import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const api = 'http://localhost:5000/api/v1';

async function run() {
  try {
    const testEmail = 'pwdtest1@example.com';
    const password = 'MySecretPassword123';

    console.log('--- 1. Check User (Should not exist) ---');
    let res = await fetch(api + '/auth/check', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ identifier: testEmail }) });
    console.log(await res.json());

    console.log('\n--- 2. Request OTP ---');
    res = await fetch(api + '/auth/request-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ identifier: testEmail }) });
    console.log(await res.json());

    const record = await prisma.otpVerification.findUnique({ where: { identifier: testEmail } });
    
    console.log('\n--- 3. Verify OTP ---');
    res = await fetch(api + '/auth/verify-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ identifier: testEmail, otp: record.otp }) });
    const verifyResult = await res.json();
    console.log(verifyResult);

    console.log('\n--- 4. Complete Registration (With Password) ---');
    res = await fetch(api + '/auth/register', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({ 
        registerToken: verifyResult.data.registerToken,
        role: 'CUSTOMER',
        firstName: 'Pwd',
        lastName: 'Test',
        email: testEmail,
        password: password
      }) 
    });
    console.log(await res.json());

    console.log('\n--- 5. Check User Again (Should exist & have password) ---');
    res = await fetch(api + '/auth/check', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ identifier: testEmail }) });
    console.log(await res.json());

    console.log('\n--- 6. Login with Password ---');
    res = await fetch(api + '/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ identifier: testEmail, password: password }) });
    console.log(await res.json());

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
