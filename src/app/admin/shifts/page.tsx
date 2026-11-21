"use client";

import { useEffect, useState } from "react";

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  crosses_midnight: boolean;
  duration_minutes: number;
  active: boolean;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_time: "08:00",
    end_time: "16:00",
    crosses_midnight: false,
  });
  const [errorMsg, setErrorMsg] = useState("");

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/shifts");
      const data = await res.json();
      if (data.success) {
        setShifts(data.data);
      }
    } catch {
      setErrorMsg("فشل تحميل الورديات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ name: "", start_time: "08:00", end_time: "16:00", crosses_midnight: false });
        fetchShifts();
      } else {
        setErrorMsg(data.error || "فشل إضافة الوردية");
      }
    } catch {
      setErrorMsg("حدث خطأ في الاتصال");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>إدارة الورديات</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            تعريف الورديات الرسمية وساعات العمل (الصباحية، المسائية، الليلية العابرة لمنتصف الليل)
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
          + إضافة وردية
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
              <th style={{ padding: "0.875rem 1rem" }}>اسم الوردية</th>
              <th style={{ padding: "0.875rem 1rem" }}>وقت البداية</th>
              <th style={{ padding: "0.875rem 1rem" }}>وقت النهاية</th>
              <th style={{ padding: "0.875rem 1rem" }}>المدة الإجمالية</th>
              <th style={{ padding: "0.875rem 1rem" }}>عابرة لمنتصف الليل؟</th>
              <th style={{ padding: "0.875rem 1rem" }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  لا توجد ورديات معرفة
                </td>
              </tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>{s.name}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{s.start_time}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{s.end_time}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{(s.duration_minutes / 60).toFixed(1)} ساعة ({s.duration_minutes} دقيقة)</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    {s.crosses_midnight ? <span style={{ color: "var(--color-warning)" }}>نعم 🌙</span> : "لا"}
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span style={{ color: s.active ? "var(--color-success)" : "var(--color-danger)" }}>
                      {s.active ? "مفعلة" : "معطلة"}
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
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>إضافة وردية جديدة</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>اسم الوردية (مثال: صباحي A، مسائي B، ليلي C)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>وقت البدء</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>وقت الانتهاء</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.crosses_midnight}
                    onChange={(e) => setFormData({ ...formData, crosses_midnight: e.target.checked })}
                  />
                  <span style={{ fontSize: "0.875rem" }}>الوردية تتجاوز منتصف الليل (تبدأ في يوم وتنتهي في التالي)</span>
                </label>
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
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
