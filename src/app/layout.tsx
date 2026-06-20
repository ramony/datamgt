import "antd/dist/reset.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DataMGT",
  description: "Lightweight browser MySQL management tool"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
