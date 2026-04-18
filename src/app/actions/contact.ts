'use server';

import { Resend } from 'resend';
import { headers } from 'next/headers';
import { contactSchema, type ContactFormData } from '@/lib/validators';

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'olemieux@levicapital.ca';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestLog = new Map<string, number[]>();

export type ContactType = 'broker' | 'lender' | 'partner';

const subjects: Record<ContactType, string> = {
  broker: 'Soumission immeuble',
  lender: 'Discussion financement',
  partner: 'Discussion partenariat',
};

function buildEmailBody(data: ContactFormData): string {
  const lines = [
    `Type: ${subjects[data.type]}`,
    `Nom: ${data.name}`,
    `Email: ${data.email}`,
  ];

  if (data.phone) lines.push(`Téléphone: ${data.phone}`);
  if (data.doors) lines.push(`Nombre de portes: ${data.doors}`);
  if (data.city) lines.push(`Ville / Secteur: ${data.city}`);
  if (data.institution) lines.push(`Institution: ${data.institution}`);
  lines.push(`Message: ${data.message}`);
  if (data.context) lines.push(`Contexte: ${data.context}`);
  if (data.notes) lines.push(`Notes: ${data.notes}`);

  return lines.join('\n');
}

function buildConfirmationHtml(data: ContactFormData): string {
  const isBroker = data.type === 'broker';

  return `
    <div style="font-family: Georgia, serif; color: #0A0A0A; max-width: 500px;">
      <p>Bonjour ${data.name},</p>
      <p>Nous avons bien reçu votre message.</p>
      ${isBroker
        ? '<p>Notre équipe analyse chaque opportunité individuellement. Vous recevrez une réponse dans les 48 prochaines heures.</p>'
        : '<p>Nous prendrons connaissance de votre message et reviendrons vers vous dans les meilleurs délais.</p>'
      }
      <p style="margin-top: 24px;">
        Cordialement,<br/>
        <strong>Olivier Lemieux</strong><br/>
        <span style="color: #6B6B6B;">ORÉA — Holding immobilière</span><br/>
        <span style="color: #6B6B6B;">${CONTACT_EMAIL}</span><br/>
        <span style="color: #6B6B6B;">(514) 876-5276</span>
      </p>
    </div>
  `;
}

async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const realIp = requestHeaders.get('x-real-ip');
  const cfIp = requestHeaders.get('cf-connecting-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return realIp?.trim() || cfIp?.trim() || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recentRequests = (requestLog.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(ip, recentRequests);
    return true;
  }

  recentRequests.push(now);
  requestLog.set(ip, recentRequests);
  return false;
}

export async function submitContactForm(payload: unknown): Promise<{ success: boolean; error?: 'validation' | 'rate_limited' | 'send_failed' }> {
  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    return { success: false, error: 'validation' };
  }

  const data = parsed.data;

  if (data.website) {
    return { success: true };
  }

  const ip = await getClientIp();
  if (isRateLimited(ip)) {
    return { success: false, error: 'rate_limited' };
  }

  try {
    await resend.emails.send({
      from: 'ORÉA <onboarding@resend.dev>',
      to: CONTACT_EMAIL,
      subject: `${subjects[data.type]} — ${data.name}`,
      text: buildEmailBody(data),
      replyTo: data.email,
    });

    // Send confirmation to the submitter
    await resend.emails.send({
      from: 'ORÉA <onboarding@resend.dev>',
      to: data.email,
      subject: 'ORÉA — Votre message a bien été reçu',
      html: buildConfirmationHtml(data),
    });

    return { success: true };
  } catch (error) {
    console.error('Contact form error:', error);
    return { success: false, error: 'send_failed' };
  }
}
