"use client";

import { useEffect, useState } from "react";

interface Hotel {
  id: string;
  name: string;
  code: string;
}

export default function KioskPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [employeeName, setEmployeeName] = useState("");
  const [pin, setPin] = useState("");
  const [punchType, setPunchType] = useState<"IN" | "OUT">("IN");
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [statusResult, setStatusResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // تحديث الساعة الرقمية الحية بتوقيت الأردن
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("ar-JO", {
          timeZone: "Asia/Amman",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("ar-JO", {
          timeZone: "Asia/Amman",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // جلب الفنادق الثلاثة
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await fetch("/api/admin/hotels");
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setHotels(data.data);
          setSelectedHotelId(data.data[0].id);
        }
      } catch {
        // ignore
      }
    };
    fetchHotels();
  }, []);

  const handleKeypadPress = (val: string) => {
    if (val === "CLEAR") {
      setPin("");
    } else if (val === "BACK") {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (pin.length < 8) setPin((prev) => prev + val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      setStatusResult({ success: false, message: "الرجاء كتابة اسم الموظف" });
      return;
    }
    if (!pin) {
      setStatusResult({ success: false, message: "الرجاء إدخال الرمز السري PIN" });
      return;
    }
    if (!selectedHotelId) {
      setStatusResult({ success: false, message: "الرجاء اختيار الفندق" });
      return;
    }

    try {
      setLoading(true);
      setStatusResult(null);

      const res = await fetch("/api/kiosk/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: employeeName.trim(),
          pin,
          hotel_id: selectedHotelId,
          type: punchType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusResult({
          success: true,
          message: data.data.message,
          details: data.data,
        });
        setPin("");
        setEmployeeName("");
      } else {
        setStatusResult({
          success: false,
          message: data.error || "فشل تسجيل البصمة",
        });
      }
    } catch {
      setStatusResult({ success: false, message: "حدث خطأ أثناء الاتصال بالخادم" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top, #1e293b, #0f172a)", color: "#fff", direction: "rtl", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      {/* الرأس: الساعة والشعار */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "2.75rem", fontWeight: "900", letterSpacing: "1px", color: "#38bdf8", fontFamily: "monospace" }}>
          {currentTime || "00:00:00"}
        </div>
        <div style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          {currentDate}
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: "560px", background: "var(--color-bg-800)", borderRadius: "20px", border: "1px solid var(--color-border)", padding: "2rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
        {/* أزرار الفنادق الثلاثة الكبيرة */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.5rem", fontWeight: "600" }}>
            ١. اختر الفندق التابع له دوامك اليوم:
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            {hotels.map((h) => {
              const isSelected = selectedHotelId === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHotelId(h.id)}
                  style={{
                    padding: "1rem 0.5rem",
                    borderRadius: "12px",
                    border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: isSelected ? "rgba(59,130,246,0.15)" : "var(--color-bg-900)",
                    color: isSelected ? "var(--color-primary)" : "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", marginBottom: "0.2rem" }}>🏨</div>
                  <div style={{ fontSize: "0.9rem" }}>{h.name}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>({h.code})</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* نوع البصمة: دخول / خروج */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.5rem", fontWeight: "600" }}>
            ٢. اختر نوع البصمة:
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => setPunchType("IN")}
              style={{
                padding: "0.85rem",
                borderRadius: "10px",
                border: punchType === "IN" ? "2px solid var(--color-success)" : "1px solid var(--color-border)",
                background: punchType === "IN" ? "rgba(16,185,129,0.2)" : "var(--color-bg-900)",
                color: punchType === "IN" ? "var(--color-success)" : "#94a3b8",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              🟢 تسجيل دخول (IN)
            </button>
            <button
              type="button"
              onClick={() => setPunchType("OUT")}
              style={{
                padding: "0.85rem",
                borderRadius: "10px",
                border: punchType === "OUT" ? "2px solid var(--color-danger)" : "1px solid var(--color-border)",
                background: punchType === "OUT" ? "rgba(239,68,68,0.2)" : "var(--color-bg-900)",
                color: punchType === "OUT" ? "var(--color-danger)" : "#94a3b8",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              🔴 تسجيل خروج (OUT)
            </button>
          </div>
        </div>

        {/* نموذج الموظف و PIN */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.4rem", fontWeight: "600" }}>
              ٣. اسم الموظف (يُكتب يدوياً):
            </label>
            <input
              type="text"
              required
              placeholder="اكتب اسمك الثلاثي أو الرباعي..."
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                background: "var(--color-bg-900)",
                border: "1px solid var(--color-border)",
                color: "#fff",
                fontSize: "1rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.4rem", fontWeight: "600" }}>
              ٤. رمز PIN السري:
            </label>
            <input
              type="password"
              readOnly
              value={pin}
              placeholder="••••"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "10px",
                background: "var(--color-bg-900)",
                border: "1px solid var(--color-border)",
                color: "#38bdf8",
                textAlign: "center",
                fontSize: "1.5rem",
                letterSpacing: "8px",
                marginBottom: "0.75rem",
              }}
            />

            {/* لوحة الأرقام Keypad اللمسية */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "BACK"].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleKeypadPress(val)}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "8px",
                    background: "var(--color-bg-900)",
                    border: "1px solid var(--color-border)",
                    color: val === "CLEAR" || val === "BACK" ? "var(--color-warning)" : "#fff",
                    fontSize: val === "CLEAR" || val === "BACK" ? "0.85rem" : "1.25rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {val === "CLEAR" ? "مسح" : val === "BACK" ? "⌫" : val}
                </button>
              ))}
            </div>
          </div>

          {statusResult && (
            <div
              style={{
                padding: "1rem",
                borderRadius: "10px",
                marginBottom: "1.25rem",
                background: statusResult.success ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                border: `1px solid ${statusResult.success ? "var(--color-success)" : "var(--color-danger)"}`,
                color: statusResult.success ? "var(--color-success)" : "var(--color-danger)",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              <div>{statusResult.message}</div>
              {statusResult.details && (
                <div style={{ fontSize: "0.85rem", marginTop: "0.4rem", color: "#fff" }}>
                  الوقت: {statusResult.details.time} | الموظف: {statusResult.details.employee_name}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "12px",
              background: punchType === "IN" ? "var(--color-success)" : "var(--color-danger)",
              border: "none",
              color: "#fff",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 14px 0 rgba(0,0,0,0.39)",
            }}
          >
            {loading ? "جاري التسجيل والتحقق..." : `تأكيد بصمة ${punchType === "IN" ? "الدخول" : "الخروج"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
