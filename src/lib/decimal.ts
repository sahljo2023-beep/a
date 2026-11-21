import Decimal from "decimal.js";

// ============================================================
// إعداد Decimal.js
// ============================================================
Decimal.set({
  precision: 20,         // دقة عالية
  rounding: Decimal.ROUND_HALF_UP,
  toExpPos: 20,
  toExpNeg: -7,
});

// ثوابت الحساب
const SHIFT_MINUTES = new Decimal(480); // 8 ساعات = 480 دقيقة
const SHIFT_VALUE_JD = new Decimal(10); // قيمة الوردية بالدينار الأردني
const DOUBLE_HOURLY_RATE = new Decimal(1.25); // سعر الدبل في الساعة

/**
 * حساب قيمة التأخير
 * القيمة = (دقائق ÷ 480) × 10 دينار
 * ⚠️ لا تقرّب سعر الدقيقة قبل الجمع النهائي
 */
export function calculateLateClaimAmount(lateMinutes: number): Decimal {
  const minutes = new Decimal(lateMinutes);
  // (دقائق ÷ 480) × 10 — الضرب والقسمة بالترتيب الصحيح
  return minutes.div(SHIFT_MINUTES).mul(SHIFT_VALUE_JD);
}

/**
 * حساب إجمالي قيمة مطالبات متعددة
 * يجمع أولاً ثم يقرّب — لا يقرّب كل مطالبة على حدة
 */
export function sumLateClaimAmounts(minutesList: number[]): Decimal {
  return minutesList.reduce(
    (sum, minutes) => sum.plus(calculateLateClaimAmount(minutes)),
    new Decimal(0)
  );
}

/**
 * حساب قيمة الدبل
 * القيمة = ساعات × 1.25 دينار
 */
export function calculateDoubleAmount(hours: number | Decimal): Decimal {
  const h = new Decimal(hours);
  return h.mul(DOUBLE_HOURLY_RATE);
}

/**
 * التحقق من مجموع ساعات الدبل
 * يجب أن يساوي مدة الوردية (بدقة 0.01 ساعة)
 */
export function validateDoubleHours(
  allocatedHours: number[],
  shiftDurationMinutes: number
): { valid: boolean; difference: Decimal; message?: string } {
  const shiftHours = new Decimal(shiftDurationMinutes).div(60);
  const totalAllocated = allocatedHours.reduce(
    (sum, h) => sum.plus(new Decimal(h)),
    new Decimal(0)
  );
  const difference = totalAllocated.minus(shiftHours).abs();
  const tolerance = new Decimal("0.01");

  if (difference.lte(tolerance)) {
    return { valid: true, difference };
  }

  return {
    valid: false,
    difference,
    message: `مجموع الساعات الموزّعة (${totalAllocated.toFixed(2)}) لا يساوي مدة الوردية (${shiftHours.toFixed(2)} ساعة)`,
  };
}

/**
 * تحويل Decimal إلى string بـ 3 منازل عشرية
 * للتخزين والعرض
 */
export function decimalToString(value: Decimal | string | number): string {
  return new Decimal(value).toFixed(3);
}

/**
 * التحقق من عدم استخدام float
 * يُستخدم في التحقق من المدخلات
 */
export function parseDecimalSafe(value: string | number): Decimal | null {
  try {
    return new Decimal(value);
  } catch {
    return null;
  }
}

// ============================================================
// اختبارات الوحدة المدمجة (تُشغَّل في dev mode)
// الجدول من المواصفات:
//   5 د  → 0.104
//   15 د → 0.313
//   30 د → 0.625
//   60 د → 1.250
//   24 س → 30.000
// ============================================================
export function runDecimalTests(): void {
  const tests = [
    { minutes: 5, expected: "0.104" },
    { minutes: 15, expected: "0.313" },
    { minutes: 30, expected: "0.625" },
    { minutes: 60, expected: "1.250" },
    { minutes: 1440, expected: "30.000" }, // 24 ساعة
  ];

  let allPassed = true;

  for (const test of tests) {
    const result = calculateLateClaimAmount(test.minutes).toFixed(3);
    const passed = result === test.expected;
    if (!passed) {
      console.error(
        `❌ اختبار فشل: ${test.minutes} دقيقة → ${result} (متوقع: ${test.expected})`
      );
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("✅ اجتازت جميع اختبارات الحسابات المالية (5 اختبارات)");
  }
}

export { Decimal };
