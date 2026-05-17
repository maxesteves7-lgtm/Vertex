import { prisma } from "./prisma";
import { fetchPolymarketMarkets } from "./exchanges/polymarket";
import { sendEmail, alertEmailHtml } from "./email";
import type { Alert as PrismaAlert } from "@prisma/client";

const RE_FIRE_COOLDOWN_MS = 60 * 60 * 1000; // 1h between repeat fires per alert

/**
 * Lazy-creates the default single user (keyed by ALERT_EMAIL_TO). Predix
 * has no auth yet; alerts are owned by this implicit account.
 */
export async function getOrCreateDefaultUser() {
  const email = process.env.ALERT_EMAIL_TO;
  if (!email) {
    throw new Error("ALERT_EMAIL_TO is not set");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email, displayName: "Predix Owner" },
  });
}

export type CreateAlertInput = {
  exchange: "POLYMARKET" | "KALSHI";
  externalMarketId: string;
  marketQuestion: string;
  ruleType: "PRICE_ABOVE" | "PRICE_BELOW";
  threshold: number; // 0..1
  destination?: string; // optional override; defaults to ALERT_EMAIL_TO
};

export async function createAlert(input: CreateAlertInput) {
  const user = await getOrCreateDefaultUser();
  const destination = input.destination ?? user.email;
  return prisma.alert.create({
    data: {
      userId: user.id,
      exchange: input.exchange,
      externalMarketId: input.externalMarketId,
      marketQuestion: input.marketQuestion,
      ruleType: input.ruleType,
      threshold: input.threshold,
      channel: "EMAIL",
      destination,
    },
  });
}

export async function listAlerts() {
  return prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAlert(id: string) {
  return prisma.alert.delete({ where: { id } });
}

/**
 * Evaluate every active alert against current market prices. Triggered
 * alerts are sent and their lastFiredAt updated. Returns a summary so the
 * cron handler can log it.
 */
export async function evaluateAlerts(): Promise<{
  evaluated: number;
  fired: number;
  skipped: number;
  errors: number;
}> {
  const alerts = await prisma.alert.findMany({ where: { isActive: true } });
  if (alerts.length === 0) {
    return { evaluated: 0, fired: 0, skipped: 0, errors: 0 };
  }

  // Pull a wide superset of Polymarket markets and index by ID
  const polyMarkets = await fetchPolymarketMarkets(500).catch(() => []);
  const polyById = new Map(polyMarkets.map((m) => [m.externalId, m]));

  let fired = 0;
  let skipped = 0;
  let errors = 0;

  for (const a of alerts) {
    try {
      const m = a.exchange === "POLYMARKET" ? polyById.get(a.externalMarketId) : null;
      if (!m || m.yesPrice === null) {
        skipped++;
        continue;
      }
      const triggered =
        (a.ruleType === "PRICE_ABOVE" && m.yesPrice >= a.threshold) ||
        (a.ruleType === "PRICE_BELOW" && m.yesPrice <= a.threshold);
      if (!triggered) {
        skipped++;
        continue;
      }
      // Cooldown: don't spam the same alert
      if (
        a.lastFiredAt &&
        Date.now() - a.lastFiredAt.getTime() < RE_FIRE_COOLDOWN_MS
      ) {
        skipped++;
        continue;
      }

      await fireAlertEmail(a, m.yesPrice, m.externalUrl);
      await prisma.alert.update({
        where: { id: a.id },
        data: { lastFiredAt: new Date() },
      });
      fired++;
    } catch (e) {
      console.error("[alerts] failed to evaluate alert", a.id, e);
      errors++;
    }
  }

  return { evaluated: alerts.length, fired, skipped, errors };
}

async function fireAlertEmail(
  a: PrismaAlert,
  currentPrice: number,
  marketUrl: string,
) {
  const ruleHuman =
    a.ruleType === "PRICE_ABOVE"
      ? `YES price ≥ ${(a.threshold * 100).toFixed(1)}%`
      : `YES price ≤ ${(a.threshold * 100).toFixed(1)}%`;
  await sendEmail({
    to: a.destination,
    subject: `[Futurist] ${a.marketQuestion.slice(0, 80)}`,
    html: alertEmailHtml({
      question: a.marketQuestion,
      ruleHuman,
      currentPrice,
      threshold: a.threshold,
      marketUrl,
    }),
  });
}
