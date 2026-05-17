/**
 * Email delivery via Resend's HTTPS API. Plain fetch — no SDK dependency.
 * https://resend.com/docs/api-reference/emails/send-email
 */

type SendEmailOpts = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

type ResendResponse = { id?: string; statusCode?: number; message?: string };

export async function sendEmail(opts: SendEmailOpts): Promise<ResendResponse> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  const from = opts.from ?? process.env.ALERT_EMAIL_FROM ?? "Predix <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? stripHtml(opts.html),
    }),
  });

  const json = (await res.json().catch(() => ({}))) as ResendResponse;
  if (!res.ok) {
    throw new Error(
      `Resend send failed (${res.status}): ${json.message ?? "unknown"}`,
    );
  }
  return json;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Predix-branded HTML wrapper. Keep super simple — terminal aesthetic.
 */
export function alertEmailHtml(args: {
  question: string;
  ruleHuman: string;
  currentPrice: number;
  threshold: number;
  marketUrl: string;
}): string {
  const { question, ruleHuman, currentPrice, threshold, marketUrl } = args;
  return `<!doctype html>
<html><body style="background:#05070a;color:#e6edf3;font-family:Menlo,Consolas,monospace;padding:32px;">
  <div style="max-width:560px;margin:0 auto;border:1px solid #1c2128;background:#0b0f14;">
    <div style="padding:16px 20px;border-bottom:1px solid #1c2128;">
      <span style="color:#22d3ee;font-weight:bold;letter-spacing:0.3em;">FUTURIST</span>
      <span style="color:#7d8590;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-left:12px;">Alert Triggered</span>
    </div>
    <div style="padding:20px;">
      <div style="font-size:14px;font-weight:600;color:#e6edf3;line-height:1.5;">${escapeHtml(question)}</div>
      <table style="width:100%;margin-top:16px;font-size:12px;">
        <tr><td style="color:#7d8590;padding:4px 0;">Rule</td><td style="text-align:right;color:#e6edf3;">${escapeHtml(ruleHuman)}</td></tr>
        <tr><td style="color:#7d8590;padding:4px 0;">Threshold</td><td style="text-align:right;color:#e6edf3;">${(threshold * 100).toFixed(1)}%</td></tr>
        <tr><td style="color:#7d8590;padding:4px 0;">Current YES</td><td style="text-align:right;color:#22d3ee;font-weight:600;">${(currentPrice * 100).toFixed(1)}%</td></tr>
      </table>
      <div style="margin-top:20px;">
        <a href="${marketUrl}" style="display:inline-block;padding:8px 14px;background:#22d3ee;color:#000;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Open Market →</a>
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid #1c2128;font-size:10px;color:#4a525c;text-transform:uppercase;letter-spacing:0.1em;">
      Sent by Futurist · You set this alert in the terminal
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
