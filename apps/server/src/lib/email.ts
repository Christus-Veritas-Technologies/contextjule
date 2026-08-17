import prisma from "@contextjule/db";
import { env } from "@contextjule/env/server";

import { mailTransport } from "./mailer";

/**
 * Transactional mail. One template that matters — the one carrying the licence
 * key and the download link — plus a resend of it.
 *
 * Sent over SMTP through nodemailer. Every send is logged, because "I never got
 * the email" is the single most common support message for a product with no
 * account to log into, and the log is the only way to answer it.
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  template: string;
  html: string;
  text: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const log = await prisma.emailLog.create({
    data: { to: input.to, subject: input.subject, template: input.template, status: "queued" },
  });

  const transport = mailTransport();

  // Development sends nothing and prints instead, so a local webhook replay
  // cannot mail a real customer. Also the path taken when SMTP is simply not
  // configured yet — better a logged no-op than a crash on the first purchase.
  if (env.EMAIL_DRY_RUN || !transport) {
    if (!env.EMAIL_DRY_RUN) {
      console.warn("[email] SMTP is not configured — printing instead of sending");
    }
    console.info(`[email:dry-run] ${input.template} -> ${input.to}\n${input.text}`);
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", sentAt: new Date(), providerMessageId: "dry-run" },
    });
    return;
  }

  try {
    const result = await transport.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      // Some inbox providers treat a transactional message with no List-
      // headers as more suspicious than one that declares itself. There is no
      // list to unsubscribe from, so the address is the honest answer.
      headers: { "X-Entity-Ref-ID": log.id },
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
    });

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", sentAt: new Date(), providerMessageId: result.messageId ?? null },
    });

    // `rejected` is not an exception in nodemailer: the SMTP server accepted
    // the session and refused this recipient. Silently treating that as sent is
    // how a bounce becomes invisible.
    if (result.rejected?.length) {
      console.error(`[email] rejected by the server: ${result.rejected.join(", ")}`);
    }
  } catch (error) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        attempts: { increment: 1 },
      },
    });
    // Rethrown on purpose. The webhook catches it, returns 500, and Dodo
    // retries — which is the only retry mechanism worth having here.
    throw error;
  }
}

export interface PurchaseEmailInput {
  to: string;
  licenseKey: string | null;
  downloadUrl: string;
  free: boolean;
}

/**
 * The purchase email. Plain, short, and it leads with the key — that is the
 * thing the reader came for. The download link is second because it expires and
 * the key does not.
 */
export function purchaseEmail(input: PurchaseEmailInput): SendEmailInput {
  const greeting = input.free
    ? "Your free copy of ContextJule is ready."
    : "Thank you for buying ContextJule.";

  const keyBlock = input.licenseKey
    ? `Your licence key:\n\n    ${input.licenseKey}\n\nPaste it into the app the first time you open it. It does not expire.`
    : "Your licence key is being issued and will arrive in a second email shortly.";

  const text = [
    greeting,
    "",
    keyBlock,
    "",
    `Download (Windows and macOS): ${input.downloadUrl}`,
    "",
    "That download link is good for 72 hours. The key is what unlocks the app, so keep the key — you can always ask for a fresh link.",
    "",
    "Jule reads your context window on your machine. Nothing about your sessions ever leaves it.",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#fdf6ea;font-family:'Space Grotesk',system-ui,sans-serif;color:#231b12">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#fffdf8;border:3px solid #221b2c">
        <tr><td style="background:#221b2c;padding:12px 16px;font-family:monospace;font-size:11px;letter-spacing:1px;color:#e8e2d6">contextjule</td></tr>
        <tr><td style="padding:24px 20px">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6">${escapeHtml(greeting)}</p>
          ${
            input.licenseKey
              ? `<p style="margin:0 0 8px;font-family:monospace;font-size:10px;color:#8a7660">YOUR LICENCE KEY</p>
                 <p style="margin:0 0 18px;padding:14px;background:#f0b13f;border:3px solid #221b2c;font-family:monospace;font-size:14px;letter-spacing:2px;word-break:break-all">${escapeHtml(input.licenseKey)}</p>
                 <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#6b5b48">Paste it into the app the first time you open it. It does not expire.</p>`
              : `<p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#6b5b48">Your licence key is being issued and will arrive in a second email shortly.</p>`
          }
          <a href="${escapeHtml(input.downloadUrl)}" style="display:inline-block;padding:14px 22px;background:#f0b13f;border:3px solid #221b2c;box-shadow:4px 4px 0 #221b2c;font-family:monospace;font-size:12px;color:#221b2c;text-decoration:none">download for windows and mac</a>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#8a7660">That link is good for 72 hours. The key is what unlocks the app, so keep the key — you can always ask for a fresh link.</p>
        </td></tr>
        <tr><td style="padding:14px 20px;background:#fdf6ea;border-top:3px solid #221b2c;font-size:12px;line-height:1.6;color:#6b5b48">
          Jule reads your context window on your machine. Nothing about your sessions ever leaves it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    to: input.to,
    subject: input.free ? "Your free copy of ContextJule" : "Your ContextJule licence key",
    template: input.free ? "purchase-free" : "purchase",
    html,
    text,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
