import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

let client = null;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn('[SMS Service] Twilio credentials missing in .env. Real SMS will NOT be sent.');
}

/**
 * Sends an SMS OTP to a given phone number
 * @param {string} to - The recipient's phone number (e.g., +919876543210)
 * @param {string} body - The message content
 */
export const sendSms = async (to, body) => {
  if (!client) {
    console.log(`[SMS MOCK] To: ${to} | Body: ${body}`);
    return { success: true, mocked: true };
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: fromPhone,
      to: to
    });
    console.log(`[SMS Sent] Message SID: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('[SMS Error]', error.message);
    throw error;
  }
};
