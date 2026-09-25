import AppHeader from "@/components/AppHeader";
import DbSidebar from "@/components/DbSidebar";

export default async function DbLayout({ children, params }: { children: React.ReactNode; params: Promise<{ connId: string }> }) {
  const { connId } = await params;
  return (
    <>
      {/* <AppHeader /> */}
      <div style={{ display: "flex" }}>
        <DbSidebar connId={connId} />
        <section className="page-pad" style={{ flex: 1, minWidth: 0, height: "calc(100vh)", overflow: "auto" }}>
          {children}
        </section>
      </div>
    </>
  );
}
