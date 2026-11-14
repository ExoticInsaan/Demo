"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function Login() {
  const ref = useSearchParams().get("ref") ?? "";
  const [mode, setMode] = useState<"up" | "in">(ref ? "up" : "in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (mode === "up") {
      const r = await fetch("/api/register", { method: "POST", body: JSON.stringify({ email, password, ref }) });
      if (!r.ok) return setErr((await r.json()).error);
    }
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) return setErr("Wrong email or password, or the account is suspended.");
    window.location.href = "/dashboard";
  }
  return (
    <main style={{ maxWidth: 380, margin: "60px auto" }}>
      <h1>{mode === "up" ? "Create your account" : "Log in"}</h1>
      <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>Continue with Google</button>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} required />
        {err && <p role="alert" style={{ color: "#b3261e", margin: 0 }}>{err}</p>}
        <button type="submit">{mode === "up" ? "Create account" : "Log in"}</button>
      </form>
      <p><a href="#" onClick={e => { e.preventDefault(); setMode(mode === "up" ? "in" : "up"); }}>{mode === "up" ? "Already have an account? Log in" : "New here? Sign up"}</a></p>
    </main>
  );
}
