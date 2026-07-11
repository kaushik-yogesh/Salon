import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (to, subject, text, html) => {
  try {
    // 1. Try Resend if configured
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      
      const { data, error } = await resend.emails.send({
        from: `SalonOS <${fromEmail}>`,
        to: [to],
        subject,
        text,
        html,
      });

      if (error) throw new Error(error.message);
      
      console.log(`[Email Sent via Resend] Message ID: ${data?.id}`);
      return data;
    }

    // 2. Fallback to Nodemailer if SMTP is configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = createTransporter();
      const info = await transporter.sendMail({
        from: `"SalonOS" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`[Email Sent via SMTP] Message ID: ${info.messageId}`);
      return info;
    }

    // 3. Fallback to Console (Development mode)
    console.warn('[Email Service] Neither RESEND_API_KEY nor SMTP_USER found in .env. Real Email will NOT be sent.');
    return null;

  } catch (error) {
    console.error('[Email Error]', error.message);
    throw error;
  }
};
