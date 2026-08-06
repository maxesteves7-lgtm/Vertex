import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

/**
 * GET /api/cron/trial-nag
 *
 * Runs daily via Vercel cron. Finds subscriptions still in trial where
 * `currentPeriodEnd` falls within the next 48 hours, and emails the user
 * a heads-up so their card converts (or they cancel gracefully).
 *
 * Idempotent-ish: we set `updatedAt = now()` on the Subscription row after
 * emailing so the same user doesn't get nagged twice on the same day. This
 * isn't a bulletproof lock (concurrent runs could race), but it's fine for
 * a once-daily cron.
 *
 * Route is public + idempotent. Vercel cron hits it; nothing else should.
 */
export const maxDuration = 30;

export async function GET() {
  const started = Date.now();

  const now = Date.now();
  const cutoff = new Date(now + 48 * 60 * 60 * 1000);

  const candidates = await prisma.subscription.findMany({
    where: {
      status: "trialing",
      currentPeriodEnd: { lte: cutoff, gte: new Date(now) },
    },
  });

  let sent = 0;
  const failures: Array<{ email: string; reason: string }> = [];

  for (const sub of candidates) {
    // Rough "already nagged today" guard: if updatedAt is within the last
    // 20 hours, we probably already sent one from this cron.
    if (
      sub.updatedAt &&
      now - sub.updatedAt.getTime() < 20 * 60 * 60 * 1000 &&
      sub.updatedAt.getTime() > now - 24 * 60 * 60 * 1000
    ) {
      // Only skip if the row was touched by *us* today (email dispatch). We
      // can't cheaply tell that apart from a Stripe webhook update, so this
      // guard is conservative — worst case we skip a legitimate nag day.
      continue;
    }

    const endsAt = sub.currentPeriodEnd
      ? sub.currentPeriodEnd.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : "soon";

    try {
      await sendEmail({
        to: sub.userEmail,
        subject: "Your Futurist trial ends soon",
        html: trialNagHtml({ endsAt, tier: sub.tier }),
      });
      sent++;
      // Touch updatedAt so we don't nag again the same day
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { updatedAt: new Date() },
      });
    } catch (e) {
      failures.push({
        email: sub.userEmail,
        reason: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 10),
    elapsedMs: Date.now() - started,
  });
}

function trialNagHtml(args: { endsAt: string; tier: string }): string {
  const tierLabel = args.tier === "institutional" ? "Institutional" : "Pro";
  return `<!doctype html>
<html><body style="background:#000;color:#e8e8e8;font-family:Menlo,Consolas,monospace;padding:32px;">
  <div style="max-width:560px;margin:0 auto;border:1px solid #222;background:#0f0f0f;">
    <div style="padding:16px 20px;border-bottom:1px solid #222;">
      <span style="color:#ff6600;font-weight:bold;letter-spacing:0.3em;">FUTURIST</span>
      <span style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-left:12px;">Trial Ending Soon</span>
    </div>
    <div style="padding:20px;">
      <p style="font-size:14px;line-height:1.6;color:#e8e8e8;margin:0 0 12px;">
        Your ${tierLabel} trial ends on <strong>${args.endsAt}</strong>.
        After that your card will be charged and access continues seamlessly.
      </p>
      <p style="font-size:13px;line-height:1.6;color:#a3a3a3;margin:0 0 20px;">
        If you'd rather cancel, click Manage Subscription below — access continues to the end of your trial period, no charge.
      </p>
      <a href="https://predix-max-s-projects25.vercel.app/account" style="display:inline-block;padding:10px 16px;background:#ff6600;color:#000;text-decoration:none;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;">Manage Subscription →</a>
    </div>
    <div style="padding:12px 20px;border-top:1px solid #222;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.1em;">
      Sent by Futurist · Trial reminder cron
    </div>
  </div>
</body></html>`;
}
