import type { ReactNode } from "react";
export const metadata = { title: "ChainView" };
export default function Root({ children }: { children: ReactNode }) {
  return (<html lang="en"><body style={{ fontFamily: "system-ui", margin: 0, padding: 24, maxWidth: 960, marginInline: "auto" }}>{children}</body></html>);
}
