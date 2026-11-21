"use client";

import { useEffect, useState } from "react";

interface Network {
  id: string;
  cidr: string;
  description?: string | null;
  active: boolean;
  created_at: string;
  hotel: { id: string; name: string; code: string };
}

interface Hotel {
  id: string;
  name: string;
  code: string;
}

export default function NetworksPage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ cidr: "", hotel_id: "", description: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resNet, resHot] = await Promise.all([
        fetch("/api/admin/networks"),
        fetch("/api/admin/hotels"),
      ]);
      const dataNet = await resNet.json();
      const dataHot = await resHot.json();
      if (dataNet.success) setNetworks(dataNet.data);
      if (dataHot.success) setHotels(dataHot.data);
    } catch {
      setErrorMsg("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ cidr: "", hotel_id: "", description: "" });
        fetchData();
      } else {
        setErrorMsg(data.error || "فشل إضافة النطاق");
      }
    } catch {
      setErrorMsg("حدث خطأ في الاتصال");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>نطاقات الشبكات المسموحة (IP Allowed)</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            إدارة عناوين الـ IP و CIDR الخاصة بشبكات كل فندق لمنع تسجيل البصمة من خارج الفندق
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "0.6rem 1.2rem",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          + إضافة نطاق شبكة
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ background: "var(--color-bg-800)", borderRadius: "12px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}>
              <th style={{ padding: "0.875rem 1rem" }}>نطاق الشبكة (CIDR)</th>
              <th style={{ padding: "0.875rem 1rem" }}>الفندق التابع له</th>
              <th style={{ padding: "0.875rem 1rem" }}>الوصف</th>
              <th style={{ padding: "0.875rem 1rem" }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : networks.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  لا توجد نطاقات مسجلة
                </td>
              </tr>
            ) : (
              networks.map((n) => (
                <tr key={n.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "600", fontFamily: "monospace", color: "#38bdf8" }}>{n.cidr}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{n.hotel.name} ({n.hotel.code})</td>
                  <td style={{ padding: "0.875rem 1rem", color: "var(--color-text-secondary)" }}>{n.description || "—"}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span style={{ color: n.active ? "var(--color-success)" : "var(--color-danger)" }}>
                      {n.active ? "مسموح" : "معطل"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--color-bg-800)", padding: "1.5rem", borderRadius: "12px", width: "100%", maxWidth: "450px", border: "1px solid var(--color-border)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>إضافة نطاق IP مسموح</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>عنوان الشبكة بصيغة CIDR (مثال: 192.168.1.0/24 أو 10.0.0.1/32)</label>
                <input
                  type="text"
                  required
                  placeholder="192.168.1.0/24"
                  value={formData.cidr}
                  onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff", direction: "ltr", textAlign: "left" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>الفندق</label>
                <select
                  required
                  value={formData.hotel_id}
                  onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                >
                  <option value="">اختر الفندق...</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>الوصف (اختياري)</label>
                <input
                  type="text"
                  placeholder="راوتر الاستقبال، شبكة الإدارة..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: "transparent", border: "1px solid var(--color-border)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  style={{ background: "var(--color-primary)", border: "none", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                >
                  حفظ النطاق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
