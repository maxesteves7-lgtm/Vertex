import { prisma } from "./prisma";

/**
 * Daily per-feature usage cap. Increments the UsageLog counter (upsert)
 * and returns whether the caller is still under the limit + how many
 * remain for the day. Uses UTC "YYYY-MM-DD" as the bucket key.
 *
 * Pass `limit = Infinity` for Institutional / unlimited plans — the
 * counter still increments (useful for analytics) but never denies.
 */
export type UsageResult = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
};

export async function bumpUsage(
  userEmail: string,
  feature: string,
  limit: number,
): Promise<UsageResult> {
  const day = todayUtc();

  // Upsert-then-check pattern. Prisma doesn't atomically return the new
  // counter on upsert-with-increment across all versions, so we do read +
  // increment in two calls. Not fully race-safe under heavy concurrency
  // but fine for personal-scale usage.
  const existing = await prisma.usageLog.findUnique({
    where: {
      userEmail_feature_day: { userEmail, feature, day },
    },
  });

  const currentCount = existing?.count ?? 0;
  if (currentCount >= limit) {
    return {
      allowed: false,
      used: currentCount,
      limit,
      remaining: 0,
    };
  }

  const next = await prisma.usageLog.upsert({
    where: { userEmail_feature_day: { userEmail, feature, day } },
    create: { userEmail, feature, day, count: 1 },
    update: { count: { increment: 1 } },
  });

  return {
    allowed: true,
    used: next.count,
    limit,
    remaining: Math.max(0, limit - next.count),
  };
}

/** Read-only — how many uses today, without incrementing. */
export async function peekUsage(
  userEmail: string,
  feature: string,
): Promise<number> {
  const row = await prisma.usageLog.findUnique({
    where: {
      userEmail_feature_day: { userEmail, feature, day: todayUtc() },
    },
  });
  return row?.count ?? 0;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}
