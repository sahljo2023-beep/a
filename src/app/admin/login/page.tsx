"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: "ADMIN" }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError(data.error ?? "خطأ في تسجيل الدخول");
      }
    } catch {
      setError("حدث خطأ في الاتصال. حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at top, hsl(217,91%,8%) 0%, hsl(224,71%,4%) 60%)",
        padding: "1rem",
      }}
    >
      {/* بطاقة الدخول */}
      <div
        className="animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* الشعار */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, hsl(217,91%,60%), hsl(280,85%,65%))",
              margin: "0 auto 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
            }}
          >
            🏨
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "var(--color-text-primary)",
              marginBottom: "0.25rem",
            }}
          >
            نظام إدارة الدوام
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            لوحة تحكم المدير
          </p>
        </div>

        {/* نموذج الدخول */}
        <div className="card glass" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label className="label" htmlFor="username">
                اسم المستخدم
              </label>
              <input
                id="username"
                type="text"
                className="input"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label className="label" htmlFor="password">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "0.75rem" }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <span className="spinner" style={{ width: "16px", height: "16px" }} />
                  جاري التحقق...
                </span>
              ) : (
                "دخول"
              )}
            </button>
          </form>
        </div>

        {/* تذييل */}
        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            color: "var(--color-text-muted)",
            fontSize: "0.75rem",
          }}
        >
          نظام إدارة دوام الفنادق © 2024
        </p>
      </div>
    </div>
  );
}
