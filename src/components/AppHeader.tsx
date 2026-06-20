"use client";

import { DatabaseOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function AppHeader() {
  return (
    <div
      style={{
        height: 54,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 20px",
        borderBottom: "1px solid var(--border)",
        background: "#fff"
      }}
    >
      <DatabaseOutlined style={{ color: "var(--accent)", fontSize: 22 }} />
      <Link href="/connections" style={{ fontWeight: 700, fontSize: 18 }}>
        DataMGT
      </Link>
      <span className="muted">Web MySQL 管理工具</span>
    </div>
  );
}
