"use client";

import { use, useEffect, useState } from "react";
import { Button, Card, Form, Select, Space, Table, Upload, message } from "antd";
import type { UploadFile } from "antd/es/upload/interface";

export default function ImportExportPage({ params }: { params: Promise<{ connId: string; database: string; table: string }> }) {
  const raw = use(params);
  const connId = raw.connId;
  const database = decodeURIComponent(raw.database);
  const table = decodeURIComponent(raw.table);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch(`/api/tables/${encodeURIComponent(table)}/structure?connId=${connId}&db=${encodeURIComponent(database)}`)
      .then((res) => res.json())
      .then((json) => setColumns((json.data?.columns || []).map((col: { Field: string }) => col.Field)));
  }, [connId, database, table]);

  const submit = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.warning("请选择文件");
      return;
    }
    const fd = new FormData();
    fd.set("connId", connId);
    fd.set("db", database);
    fd.set("table", table);
    fd.set("strategy", form.getFieldValue("strategy") || "ignore");
    fd.set("mapping", JSON.stringify(form.getFieldValue("mapping") || {}));
    fd.set("file", file);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const json = await res.json();
    setResult(json.data || json);
    if (res.ok) message.success("导入完成");
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={14}>
      <h2>导入 {table}</h2>
      <Card>
        <Form form={form} layout="vertical" initialValues={{ strategy: "ignore" }}>
          <Form.Item label="文件">
            <Upload beforeUpload={() => false} fileList={fileList} onChange={({ fileList }) => setFileList(fileList.slice(-1))}>
              <Button>选择 Excel / CSV / JSON</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="strategy" label="冲突策略">
            <Select
              options={[
                { value: "ignore", label: "忽略" },
                { value: "replace", label: "REPLACE" },
                { value: "update", label: "ON DUPLICATE KEY UPDATE" }
              ]}
            />
          </Form.Item>
          <Card size="small" title="列映射">
            {columns.map((column) => (
              <Form.Item key={column} label={column} name={["mapping", column]}>
                <Select allowClear options={columns.map((target) => ({ value: target, label: target }))} placeholder="默认同名匹配" />
              </Form.Item>
            ))}
          </Card>
          <Button type="primary" onClick={submit} style={{ marginTop: 12 }}>
            开始导入
          </Button>
        </Form>
      </Card>
      {result && (
        <Card title="导入结果">
          <p>成功：{String(result.success || 0)}，失败：{String(result.failed || 0)}</p>
          <Table size="small" dataSource={(result.preview as object[]) || []} columns={Object.keys(((result.preview as object[]) || [])[0] || {}).map((key) => ({ title: key, dataIndex: key }))} />
        </Card>
      )}
    </Space>
  );
}
