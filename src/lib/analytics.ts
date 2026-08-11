import mongoose from "mongoose";
import { PointEvent } from "@/models/PointEvent";
import { ActivityEvent } from "@/models/ActivityEvent";
import { Folder } from "@/models/Folder";
import { FolderShare } from "@/models/FolderShare";
import { Todo } from "@/models/Todo";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getAnalytics(
  userId: string,
  opts: { range: "day" | "week" | "month"; excludePrivate?: boolean } = {
    range: "week",
  }
) {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const todayStart = startOfDay(now);

  let rangeStart = todayStart;
  if (opts.range === "week") rangeStart = addDays(todayStart, -6);
  if (opts.range === "month") rangeStart = addDays(todayStart, -29);

  let folderFilter: mongoose.Types.ObjectId[] | null = null;
  if (opts.excludePrivate) {
    const publicFolders = await Folder.find({ ownerId: uid, isPrivate: false }).select("_id");
    folderFilter = publicFolders.map((f) => f._id);
  }

  const pointMatch: Record<string, unknown> = {
    userId: uid,
    createdAt: { $gte: rangeStart },
  };
  if (folderFilter) {
    pointMatch.folderId = { $in: folderFilter };
  }

  const activityMatch: Record<string, unknown> = {
    userId: uid,
    createdAt: { $gte: rangeStart },
  };

  const ownedFoldersForPending = await Folder.find(
    opts.excludePrivate ? { ownerId: uid, isPrivate: false } : { ownerId: uid }
  )
    .select("_id")
    .lean();
  const sharesForPending = opts.excludePrivate
    ? []
    : await FolderShare.find({ userId: uid }).select("folderId").lean();
  const pendingFolderIds = [
    ...ownedFoldersForPending.map((f) => f._id),
    ...sharesForPending.map((s) => s.folderId),
  ];

  const [
    pointAgg,
    activityAgg,
    todayPoints,
    todayCompletions,
    todayCreated,
    pending,
    byFolder,
    selfPeer,
  ] = await Promise.all([
    PointEvent.aggregate([
      { $match: pointMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          points: { $sum: "$points" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ActivityEvent.aggregate([
      { $match: { ...activityMatch, type: "todo_completed" } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          completions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    PointEvent.aggregate([
      {
        $match: {
          userId: uid,
          createdAt: { $gte: todayStart },
          ...(folderFilter ? { folderId: { $in: folderFilter } } : {}),
        },
      },
      { $group: { _id: null, points: { $sum: "$points" } } },
    ]),
    ActivityEvent.countDocuments({
      userId: uid,
      type: "todo_completed",
      createdAt: { $gte: todayStart },
    }),
    ActivityEvent.countDocuments({
      userId: uid,
      type: "todo_created",
      createdAt: { $gte: todayStart },
    }),
    pendingFolderIds.length === 0
      ? Promise.resolve(0)
      : Todo.countDocuments({
          folderId: { $in: pendingFolderIds },
          completed: false,
        }),
    PointEvent.aggregate([
      { $match: pointMatch },
      {
        $group: {
          _id: "$folderId",
          points: { $sum: "$points" },
        },
      },
      { $sort: { points: -1 } },
      { $limit: 8 },
    ]),
    PointEvent.aggregate([
      { $match: pointMatch },
      {
        $group: {
          _id: "$source",
          points: { $sum: "$points" },
        },
      },
    ]),
  ]);

  const days: { date: string; points: number; completions: number }[] = [];
  const pointMap = new Map(pointAgg.map((p) => [p._id, p.points as number]));
  const completionMap = new Map(activityAgg.map((a) => [a._id, a.completions as number]));

  const dayCount = opts.range === "day" ? 1 : opts.range === "week" ? 7 : 30;
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = addDays(todayStart, -i);
    const key = dayKey(d);
    days.push({
      date: key,
      points: pointMap.get(key) ?? 0,
      completions: completionMap.get(key) ?? 0,
    });
  }

  const folderIds = byFolder.map((f) => f._id);
  const folders = await Folder.find({ _id: { $in: folderIds } }).select("name color");
  const folderNameMap = new Map(folders.map((f) => [f._id.toString(), f]));

  // Average completion latency for completed todos in range
  const latencyMatch: Record<string, unknown> = {
    completed: true,
    completedAt: { $gte: rangeStart, $ne: null },
  };
  if (folderFilter) {
    latencyMatch.folderId = { $in: folderFilter };
  } else {
    const owned = await Folder.find({ ownerId: uid }).select("_id");
    latencyMatch.folderId = { $in: owned.map((f) => f._id) };
  }

  const latency = await Todo.aggregate([
    { $match: latencyMatch },
    {
      $project: {
        ms: { $subtract: ["$completedAt", "$createdAt"] },
      },
    },
    {
      $group: {
        _id: null,
        avgMs: { $avg: "$ms" },
        count: { $sum: 1 },
      },
    },
  ]);

  const selfPoints = selfPeer.find((s) => s._id === "self")?.points ?? 0;
  const peerPoints = selfPeer.find((s) => s._id === "peer")?.points ?? 0;

  return {
    range: opts.range,
    today: {
      points: todayPoints[0]?.points ?? 0,
      completions: todayCompletions,
      pending,
      created: todayCreated,
    },
    series: days,
    byFolder: byFolder.map((f) => ({
      folderId: f._id.toString(),
      name: folderNameMap.get(f._id.toString())?.name ?? "Unknown",
      color: folderNameMap.get(f._id.toString())?.color ?? "#8E8E93",
      points: f.points as number,
    })),
    selfVsPeer: { self: selfPoints, peer: peerPoints },
    avgCompletionMs: latency[0]?.avgMs ?? null,
    completedInRange: latency[0]?.count ?? 0,
  };
}

export async function logActivity(
  userId: string,
  type: import("@/models/ActivityEvent").ActivityType,
  meta: Record<string, unknown> = {}
) {
  await ActivityEvent.create({
    userId,
    type,
    meta,
  });
}
