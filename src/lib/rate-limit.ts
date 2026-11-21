import { LRUCache } from "lru-cache";

// ============================================================
// Rate Limiter بسيط في الذاكرة (لبيئة Dev والـ Single Instance)
// للإنتاج: استبدل بـ Redis / Upstash
// ============================================================

interface RateLimitOptions {
  uniqueTokenPerInterval?: number;
  interval?: number; // milliseconds
}

interface RateLimitRecord {
  count: number;
  lockedUntil?: number;
}

export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache<string, RateLimitRecord>({
    max: options?.uniqueTokenPerInterval ?? 500,
    ttl: options?.interval ?? 60_000,
  });

  return {
    check: (
      limit: number,
      token: string,
      lockDurationMs = 0
    ): {
      success: boolean;
      remaining: number;
      lockedUntil?: number;
    } => {
      const now = Date.now();
      const record = tokenCache.get(token) ?? { count: 0 };

      // التحقق من القفل
      if (record.lockedUntil && now < record.lockedUntil) {
        return {
          success: false,
          remaining: 0,
          lockedUntil: record.lockedUntil,
        };
      }

      record.count += 1;

      // تجاوز الحد → قفل مؤقت
      if (record.count > limit) {
        if (lockDurationMs > 0) {
          record.lockedUntil = now + lockDurationMs;
        }
        tokenCache.set(token, record);
        return {
          success: false,
          remaining: 0,
          lockedUntil: record.lockedUntil,
        };
      }

      tokenCache.set(token, record);
      return { success: true, remaining: limit - record.count };
    },

    reset: (token: string) => {
      tokenCache.delete(token);
    },
  };
}

// ============================================================
// Rate Limiters مُعرَّفة مسبقاً
// ============================================================

// تسجيل الدخول: 5 محاولات / 15 دقيقة، قفل 15 دقيقة
export const loginRateLimiter = rateLimit({
  interval: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? "900000"),
  uniqueTokenPerInterval: 500,
});

export const LOGIN_MAX_ATTEMPTS = parseInt(
  process.env.LOGIN_RATE_LIMIT_MAX ?? "5"
);
export const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 دقيقة

// بصمة PIN: 5 محاولات / 5 دقائق، قفل 5 دقائق
export const pinRateLimiter = rateLimit({
  interval: parseInt(process.env.PIN_RATE_LIMIT_WINDOW_MS ?? "300000"),
  uniqueTokenPerInterval: 500,
});

export const PIN_MAX_ATTEMPTS = parseInt(
  process.env.PIN_RATE_LIMIT_MAX ?? "5"
);
export const PIN_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 دقائق
