import { env } from "@contextjule/env/server";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * The SMTP transport.
 *
 * One connection pool for the process, built lazily so a server with mail
 * disabled never opens a socket. Nodemailer over plain SMTP rather than a
 * provider SDK: the purchase email is the single most important thing this
 * backend sends, and SMTP means it can be moved between providers by editing
 * five environment variables instead of by a deploy.
 *
 * Pooled, because the two events that produce mail — `payment.succeeded` and
 * `entitlement_grant.delivered` — arrive in bursts during a launch, and a fresh
 * TLS handshake per message is both slow and the thing that gets an IP
 * throttled.
 */
let transporter: Transporter | null = null;

export function mailTransport(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // Implicit TLS on 465, STARTTLS everywhere else. Derived from the port
    // rather than configured separately, because the two disagreeing is the
    // single most common way an SMTP config fails with an unhelpful error.
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    pool: true,
    maxConnections: 3,
    // A message that has not gone in twenty seconds is not going. Failing fast
    // lets the webhook return 500 and lets Dodo retry, which is a better
    // recovery path than a request hanging until the platform kills it.
    connectionTimeout: 20_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

/**
 * Prove the credentials work, without sending anything.
 *
 * Called at boot so a bad password shows up in the deploy log rather than in
 * the first customer's missing email.
 */
export async function verifyMailTransport(): Promise<boolean> {
  const transport = mailTransport();
  if (!transport) return false;
  try {
    await transport.verify();
    return true;
  } catch (error) {
    console.error("[mail] SMTP verification failed", error);
    return false;
  }
}
