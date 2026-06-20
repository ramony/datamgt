"use client";

import { use, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Space, Table, message } from "antd";

const methods = [
  "person.fullName",
  "internet.email",
  "internet.url",
  "location.streetAddress",
  "phone.number",
  "company.name",
  "lorem.sentence",
  "number.int",
  "date.recent",
  "string.uuid"
];

function recommend(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("email")) return "internet.email";
  if (lower.includes("name")) return "person.fullName";
  if (lower.includes("phone") || lower.includes("mobile")) return "phone.number";
  if (lower.includes("address")) return "location.streetAddress";
  if (lower.includes("company")) return "company.name";
  if (lower.includes("uuid")) return "string.uuid";
  return "lorem.sentence";
}

export default function GeneratePage({ params }: { params: Promise<{ connId: string; database: string; table: string }> }) {
  const raw = use(params);
  const connId = raw.connId;
  const database = decodeURIComponent(raw.database);
  const table = decodeURIComponent(raw.table);
  const [columns, setColumns] = useState<Array<{ Field: string; Type: string; Extra: string }>>([]);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch(`/api/tables/${encodeURIComponent(table)}/structure?connId=${connId}&db=${encodeURIComponent(database)}`)
      .then((res) => res.json())
      .then((json) => {
        const cols = (json.data?.columns || []).filter((col: { Extra: string }) => !col.Extra.includes("auto_increment"));
        setColumns(cols);
        form.setFieldsValue({
          count: 10,
          config: Object.fromEntries(cols.map((col: { Field: string }) => [col.Field, { type: "faker", method: recommend(col.Field) }]))
        });
      });
  }, [connId, database, table, form]);

  const submit = async (isPreview: boolean) => {
    const values = await form.validateFields();
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connId, db: database, table, ...values, preview: isPreview })
    });
    const json = await res.json();
    if (isPreview) setPreview(json.data || []);
    else {
      message.success(`已生成 ${json.data?.inserted || 0} 行`);
      window.dispatchEvent(new CustomEvent("table-data-changed", { detail: { database } }));
    }
  };

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size={14}>
      <h2>生成数据：{table}</h2>
      <Card>
        <Form form={form} layout="vertical">
          <Form.Item name="count" label="生成数量">
            <InputNumber min={1} max={10000} />
          </Form.Item>
          {columns.map((column) => (
            <Card key={column.Field} size="small" title={`${column.Field} (${column.Type})`} style={{ marginBottom: 10 }}>
              <Space align="start">
                <Form.Item name={["config", column.Field, "type"]} label="策略">
                  <Select style={{ width: 130 }} options={[{ value: "faker", label: "Faker" }, { value: "fixed", label: "固定值" }, { value: "expression", label: "表达式" }]} />
                </Form.Item>
                <Form.Item name={["config", column.Field, "method"]} label="Faker 方法">
                  <Select style={{ width: 220 }} options={methods.map((method) => ({ value: method, label: method }))} />
                </Form.Item>
                <Form.Item name={["config", column.Field, "value"]} label="值 / 表达式">
                  <Input style={{ width: 220 }} placeholder="now 或 uuid" />
                </Form.Item>
                <Form.Item name={["config", column.Field, "nullRate"]} label="NULL 概率">
                  <InputNumber min={0} max={1} step={0.05} />
                </Form.Item>
              </Space>
            </Card>
          ))}
          <Space>
            <Button onClick={() => submit(true)}>预览</Button>
            <Button type="primary" onClick={() => submit(false)}>
              生成并插入
            </Button>
          </Space>
        </Form>
      </Card>
      {preview.length > 0 && <Table size="small" dataSource={preview} columns={Object.keys(preview[0]).map((key) => ({ title: key, dataIndex: key, render: (v: unknown) => String(v ?? "") }))} />}
    </Space>
  );
}
