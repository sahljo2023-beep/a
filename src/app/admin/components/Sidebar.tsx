"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: "🏠" },
  { href: "/admin/employees", label: "الموظفون", icon: "👤" },
  { href: "/admin/hotels", label: "الفنادق", icon: "🏨" },
  { href: "/admin/shifts", label: "الورديات", icon: "🕐" },
  { href: "/admin/schedule", label: "جدول الدوام", icon: "📅" },
  { href: "/admin/devices", label: "الأجهزة", icon: "💻" },
  { href: "/admin/networks", label: "الشبكات", icon: "🌐" },
  { href: "/admin/users", label: "حسابات المدراء", icon: "👥" },
  { href: "/admin/attendance", label: "الحضور والبصمة", icon: "✅" },
  { href: "/admin/late-claims", label: "التأخيرات", icon: "⏰" },
  { href: "/admin/doubles", label: "الدبل", icon: "🔄" },
  { href: "/admin/financial", label: "الحسابات المالية", icon: "💰" },
  { href: "/admin/reports", label: "التقارير", icon: "📊" },
  { href: "/admin/audit-log", label: "سجل التدقيق", icon: "📋" },
  { href: "/admin/errors", label: "معالجة الأخطاء", icon: "🔧" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100dvh",
        background: "var(--color-bg-800)",
        borderLeft: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        overflowY: "auto",
      }}
    >
      {/* الشعار */}
      <div
        style={{
          padding: "1.25rem 1rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, hsl(217,91%,60%), hsl(280,85%,65%))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem", flexShrink: 0,
          }}
        >🏨</div>
        <div>
          <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--color-text-primary)", lineHeight: 1.2 }}>
            نظام الدوام
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>لوحة الأدمن</div>
        </div>
      </div>

      {/* روابط التنقل */}
      <nav style={{ flex: 1, padding: "0.75rem 0.5rem" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                marginBottom: "2px",
                color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                background: isActive ? "rgba(59,130,246,0.1)" : "transparent",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: isActive ? "600" : "400",
                transition: "all 0.15s ease",
                borderRight: isActive ? "3px solid var(--color-primary)" : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* زر الخروج */}
      <div style={{ padding: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: "100%", padding: "0.5rem", borderRadius: "8px",
            background: "transparent", border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)", cursor: "pointer",
            fontSize: "0.85rem", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "0.5rem", transition: "all 0.15s ease",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-danger)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
          }}
        >
          <span>🚪</span>
          <span>{loggingOut ? "جاري الخروج..." : "تسجيل الخروج"}</span>
        </button>
      </div>
    </aside>
  );
}
