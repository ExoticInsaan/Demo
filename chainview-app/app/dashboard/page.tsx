import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWalletInfo, isTronAddress } from "@/lib/tron";

async function addWallet(fd: FormData) {
  "use server";
  const s = await getSession(); const uid = (s?.user as any)?.id as string | undefined;
  const address = String(fd.get("address") ?? "").trim();
  if (!uid || !isTronAddress(address)) return;
  await db.wallet.upsert({ where: { userId_address: { userId: uid, address } }, update: {}, create: { userId: uid, address } });
  await db.activityLog.create({ data: { userId: uid, action: "Added a wallet" } });
  revalidatePath("/dashboard");
}

export default async function Dashboard() {
  const s = await getSession(); const uid = (s?.user as any)?.id as string | undefined;
  if (!uid) redirect("/login");
  const user = await db.user.findUnique({ where: { id: uid }, include: { wallets: true, _count: { select: { referrals: true } } } });
  const infos = await Promise.all((user?.wallets ?? []).map(w => getWalletInfo(w.address).catch(() => null)));
  return (
    <main>
      <h1>Your wallets</h1>
      {isAdmin(s?.user?.email) && <p><Link href="/admin">Open admin panel</Link></p>}
      <form action={addWallet} style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input name="address" placeholder="Tron address (starts with T)" style={{ flex: 1 }} required />
        <button type="submit">Add wallet</button>
      </form>
      {user?.wallets.length === 0 && <p>Add a wallet to see balances, energy and transfers.</p>}
      {user?.wallets.map((w, i) => { const d = infos[i]; return (
        <section key={w.id} style={{ border: "1px solid #ccc", borderRadius: 12, padding: 16, margin: "12px 0" }}>
          <code>{w.address}</code>
          {!d ? <p>Could not load this wallet right now. Try again in a minute.</p> : (<>
            <p>TRX {d.trx.toLocaleString()} · USDT {d.usdt.toLocaleString()} · Energy left {d.energyLeft}% · Bandwidth left {d.bandwidthLeft}%</p>
            <table width="100%"><tbody>{d.transfers.map(t => (
              <tr key={t.id}><td>{t.time}</td><td>{t.dir === "in" ? "Received" : "Sent"}</td><td>{t.amount} USDT</td><td><code>{t.other.slice(0, 6)}…{t.other.slice(-4)}</code></td></tr>
            ))}</tbody></table></>)}
        </section>); })}
      <h2>Invite a friend</h2>
      <p>Your link: <code>/login?ref={user?.referralCode}</code> · Friends invited: {user?._count.referrals ?? 0}</p>
    </main>
  );
}
