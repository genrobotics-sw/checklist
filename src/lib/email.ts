import nodemailer from 'nodemailer'

// Create a reusable transporter object using Google's SMTP server
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendEmail({ to, subject, text }: { to: string, subject: string, text: string }) {
  // If you haven't provided your Gmail credentials in the .env.local file yet,
  // we will safely log the email to the terminal so the app doesn't crash.
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log('\n=============================================')
    console.log('[MOCK EMAIL - Missing SMTP_EMAIL or SMTP_PASSWORD]')
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}`)
    console.log('=============================================\n')
    return { success: true, mocked: true }
  }

  try {
    const info = await transporter.sendMail({
      from: `"G-list Notifications" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      text,
    })

    return { success: true, data: info }
  } catch (error) {
    console.error('Email exception:', error)
    return { success: false, error }
  }
}
