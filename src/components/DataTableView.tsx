"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Dropdown, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, DownloadOutlined, EditOutlined, FilterOutlined, PlusOutlined, SaveOutlined, UndoOutlined } from "@ant-design/icons";
import SqlEditor, { SqlEditorRef } from "@/components/sql-editor/SqlEditor";

type Row = Record<string, unknown> & { __key?: string };
type Column = { Field: string; Type: string; Key: string; Extra: string };

function display(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
  return String(value);
}

export default function DataTableView({ connId, database, table }: { connId: string; database: string; table: string }) {
  const editorRef = useRef<SqlEditorRef>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [schema, setSchema] = useState<Record<string, string[]>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sort, setSort] = useState<{ field?: string; order?: string }>({});
  const [sqlText, setSqlText] = useState(`SELECT * FROM \`${database}\`.\`${table}\``);
  const [customSql, setCustomSql] = useState("");
  const [edits, setEdits] = useState<Record<string, Record<string, unknown>>>({});
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [ddl, setDdl] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);

  const pk = useMemo(() => columns.filter((col) => col.Key === "PRI").map((col) => col.Field), [columns]);

  const rowKey = (row: Row, index?: number) => {
    if (pk.length) return pk.map((key) => String(row[key])).join("|");
    return String(index ?? 0);
  };

  const loadStructure = async () => {
    const res = await fetch(`/api/tables/${encodeURIComponent(table)}/structure?connId=${connId}&db=${encodeURIComponent(database)}`);
    const data = (await res.json()).data;
    setColumns(data?.columns || []);
    setDdl(data?.createTable || "");
  };

  const loadSchema = async () => {
    const res = await fetch(`/api/schema?connId=${connId}&db=${encodeURIComponent(database)}`);
    setSchema((await res.json()).data || {});
  };

  const loadData = async (nextPage = page, nextPageSize = pageSize, filters?: unknown[]) => {
    const params = new URLSearchParams({ connId, db: database, page: String(nextPage), pageSize: String(nextPageSize) });
    if (sort.field && sort.order) {
      params.set("sortField", sort.field);
      params.set("sortOrder", sort.order);
    }
    if (customSql) params.set("sql", customSql);
    if (filters) params.set("filters", JSON.stringify(filters));
    const res = await fetch(`/api/tables/${encodeURIComponent(table)}/data?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      message.error(json.error || "加载失败");
      return;
    }
    setRows((json.data.rows || []).map((row: Row, i: number) => ({ ...row, __key: rowKey(row, i) })));
    setTotal(json.data.total || 0);
    setSqlText(json.data.sql || sqlText);
  };

  useEffect(() => {
    loadStructure();
    loadSchema();
  }, [connId, database, table]);

  useEffect(() => {
    loadData();
  }, [sort, customSql]);

  const saveEdits = async () => {
    const payload = Object.entries(edits).map(([key, values]) => {
      const row = rows.find((item) => item.__key === key);
      const keys: Record<string, unknown> = {};
      pk.forEach((name) => (keys[name] = row?.[name]));
      return { keys, values };
    });
    const res = await fetch(`/api/tables/${encodeURIComponent(table)}/rows`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connId, db: database, rows: payload })
    });
    if (res.ok) {
      setEdits({});
      message.success("已保存修改");
      window.dispatchEvent(new CustomEvent("table-data-changed", { detail: { database } }));
      loadData();
    } else {
      message.error((await res.json()).error || "保存失败");
    }
  };

  const addRow = async () => {
    const row: Record<string, unknown> = {};
    columns.filter((col) => !col.Extra.includes("auto_increment")).forEach((col) => (row[col.Field] = null));
    Modal.confirm({
      title: "新增行",
      width: 760,
      content: (
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 8 }}>
          <RowForm columns={columns} row={row} onChange={(values) => Object.assign(row, values)} />
        </div>
      ),
      onOk: async () => {
        const res = await fetch(`/api/tables/${encodeURIComponent(table)}/rows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connId, db: database, row })
        });
        if (!res.ok) throw new Error((await res.json()).error || "新增失败");
        window.dispatchEvent(new CustomEvent("table-data-changed", { detail: { database } }));
        loadData();
      }
    });
  };

  const deleteRows = async () => {
    const keys = rows
      .filter((row) => selectedKeys.includes(row.__key || ""))
      .map((row) => Object.fromEntries(pk.map((name) => [name, row[name]])));
    const res = await fetch(`/api/tables/${encodeURIComponent(table)}/rows`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connId, db: database, keys })
    });
    if (res.ok) {
      setSelectedKeys([]);
      window.dispatchEvent(new CustomEvent("table-data-changed", { detail: { database } }));
      loadData();
    }
  };

  const antColumns: ColumnsType<Row> = columns.map((column) => ({
    title: column.Field,
    dataIndex: column.Field,
    sorter: true,
    ellipsis: true,
    onCell: (record) => ({
      onDoubleClick: () => {
        const nextValue = window.prompt(`编辑 ${column.Field}`, display(edits[record.__key || ""]?.[column.Field] ?? record[column.Field]));
        if (nextValue !== null) {
          setEdits((prev) => ({ ...prev, [record.__key || ""]: { ...(prev[record.__key || ""] || {}), [column.Field]: nextValue } }));
        }
      },
      className: edits[record.__key || ""]?.[column.Field] !== undefined ? "edited-cell" : ""
    }),
    render: (value, record) => <span title={display(edits[record.__key || ""]?.[column.Field] ?? value)}>{display(edits[record.__key || ""]?.[column.Field] ?? value)}</span>
  }));

  const runCustomSql = () => {
    const sql = editorRef.current?.getExecutableSql() || sqlText;
    setCustomSql(sql);
    setPage(1);
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <div className="toolbar">
        {Object.keys(edits).length > 0 && (
          <>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveEdits}>
              保存修改
            </Button>
            <Button icon={<UndoOutlined />} onClick={() => setEdits({})}>
              撤销
            </Button>
          </>
        )}
        <Button icon={<PlusOutlined />} onClick={addRow}>
          新增行
        </Button>
        {selectedKeys.length > 0 && (
          <>
            <Button icon={<EditOutlined />} onClick={() => setBatchOpen(true)}>
              批量编辑
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={deleteRows}>
              删除
            </Button>
          </>
        )}
        <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}>
          筛选
        </Button>
        <Dropdown
          menu={{
            items: ["sql", "json", "csv", "xlsx"].map((format) => ({ key: format, label: format.toUpperCase() })),
            onClick: ({ key }) => {
              fetch("/api/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connId, db: database, table, sql: customSql || sqlText, format: key })
              })
                .then((res) => res.blob())
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${table}.${key}`;
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }
          }}
        >
          <Button icon={<DownloadOutlined />}>导出</Button>
        </Dropdown>
        <Link href={`/db/${connId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/import-export`}>
          <Button>导入</Button>
        </Link>
        <Link href={`/db/${connId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/generate`}>
          <Button>生成数据</Button>
        </Link>
        <Link href={`/db/${connId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/structure`}>
          <Button>表结构</Button>
        </Link>
        <Button onClick={() => Modal.info({ title: "CREATE TABLE", width: 820, content: <pre className="code-block">{ddl}</pre> })}>DDL</Button>
      </div>
      <Tabs
        items={[
          {
            key: "sql",
            label: "SQL",
            children: (
              <Space orientation="vertical" style={{ width: "100%" }}>
                <SqlEditor ref={editorRef} value={sqlText} onChange={setSqlText} onExecute={runCustomSql} schema={schema} />
                <Button type="primary" onClick={runCustomSql}>
                  执行
                </Button>
              </Space>
            )
          }
        ]}
      />
      <Table
        size="small"
        rowKey="__key"
        tableLayout="fixed"
        scroll={{ x: "max-content", y: "calc(100vh - 355px)" }}

        columns={antColumns}
        dataSource={rows}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100, 200, 500],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
            loadData(p, ps);
          }
        }}
        onChange={(_p, _f, sorter) => {
          const one = Array.isArray(sorter) ? sorter[0] : sorter;
          setSort({ field: String(one.field || ""), order: one.order || undefined });
        }}
      />
      <FilterModal open={filterOpen} columns={columns} onCancel={() => setFilterOpen(false)} onApply={(filters) => { setFilterOpen(false); loadData(1, pageSize, filters); }} />
      <BatchModal
        open={batchOpen}
        columns={columns}
        onCancel={() => setBatchOpen(false)}
        onApply={(column, value) => {
          const next = { ...edits };
          selectedKeys.forEach((key) => (next[String(key)] = { ...(next[String(key)] || {}), [column]: value }));
          setEdits(next);
          setBatchOpen(false);
        }}
      />
    </Space>
  );
}

function RowForm({ columns, row, onChange }: { columns: Column[]; row: Record<string, unknown>; onChange: (row: Record<string, unknown>) => void }) {
  return (
    <Form layout="vertical" initialValues={row} onValuesChange={(_, values) => onChange(values)}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0 12px" }}>
        {columns.filter((col) => !col.Extra.includes("auto_increment")).map((col) => (
          <Form.Item key={col.Field} name={col.Field} label={`${col.Field} (${col.Type})`}>
            <Input />
          </Form.Item>
        ))}
      </div>
    </Form>
  );
}

function FilterModal({ open, columns, onCancel, onApply }: { open: boolean; columns: Column[]; onCancel: () => void; onApply: (filters: unknown[]) => void }) {
  const [form] = Form.useForm();
  return (
    <Modal open={open} title="筛选" onCancel={onCancel} onOk={() => onApply(form.getFieldValue("filters") || [])}>
      <Form form={form} initialValues={{ filters: [{ operator: "=", value: "" }] }}>
        <Form.List name="filters">
          {(fields, { add, remove }) => (
            <Space orientation="vertical" style={{ width: "100%" }}>
              {fields.map((field) => (
                <Space key={field.key}>
                  <Form.Item name={[field.name, "column"]} noStyle>
                    <Select style={{ width: 150 }} options={columns.map((c) => ({ value: c.Field, label: c.Field }))} />
                  </Form.Item>
                  <Form.Item name={[field.name, "operator"]} noStyle>
                    <Select style={{ width: 120 }} options={["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN", "IS NULL", "IS NOT NULL"].map((op) => ({ value: op, label: op }))} />
                  </Form.Item>
                  <Form.Item name={[field.name, "value"]} noStyle>
                    <Input style={{ width: 180 }} />
                  </Form.Item>
                  <Button onClick={() => remove(field.name)}>删除</Button>
                </Space>
              ))}
              <Button onClick={() => add({ operator: "=" })}>添加条件</Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

function BatchModal({ open, columns, onCancel, onApply }: { open: boolean; columns: Column[]; onCancel: () => void; onApply: (column: string, value: unknown) => void }) {
  const [column, setColumn] = useState("");
  const [value, setValue] = useState("");
  return (
    <Modal open={open} title="批量编辑" onCancel={onCancel} onOk={() => onApply(column, value)}>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Select style={{ width: "100%" }} placeholder="选择列" options={columns.map((c) => ({ value: c.Field, label: c.Field }))} onChange={setColumn} />
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="新值" />
        <InputNumber style={{ display: "none" }} />
      </Space>
    </Modal>
  );
}
