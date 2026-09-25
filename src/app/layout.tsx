import "antd/dist/reset.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DataMGT",
  description: "Lightweight browser MySQL management tool"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full">
        <main className="app-shell h-full">{children}</main>
      </body>
    </html>
  );
}
