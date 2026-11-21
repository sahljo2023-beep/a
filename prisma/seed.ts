import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import crypto from "crypto";

const prisma = new PrismaClient();

// ⚠️  DEMO DATA — للتجربة فقط
// احذف هذا الـ seed قبل النشر في الإنتاج
// يمكنك إعادة تشغيله بـ: npx prisma db seed

async function main() {
  console.log("\n========================================");
  console.log("⚠️  DEMO SEED — للتجربة فقط");
  console.log("========================================\n");

  // ============================================================
  // 1. إنشاء حساب الأدمن الأول
  // ============================================================
  const adminPassword = generateStrongPassword();
  const adminPasswordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@hotel-demo.local",
      password_hash: adminPasswordHash,
      role: "ADMIN",
      display_name: "مدير النظام",
      active: true,
    },
  });

  console.log("✅ تم إنشاء حساب الأدمن:");
  console.log("   اسم المستخدم : admin");
  console.log(`   كلمة المرور  : ${adminPassword}`);
  console.log("   ⚠️  غيّر كلمة المرور فور أول دخول!\n");

  // ============================================================
  // 2. لا بيانات حقيقية — الفنادق والموظفون يُضافون من لوحة الأدمن
  // ============================================================
  console.log("ℹ️  لم يتم إنشاء فنادق أو موظفين.");
  console.log("   أضفها من لوحة الأدمن بعد تسجيل الدخول.\n");

  console.log("========================================");
  console.log("✅ اكتمل الـ DEMO SEED بنجاح");
  console.log("   الرابط: http://localhost:3000/admin");
  console.log("========================================\n");
}

// توليد كلمة مرور قوية عشوائية
function generateStrongPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
  const length = 16;
  let password = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ فشل الـ seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
