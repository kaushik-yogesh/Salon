import puppeteer from 'puppeteer';
import { exec } from 'child_process';

const URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api/v1';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runE2E() {
  console.log('Starting Phase 2 E2E: Customer Workflow');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Users\\yoges\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));
  
  try {
    // 1. Open Public Website (Landing -> Directory)
    console.log('Navigating to Directory...');
    await page.goto(`${URL}/directory`, { waitUntil: 'networkidle2' });
    
    // 2. Find Salon
    console.log('Finding Salon...');
    await page.waitForSelector('a[href^="/book/"]');
    const bookLinks = await page.$$('a[href^="/book/"]');
    if (bookLinks.length === 0) throw new Error('No salons found in directory!');
    
    // We don't click book just yet, we need to register first according to workflow.
    // 3. Register
    console.log('Registering Customer...');
    await page.goto(`${URL}/login`, { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('input[type="text"]');
    const custEmail = `customer_e2e_${Date.now()}@example.com`;
    await page.type('input[type="text"]', custEmail);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('input[placeholder="000000"]', { timeout: 10000 });
    
    // Get OTP from DB
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { identifier: custEmail },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!otpRecord) throw new Error('OTP not found in DB');
    const otp = otpRecord.otp;
    
    await page.type('input[placeholder="000000"]', otp);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('select', { timeout: 10000 }); // Wait for registration page
    
    await page.select('select', 'CUSTOMER');
    const inputs = await page.$$('input[type="text"]');
    await page.evaluate(el => el.value = '', inputs[0]);
    await inputs[0].type('Alice');
    await page.evaluate(el => el.value = '', inputs[1]);
    await inputs[1].type('Smith');
    
    const pwdInputs = await page.$$('input[type="password"]');
    await pwdInputs[0].type('Password123!');
    await pwdInputs[1].type('Password123!');
    
    await page.click('button[type="submit"]');
    
    // Wait for Customer Dashboard
    console.log('Waiting for Customer Dashboard...');
    await page.waitForSelector('h1', { timeout: 10000 });
    const h1Text = await page.evaluate(() => document.querySelector('h1').textContent);
    if (!h1Text.includes('Welcome back')) {
      throw new Error('Did not reach customer dashboard');
    }
    console.log('SUCCESS: Reached Customer Dashboard.');
    
    // 5-8: Go back to directory and Book Appointment
    console.log('Going to Directory to book...');
    await page.goto(`${URL}/directory`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('a[href^="/book/"]');
    
    // Click the LAST Book Now (which should be the one created in Phase 1)
    const allBookLinks = await page.$$('a[href^="/book/"]');
    
    // Extract tenantId from the href
    const href = await page.evaluate(el => el.getAttribute('href'), allBookLinks[allBookLinks.length - 1]);
    const tenantId = href.split('/book/')[1];
    
    // Give all workers of this tenant a schedule for every day
    const worker = await prisma.workerProfile.findFirst({ where: { tenantId } });
    if (worker) {
        await prisma.workerSchedule.createMany({
            data: [0, 1, 2, 3, 4, 5, 6].map(day => ({
                dayOfWeek: day,
                isWorking: true,
                startTime: '00:00',
                endTime: '23:59',
                workerProfileId: worker.id
            })),
            skipDuplicates: true
        });
    }
    
    await allBookLinks[allBookLinks.length - 1].click();
    
    console.log('On Booking Page. Selecting Service...');
    // Step 1: Select Service
    await page.waitForSelector('h4');
    const h4s = await page.$$('h4');
    if (h4s.length === 0) throw new Error('No services found!');
    
    // Click the parent div of the first h4
    await page.evaluate(el => el.parentElement.parentElement.click(), h4s[0]);
    
    console.log('Selecting Date and Time...');
    // Step 2: Date & Time
    await page.waitForFunction(() => document.querySelector('h2').textContent.includes('Date'));
    
    const timeBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes(':00') && !b.disabled);
    });
    const isBtnFound = await page.evaluate(el => !!el, timeBtn);
    if (!isBtnFound) throw new Error('Time button not found');
    await page.evaluate(el => el.click(), timeBtn);
    
    console.log('Filling Details...');
    // Step 3: Details
    await page.waitForFunction(() => document.querySelector('h2').textContent.includes('Details'));
    
    // Fill out the form
    const detailInputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"]');
    // First Name, Last Name, Email, Phone
    // Since inputs don't have good selectors, let's just use tab or placeholder
    await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const fn = inputs.find(i => i.placeholder.includes('First'));
        if (fn) { fn.value = 'Alice'; fn.dispatchEvent(new Event('input', { bubbles: true })); }
        
        const ln = inputs.find(i => i.placeholder.includes('Last'));
        if (ln) { ln.value = 'Smith'; ln.dispatchEvent(new Event('input', { bubbles: true })); }
        
        const em = inputs.find(i => i.placeholder.includes('Email') || i.type === 'email');
        if (em) { em.value = 'alice@example.com'; em.dispatchEvent(new Event('input', { bubbles: true })); }
        
        const ph = inputs.find(i => i.placeholder.includes('Phone') || i.type === 'tel');
        if (ph) { ph.value = '1234567890'; ph.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    
    // We need to type at least one character to trigger React state if evaluate doesn't fully work
    await page.type('input[placeholder="First Name"]', 'a');
    await page.type('input[placeholder="Last Name"]', 'b');
    await page.type('input[type="email"]', 'c');
    await page.type('input[type="tel"]', '1');
    
    await page.click('button[type="submit"]');
    
    console.log('Waiting for confirmation...');
    // Step 4: Success
    await page.waitForFunction(() => {
        const h2 = document.querySelector('h2');
        return h2 && h2.textContent.includes('Confirmed');
    }, { timeout: 15000 });
    
    console.log('Booking Confirmed Successfully!');
    console.log('Phase 2 Customer Workflow completed successfully!');

  } catch (error) {
    console.error('FAILED:', error.message);
    await page.screenshot({ path: 'e2e-screenshot-phase2.png' });
    console.log('Taking failure screenshot...');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
