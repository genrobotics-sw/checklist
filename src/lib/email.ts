import nodemailer from 'nodemailer'

// Explicit SMTP config (instead of the "gmail" service shorthand) — more
// reliable on serverless platforms and lets us set timeouts so a bad
// connection fails fast with a real error instead of hanging.
function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  })
}

export async function sendEmail({ to, subject, text }: { to: string, subject: string, text: string }) {
  // If credentials aren't configured, log the email instead of crashing.
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log('\n=============================================')
    console.log('[MOCK EMAIL - Missing SMTP_EMAIL or SMTP_PASSWORD]')
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}`)
    console.log('=============================================\n')
    return { success: true, mocked: true }
  }

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: `"G-list Notifications" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      text,
    })

    console.log(`[EMAIL SENT] to=${to} messageId=${info.messageId}`)
    return { success: true, data: info }
  } catch (error) {
    // Log everything nodemailer gives us — code/command/response are the
    // parts that actually explain *why* (auth rejected, timeout, etc).
    const err = error as { message?: string; code?: string; command?: string; responseCode?: number; response?: string }
    console.error('[EMAIL FAILED]', {
      to,
      message: err?.message,
      code: err?.code,
      command: err?.command,
      responseCode: err?.responseCode,
      response: err?.response,
    })
    return { success: false, error }
  }
}
