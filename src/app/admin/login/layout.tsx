import type { Metadata } from "next";

/** v23: proper browser-tab title for the (pro) admin login page. */
export const metadata: Metadata = {
  title: "ورود مدیران | تاج الکترونیکس",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
