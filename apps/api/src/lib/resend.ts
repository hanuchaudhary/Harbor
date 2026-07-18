import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

export async function sendEmail(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY missing; skipping email to", opts.to);
    return;
  }
  await resend.emails.send(opts).catch((error) => {
    console.error("Resend email error:", error);
  });
}
