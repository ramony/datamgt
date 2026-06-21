"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Checkbox, Input, Select, Space, Tree, message } from "antd";
import type { DataNode } from "antd/es/tree";
import { CodeOutlined, HistoryOutlined, ReloadOutlined, SearchOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { ConnectionRecord, TableSummary } from "@/lib/types";

export default function DbSidebar({ connId }: { connId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<Record<string, TableSummary[]>>({});
  const [expanded, setExpanded] = useState<React.Key[]>([]);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const loadConnections = async () => {
    const res = await fetch("/api/connections");
    setConnections((await res.json()).data || []);
  };

  const loadTables = async (db: string) => {
    const res = await fetch(`/api/tables?connId=${connId}&db=${encodeURIComponent(db)}`);
    const data = (await res.json()).data || [];
    setTables((prev) => ({ ...prev, [db]: data }));
  };

  const loadDatabases = async () => {
    const res = await fetch(`/api/databases?connId=${connId}${showAll ? "&all=1" : ""}`);
    const data = (await res.json()).data || [];
    setDatabases(data);
    if (data.length === 1) {
      setExpanded(data);
      await loadTables(data[0]);
    }
  };

  const openDatabase = (db: string) => {
    setExpanded((prev) => (prev.includes(db) ? prev : [...prev, db]));
    if (!tables[db]) void loadTables(db);
  };

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    setTables({});
    loadDatabases();
  }, [connId, showAll]);

  useEffect(() => {
    const handler = (event: Event) => {
      const database = (event as CustomEvent<{ database?: string }>).detail?.database;
      if (database) void loadTables(database);
    };
    window.addEventListener("table-data-changed", handler);
    return () => window.removeEventListener("table-data-changed", handler);
  }, [connId]);

  const treeData = useMemo<DataNode[]>(() => {
    return databases.map((db) => {
      const filteredTables = (tables[db] || []).filter((table) => table.name.toLowerCase().includes(search.toLowerCase()));
      return {
        key: db,
        title: (
          <Link href={`/db/${connId}/${encodeURIComponent(db)}`} onClick={() => openDatabase(db)}>
            {db}
          </Link>
        ),
        children: filteredTables.map((table) => ({
          key: `${db}.${table.name}`,
          title: (
            <Link href={`/db/${connId}/${encodeURIComponent(db)}/${encodeURIComponent(table.name)}`} title={table.comment || table.name}>
              {table.name} <span className="muted">({table.rows ?? 0})</span>
            </Link>
          ),
          isLeaf: true
        }))
      };
    });
  }, [databases, tables, search, connId]);

  useEffect(() => {
    if (search) {
      setExpanded(databases.filter((db) => (tables[db] || []).some((table) => table.name.toLowerCase().includes(search.toLowerCase()))));
    }
  }, [search, databases, tables]);

  return (
    <aside
      style={{
        width: 310,
        minWidth: 220,
        maxWidth: 500,
        borderRight: "1px solid var(--border)",
        background: "#fff",
        height: "calc(100vh - 54px)",
        overflow: "auto",
        padding: 12
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={10}>
        <Select
          value={connId}
          style={{ width: "100%" }}
          options={connections.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(id) => router.push(`/db/${id}`)}
        />
        <div className="toolbar">
          <Link href={`/connections`}>
            <Button icon={<ArrowLeftOutlined />}>

            </Button>
          </Link>
          <Button icon={<ReloadOutlined />} onClick={() => loadDatabases()} />
          <Button icon={<CodeOutlined />} onClick={() => router.push(`/db/${connId}/sql`)} />
          <Button icon={<HistoryOutlined />} onClick={() => router.push(`/db/${connId}/history`)} />
        </div>
        <Checkbox checked={showAll} onChange={(event) => setShowAll(event.target.checked)}>
          显示所有数据库
        </Checkbox>
        <Input prefix={<SearchOutlined />} placeholder="搜索表名" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Tree
          treeData={treeData}
          expandedKeys={expanded}
          selectedKeys={[decodeURIComponent(pathname.split("/").slice(3, 5).join("."))]}
          onExpand={async (keys, info) => {
            setExpanded(keys);
            if (info.expanded) await loadTables(String(info.node.key));
          }}
          onSelect={(_, info) => {
            const key = String(info.node.key);
            if (!key.includes(".")) openDatabase(key);
          }}
          onRightClick={({ node }) => {
            navigator.clipboard?.writeText(String(node.key)).then(() => message.success("已复制名称"));
          }}
        />
      </Space>
    </aside>
  );
}
