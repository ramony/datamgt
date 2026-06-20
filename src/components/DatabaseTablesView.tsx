"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Space, Table, Tag, message } from "antd";
import { ArrowLeftOutlined, CodeOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableSummary } from "@/lib/types";

export default function DatabaseTablesView({ connId, database }: { connId: string; database: string }) {
  const router = useRouter();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tables?connId=${connId}&db=${encodeURIComponent(database)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加载表失败");
      setTables(json.data || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [connId, database]);

  const filtered = tables.filter((table) => table.name.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{database}</h2>
          <div className="muted">共 {tables.length} 张表</div>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <Link href={`/db/${connId}/sql?db=${encodeURIComponent(database)}`}>
            <Button icon={<CodeOutlined />}>SQL Console</Button>
          </Link>
          <Button icon={<ReloadOutlined />} onClick={loadTables}>
            刷新
          </Button>
        </Space>
      </div>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input.Search placeholder="搜索表名" allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ maxWidth: 360 }} />
          <Table
            rowKey="name"
            loading={loading}
            dataSource={filtered}
            columns={[
              {
                title: "表名",
                dataIndex: "name",
                render: (name: string) => <Link href={`/db/${connId}/${encodeURIComponent(database)}/${encodeURIComponent(name)}`}>{name}</Link>
              },
              { title: "估算行数", dataIndex: "rows", width: 140, render: (rows) => <Tag>{rows ?? 0}</Tag> },
              { title: "备注", dataIndex: "comment", render: (value) => value || <span className="muted">无</span> }
            ]}
            pagination={{ pageSize: 50, showSizeChanger: true }}
          />
        </Space>
      </Card>
    </Space>
  );
}
