import DataTableView from "@/components/DataTableView";

export default async function TablePage({ params }: { params: Promise<{ connId: string; database: string; table: string }> }) {
  const { connId, database, table } = await params;
  return <DataTableView connId={connId} database={decodeURIComponent(database)} table={decodeURIComponent(table)} />;
}
