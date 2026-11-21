# نظام إدارة دوام الفنادق

نظام متكامل لإدارة حضور وانصراف موظفي ثلاثة فنادق، مبني بـ Next.js + PostgreSQL + Prisma.

---

## متطلبات التشغيل

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (مُثبَّت وشغّال)
- Node.js 20+ (للتطوير المحلي فقط)

---

## التشغيل السريع (Docker)

### 1. إعداد متغيرات البيئة

```bash
cp .env.example .env
```

افتح `.env` وعدّل القيم التالية (إلزامي):

| المتغير | الوصف |
|---------|-------|
| `POSTGRES_PASSWORD` | كلمة مرور قاعدة البيانات |
| `VIEWER_DB_PASSWORD` | كلمة مرور مستخدم القراءة |
| `SESSION_SECRET` | مفتاح الجلسة (64+ حرف عشوائي) |
| `NEXTAUTH_SECRET` | مفتاح Next Auth (32+ حرف) |

**لتوليد مفاتيح عشوائية:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. تشغيل Docker Compose

```bash
docker compose up -d
```

### 3. تشغيل migrations وإنشاء حساب الأدمن

```bash
# تشغيل migrations
docker compose exec app npx prisma migrate deploy

# تطبيق triggers الحماية وإنشاء views
docker compose exec postgres psql -U hotel_admin -d hotel_attendance \
  -c "SELECT fn_apply_protection_triggers(); SELECT fn_create_viewer_views(); SELECT fn_grant_viewer_permissions();"

# إنشاء حساب الأدمن (احفظ كلمة المرور المُطبَعة!)
docker compose exec app npx prisma db seed
```

### 4. فتح التطبيق

- لوحة الأدمن: http://localhost:3000/admin/login
- شاشة البصمة: http://localhost:3000/kiosk
- لوحة المدراء: http://localhost:3000/viewer/login

---

## التطوير المحلي (بدون Docker)

> تأكد من تشغيل PostgreSQL 16 محلياً أولاً

```bash
# تثبيت الحزم
npm install

# إعداد البيئة
cp .env.example .env
# عدّل DATABASE_URL ليشير لقاعدة بياناتك المحلية

# تشغيل migrations
npm run db:migrate

# تشغيل الـ seed
npm run db:seed

# تشغيل التطوير
npm run dev
```

---

## هيكل المشروع

```
hotel-attendance/
├── prisma/
│   ├── schema.prisma     # نموذج البيانات الكامل
│   ├── migrations/       # Migrations التلقائية
│   └── seed.ts           # ⚠️ DEMO SEED فقط
├── scripts/
│   ├── init-db.sql       # Triggers + Views + Permissions
│   ├── backup.sh         # نسخ احتياطي (مرحلة 10)
│   └── restore.sh        # استعادة (مرحلة 10)
├── src/
│   ├── app/
│   │   ├── admin/        # لوحة الأدمن
│   │   ├── viewer/       # لوحة المدراء
│   │   ├── kiosk/        # شاشة البصمة
│   │   └── api/          # API endpoints
│   ├── lib/
│   │   ├── auth.ts       # إدارة الجلسات
│   │   ├── prisma.ts     # Prisma client
│   │   ├── decimal.ts    # الحسابات المالية
│   │   ├── normalize.ts  # تطبيع النص العربي
│   │   └── rate-limit.ts # حماية من الهجمات
│   ├── middleware.ts      # حماية المسارات
│   └── types/            # TypeScript types
└── docker-compose.yml
```

---

## الصلاحيات والأدوار

| الدور | الوصول | الكتابة |
|-------|-------|---------|
| `ADMIN` | كل شيء | ✅ |
| `VIEWER` | تقارير + إحصاءات | ❌ |
| `EMPLOYEE_KIOSK` | شاشة البصمة فقط | ❌ (بصمة فقط) |

### حماية VIEWER على مستويين:
1. **API**: كل endpoints في `/api/viewer/*` تقبل `GET` فقط
2. **قاعدة البيانات**: مستخدم `viewer_role` له `SELECT` فقط على views مخصصة، لا يستطيع الوصول للجداول الأساسية

---

## ⚠️ حدود الحماية الأمنية

> **قراءة مهمة قبل النشر:**

### 1. حماية IP
- **المشكلة**: الأجهزة خلف NAT أو Proxy تشترك في نفس الـ IP. جهاز خارج الفندق يستخدم VPN يبدو داخلياً.
- **الحل الموصى**: استخدم Device Token مع IP كطبقة ثانية، لا كطبقة وحيدة.

### 2. Device Token في الكوكي
- **المشكلة**: إذا سُرق الكوكي (XSS، Man-in-the-Middle)، يستطيع المهاجم انتحال الجهاز.
- **الحماية المطبقة**: `httpOnly` يمنع XSS. `Secure` يمنع الاعتراض عبر HTTP. `SameSite=Strict` يحمي من CSRF.
- **الباقي**: تأكد من HTTPS في الإنتاج.

### 3. فحص User-Agent
- **تنبيه**: User-Agent قابل للتزوير بسهولة ويُستخدم فقط لعرض رسائل ودية، **لا كحماية حقيقية**.

### 4. Rate Limiting
- الـ Rate Limiter الحالي **في الذاكرة** — يُصفَّر عند إعادة تشغيل التطبيق.
- للإنتاج: استبدله بـ Redis/Upstash لمشاركة الحالة بين instances متعددة.

---

## الحزم المستخدمة

| الحزمة | الغرض |
|--------|-------|
| `next` 16 | إطار العمل |
| `prisma` | ORM + Migrations |
| `argon2` | تشفير كلمات المرور |
| `iron-session` | جلسات httpOnly آمنة |
| `zod` | التحقق من المدخلات |
| `decimal.js` | الحسابات المالية الدقيقة |
| `exceljs` | تصدير Excel |
| `@react-pdf/renderer` | تصدير PDF مع دعم RTL/عربي |
| `date-fns` + `date-fns-tz` | التعامل مع التواريخ والمناطق الزمنية |
| `lru-cache` | Rate limiting في الذاكرة |

---

## الأوامر المفيدة

```bash
# عرض logs التطبيق
docker compose logs -f app

# عرض logs قاعدة البيانات
docker compose logs -f postgres

# الدخول لقاعدة البيانات
docker compose exec postgres psql -U hotel_admin -d hotel_attendance

# إعادة تعيين كلمة مرور الأدمن
docker compose exec app npx prisma db seed

# إيقاف كل شيء
docker compose down

# إيقاف مع حذف البيانات (تحذير!)
docker compose down -v
```

---

## ⚠️ تحذيرات مهمة

- **لا تنشر في الإنتاج** بدون مراجعة وموافقة المطور
- **احذف DEMO SEED** قبل الإنتاج (`prisma/seed.ts` للتجربة فقط)
- **غيّر كلمة مرور الأدمن** فور أول دخول
- **استخدم HTTPS** في الإنتاج (شرط لعمل كوكيز `Secure`)

---

## مراحل التطوير

- [x] المرحلة 1: هيكل المشروع + Docker + قاعدة البيانات + Migrations + Triggers + Seed
- [ ] المرحلة 2: الدخول والصلاحيات + إدارة الموظفين والفنادق والأجهزة
- [ ] المرحلة 3: جدول الدوام
- [ ] المرحلة 4: شاشة البصمة بالحماية الكاملة
- [ ] المرحلة 5: التأخير والتعويض المالي والزمني
- [ ] المرحلة 6: الدبل وتقسيمه
- [ ] المرحلة 7: معالجة الأخطاء وسجل التدقيق
- [ ] المرحلة 8: الحسابات المالية والتسوية
- [ ] المرحلة 9: لوحات العرض والتقارير (Excel/PDF)
- [ ] المرحلة 10: النسخ الاحتياطي + الاختبارات الأمنية
