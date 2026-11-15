import type { ReactNode } from "react";
import "./globals.css";
export const metadata = { title: "ChainView", description: "Tron wallet tracker and energy packs" };
export default function Root({ children }: { children: ReactNode }) {
  return (<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>{children}</body></html>);
}
