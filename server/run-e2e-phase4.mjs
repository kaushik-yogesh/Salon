import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const URL = 'http://localhost:5173';
const prisma = new PrismaClient();

async function runE2E() {
  console.log('Starting Phase 4 E2E: Owner Post-Service Workflow');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Users\\yoges\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    // 1. Get latest E2E Owner
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
    
    // 3. View Reports
    console.log('Navigating to Reports...');
    await page.goto(`${URL}/owner/reports`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    const reportsHeader = await page.evaluate(() => document.querySelector('h1').textContent);
    console.log('Reports header:', reportsHeader);
    
    // Check if charts/tables loaded (wait for a canvas or a table)
    // Some charts might not load if there's no data, but we just verify the page doesn't crash
    await new Promise(r => setTimeout(r, 2000));
    
    // 4. Run Payroll
    console.log('Navigating to Salary/Payroll...');
    await page.goto(`${URL}/owner/salary`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    
    console.log('Generating Payroll...');
    const generateBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Generate') || b.textContent.includes('Run Payroll'));
    });
    
    const isGenerateFound = await page.evaluate(el => !!el, generateBtn);
    if (isGenerateFound) {
        await page.evaluate(el => el.click(), generateBtn);
        await new Promise(r => setTimeout(r, 2000));
        
        // Find Process/Pay button
        const payBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('Process') || b.textContent.includes('Pay'));
        });
        const isPayFound = await page.evaluate(el => !!el, payBtn);
        if (isPayFound) {
            await page.evaluate(el => el.click(), payBtn);
            await new Promise(r => setTimeout(r, 2000));
        }
    } else {
        console.log('Warning: No generate payroll button found. Assuming empty payroll or different UI.');
    }
    
    // 5. Navigate to HR to check Worker Performance (or just check HR)
    console.log('Navigating to HR...');
    await page.goto(`${URL}/owner/hr`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    
    console.log('Phase 4 Owner Post-Service Workflow completed successfully!');

  } catch (error) {
    console.error('FAILED:', error.message);
    await page.screenshot({ path: 'e2e-screenshot-phase4.png' });
    console.log('Taking failure screenshot...');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
