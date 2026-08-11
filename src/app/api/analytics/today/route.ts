import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAnalytics } from "@/lib/analytics";

export async function GET() {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  await connectDB();
  const data = await getAnalytics(userId, { range: "day" });
  return NextResponse.json(data.today);
}
