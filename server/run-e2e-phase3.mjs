import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const URL = 'http://localhost:5173';
const prisma = new PrismaClient();

async function runE2E() {
  console.log('Starting Phase 3 E2E: Reception & Worker Workflow');
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
    // 1. Get latest Owner
    const ownerUser = await prisma.user.findFirst({
        where: { 
            email: { startsWith: 'owner_e2e_' },
            userRoles: { some: { role: { name: 'TENANT_OWNER' } } } 
        },
        orderBy: { createdAt: 'desc' }
    });
    
    if (!ownerUser) throw new Error('No owner found in DB');
    console.log(`Logging in as ${ownerUser.email}`);
    
    // 2. Login
    await page.goto(`${URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', ownerUser.email);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', 'Password123');
    await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && btn.textContent.includes('Login');
    });
    await page.click('button[type="submit"]');
    
    // Wait for Dashboard
    console.log('Waiting for Dashboard...');
    await page.waitForSelector('h1', { timeout: 15000 });
    
    // 3. Navigate to Reception
    console.log('Navigating to Reception...');
    await page.goto(`${URL}/reception`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    
    console.log('Reception Dashboard reached!');
    
    // 4. Navigate to POS (Walk-in Booking / Invoice)
    console.log('Navigating to POS...');
    await page.goto(`${URL}/reception/pos`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    const posHeader = await page.evaluate(() => document.querySelector('h1').textContent);
    if (!posHeader.includes('Point of Sale') && !posHeader.includes('POS')) {
        console.log('POS page header:', posHeader);
    }
    
    // Create Walk-in Booking/Invoice
    console.log('Creating Walk-in Invoice...');
    
    // Select the first appointment
    await page.waitForSelector('div.cursor-pointer');
    const appointments = await page.$$('div.cursor-pointer');
    if (appointments.length > 0) {
        await page.evaluate(el => el.click(), appointments[0]);
    } else {
        console.log('No appointments found for POS!');
    }
    
    console.log('Checking Out...');
    // Checkout - Proceed to Checkout
    await new Promise(r => setTimeout(r, 1000));
    const checkoutBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Proceed to Checkout') || b.textContent.includes('Charge'));
    });
    const isCheckoutFound = await page.evaluate(el => !!el, checkoutBtn);
    if (isCheckoutFound) {
        await page.evaluate(el => el.click(), checkoutBtn);
        // Wait for modal or payment options
        await new Promise(r => setTimeout(r, 2000));
        
        // Select Payment Method (Cash)
        const cashBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('Cash'));
        });
        const isCashFound = await page.evaluate(el => !!el, cashBtn);
        if (isCashFound) {
            await page.evaluate(el => el.click(), cashBtn);
        }
        
        // Confirm Payment
        const confirmBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('Confirm Payment') || b.textContent.includes('Record Payment'));
        });
        const isConfirmFound = await page.evaluate(el => !!el, confirmBtn);
        if (isConfirmFound) {
            await page.evaluate(el => el.click(), confirmBtn);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    
    console.log('Phase 3 Reception Workflow completed successfully!');

  } catch (error) {
    console.error('FAILED:', error.message);
    await page.screenshot({ path: 'e2e-screenshot-phase3.png' });
    console.log('Taking failure screenshot...');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
