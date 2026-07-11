import { prisma } from './db.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import webpush from 'web-push';
import { generateAppointmentQR } from './qr.service.js';

// Transports Initialization
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}) : null;

const twilioClient = process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@salonos.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const sendNotification = async ({ tenantId, customerId, type, subject, body, attachment }) => {
  let status = 'PENDING';
  let customerPhone = null;
  let customerEmail = null;

  try {
    const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
    if (customer) {
      customerPhone = customer.phone;
      customerEmail = customer.email;
    }

    if (type === 'EMAIL' && transporter && customerEmail) {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'no-reply@salonos.com',
        to: customerEmail,
        subject,
        text: body,
      };

      if (attachment) {
        mailOptions.attachments = [{
          filename: attachment.filename,
          content: attachment.content.split('base64,')[1],
          encoding: 'base64'
        }];
      }

      await transporter.sendMail(mailOptions);
      status = 'SENT';
    } else if (type === 'SMS' && twilioClient && customerPhone) {
      await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: customerPhone
      });
      status = 'SENT';
    } else if (type === 'WHATSAPP' && twilioClient && customerPhone) {
      await twilioClient.messages.create({
        body,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${customerPhone}`
      });
      status = 'SENT';
    } else {
      console.warn(`[MOCK ${type} SENT] To: ${customerEmail || customerPhone} Subject: ${subject} Body: ${body}`);
      status = 'SENT';
    }

  } catch (error) {
    console.error(`Failed to send ${type} notification:`, error);
    status = 'FAILED';
  }

  // Log in DB
  await prisma.notificationLog.create({
    data: {
      tenantId,
      customerId,
      type,
      status,
      subject,
      body,
      sentAt: status === 'SENT' ? new Date() : null
    }
  });

  return status === 'SENT';
};

export const sendBookingConfirmation = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true }
  });

  if (!appointment || !appointment.customer) return;

  // Generate QR for the email attachment
  const qrBase64 = await generateAppointmentQR(appointmentId);

  await sendNotification({
    tenantId: appointment.tenantId,
    customerId: appointment.customerId,
    type: 'EMAIL',
    subject: 'Booking Confirmed - SalonOS',
    body: `Hi ${appointment.customer.firstName}, your appointment for ${appointment.date.toDateString()} is confirmed! Please find your QR code attached.`,
    attachment: {
      filename: 'booking-qr.png',
      content: qrBase64
    }
  });
};

export const sendPaymentReceipt = async (invoiceId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { appointment: { include: { customer: true } } }
  });

  if (!invoice || !invoice.appointment?.customer) return;

  await sendNotification({
    tenantId: invoice.tenantId,
    customerId: invoice.appointment.customerId,
    type: 'EMAIL',
    subject: 'Payment Receipt - SalonOS',
    body: `Hi ${invoice.appointment.customer.firstName}, we have received your payment of $${invoice.grandTotal.toFixed(2)}. Thank you for visiting!`
  });
};

export const sendPasswordResetEmail = async (email, token) => {
  if (transporter) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@salonos.com',
      to: email,
      subject: 'Password Reset Request - SalonOS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Password Reset</h2>
          <p>You requested a password reset for your SalonOS account.</p>
          <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    });
  } else {
    console.warn(`[MOCK EMAIL SENT] To: ${email} Subject: Password Reset Token: ${token}`);
  }
};

export const sendVerificationEmail = async (email, token) => {
  if (transporter) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@salonos.com',
      to: email,
      subject: 'Verify your Email - SalonOS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Verify your Email</h2>
          <p>Welcome to SalonOS! Please verify your email address to get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email</a>
        </div>
      `
    });
  } else {
    console.warn(`[MOCK EMAIL SENT] To: ${email} Subject: Verify Email Token: ${token}`);
  }
};
