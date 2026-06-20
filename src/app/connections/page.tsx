"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, ColorPicker, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, message } from "antd";
import { CopyOutlined, DatabaseOutlined, DeleteOutlined, EditOutlined, LoginOutlined, PlusOutlined } from "@ant-design/icons";
import AppHeader from "@/components/AppHeader";
import type { ConnectionRecord } from "@/lib/types";

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectionRecord | null>(null);
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await fetch("/api/connections");
    setConnections((await res.json()).data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    const body = { ...values, color: typeof values.color === "string" ? values.color : values.color?.toHexString?.() };
    const res = await fetch(editing ? `/api/connections/${editing.id}` : "/api/connections", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error((await res.json()).error || "保存失败");
    setOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const testCurrentForm = async () => {
    const values = await form.validateFields(["host", "port", "username", "password", "default_database"]);
    setTesting(true);
    try {
      const useSavedPassword = editing && !values.password;
      const res = await fetch(useSavedPassword ? `/api/connections/${editing.id}/test` : "/api/connections/test", {
        method: "POST",
        headers: useSavedPassword ? undefined : { "Content-Type": "application/json" },
        body: useSavedPassword ? undefined : JSON.stringify(values)
      });
      if (res.ok) message.success("连接成功");
      else message.error((await res.json()).error || "连接失败");
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="page-pad">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <div>
              <h1 style={{ margin: 0 }}>连接管理</h1>
              <div className="muted">保存并测试你的 MySQL 连接配置。</div>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                form.setFieldsValue({ port: 3306, color: "#1769aa" });
                setOpen(true);
              }}
            >
              新建连接
            </Button>
          </div>
          <Card>
            <Table
              rowKey="id"
              dataSource={connections}
              columns={[
                {
                  title: "名称",
                  dataIndex: "name",
                  render: (value, record) => (
                    <Link href={`/db/${record.id}`}>
                      <Space>
                        <DatabaseOutlined style={{ color: record.color || "#1769aa" }} />
                        <strong>{value}</strong>
                      </Space>
                    </Link>
                  )
                },
                { title: "Host", dataIndex: "host" },
                { title: "Port", dataIndex: "port" },
                { title: "用户", dataIndex: "username" },
                { title: "默认库", dataIndex: "default_database", render: (v) => (v ? <Tag>{v}</Tag> : <span className="muted">未设置</span>) },
                {
                  title: "操作",
                  render: (_, record) => (
                    <Space>
                      <Link href={`/db/${record.id}`}>
                        <Button type="primary" icon={<LoginOutlined />}>
                          进入
                        </Button>
                      </Link>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditing(record);
                          form.setFieldsValue({ ...record, password: undefined });
                          setOpen(true);
                        }}
                      />
                      <Button
                        icon={<CopyOutlined />}
                        onClick={() => {
                          setEditing(null);
                          form.setFieldsValue({ ...record, name: `${record.name} Copy`, password: "" });
                          setOpen(true);
                        }}
                      />
                      <Popconfirm
                        title="删除连接？"
                        onConfirm={async () => {
                          await fetch(`/api/connections/${record.id}`, { method: "DELETE" });
                          load();
                        }}
                      >
                        <Button danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </Space>
      </div>
      <Modal
        open={open}
        title={editing ? "编辑连接" : "新建连接"}
        onCancel={() => setOpen(false)}
        width={640}
        footer={[
          <Button key="test" loading={testing} onClick={testCurrentForm}>
            测试连接
          </Button>,
          <Button key="cancel" onClick={() => setOpen(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={submit}>
            保存
          </Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="连接名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: "100%" }} align="start">
            <Form.Item name="host" label="Host" rules={[{ required: true }]}>
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item name="port" label="Port" rules={[{ required: true }]}>
              <InputNumber min={1} max={65535} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: !editing }]}>
            <Input.Password placeholder={editing ? "留空则保持不变" : ""} />
          </Form.Item>
          <Form.Item name="default_database" label="默认数据库">
            <Input />
          </Form.Item>
          <Form.Item name="color" label="颜色标记">
            <ColorPicker />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
