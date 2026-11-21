"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    employeesCount: 0,
    hotelsCount: 0,
    shiftsCount: 0,
    devicesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [resEmp, resHot, resShf, resDev] = await Promise.all([
          fetch("/api/admin/employees"),
          fetch("/api/admin/hotels"),
          fetch("/api/admin/shifts"),
          fetch("/api/admin/devices"),
        ]);
        const dEmp = await resEmp.json();
        const dHot = await resHot.json();
        const dShf = await resShf.json();
        const dDev = await resDev.json();

        setStats({
          employeesCount: dEmp.data?.total || dEmp.data?.employees?.length || 0,
          hotelsCount: dHot.data?.length || 0,
          shiftsCount: dShf.data?.length || 0,
          devicesCount: dDev.data?.length || 0,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "900" }}>لوحة تحكم النظام الرئيسية</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          متابعة حضور وبصمة موظفي الفنادق الثلاثة وإدارة الورديات والحسابات
        </p>
      </div>

      {/* بطاقات الإحصائيات السريعة */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div style={{ background: "var(--color-bg-800)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>إجمالي الموظفين</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "var(--color-primary)" }}>
            {loading ? "..." : stats.employeesCount}
          </div>
        </div>

        <div style={{ background: "var(--color-bg-800)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>الفنادق المعتمدة</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "var(--color-success)" }}>
            {loading ? "..." : stats.hotelsCount}
          </div>
        </div>

        <div style={{ background: "var(--color-bg-800)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>الورديات المعرفة</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "var(--color-warning)" }}>
            {loading ? "..." : stats.shiftsCount}
          </div>
        </div>

        <div style={{ background: "var(--color-bg-800)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>الأجهزة المرتبطة</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "#a855f7" }}>
            {loading ? "..." : stats.devicesCount}
          </div>
        </div>
      </div>

      {/* الروابط السريعة */}
      <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>الوصول السريع</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        <Link
          href="/admin/schedule"
          style={{
            background: "var(--color-bg-800)",
            border: "1px solid var(--color-border)",
            borderRadius: "10px",
            padding: "1rem",
            textDecoration: "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>📅</span>
          <div>
            <div style={{ fontWeight: "bold" }}>جدول الدوام الأسبوعي</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>توزيع الشفتات والموظفين والعطلات</div>
          </div>
        </Link>

        <Link
          href="/kiosk"
          target="_blank"
          style={{
            background: "var(--color-bg-800)",
            border: "1px solid var(--color-border)",
            borderRadius: "10px",
            padding: "1rem",
            textDecoration: "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>🖥️</span>
          <div>
            <div style={{ fontWeight: "bold" }}>شاشة البصمة (Kiosk)</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>فتح شاشة بصمة الموظفين</div>
          </div>
        </Link>

        <Link
          href="/admin/reports"
          style={{
            background: "var(--color-bg-800)",
            border: "1px solid var(--color-border)",
            borderRadius: "10px",
            padding: "1rem",
            textDecoration: "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>📊</span>
          <div>
            <div style={{ fontWeight: "bold" }}>التقارير والتصدير</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>تصدير كشوفات الحساب والدوام Excel</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
