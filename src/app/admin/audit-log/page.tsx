"use client";

import { useEffect, useState } from "react";

interface AuditItem {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  reason?: string | null;
  performed_by: string;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/audit-log");
        const data = await res.json();
        if (data.success) setLogs(data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>سجل التدقيق الأمني (Audit Log)</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          سجل غير قابل للحذف أو التعديل (Append-Only) لتوثيق جميع العمليات، الأسباب، والمنفّذين
        </p>
      </div>

      <div style={{ background: "var(--color-bg-800)", borderRadius: "12px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}>
              <th style={{ padding: "0.875rem 1rem" }}>الوقت والتاريخ</th>
              <th style={{ padding: "0.875rem 1rem" }}>الجدول المستهدف</th>
              <th style={{ padding: "0.875rem 1rem" }}>نوع الإجراء</th>
              <th style={{ padding: "0.875rem 1rem" }}>المنفّذ</th>
              <th style={{ padding: "0.875rem 1rem" }}>السبب الإلزامي المدخل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>جاري التحميل...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>لا توجد سجلات تدقيق حتى الآن</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--color-border)", fontSize: "0.85rem" }}>
                  <td style={{ padding: "0.875rem 1rem", color: "var(--color-text-secondary)" }}>
                    {new Date(log.created_at).toLocaleString("ar-JO", { timeZone: "Asia/Amman" })}
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontFamily: "monospace", color: "#38bdf8" }}>{log.table_name}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      fontSize: "0.75rem",
                      background: log.action === "CREATE" ? "rgba(16,185,129,0.15)" : log.action === "UPDATE" ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)",
                      color: log.action === "CREATE" ? "var(--color-success)" : log.action === "UPDATE" ? "var(--color-primary)" : "var(--color-danger)"
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>{log.performed_by}</td>
                  <td style={{ padding: "0.875rem 1rem", color: "#e2e8f0" }}>{log.reason || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
