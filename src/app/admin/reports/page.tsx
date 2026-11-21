"use client";

import { useEffect, useState } from "react";

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false);

  const handleExportExcel = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/api/admin/reports/excel");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير_الدوام_والحسابات_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("حدث خطأ أثناء تصدير التقرير");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>التقارير والتصدير</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          استخراج وتصدير كشوفات الحضور، بصمات الموظفين، مستحقات الدبل، والتأخيرات بصيغة Excel
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        <div style={{ background: "var(--color-bg-800)", border: "1px solid var(--color-border)", borderRadius: "14px", padding: "1.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📊</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>تقرير الحضور والحسابات الشامل (Excel)</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
              ملف متكامل يحتوي على أوراق عمل متعددة: سجل البصمات، مستحقات الدبل، مطالبات التأخير، والأرصدة الصافية مع دعم كامل للغة العربية والـ RTL.
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            style={{
              marginTop: "1.5rem",
              background: "var(--color-success)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.25rem",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <span>📥</span>
            <span>{downloading ? "جاري التوليد والتحميل..." : "تصدير بصيغة Excel (.xlsx)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
