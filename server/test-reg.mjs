import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const api = 'http://localhost:5000/api/v1';

async function run() {
  try {
    // 1. request OTP for Email
    let res = await fetch(api + '/auth/request-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ identifier: 'testowner@example.com' }) });
    console.log('OTP Request:', await res.json());

    const record = await prisma.otpVerification.findUnique({ where: { identifier: 'testowner@example.com' } });
    console.log('OTP in DB:', record.otp);

    // 2. verify OTP
    res = await fetch(api + '/auth/verify-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ identifier: 'testowner@example.com', otp: record.otp }) });
    const verifyResult = await res.json();
    console.log('Verify Result:', verifyResult);

    // 3. request EMAIL OTP
    res = await fetch(api + '/auth/request-email-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: 'testowner@example.com' }) });
    console.log('Email OTP Request:', await res.json());

    const emailRecord = await prisma.otpVerification.findUnique({ where: { identifier: 'testowner@example.com' } });
    console.log('Email OTP in DB:', emailRecord.otp);

    // 4. complete registration
    res = await fetch(api + '/auth/register', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({ 
        registerToken: verifyResult.data.registerToken,
        role: 'OWNER',
        salonName: 'My Salon',
        firstName: 'Test',
        lastName: 'User',
        email: 'testowner@example.com',
        emailOtp: emailRecord.otp
      }) 
    });
    console.log('Register Result:', await res.json());
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
