"use client";

import { use, useEffect, useState } from "react";
import { Button, Input, Space, Table, Tag, message } from "antd";

type HistoryRow = {
  id: number;
  database_name?: string;
  sql_text: string;
  duration_ms: number;
  affected_rows?: number;
  status: "success" | "error";
  error_message?: string;
  executed_at: string;
  rollback_sql?: string;
};

export default function HistoryPage({ params }: { params: Promise<{ connId: string }> }) {
  const { connId } = use(params);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const res = await fetch(`/api/history?connId=${connId}&q=${encodeURIComponent(q)}`);
    setRows((await res.json()).data || []);
  };

  useEffect(() => {
    load();
  }, [connId]);

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <div className="toolbar">
        <Input.Search placeholder="搜索 SQL" value={q} onChange={(e) => setQ(e.target.value)} onSearch={load} style={{ width: 360 }} />
      </div>
      <Table
        rowKey="id"
        dataSource={rows}
        scroll={{ x: "max-content" }}
        columns={[
          { title: "时间", dataIndex: "executed_at", width: 180 },
          { title: "数据库", dataIndex: "database_name", width: 140 },
          { title: "状态", dataIndex: "status", render: (v) => <Tag color={v === "success" ? "green" : "red"}>{v}</Tag> },
          { title: "耗时", dataIndex: "duration_ms", render: (v) => `${v || 0} ms` },
          { title: "影响行数", dataIndex: "affected_rows" },
          { title: "SQL", dataIndex: "sql_text", render: (v) => <pre style={{ maxWidth: 620, whiteSpace: "pre-wrap" }}>{v}</pre> },
          { title: "错误", dataIndex: "error_message" },
          {
            title: "回滚",
            render: (_, row) => (
              <Button
                disabled={!row.rollback_sql}
                onClick={async () => {
                  const res = await fetch(`/api/history/${row.id}/rollback`, { method: "POST" });
                  if (res.ok) message.success("回滚已执行");
                  else message.error((await res.json()).error || "回滚失败");
                }}
              >
                执行
              </Button>
            )
          }
        ]}
      />
    </Space>
  );
}
