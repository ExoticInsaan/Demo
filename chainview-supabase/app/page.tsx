"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getWalletInfo, isTronAddress } from "@/lib/tron";

type Row = Record<string, any>;
const STATUS: Record<string, string> = {
  awaiting_payment: "Awaiting payment", payment_submitted: "Payment submitted", delivered: "Delivered",
  refund_requested: "Refund requested", refunded: "Refunded", rejected: "Rejected",
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <div className="wrap">Loading…</div>;
  return session ? <Main session={session} /> : <Auth />;
}

function Auth() {
  const ref = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") ?? "" : "";
  const [mode, setMode] = useState<"in" | "up">(ref ? "up" : "in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [info, setInfo] = useState(""); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: ref ? { ref } : {} } });
      if (error) setErr(error.message);
      else if (!data.session) setInfo("Account created. Check your email and click the confirmation link, then log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    }
    setBusy(false);
  }
  return (
    <div className="wrap"><div className="auth card">
      <div className="logo" style={{ marginBottom: 12 }}>Chain<b>View</b></div>
      <h2>{mode === "up" ? "Create your account" : "Log in"}</h2>
      <p className="muted">Track Tron wallets and buy energy packs. We never hold your crypto and never ask for private keys.</p>
      <button style={{ width: "100%", marginTop: 8 }} onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}>Continue with Google</button>
      <form onSubmit={submit}>
        <label htmlFor="e">Email</label><input id="e" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <label htmlFor="p">Password</label><input id="p" type="password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
        {err && <p className="err" role="alert">{err}</p>}{info && <p className="okm">{info}</p>}
        <button className="primary" style={{ width: "100%", marginTop: 12 }} disabled={busy}>{mode === "up" ? "Create account" : "Log in"}</button>
      </form>
      <p className="muted"><a href="#" onClick={e => { e.preventDefault(); setMode(mode === "up" ? "in" : "up"); setErr(""); setInfo(""); }}>{mode === "up" ? "Have an account? Log in" : "New here? Sign up"}</a></p>
    </div></div>
  );
}

function Main({ session }: { session: any }) {
  const uid: string = session.user.id;
  const [tab, setTab] = useState("wallets");
  const [profile, setProfile] = useState<Row | null>(null);
  const [admin, setAdmin] = useState(false);
  const [companyWallet, setCompanyWallet] = useState("");
  const [packs, setPacks] = useState<Row[]>([]);
  const [wallets, setWallets] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [rewards, setRewards] = useState<Row[]>([]);
  const [invited, setInvited] = useState(0);

  const load = useCallback(async () => {
    const [p, a, s, pk, w, o, r, c] = await Promise.all([
      supabase.from("cv_profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.rpc("cv_is_admin"),
      supabase.from("cv_settings").select("value").eq("key", "company_wallet").maybeSingle(),
      supabase.from("cv_packs").select("*").eq("active", true).order("price_usdt"),
      supabase.from("cv_wallets").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("cv_orders").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("cv_rewards").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.rpc("cv_my_referral_count"),
    ]);
    setProfile(p.data); setAdmin(a.data === true); setCompanyWallet(s.data?.value ?? "");
    setPacks(pk.data ?? []); setWallets(w.data ?? []); setOrders(o.data ?? []); setRewards(r.data ?? []); setInvited(c.data ?? 0);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const tabs = [["wallets", "Wallets"], ["buy", "Buy energy"], ["orders", "My orders"], ["rewards", "Rewards"], ...(admin ? [["admin", "Admin"]] : [])];
  return (
    <div className="wrap">
      <div className="top"><div className="logo">Chain<b>View</b></div>
        <div className="row"><span className="muted">{session.user.email}</span><button onClick={() => supabase.auth.signOut()}>Log out</button></div></div>
      {profile?.suspended && <div className="notice" role="alert">Your account is suspended. Contact support.</div>}
      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "wallets" && <Wallets uid={uid} wallets={wallets} reload={load} />}
      {tab === "buy" && <Buy packs={packs} wallets={wallets} companyWallet={companyWallet} reload={load} goOrders={() => setTab("orders")} />}
      {tab === "orders" && <Orders orders={orders} packs={packs} companyWallet={companyWallet} reload={load} />}
      {tab === "rewards" && <Rewards rewards={rewards} invited={invited} code={profile?.referral_code} reload={load} />}
      {tab === "admin" && admin && <Admin companyWallet={companyWallet} reloadTop={load} />}
    </div>
  );
}

function Wallets({ uid, wallets, reload }: { uid: string; wallets: Row[]; reload: () => void }) {
  const [addr, setAddr] = useState(""); const [err, setErr] = useState("");
  const [info, setInfo] = useState<Record<string, any>>({});
  useEffect(() => { wallets.forEach(w => { if (!info[w.address]) getWalletInfo(w.address).then(d => setInfo(i => ({ ...i, [w.address]: d }))).catch(() => setInfo(i => ({ ...i, [w.address]: "error" }))); }); }, [wallets]); // eslint-disable-line
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!isTronAddress(addr.trim())) return setErr("Enter a valid Tron address (starts with T, 34 characters).");
    const { error } = await supabase.from("cv_wallets").insert({ user_id: uid, address: addr.trim() });
    if (error) return setErr(error.code === "23505" ? "This wallet is already added." : error.message);
    setAddr(""); reload();
  }
  return (<>
    <form className="card" onSubmit={add}><label htmlFor="a" style={{ marginTop: 0 }}>Add a wallet to track</label>
      <div className="row"><input id="a" style={{ flex: 1, minWidth: 220 }} placeholder="Tron address (starts with T)" value={addr} onChange={e => setAddr(e.target.value)} /><button className="primary">Add</button></div>
      {err && <p className="err" role="alert">{err}</p>}<p className="muted" style={{ marginBottom: 0 }}>Read-only. We only read public blockchain data and never ask for a private key.</p></form>
    {wallets.length === 0 && <p className="muted">No wallets yet. Add one above.</p>}
    {wallets.map(w => { const d = info[w.address]; return (
      <div className="card" key={w.id}><code>{w.address}</code>
        {!d ? <p className="muted">Loading…</p> : d === "error" ? <p className="err">Could not load this wallet right now.</p> : (<>
          <div className="grid" style={{ margin: "12px 0" }}>
            <div><span className="muted">TRX</span><h3>{d.trx.toLocaleString()}</h3></div><div><span className="muted">USDT</span><h3>{d.usdt.toLocaleString()}</h3></div>
            <div><span className="muted">Energy left {d.energy}%</span><div className="bar"><i style={{ width: d.energy + "%" }} /></div></div>
            <div><span className="muted">Bandwidth left {d.bandwidth}%</span><div className="bar"><i style={{ width: d.bandwidth + "%" }} /></div></div></div>
          {d.transfers.length > 0 && <div className="scroll"><table><tbody>{d.transfers.map((t: any) => (<tr key={t.id}><td>{t.time}</td><td className={t.dir}>{t.dir === "in" ? "Received" : "Sent"}</td><td>{t.amount} USDT</td><td><code>{t.other.slice(0, 6)}…{t.other.slice(-4)}</code></td></tr>))}</tbody></table></div>}
        </>)}
        <button className="small" style={{ marginTop: 10 }} onClick={async () => { await supabase.from("cv_wallets").delete().eq("id", w.id); reload(); }}>Remove</button></div>); })}
  </>);
}

function Buy({ packs, wallets, companyWallet, reload, goOrders }: { packs: Row[]; wallets: Row[]; companyWallet: string; reload: () => void; goOrders: () => void }) {
  const [pack, setPack] = useState(""); const [wallet, setWallet] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function create() {
    setErr(""); setBusy(true);
    const { error } = await supabase.rpc("cv_create_order", { p_pack: pack, p_wallet: wallet });
    setBusy(false); if (error) return setErr(error.message);
    reload(); goOrders();
  }
  return (
    <div className="card"><h2>Buy an energy pack</h2>
      <p className="muted">Energy lets your wallet send USDT without burning TRX. You pay once for the pack. Nothing is stored as a balance and no returns are promised.</p>
      {wallets.length === 0 ? <p className="err">Add a wallet in the Wallets tab first. The energy is delivered to that wallet.</p> : (<>
        <label htmlFor="pk">Pack</label><select id="pk" value={pack} onChange={e => setPack(e.target.value)}><option value="">Choose a pack</option>{packs.map(p => <option key={p.id} value={p.id}>{p.name}: {Number(p.energy).toLocaleString()} energy for {p.price_usdt} USDT</option>)}</select>
        <label htmlFor="wl">Deliver to wallet</label><select id="wl" value={wallet} onChange={e => setWallet(e.target.value)}><option value="">Choose a wallet</option>{wallets.map(w => <option key={w.id} value={w.address}>{w.address}</option>)}</select>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="primary" style={{ marginTop: 14 }} disabled={!pack || !wallet || busy} onClick={create}>Create order</button>
        <p className="muted">Next you'll see the payment address ({companyWallet.startsWith("REPLACE") ? "not set yet" : "company wallet"}) in My orders.</p></>)}
    </div>);
}

function Orders({ orders, packs, companyWallet, reload }: { orders: Row[]; packs: Row[]; companyWallet: string; reload: () => void }) {
  const [tx, setTx] = useState<Record<string, string>>({}); const [msg, setMsg] = useState<Record<string, string>>({});
  const name = (id: string) => packs.find(p => p.id === id)?.name ?? id;
  async function pay(id: string) {
    const { error } = await supabase.rpc("cv_submit_payment", { p_order: id, p_tx: (tx[id] ?? "").trim() });
    if (error) setMsg(m => ({ ...m, [id]: error.message })); else reload();
  }
  async function refund(id: string) {
    const reason = window.prompt("Why do you want a refund? (for example, energy was not delivered)") ?? "";
    if (!reason.trim()) return;
    const { error } = await supabase.rpc("cv_request_refund", { p_order: id, p_reason: reason });
    if (error) setMsg(m => ({ ...m, [id]: error.message })); else reload();
  }
  if (orders.length === 0) return <p className="muted">No orders yet. Buy an energy pack to create one.</p>;
  return (<>{orders.map(o => (
    <div className="card" key={o.id}>
      <div className="row" style={{ justifyContent: "space-between" }}><h3>{name(o.pack_id)} · {o.amount_usdt} USDT</h3><span className="badge">{STATUS[o.status]}</span></div>
      <p className="muted">Deliver to <code>{o.wallet_address}</code> · {new Date(o.created_at).toLocaleString()}</p>
      {o.status === "awaiting_payment" && (<>
        <div className="notice">Send exactly <b>{o.amount_usdt} USDT (TRC20)</b> to:<br /><code>{companyWallet}</code></div>
        <label htmlFor={"t" + o.id} style={{ marginTop: 0 }}>Paste your transaction ID after paying</label>
        <div className="row"><input id={"t" + o.id} style={{ flex: 1, minWidth: 220 }} placeholder="64-character transaction ID" value={tx[o.id] ?? ""} onChange={e => setTx(t => ({ ...t, [o.id]: e.target.value }))} /><button className="primary" onClick={() => pay(o.id)}>I have paid</button></div></>)}
      {o.status === "payment_submitted" && <div className="row"><span className="muted">We are checking your payment.</span><button className="small" onClick={() => refund(o.id)}>Request refund</button></div>}
      {o.status === "refund_requested" && <p className="muted">Refund requested: {o.refund_reason}</p>}
      {msg[o.id] && <p className="err" role="alert">{msg[o.id]}</p>}
    </div>))}</>);
}

function Rewards({ rewards, invited, code, reload }: { rewards: Row[]; invited: number; code?: string; reload: () => void }) {
  const [note, setNote] = useState("");
  const earned = rewards.filter(r => r.status === "earned").reduce((s, r) => s + Number(r.amount_usdt), 0);
  const link = typeof window !== "undefined" ? `${window.location.origin}/?ref=${code ?? ""}` : "";
  return (
    <div className="card"><h2>Invite a friend</h2>
      <p className="muted">One level only: you earn 10% when a friend you invited buys an energy pack and the order is delivered. Nobody else earns from it.</p>
      <div className="row"><input readOnly value={link} aria-label="Your referral link" style={{ flex: 1, minWidth: 220 }} /><button onClick={() => navigator.clipboard?.writeText(link)}>Copy</button></div>
      <p>Friends invited: <b>{invited}</b> · Ready to pay out: <b>{earned.toFixed(2)} USDT</b></p>
      <button className="primary" disabled={earned <= 0} onClick={async () => { const { data } = await supabase.rpc("cv_request_payout"); setNote(data > 0 ? "Payout requested. The admin will pay you manually." : "Nothing to request."); reload(); }}>Request payout</button>
      {note && <p className="okm">{note}</p>}
      {rewards.length > 0 && <div className="scroll" style={{ marginTop: 12 }}><table><thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{rewards.map(r => (<tr key={r.id}><td>{new Date(r.created_at).toLocaleDateString()}</td><td>{r.amount_usdt} USDT</td><td><span className="badge">{r.status.replace("_", " ")}</span></td></tr>))}</tbody></table></div>}
    </div>);
}

function Admin({ companyWallet, reloadTop }: { companyWallet: string; reloadTop: () => void }) {
  const [users, setUsers] = useState<Row[]>([]); const [orders, setOrders] = useState<Row[]>([]); const [rewards, setRewards] = useState<Row[]>([]); const [logs, setLogs] = useState<Row[]>([]);
  const [cw, setCw] = useState(companyWallet); const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [u, o, r, l] = await Promise.all([
      supabase.from("cv_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("cv_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("cv_rewards").select("*").order("created_at", { ascending: false }),
      supabase.from("cv_activity").select("*").order("created_at", { ascending: false }).limit(25),
    ]);
    setUsers(u.data ?? []); setOrders(o.data ?? []); setRewards(r.data ?? []); setLogs(l.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const email = (id: string) => users.find(u => u.id === id)?.email ?? "unknown";
  async function log(userId: string, action: string) { await supabase.from("cv_activity").insert({ user_id: userId, action }); }
  async function setOrder(o: Row, status: string) { await supabase.from("cv_orders").update({ status }).eq("id", o.id); await log(o.user_id, `Admin marked order ${status}`); load(); }
  async function toggle(u: Row) { await supabase.from("cv_profiles").update({ suspended: !u.suspended }).eq("id", u.id); await log(u.id, `Admin ${u.suspended ? "reactivated" : "suspended"} ${u.email}`); load(); }
  async function paid(r: Row) { await supabase.from("cv_rewards").update({ status: "paid" }).eq("id", r.id); await log(r.user_id, "Admin paid a reward"); load(); }
  async function saveWallet() {
    if (!isTronAddress(cw.trim())) return setMsg("Enter a valid Tron address.");
    const { error } = await supabase.from("cv_settings").update({ value: cw.trim() }).eq("key", "company_wallet");
    setMsg(error ? error.message : "Company wallet saved."); reloadTop();
  }
  const open = orders.filter(o => ["payment_submitted", "refund_requested"].includes(o.status)).length;
  return (<>
    <div className="grid"><div className="card"><span className="muted">Users</span><h2>{users.length}</h2></div><div className="card"><span className="muted">Orders needing action</span><h2>{open}</h2></div><div className="card"><span className="muted">Payouts requested</span><h2>{rewards.filter(r => r.status === "payout_requested").length}</h2></div></div>
    <div className="card"><h3>Company wallet (receives payments)</h3><div className="row" style={{ marginTop: 8 }}><input style={{ flex: 1, minWidth: 220 }} value={cw} onChange={e => setCw(e.target.value)} /><button className="primary" onClick={saveWallet}>Save</button></div>{msg && <p className="okm">{msg}</p>}</div>
    <div className="card"><h3>Orders</h3><div className="scroll"><table><thead><tr><th>User</th><th>Amount</th><th>Transaction</th><th>Status</th><th /></tr></thead><tbody>{orders.map(o => (
      <tr key={o.id}><td>{email(o.user_id)}</td><td>{o.amount_usdt}</td><td><code>{o.tx_id ? o.tx_id.slice(0, 12) + "…" : "-"}</code></td><td><span className="badge">{STATUS[o.status]}</span>{o.refund_reason && <div className="muted">{o.refund_reason}</div>}</td>
        <td className="row">{["payment_submitted", "refund_requested"].includes(o.status) && <><button className="small" onClick={() => setOrder(o, "delivered")}>Delivered</button><button className="small" onClick={() => setOrder(o, "refunded")}>Refunded</button><button className="small" onClick={() => setOrder(o, "rejected")}>Reject</button></>}</td></tr>))}</tbody></table></div></div>
    <div className="card"><h3>Reward payouts</h3><div className="scroll"><table><thead><tr><th>User</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{rewards.map(r => (<tr key={r.id}><td>{email(r.user_id)}</td><td>{r.amount_usdt} USDT</td><td><span className="badge">{r.status.replace("_", " ")}</span></td><td>{r.status === "payout_requested" && <button className="small" onClick={() => paid(r)}>Mark paid</button>}</td></tr>))}</tbody></table></div></div>
    <div className="card"><h3>Users</h3><div className="scroll"><table><thead><tr><th>Email</th><th>Joined</th><th>Status</th><th /></tr></thead><tbody>{users.map(u => (<tr key={u.id}><td>{u.email}</td><td>{new Date(u.created_at).toLocaleDateString()}</td><td><span className="badge">{u.suspended ? "Suspended" : "Active"}</span></td><td><button className="small" onClick={() => toggle(u)}>{u.suspended ? "Reactivate" : "Suspend"}</button></td></tr>))}</tbody></table></div></div>
    <div className="card"><h3>Activity log</h3><ul style={{ paddingLeft: 18, margin: "8px 0 0" }}>{logs.map(l => <li key={l.id}>{new Date(l.created_at).toLocaleString()} · {l.user_id ? email(l.user_id) : "system"} · {l.action}</li>)}</ul></div>
  </>);
}
