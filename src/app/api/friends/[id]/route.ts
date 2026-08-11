import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Friendship } from "@/models/Friendship";

const actionSchema = z.object({
  action: z.enum(["accept", "decline", "remove"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const { id } = await params;

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await connectDB();
  const friendship = await Friendship.findById(id);
  if (!friendship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isRequester = friendship.requesterId.toString() === userId;
  const isAddressee = friendship.addresseeId.toString() === userId;
  if (!isRequester && !isAddressee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.action === "accept") {
    if (!isAddressee || friendship.status !== "pending") {
      return NextResponse.json({ error: "Cannot accept" }, { status: 400 });
    }
    friendship.status = "accepted";
    await friendship.save();
    return NextResponse.json({ status: "accepted" });
  }

  if (parsed.data.action === "decline") {
    if (!isAddressee || friendship.status !== "pending") {
      return NextResponse.json({ error: "Cannot decline" }, { status: 400 });
    }
    friendship.status = "declined";
    await friendship.save();
    return NextResponse.json({ status: "declined" });
  }

  // remove
  await Friendship.deleteOne({ _id: friendship._id });
  return NextResponse.json({ ok: true });
}
