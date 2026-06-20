"use client";

import { use, useEffect, useState } from "react";
import { Card, Space, Table, Tabs } from "antd";

type IndexRow = {
  Key_name: string;
  Seq_in_index: number;
  Column_name?: string;
  Non_unique?: number;
  Index_type?: string;
};

export default function StructurePage({ params }: { params: Promise<{ connId: string; database: string; table: string }> }) {
  const raw = use(params);
  const resolved = { connId: raw.connId, database: decodeURIComponent(raw.database), table: decodeURIComponent(raw.table) };
  const [data, setData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch(`/api/tables/${encodeURIComponent(resolved.table)}/structure?connId=${resolved.connId}&db=${encodeURIComponent(resolved.database)}`)
      .then((res) => res.json())
      .then((json) => setData(json.data || {}));
  }, [resolved.connId, resolved.database, resolved.table]);

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <h2>{resolved.table} 表结构</h2>
      <Tabs
        items={[
          {
            key: "columns",
            label: "列",
            children: <Table size="small" rowKey="Field" dataSource={(data.columns as object[]) || []} pagination={false} columns={["Field", "Type", "Null", "Key", "Default", "Extra", "Comment"].map((key) => ({ title: key, dataIndex: key }))} />
          },
          {
            key: "indexes",
            label: "索引",
            children: <Table<IndexRow> size="small" rowKey={(row) => `${row.Key_name}-${row.Seq_in_index}`} dataSource={(data.indexes as IndexRow[]) || []} pagination={false} columns={["Key_name", "Column_name", "Non_unique", "Index_type"].map((key) => ({ title: key, dataIndex: key }))} />
          },
          {
            key: "foreign",
            label: "外键",
            children: <Table size="small" rowKey="CONSTRAINT_NAME" dataSource={(data.foreignKeys as object[]) || []} pagination={false} columns={["CONSTRAINT_NAME", "COLUMN_NAME", "REFERENCED_TABLE_NAME", "REFERENCED_COLUMN_NAME"].map((key) => ({ title: key, dataIndex: key }))} />
          },
          { key: "ddl", label: "DDL", children: <Card><pre className="code-block">{String(data.createTable || "")}</pre></Card> }
        ]}
      />
    </Space>
  );
}
