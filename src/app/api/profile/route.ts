import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { User } from "@/models/User";
import { isThemeId } from "@/lib/themes";

export async function GET() {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  await connectDB();
  const user = await User.findById(userId).select("name email theme createdAt").lean();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const theme = isThemeId(user.theme) ? user.theme : null;

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    theme,
    createdAt: user.createdAt,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  theme: z.enum(["sky", "midnight", "forest", "ocean", "sand", "rose"]).optional(),
});

export async function PATCH(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await connectDB();

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim();
  if (parsed.data.theme !== undefined) update.theme = parsed.data.theme;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, runValidators: true }
  ).select("name email theme");

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    theme: isThemeId(user.theme) ? user.theme : null,
  });
}
