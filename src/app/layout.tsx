import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة دوام الموظفين - الفنادق الثلاثة",
  description: "نظام بصمة وحضور متقدم مع حماية الأجهزة وحسابات الدبل والتأخير",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          fontFamily: "'Cairo', 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif",
          backgroundColor: "var(--color-bg-900)",
          color: "var(--color-text-primary)",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
