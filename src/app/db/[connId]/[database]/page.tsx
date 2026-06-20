import DatabaseTablesView from "@/components/DatabaseTablesView";

export default async function DatabasePage({ params }: { params: Promise<{ connId: string; database: string }> }) {
  const { connId, database } = await params;
  return <DatabaseTablesView connId={connId} database={decodeURIComponent(database)} />;
}
