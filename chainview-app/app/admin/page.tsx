import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

async function toggle(fd: FormData) {
  "use server";
  const s = await getSession(); if (!isAdmin(s?.user?.email)) return;
  const id = String(fd.get("id")); const u = await db.user.findUnique({ where: { id } }); if (!u) return;
  await db.user.update({ where: { id }, data: { suspended: !u.suspended } });
  await db.activityLog.create({ data: { userId: id, action: `Admin ${u.suspended ? "reactivated" : "suspended"} ${u.email}` } });
  revalidatePath("/admin");
}

export default async function Admin() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!isAdmin(s.user?.email)) redirect("/dashboard");
  const [users, logs] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { wallets: true } } } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: true } }),
  ]);
  return (
    <main>
      <h1>Admin</h1>
      <p>{users.length} users · {users.filter(u => !u.suspended).length} active</p>
      <table width="100%"><thead><tr><th align="left">Email</th><th align="left">Wallets</th><th align="left">Status</th><th /></tr></thead><tbody>
        {users.map(u => (<tr key={u.id}><td>{u.email}</td><td>{u._count.wallets}</td><td>{u.suspended ? "Suspended" : "Active"}</td>
          <td><form action={toggle}><input type="hidden" name="id" value={u.id} /><button>{u.suspended ? "Reactivate" : "Suspend"}</button></form></td></tr>))}
      </tbody></table>
      <h2>Activity log</h2>
      <ul>{logs.map(l => (<li key={l.id}>{l.createdAt.toLocaleString()} · {l.user?.email ?? "system"} · {l.action}</li>))}</ul>
    </main>
  );
}
