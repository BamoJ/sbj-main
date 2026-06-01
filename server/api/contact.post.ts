import { Resend } from 'resend'

/**
 * Contact form pipeline.
 *
 *   Form.vue → POST /api/contact → Resend → inbox at CONTACT_TO_EMAIL
 *
 * Reply-To is the submitter's email, so hitting Reply in the inbox goes
 * straight to them — no copy-paste address dance.
 *
 * `from` is locked to onboarding@resend.dev until a custom domain is verified
 * in Resend (DNS step — SPF + DKIM records). After verification, swap the
 * `from` to e.g. `Studio Bamo.J <forms@studio-bamoj.com>`.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default defineEventHandler(async (event) => {
  const { resendApiKey, contactToEmail } = useRuntimeConfig()

  if (!resendApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server not configured — missing RESEND_API_KEY.',
    })
  }
  if (!contactToEmail) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server not configured — missing CONTACT_TO_EMAIL.',
    })
  }

  const body = await readBody<{ name?: string; email?: string; message?: string }>(event)

  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? '').trim()
  const message = String(body?.message ?? '').trim()

  if (!name || !email || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Name, email and message are required.' })
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'That email address looks off.' })
  }
  if (message.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: 'Message is too long (5000 chars max).' })
  }

  const resend = new Resend(resendApiKey)

  const { error } = await resend.emails.send({
    from: 'Studio Bamo.J <onboarding@resend.dev>',
    to: contactToEmail,
    replyTo: email,
    subject: `New inquiry from ${name}`,
    html: `
      <h2 style="margin: 0 0 16px; font-family: system-ui, sans-serif;">New contact form submission</h2>
      <p style="margin: 0 0 8px; font-family: system-ui, sans-serif;">
        <strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;
      </p>
      <p style="margin: 16px 0 4px; font-family: system-ui, sans-serif;"><strong>Message:</strong></p>
      <p style="margin: 0; white-space: pre-wrap; font-family: system-ui, sans-serif; line-height: 1.5;">${escapeHtml(message)}</p>
    `,
    text: `New contact form submission\n\nFrom: ${name} <${email}>\n\nMessage:\n${message}`,
  })

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error.message ?? 'Resend rejected the send.',
    })
  }

  return { ok: true }
})
