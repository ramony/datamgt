export default function ConnectionHomePage() {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 6, padding: 20 }}>
      <h2>选择数据库或打开 SQL Console</h2>
      <p className="muted">从左侧数据库树展开表，或使用顶部工具按钮进入 SQL Console 和历史记录。</p>
    </div>
  );
}
