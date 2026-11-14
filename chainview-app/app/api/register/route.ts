import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { email, password, name, ref } = await req.json();
  const e = String(email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (String(password ?? "").length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (await db.user.findUnique({ where: { email: e } })) return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
  const referrer = ref ? await db.user.findUnique({ where: { referralCode: String(ref) } }) : null;
  const user = await db.user.create({
    data: { email: e, name: name || null, passwordHash: await bcrypt.hash(password, 12), referredById: referrer?.id ?? null },
  });
  await db.activityLog.create({ data: { userId: user.id, action: "Signed up" } });
  return NextResponse.json({ ok: true });
}
