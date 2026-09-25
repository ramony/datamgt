"use client";

import { Card } from "antd";
import { DatabaseOutlined } from "@ant-design/icons";


export default function ConnectionHomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="text-center" style={{ width: 400 }}>
        <DatabaseOutlined className="text-4xl text-blue-500" />
        <p className="text-gray-500">请从左侧数据库树中选择一个数据库或者表</p>
      </Card>
    </div>
  );
}
