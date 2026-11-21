"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: string;
  name: string;
  active: boolean;
  hired_at: string;
  left_at?: string | null;
  default_hotel?: { id: string; name: string } | null;
}

interface Hotel {
  id: string;
  name: string;
  code: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    pin: "",
    hired_at: new Date().toISOString().split("T")[0],
    default_hotel_id: "",
    notes: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/employees?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data.employees);
      }
    } catch {
      setErrorMsg("فشل تحميل بيانات الموظفين");
    } finally {
      setLoading(false);
    }
  };

  const fetchHotels = async () => {
    try {
      const res = await fetch("/api/admin/hotels");
      const data = await res.json();
      if (data.success) {
        setHotels(data.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("تم إضافة الموظف بنجاح");
        setShowAddModal(false);
        setFormData({
          name: "",
          pin: "",
          hired_at: new Date().toISOString().split("T")[0],
          default_hotel_id: "",
          notes: "",
        });
        fetchEmployees();
      } else {
        setErrorMsg(data.error || "فشل إضافة الموظف");
      }
    } catch {
      setErrorMsg("حدث خطأ في الاتصال");
    }
  };

  const toggleStatus = async (emp: Employee) => {
    const reason = prompt(`الرجاء إدخال سبب ${emp.active ? "إيقاف" : "تفعيل"} الموظف:`);
    if (!reason || reason.trim().length < 3) {
      alert("السبب إلزامي (3 أحرف على الأقل)");
      return;
    }
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !emp.active, reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      } else {
        alert(data.error || "فشل تحديث الحالة");
      }
    } catch {
      alert("حدث خطأ في الاتصال");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>إدارة الموظفين</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            إضافة وتعديل بيانات الموظفين والـ PIN وضبط حالتهم
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
          + إضافة موظف
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid var(--color-success)", color: "var(--color-success)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="بحث عن موظف بالاسم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            background: "var(--color-bg-800)",
            border: "1px solid var(--color-border)",
            color: "#fff",
          }}
        />
      </div>

      <div style={{ background: "var(--color-bg-800)", borderRadius: "12px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}>
              <th style={{ padding: "0.875rem 1rem" }}>الاسم</th>
              <th style={{ padding: "0.875rem 1rem" }}>الفندق الافتراضي</th>
              <th style={{ padding: "0.875rem 1rem" }}>تاريخ التعيين</th>
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
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  لا يوجد موظفون
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>{emp.name}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{emp.default_hotel?.name || "غير محدد"}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>{new Date(emp.hired_at).toLocaleDateString("ar-EG")}</td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: emp.active ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: emp.active ? "var(--color-success)" : "var(--color-danger)",
                      }}
                    >
                      {emp.active ? "نشط" : "معطل"}
                    </span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <button
                      onClick={() => toggleStatus(emp)}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--color-border)",
                        color: emp.active ? "var(--color-danger)" : "var(--color-success)",
                        padding: "0.3rem 0.75rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      {emp.active ? "إيقاف" : "تفعيل"}
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
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>إضافة موظف جديد</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>الاسم الكامل (عربي)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>رمز PIN (أرقام فقط 4-8 خانات)</label>
                <input
                  type="password"
                  required
                  maxLength={8}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "var(--color-bg-900)", border: "1px solid var(--color-border)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>الفندق الافتراضي</label>
                <select
                  value={formData.default_hotel_id}
                  onChange={(e) => setFormData({ ...formData, default_hotel_id: e.target.value })}
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

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem" }}>تاريخ التعيين</label>
                <input
                  type="date"
                  required
                  value={formData.hired_at}
                  onChange={(e) => setFormData({ ...formData, hired_at: e.target.value })}
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
