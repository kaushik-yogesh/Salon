import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from './db.js';

/**
 * Generates a secure token and a QR Code image buffer.
 * Saves the token to the given appointment.
 * 
 * @param {string} appointmentId
 * @returns {Promise<string>} Base64 data URI of the QR code image
 */
export const generateAppointmentQR = async (appointmentId) => {
  // 1. Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Expiry in 24 hours

  // 2. Update the appointment with the token
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      qrToken: token,
      qrExpiresAt: expiresAt,
      qrUsedAt: null, // Reset if regenerating
    }
  });

  // 3. Generate QR code (Base64 string)
  // We embed just the raw token so the scanner can directly query the database
  const qrBase64 = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    width: 300,
  });

  return qrBase64;
};
