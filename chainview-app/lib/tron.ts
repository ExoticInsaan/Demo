const BASE = "https://api.trongrid.io";
const USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
export const isTronAddress = (a: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
const headers = (): HeadersInit => ({
  "Content-Type": "application/json",
  ...(process.env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY } : {}),
});

export async function getWalletInfo(address: string) {
  const [acc, res, tx] = await Promise.all([
    fetch(`${BASE}/v1/accounts/${address}`, { headers: headers(), next: { revalidate: 30 } }).then(r => r.json()),
    fetch(`${BASE}/wallet/getaccountresource`, { method: "POST", headers: headers(), body: JSON.stringify({ address, visible: true }), next: { revalidate: 30 } }).then(r => r.json()),
    fetch(`${BASE}/v1/accounts/${address}/transactions/trc20?limit=10&contract_address=${USDT}`, { headers: headers(), next: { revalidate: 30 } }).then(r => r.json()),
  ]);
  const a = acc?.data?.[0];
  const usdtRaw = (a?.trc20 ?? []).find((t: Record<string, string>) => t[USDT] !== undefined)?.[USDT] ?? "0";
  const pct = (limit = 0, used = 0) => (limit > 0 ? Math.max(0, Math.round(((limit - used) / limit) * 100)) : 0);
  return {
    trx: (a?.balance ?? 0) / 1e6,
    usdt: Number(usdtRaw) / 1e6,
    energyLeft: pct(res.EnergyLimit, res.EnergyUsed),
    bandwidthLeft: pct((res.freeNetLimit ?? 0) + (res.NetLimit ?? 0), (res.freeNetUsed ?? 0) + (res.NetUsed ?? 0)),
    transfers: ((tx?.data ?? []) as any[]).map((t: any) => ({
      id: t.transaction_id as string,
      dir: t.to === address ? "in" : "out",
      amount: Number(t.value) / 10 ** Number(t.token_info?.decimals ?? 6),
      other: (t.to === address ? t.from : t.to) as string,
      time: new Date(t.block_timestamp).toLocaleString(),
    })),
  };
}
