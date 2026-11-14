import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// On Cloudflare Workers a database connection cannot be shared between requests,
// so a fresh client is created per request, using the Hyperdrive connection pool.
// Locally (next dev) it falls back to DATABASE_URL.
function makeClient() {
  let connectionString = process.env.DATABASE_URL;
  try {
    const hd = (getCloudflareContext().env as any)?.HYPERDRIVE;
    if (hd?.connectionString) connectionString = hd.connectionString;
  } catch {}
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const db = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    return (makeClient() as any)[prop];
  },
});
