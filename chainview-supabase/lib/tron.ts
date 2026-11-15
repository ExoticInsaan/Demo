const BASE = "https://api.trongrid.io";
const USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
export const isTronAddress = (a: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
const pct = (limit = 0, used = 0) => (limit > 0 ? Math.max(0, Math.round(((limit - used) / limit) * 100)) : 0);

export async function getWalletInfo(address: string) {
  const [acc, res, tx] = await Promise.all([
    fetch(`${BASE}/v1/accounts/${address}`).then(r => r.json()),
    fetch(`${BASE}/wallet/getaccountresource`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, visible: true }) }).then(r => r.json()),
    fetch(`${BASE}/v1/accounts/${address}/transactions/trc20?limit=8&contract_address=${USDT}`).then(r => r.json()),
  ]);
  const a = acc?.data?.[0];
  const raw = (a?.trc20 ?? []).find((t: Record<string, string>) => t[USDT] !== undefined)?.[USDT] ?? "0";
  return {
    trx: (a?.balance ?? 0) / 1e6,
    usdt: Number(raw) / 1e6,
    energy: pct(res.EnergyLimit, res.EnergyUsed),
    bandwidth: pct((res.freeNetLimit ?? 0) + (res.NetLimit ?? 0), (res.freeNetUsed ?? 0) + (res.NetUsed ?? 0)),
    transfers: (tx?.data ?? []).map((t: any) => ({
      id: t.transaction_id as string,
      dir: t.to === address ? "in" : "out",
      amount: Number(t.value) / 10 ** Number(t.token_info?.decimals ?? 6),
      other: (t.to === address ? t.from : t.to) as string,
      time: new Date(t.block_timestamp).toLocaleString(),
    })),
  };
}
