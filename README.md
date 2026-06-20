# Web MySQL 管理工具 - 产品需求文档

一个基于浏览器的轻量级 MySQL 管理工具，类似 Navicat/DBeaver，支持本地部署，无需用户认证。

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js (App Router) | 16.x | 全栈框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式 |
| Ant Design | 6.x | UI 组件库 |
| mysql2/promise | 3.x | MySQL 连接 |
| better-sqlite3 | 12.x | 本地元数据存储 |
| CodeMirror 6 | - | SQL 编辑器 |
| @faker-js/faker | 10.x | 测试数据生成 |
| exceljs | 4.x | Excel 导入导出 |
| papaparse | 5.x | CSV 解析 |
| crypto-js | 4.x | 密码加密存储 |

---

## 项目结构
```
datamgt/
├── src/
│   ├── app/
│   │   ├── layout.tsx                         # 全局布局
│   │   ├── page.tsx                           # 首页（重定向到连接管理）
│   │   ├── connections/page.tsx               # 连接管理
│   │   ├── db/[connId]/
│   │   │   ├── layout.tsx                     # 侧边栏 + 数据库树
│   │   │   ├── page.tsx                       # 连接首页
│   │   │   ├── [database]/
│   │   │   │   ├── page.tsx                   # 数据库首页
│   │   │   │   └── [table]/
│   │   │   │       ├── page.tsx               # 表数据查看与编辑（核心页面）
│   │   │   │       ├── structure/page.tsx     # 表结构详情
│   │   │   │       ├── generate/page.tsx      # Faker 数据生成
│   │   │   │       └── import-export/page.tsx # 导入
│   │   │   ├── sql/page.tsx                   # SQL Console
│   │   │   └── history/page.tsx               # SQL 执行历史
│   │   └── api/
│   │       ├── connections/                   # 连接 CRUD + 测试
│   │       ├── databases/route.ts             # 数据库列表
│   │       ├── tables/route.ts                # 表列表
│   │       ├── tables/[table]/
│   │       │   ├── structure/route.ts         # 表结构
│   │       │   ├── data/route.ts              # 分页数据查询
│   │       │   ├── rows/route.ts              # 行 CRUD
│   │       │   └── fk-options/route.ts        # 外键下拉选项
│   │       ├── query/route.ts                 # 通用 SQL 执行
│   │       ├── schema/route.ts                # 表/列 Schema（用于自动补全）
│   │       ├── export/route.ts                # 导出
│   │       ├── import/route.ts                # 导入
│   │       ├── generate/route.ts              # 数据生成
│   │       ├── faker-templates/route.ts       # 生成规则模板
│   │       └── history/                       # SQL 历史 + 回滚
│   ├── components/
│   │   └── sql-editor/SqlEditor.tsx           # CodeMirror SQL 编辑器组件
│   └── lib/
│       ├── db/
│       │   ├── sqlite.ts                      # SQLite 单例
│       │   ├── schema.sql                     # 元数据表 DDL
│       │   └── mysql-pool.ts                  # MySQL 连接池管理
│       ├── services/
│       │   ├── connection.ts                  # 连接管理服务
│       │   └── history.ts                     # SQL 历史记录服务
│       └── utils/
│           └── crypto.ts                      # AES 加解密
├── data/                                      # SQLite 数据库文件目录（运行时生成）
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 功能模块详细设计

### 1. 连接管理 (/connections)

- 支持多个 MySQL 连接配置
- 表单字段：连接名称、Host、Port、用户名、密码、默认数据库（可选）、颜色标记
- 密码使用 AES 加密后存储到 SQLite（密钥从环境变量 ENCRYPTION_KEY 读取）
- 「测试连接」按钮验证连通性
- 连接列表支持复制连接、删除
- 点击连接名进入数据库浏览

### 2. 数据库浏览 - 侧边栏 (/db/[connId])

**布局：**
- 左侧可拖拽调整宽度的侧边栏（180px-500px）
- 顶部：连接切换下拉框 + 工具栏（刷新、SQL Console、历史记录）
- 中间：搜索框 + 数据库/表树形结构

**功能：**
- 异步加载：展开数据库节点时加载该库的表列表
- 每个表显示估算行数和备注
- 搜索框实时过滤表名（关键词匹配时自动展开所属数据库）
- 右键菜单：复制表名、刷新
- 当表数据变化时（增删改），自动刷新对应表的行数显示（通过 CustomEvent("table-data-changed") 实现跨组件通信）
- 如果连接配置了默认数据库，默认只显示该库；提供「显示所有数据库」切换

### 3. 表数据查看与编辑 (/db/[connId]/[database]/[table])

这是核心页面，功能最复杂。

**工具栏按钮：**
- 保存修改 / 撤销（有修改时显示）
- 新增行
- 批量编辑 / 删除（选中行时显示）
- 筛选
- 导出（下拉：SQL / JSON / CSV / XLSX）
- 导入
- 生成数据
- 表结构（显示 CREATE TABLE 语句）

**SQL 栏：**
- 页面顶部嵌入一个 CodeMirror SQL 编辑器，显示当前查询 SQL
- 支持表名、字段名智能补全
- 可手动修改 SQL 后点击「执行」按钮运行自定义查询
- 自定义查询结果自动分页（用 COUNT 子查询计算总数 + LIMIT/OFFSET 分页）

**数据表格：**
- 默认按 id DESC 排序（如果表有 id 字段）
- 分页：默认 50 行/页，可选 20/50/100/200/500
- 点击列头排序（升序/降序/取消）
- 双击单元格进入编辑模式，修改后单元格标记黄色背景
- 日期格式化显示：date 类型显示 YYYY-MM-DD，datetime/timestamp 显示 YYYY-MM-DD HH:mm:ss
- 选中多行可批量编辑指定列的值或批量删除

**筛选面板（Modal）：**
- 支持操作符：=, !=, >, <, >=, <=, LIKE, IN, IS NULL, IS NOT NULL
- 可添加多个条件（AND 组合）
- 筛选后 SQL 栏自动更新 WHERE 条件

**导出：**
- 格式：SQL（INSERT 语句，每 20 行一批）、JSON、CSV、XLSX
- 导出范围：当前查询条件匹配的全部数据（非仅当前页）
- 自定义 SQL 模式下按自定义 SQL 条件导出（去掉 LIMIT）
- SQL 导出时 date 类型输出 'YYYY-MM-DD' 格式，datetime 用本地时间格式化

**表结构按钮：**
- 点击后调用 SHOW CREATE TABLE 获取建表语句
- 以 Modal 弹窗展示 DDL

### 4. 表结构详情 (/db/[connId]/[database]/[table]/structure)

- 以表格展示列信息：列名、类型、是否 NULL、默认值、主键标记、注释
- 展示索引信息
- 展示外键信息

### 5. SQL Console (/db/[connId]/sql)

**编辑器：**
- 基于 CodeMirror 6，支持 MySQL 语法高亮
- 表名/字段名智能补全（从 /api/schema 获取当前数据库的所有表和字段）
- 多 Tab 管理，每个 Tab 独立的 SQL 内容
- Tab 内容自动缓存到 localStorage（按连接 ID 隔离）

**执行：**
- 支持执行选中的 SQL；未选中则执行全部
- 支持多条 SQL 以分号分隔，依次执行
- 快捷键 Ctrl+Enter / Cmd+Enter 执行
- 顶部可切换目标数据库
- URL 参数 ?db=xxx 自动选中数据库

**结果展示：**
- 单条 SQL：直接展示结果表格
- 多条 SQL：每条结果用独立 Tab 展示
- 显示执行耗时、影响行数
- 错误以红色提示

### 6. 导入 (/db/[connId]/[database]/[table]/import-export)

- 支持上传 Excel/CSV/JSON 文件
- 预览前 10 行数据
- 列映射：源列 → 目标表列（自动匹配同名列 + 手动调整）
- 冲突策略：忽略 / REPLACE / ON DUPLICATE KEY UPDATE
- 显示导入结果：成功行数、失败行数、错误详情

### 7. Faker 数据生成 (/db/[connId]/[database]/[table]/generate)

- 根据表结构自动推荐 Faker 方法（如 email 列 → faker.internet.email）
- 每列可配置生成策略：
  - Faker 方法（按分类分组选择：人物、网络、地址、电话、公司、文本、数字、日期等）
  - 固定值
  - 自定义表达式
  - 从外键关联表随机抽取
  - NULL（可设置概率）
- 配置生成数量
- 点击预览可查看示例数据
- 生成规则可保存为模板（存 SQLite），下次直接加载

### 8. SQL 历史 (/db/[connId]/history)

- 记录所有执行过的 SQL：时间、SQL 文本、耗时、影响行数、状态（成功/失败）
- 支持搜索和时间筛选
- 对于 DML 操作自动生成回滚 SQL（DELETE → INSERT, UPDATE → UPDATE 回原值）
- 可一键执行回滚

---

## 本地元数据存储（SQLite）

使用 better-sqlite3 在本地 data/meta.db 存储以下数据：
```
sql
-- 连接配置
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER DEFAULT 3306,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  default_database TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- SQL 执行历史
CREATE TABLE IF NOT EXISTS sql_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id TEXT NOT NULL,
  database_name TEXT,
  sql_text TEXT NOT NULL,
  rollback_sql TEXT,
  duration_ms INTEGER,
  affected_rows INTEGER,
  status TEXT CHECK(status IN ('success', 'error')),
  error_message TEXT,
  executed_at TEXT DEFAULT (datetime('now'))
);

-- Faker 生成规则模板
CREATE TABLE IF NOT EXISTS faker_templates (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## API 设计

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/connections | 获取所有连接 |
| POST | /api/connections | 新增连接 |
| PUT | /api/connections/[id] | 更新连接 |
| DELETE | /api/connections/[id] | 删除连接 |
| POST | /api/connections/[id]/test | 测试连接 |
| GET | /api/databases?connId= | 获取数据库列表 |
| GET | /api/tables?connId=&db= | 获取表列表（含行数、备注） |
| GET | /api/tables/[table]/structure?connId=&db= | 表结构（列、外键） |
| GET | /api/tables/[table]/data?connId=&db=&page=&pageSize=&sortField=&sortOrder= | 分页查询数据 |
| POST | /api/tables/[table]/rows | 新增行 |
| PUT | /api/tables/[table]/rows | 更新行 |
| DELETE | /api/tables/[table]/rows | 删除行 |
| GET | /api/tables/[table]/fk-options?connId=&db=&column= | 外键下拉数据 |
| POST | /api/query | 执行任意 SQL |
| GET | /api/schema?connId=&db= | 获取 Schema（用于编辑器自动补全） |
| POST | /api/export | 导出数据 |
| POST | /api/import | 导入数据 |
| POST | /api/generate | 生成测试数据 |
| GET/POST | /api/faker-templates | 生成规则模板 CRUD |
| GET | /api/history?connId= | SQL 历史列表 |
| POST | /api/history/[id]/rollback | 执行回滚 SQL |

---

## MySQL 连接池管理
```
typescript
// 关键配置
mysql.createPool({
  host, port, user, password, database,
  waitForConnections: true,
  connectionLimit: 5,
  timezone: "+08:00",        // 统一使用中国时区
  dateStrings: ["DATE"],     // date 类型直接返回字符串，避免时区转换
});
```

- 连接池按 connectionId:database 为 key 缓存
- 密码从 SQLite 读取后解密使用

---

## SQL 编辑器组件

基于 CodeMirror 6 封装的 React 组件，特性：

- 使用 @codemirror/lang-sql 的 MySQL dialect
- schema prop 传入 {tableName: [columnNames]} 实现表名/字段名自动补全
- forwardRef + useImperativeHandle 暴露 getExecutableSql() 方法（获取选中文本或全部文本）
- propsRef 模式避免闭包过期问题
- Ctrl+Enter / Cmd+Enter 快捷键执行
- schema 变更时重建编辑器实例，value 变更时仅 dispatch 更新（避免光标跳动）

---

## 时区处理

所有环境统一使用中国时区：

- package.json dev 脚本：TZ=Asia/Shanghai next dev
- Dockerfile：ENV TZ=Asia/Shanghai
- docker-compose.yml：environment: TZ=Asia/Shanghai
- MySQL 连接池：timezone: "+08:00"
- date 类型：mysql2 配置 dateStrings: ["DATE"] 直接返回 YYYY-MM-DD 字符串
- datetime/timestamp：前端渲染时格式化为 YYYY-MM-DD HH:mm:ss

---

## 跨组件通信

使用浏览器原生 CustomEvent 实现：
```
typescript
// 发送：表数据变化时
window.dispatchEvent(new CustomEvent("table-data-changed", { detail: { database } }));

// 监听：侧边栏刷新表行数
window.addEventListener("table-data-changed", handler);
```

---

## 部署

### 开发环境
```
bash
npm install
npm run dev    # 默认 http://localhost:3000
```

### Docker 部署
```
bash
docker-compose up -d    # 映射端口 3308:3000
```

- 数据目录 ./data 挂载到容器内 /app/data（持久化 SQLite）
- 环境变量 ENCRYPTION_KEY 用于密码加密

### next.config.ts
```
typescript
const nextConfig: NextConfig = {
  output: "standalone",                    // Docker 优化
  serverExternalPackages: ["better-sqlite3"], // 原生模块排除
};
```

---

## 实现顺序建议

1. **基础框架**：初始化 Next.js + Tailwind + Ant Design，配置 SQLite + 加密工具
2. **连接管理**：CRUD 页面 + 测试连接 + MySQL 连接池
3. **数据库浏览**：侧边栏布局 + 数据库/表树 + 搜索过滤
4. **表数据查看**：分页查询 + 排序 + 筛选 + 日期格式化
5. **行内编辑**：双击编辑 + 修改标记 + 保存/撤销 + 新增/删除
6. **SQL Console**：CodeMirror 编辑器 + 多 Tab + 执行 + 智能补全
7. **导入导出**：四种格式导出 + 文件导入 + 列映射
8. **数据生成**：Faker 配置 UI + 自动推荐 + 模板保存
9. **SQL 历史**：记录 + 搜索 + 回滚
10. **优化完善**：自定义 SQL 分页、表结构展示、时区统一、Docker 部署
