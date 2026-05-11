import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

/**
 * Smoke test for Resend wiring. Hit it once after deploy to verify
 * RESEND_API_KEY is set and the From-address is accepted by Resend.
 *
 * GET /api/test-email
 */
export async function GET() {
  try {
    const result = await sendEmail({
      to: process.env.ALERT_EMAIL_TO ?? "",
      subject: "[Predix] Test email — wiring check",
      html: `<p>If you received this, Resend is wired and Predix can send alerts.</p>
             <p style="color:#888;font-size:12px;">Sent at ${new Date().toISOString()}</p>`,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
