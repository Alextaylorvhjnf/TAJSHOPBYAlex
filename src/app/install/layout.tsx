import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "نصب تاج الکترونیکس",
  description: "جادوی نصب اولیه فروشگاه تاج الکترونیکس",
  robots: { index: false, follow: false },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return children;
}
