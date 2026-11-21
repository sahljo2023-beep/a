"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: string;
  name: string;
  default_hotel_id?: string | null;
}

interface Hotel {
  id: string;
  name: string;
  code: string;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface ScheduleEntry {
  id?: string;
  employee_id: string;
  hotel_id: string;
  shift_id?: string | null;
  date: string;
  is_day_off: boolean;
}

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string>("");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day; // Sunday start
    return new Date(d.setDate(diff));
  });

  const [gridData, setGridData] = useState<Record<string, Record<string, { shift_id: string; is_day_off: boolean; hotel_id: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // بناء تواريخ الأسبوع (7 أيام)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const dayNamesArabic = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  const loadData = async () => {
    try {
      setLoading(true);
      const [resEmp, resHot, resShf] = await Promise.all([
        fetch("/api/admin/employees?active=true&pageSize=100"),
        fetch("/api/admin/hotels"),
        fetch("/api/admin/shifts"),
      ]);
      const dEmp = await resEmp.json();
      const dHot = await resHot.json();
      const dShf = await resShf.json();

      if (dEmp.success) setEmployees(dEmp.data.employees);
      if (dHot.success) {
        setHotels(dHot.data);
        if (!selectedHotel && dHot.data.length > 0) setSelectedHotel(dHot.data[0].id);
      }
      if (dShf.success) setShifts(dShf.data);

      // جلب بيانات الجدول لهذا الأسبوع
      const startStr = weekDays[0];
      const endStr = weekDays[6];
      const resSched = await fetch(`/api/admin/schedule?start_date=${startStr}&end_date=${endStr}`);
      const dSched = await resSched.json();

      if (dSched.success) {
        const mapping: any = {};
        for (const item of dSched.data) {
          const dKey = item.date.split("T")[0];
          if (!mapping[item.employee_id]) mapping[item.employee_id] = {};
          mapping[item.employee_id][dKey] = {
            shift_id: item.shift_id || "",
            is_day_off: item.is_day_off,
            hotel_id: item.hotel_id,
          };
        }
        setGridData(mapping);
      }
    } catch {
      setMsg("خطأ في جلب بيانات الجدول");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  const handleCellChange = (empId: string, dateStr: string, field: "shift_id" | "is_day_off" | "hotel_id", value: any) => {
    setGridData((prev) => {
      const copy = { ...prev };
      if (!copy[empId]) copy[empId] = {};
      const current = copy[empId][dateStr] || { shift_id: "", is_day_off: false, hotel_id: selectedHotel };
      copy[empId][dateStr] = {
        ...current,
        [field]: value,
      };
      return copy;
    });
  };

  const handleSave = async () => {
    const reason = prompt("الرجاء إدخال سبب التعديل على جدول الدوام (إلزامي للتدقيق):");
    if (!reason || reason.trim().length < 3) {
      alert("السبب إلزامي (3 أحرف على الأقل)");
      return;
    }

    try {
      setSaving(true);
      const entries: any[] = [];
      for (const empId of Object.keys(gridData)) {
        for (const dateStr of Object.keys(gridData[empId])) {
          const item = gridData[empId][dateStr];
          entries.push({
            employee_id: empId,
            hotel_id: item.hotel_id || selectedHotel,
            shift_id: item.is_day_off ? null : item.shift_id || null,
            date: dateStr,
            is_day_off: item.is_day_off,
          });
        }
      }

      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert("تم حفظ جدول الدوام بنجاح!");
      } else {
        alert(data.error || "فشل الحفظ");
      }
    } catch {
      alert("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const shiftWeek = (delta: number) => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + delta * 7);
    setCurrentWeekStart(next);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>جدول الدوام الأسبوعي</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            توزيع الموظفين على الفنادق والورديات وأيام العطلة
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => shiftWeek(-1)}
            style={{ background: "var(--color-bg-800)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer" }}
          >
            ← الأسبوع السابق
          </button>
          <button
            onClick={() => shiftWeek(1)}
            style={{ background: "var(--color-bg-800)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer" }}
          >
            الأسبوع القادم →
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: "var(--color-primary)", border: "none", color: "#fff", padding: "0.5rem 1.5rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
          >
            {saving ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
          </button>
        </div>
      </div>

      <div style={{ background: "var(--color-bg-800)", borderRadius: "12px", border: "1px solid var(--color-border)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--color-border)" }}>
              <th style={{ padding: "0.75rem", textAlign: "right", minWidth: "150px" }}>الموظف</th>
              {weekDays.map((d, idx) => (
                <th key={d} style={{ padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontWeight: "bold" }}>{dayNamesArabic[idx]}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{d}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: "2rem", textAlign: "center" }}>جاري التحميل...</td>
              </tr>
            ) : employees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "0.75rem", fontWeight: "600", borderLeft: "1px solid var(--color-border)" }}>
                  {emp.name}
                </td>
                {weekDays.map((d) => {
                  const cell = gridData[emp.id]?.[d] || { shift_id: "", is_day_off: false, hotel_id: emp.default_hotel_id || selectedHotel };
                  return (
                    <td key={d} style={{ padding: "0.5rem", textAlign: "center", borderLeft: "1px solid var(--color-border)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <select
                          disabled={cell.is_day_off}
                          value={cell.shift_id}
                          onChange={(e) => handleCellChange(emp.id, d, "shift_id", e.target.value)}
                          style={{
                            padding: "0.25rem",
                            borderRadius: "4px",
                            background: cell.is_day_off ? "#374151" : "var(--color-bg-900)",
                            border: "1px solid var(--color-border)",
                            color: "#fff",
                            fontSize: "0.75rem",
                          }}
                        >
                          <option value="">(بدون وردية)</option>
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.start_time}-{s.end_time})
                            </option>
                          ))}
                        </select>

                        <select
                          disabled={cell.is_day_off}
                          value={cell.hotel_id}
                          onChange={(e) => handleCellChange(emp.id, d, "hotel_id", e.target.value)}
                          style={{
                            padding: "0.25rem",
                            borderRadius: "4px",
                            background: cell.is_day_off ? "#374151" : "var(--color-bg-900)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-primary)",
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                          }}
                        >
                          {hotels.map((h) => (
                            <option key={h.id} value={h.id}>
                              فندق {h.code}
                            </option>
                          ))}
                        </select>

                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontSize: "0.7rem", color: "var(--color-text-muted)", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={cell.is_day_off}
                            onChange={(e) => handleCellChange(emp.id, d, "is_day_off", e.target.checked)}
                          />
                          عطلة
                        </label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
