'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'olemieux@levicapital.ca';

export type ContactType = 'broker' | 'lender' | 'partner';

interface ContactFormData {
  type: ContactType;
  name: string;
  email: string;
  phone?: string;
  doors?: string;
  city?: string;
  institution?: string;
  context?: string;
  notes?: string;
}

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

export async function submitContactForm(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
  try {
    // Send notification to ORÉA
    await resend.emails.send({
      from: 'ORÉA <noreply@oreaholding.com>',
      to: CONTACT_EMAIL,
      subject: `${subjects[data.type]} — ${data.name}`,
      text: buildEmailBody(data),
      replyTo: data.email,
    });

    // Send confirmation to the submitter
    await resend.emails.send({
      from: 'ORÉA <noreply@oreaholding.com>',
      to: data.email,
      subject: 'ORÉA — Votre message a bien été reçu',
      html: buildConfirmationHtml(data),
    });

    return { success: true };
  } catch (error) {
    console.error('Contact form error:', error);
    return { success: false, error: 'Failed to send' };
  }
}
