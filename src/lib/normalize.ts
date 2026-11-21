/**
 * تطبيع النص العربي للبحث عن الموظفين
 * يعالج: الهمزات، التاء المربوطة والهاء، الألف المقصورة، التشكيل، المسافات الزائدة
 */
export function normalizeArabic(text: string): string {
  let normalized = text.trim();

  // تطبيع الهمزات على الألف
  normalized = normalized.replace(/[أإآ]/g, "ا");

  // تطبيع التاء المربوطة والهاء في نهاية الكلمة
  normalized = normalized.replace(/ة/g, "ه");

  // تطبيع الياء والألف المقصورة
  normalized = normalized.replace(/ى/g, "ي");

  // إزالة التشكيل (الحركات والسكون والشدة)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, "");

  // إزالة التطويل
  normalized = normalized.replace(/ـ/g, "");

  // تطبيع المسافات المتعددة
  normalized = normalized.replace(/\s+/g, " ").trim();

  // تحويل للأحرف الصغيرة (للنص الإنجليزي إن وُجد)
  normalized = normalized.toLowerCase();

  return normalized;
}

/**
 * مقارنة اسمين عربيين بعد التطبيع
 */
export function arabicNamesMatch(name1: string, name2: string): boolean {
  return normalizeArabic(name1) === normalizeArabic(name2);
}

/**
 * التحقق من أن الاسم المدخل يبدأ بنفس الكلمات (للبحث الجزئي)
 */
export function arabicNameStartsWith(name: string, query: string): boolean {
  return normalizeArabic(name).startsWith(normalizeArabic(query));
}
