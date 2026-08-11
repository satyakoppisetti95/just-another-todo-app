import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAnalytics } from "@/lib/analytics";
import { Friendship } from "@/models/Friendship";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") as "day" | "week" | "month") || "week";
  const forUser = searchParams.get("userId");

  await connectDB();

  let targetUserId = userId;
  let excludePrivate = false;

  if (forUser && forUser !== userId) {
    const friendship = await Friendship.findOne({
      status: "accepted",
      $or: [
        { requesterId: userId, addresseeId: forUser },
        { requesterId: forUser, addresseeId: userId },
      ],
    });
    if (!friendship) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }
    targetUserId = forUser;
    excludePrivate = true;
  }

  const data = await getAnalytics(targetUserId, { range, excludePrivate });

  let profile = null;
  if (forUser && forUser !== userId) {
    const user = await User.findById(forUser).select("name email");
    if (user) {
      profile = { id: user._id.toString(), name: user.name, email: user.email };
    }
  }

  return NextResponse.json({ ...data, profile });
}
