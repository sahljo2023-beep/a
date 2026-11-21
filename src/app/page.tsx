import { redirect } from "next/navigation";

// الصفحة الرئيسية — إعادة توجيه لصفحة دخول الأدمن
export default function HomePage() {
  redirect("/admin/login");
}
