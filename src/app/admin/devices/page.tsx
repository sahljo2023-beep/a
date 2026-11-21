"use client";

import { useEffect, useState } from "react";

interface Device {
  id: string;
  name: string;
  active: boolean;
  registered_at: string;
  last_seen_at?: string | null;
  hotel: { id: string; name: string; code: string };
}

interface Hotel {
  id: string;
  name: string;
  code: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", hotel_id: "" });
  const [newDeviceToken, setNewDeviceToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resDev, resHot] = await Promise.all([
        fetch("/api/admin/devices"),
        fetch("/api/admin/hotels"),
      ]);
      const dataDev = await resDev.json();
      const dataHot = await resHot.json();
      if (dataDev.success) setDevices(dataDev.data);
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
      const res = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewDeviceToken(data.data.token);
        setFormData({ name: "", hotel_id: "" });
        fetchData();
      } else {
        setErrorMsg(data.error || "فشل تسجيل الجهاز");
      }
    } catch {
      setErrorMsg("حدث خطأ في الاتصال");
    }
  };

  const toggleDevice = async (d: Device) => {
    const reason = prompt(`الرجاء إدخال سبب ${d.active ? "إيقاف" : "تفعيل"} الجهاز:`);
    if (!reason || reason.trim().length < 3) return;
    try {
      const res = await fetch(`/api/admin/devices/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !d.active, reason }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch {
      alert("فشل العملية");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>إدارة الأجهزة المعتمدة</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            تسجيل وتوثيق كمبيوترات الفنادق المعتمدة التي يُسمح بتسجيل البصمة منها فقط
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
          + تسجيل جهاز جديد
        </button>
      </div>

      {newDeviceToken && (
        <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid var(--color-success)", borderRadius: "8px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ color: "var(--color-success)", fontWeight: "bold", marginBottom: "0.5rem" }}>
            ⚠️ تم تسجيل الجهاز بنجاح! احفظ التوكن الآن (لن يظهر مرة أخرى):
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
            يتم نسخ هذا التوكن وإدخاله في كوكي الجهاز المعتمد في الفندق لتفعيله بصرياً وبرمجياً:
          </p>
          <div style={{ background: "var(--color-bg-900)", padding: "0.75rem", borderRadius: "6px", fontFamily: "monospace", wordBreak: "break-all", fontSize: "0.875rem", userSelect: "all", color: "#38bdf8" }}>
            {newDeviceToken}
          </div>
          <button
            onClick={() => setNewDeviceToken(null)}
            style={{ marginTop: "0.75rem", background: "var(--color-border)", border: "none", color: "#fff", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}
          >
            إغلاق التنبيه
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ background: "var(--color-bg-800)", borderRadius: "12px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}>
              <th style={{ padding: "0.875rem 1rem" }}>اسم الجهاز</th>
              <th style={{ padding: "0.875rem 1rem" }}>الفندق التابع له</th>
              <th style={{ padding: "0.875rem 1rem" }}>تاريخ التسجيل</th>
              <th style={{ padding: "0.875rem 1rem" }}>الحالة</th>
              <th style={{ padding: "0.875rem 1rem" }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  لا توجد أجهزة مسجلة
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>{d.name}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{d.hotel.name} ({d.hotel.code})</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{new Date(d.registered_at).toLocaleDateString("ar-EG")}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span style={{ color: d.active ? "var(--color-success)" : "var(--color-danger)" }}>
                      {d.active ? "معتمد ونشط" : "موقوف"}
                    </span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <button
                      onClick={() => toggleDevice(d)}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--color-border)",
                        color: d.active ? "var(--color-danger)" : "var(--color-success)",
                        padding: "0.3rem 0.75rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      {d.active ? "إيقاف الجهاز" : "تفعيل"}
                    </button>
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
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>تسجيل جهاز كمبيوتر جديد</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>اسم الجهاز (مثال: كمبيوتر الاستقبال الرئيسي)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
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
                  توليد التوكن والاعتماد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
