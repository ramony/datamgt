"use client";

import { use, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Select, Space, Table, Tabs, Tag, message } from "antd";
import SqlEditor, { SqlEditorRef } from "@/components/sql-editor/SqlEditor";

type Result = { sql: string; rows: Record<string, unknown>[]; fields?: string[]; affectedRows?: number; durationMs: number; error?: string };

export default function SqlConsolePage({ params, searchParams }: { params: Promise<{ connId: string }>; searchParams: Promise<{ db?: string }> }) {
  const { connId } = use(params);
  const query = use(searchParams);
  const editorRef = useRef<SqlEditorRef>(null);
  const storageKey = `datamgt-sql-tabs-${connId}`;
  const [databases, setDatabases] = useState<string[]>([]);
  const [db, setDb] = useState(query.db || "");
  const [schema, setSchema] = useState<Record<string, string[]>>({});
  const [active, setActive] = useState("tab-1");
  const [tabs, setTabs] = useState([{ key: "tab-1", label: "SQL 1", sql: "SELECT 1;" }]);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (cached) setTabs(JSON.parse(cached));
    fetch(`/api/databases?connId=${connId}&all=1`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data || [];
        setDatabases(data);
        if (!db && data[0]) setDb(data[0]);
      });
  }, [connId]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tabs));
  }, [tabs, storageKey]);

  useEffect(() => {
    if (!db) return;
    fetch(`/api/schema?connId=${connId}&db=${encodeURIComponent(db)}`)
      .then((res) => res.json())
      .then((json) => setSchema(json.data || {}));
  }, [connId, db]);

  const current = tabs.find((item) => item.key === active) || tabs[0];
  const setCurrentSql = (sql: string) => setTabs((prev) => prev.map((tab) => (tab.key === active ? { ...tab, sql } : tab)));

  const execute = async () => {
    const sql = editorRef.current?.getExecutableSql() || current.sql;
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connId, db, sql })
    });
    const json = await res.json();
    setResults(json.data || []);
    if (!res.ok) message.error(json.error || "执行失败");
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <div className="toolbar">
        <Select value={db} onChange={setDb} style={{ width: 220 }} options={databases.map((name) => ({ value: name, label: name }))} />
        <Button type="primary" onClick={execute}>
          执行
        </Button>
      </div>
      <Tabs
        type="editable-card"
        activeKey={active}
        onChange={setActive}
        onEdit={(targetKey, action) => {
          if (action === "add") {
            const key = `tab-${Date.now()}`;
            setTabs((prev) => [...prev, { key, label: `SQL ${prev.length + 1}`, sql: "" }]);
            setActive(key);
          } else {
            setTabs((prev) => prev.filter((tab) => tab.key !== targetKey));
          }
        }}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          children: <SqlEditor ref={editorRef} value={tab.sql} onChange={setCurrentSql} onExecute={execute} schema={schema} minHeight={220} />
        }))}
      />
      {results.length > 0 && (
        <Tabs
          items={results.map((result, index) => ({
            key: String(index),
            label: `结果 ${index + 1}`,
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Card size="small">
                  <Space>
                    <Tag color={result.error ? "red" : "green"}>{result.error ? "失败" : "成功"}</Tag>
                    <span>{result.durationMs} ms</span>
                    {result.affectedRows !== undefined && <span>影响行数：{result.affectedRows}</span>}
                  </Space>
                  <pre style={{ marginTop: 8 }}>{result.sql}</pre>
                </Card>
                {result.error ? (
                  <Alert type="error" message={result.error} />
                ) : (
                  <Table
                    size="small"
                    rowKey={(_, i) => String(i)}
                    dataSource={result.rows}
                    scroll={{ x: "max-content" }}
                    columns={Object.keys(result.rows?.[0] || {}).map((key) => ({ title: key, dataIndex: key, render: (v: unknown) => String(v ?? "") }))}
                  />
                )}
              </Space>
            )
          }))}
        />
      )}
    </Space>
  );
}
