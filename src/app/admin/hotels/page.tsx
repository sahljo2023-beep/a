"use client";

import { useEffect, useState } from "react";

interface Hotel {
  id: string;
  name: string;
  name_en?: string | null;
  code: string;
  active: boolean;
  _count?: { employees: number; devices: number; allowed_networks: number };
}

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", name_en: "", code: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/hotels");
      const data = await res.json();
      if (data.success) {
        setHotels(data.data);
      }
    } catch {
      setErrorMsg("فشل تحميل الفنادق");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ name: "", name_en: "", code: "" });
        fetchHotels();
      } else {
        setErrorMsg(data.error || "فشل إضافة الفندق");
      }
    } catch {
      setErrorMsg("حدث خطأ في الاتصال");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>إدارة الفنادق</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            إعداد الفنادق الثلاثة ورموزها التشغيلية
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
          + إضافة فندق
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {loading ? (
          <p style={{ color: "var(--color-text-muted)" }}>جاري التحميل...</p>
        ) : (
          hotels.map((hotel) => (
            <div
              key={hotel.id}
              style={{
                background: "var(--color-bg-800)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{hotel.name}</h3>
                  {hotel.name_en && <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{hotel.name_en}</p>}
                </div>
                <span
                  style={{
                    background: "rgba(59,130,246,0.15)",
                    color: "var(--color-primary)",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                  }}
                >
                  {hotel.code}
                </span>
              </div>

              <div style={{ display: "flex", gap: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                <div>الموظفون: {hotel._count?.employees ?? 0}</div>
                <div>الأجهزة: {hotel._count?.devices ?? 0}</div>
                <div>الشبكات: {hotel._count?.allowed_networks ?? 0}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--color-bg-800)", padding: "1.5rem", borderRadius: "12px", width: "100%", maxWidth: "450px", border: "1px solid var(--color-border)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>إضافة فندق جديد</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>اسم الفندق (عربي)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>الاسم بالإنجليزي (اختياري)</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>رمز الفندق (Code: مثال H1, H2, H3)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
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
