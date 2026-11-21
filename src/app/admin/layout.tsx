import AdminSidebar from "@/app/admin/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-900)", direction: "rtl" }}>
      <AdminSidebar />
      <main style={{ marginRight: "240px", flex: 1, padding: "2rem", minWidth: 0, color: "var(--color-text-primary)" }}>
        {children}
      </main>
    </div>
  );
}
