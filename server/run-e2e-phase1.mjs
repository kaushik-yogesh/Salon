import puppeteer from 'puppeteer';

async function runPhase1() {
  console.log('Starting Phase 1 E2E: Owner Workflow');
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Users\\yoges\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe'
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  try {
    // 1. Register Owner
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    
    // Type email
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'owner_e2e_25@example.com');
    await page.click('button[type="submit"]');
    
    // Wait for OTP
    console.log('Waiting for OTP screen...');
    try {
      await page.waitForSelector('input[placeholder="000000"]', { timeout: 15000 });
    } catch (e) {
      console.log('Timeout waiting for OTP screen. Capturing screenshot...');
      await page.screenshot({ path: 'e2e-screenshot.png' });
      throw e;
    }
    await page.type('input[placeholder="000000"]', '123456');
    await page.click('button[type="submit"]');
    
    // 2. Wait for Register Page
    console.log('Waiting for Register page...');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    if (page.url().includes('/register')) {
      console.log('On Register page. Filling details...');
      await page.waitForSelector('select', { timeout: 5000 });
      await page.select('select', 'OWNER');
      // The inputs might not have names if they are standard, let's use labels or generic order.
      // 0: First Name, 1: Last Name, 2: Salon Name, 3: Password, 4: Confirm Password
      const inputs = await page.$$('input[type="text"], input[type="password"]');
      if (inputs.length >= 5) {
        await inputs[0].type('E2E'); // First Name
        await inputs[1].type('Owner'); // Last Name
        await inputs[2].type('E2E Salon'); // Salon Name
        await inputs[3].type('Password123'); // Password
        await inputs[4].type('Password123'); // Confirm Password
      } else {
        throw new Error('Could not find all registration inputs. Found: ' + inputs.length);
      }
      
      // Click Complete Registration
      const buttons = await page.$$('button[type="submit"]');
      await buttons[buttons.length - 1].click();

      
      // 3. Wait for Dashboard
      console.log('Waiting for Dashboard...');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      console.log('Currently at:', page.url());
      if (!page.url().includes('/dashboard')) {
         throw new Error('Did not reach dashboard, current URL: ' + page.url());
      }
      console.log('SUCCESS: Reached Dashboard.');
      // 4. Create Branch
      console.log('Navigating to Settings for Branch creation...');
      await page.goto('http://localhost:5173/owner/settings', { waitUntil: 'networkidle0' });
      
      console.log('Waiting and Clicking Add Branch...');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Branch')));
      const addBranchBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Branch')));
      await addBranchBtn.click();
      
      console.log('Filling Branch Details...');
      await page.waitForSelector('input[name="name"]');
      await page.type('input[name="name"]', 'Main Street Branch');
      await page.type('input[name="address"]', '123 Main St, NY');
      
      const saveBranchBtn = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save') && b.type === 'submit');
      });
      await saveBranchBtn.click();
      
      // Wait for branch modal to close
      await page.waitForFunction(() => !document.querySelector('input[name="name"]'), { timeout: 5000 });
      console.log('Branch created successfully!');

      // 5. Configure Categories
      console.log('Navigating to Catalog...');
      await page.goto('http://localhost:5173/owner/catalog', { waitUntil: 'networkidle0' });
      
      console.log('Waiting and Clicking CATEGORIES tab...');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('CATEGORIES')));
      const catTab = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('CATEGORIES')));
      await page.evaluate(el => el.click(), catTab);
      
      console.log('Adding Category...');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('+ Add Category')));
      const addCatBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('+ Add Category')));
      await page.evaluate(el => el.click(), addCatBtn);
      await page.waitForSelector('input[name="name"]');
      await page.type('input[name="name"]', 'Haircuts');
      
      await page.waitForSelector('button[type="submit"]');
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !document.querySelector('input[name="name"]'), { timeout: 5000 });
      
      // 6. Configure Services
      console.log('Clicking SERVICES tab...');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SERVICES')));
      const servTab = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SERVICES')));
      await page.evaluate(el => el.click(), servTab);
      
      console.log('Adding Service...');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('+ Add Service')));
      const addServBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('+ Add Service')));
      await page.evaluate(el => el.click(), addServBtn);
      await page.waitForSelector('input[name="name"]');
      
      await page.type('input[name="name"]', 'Men Haircut');
      await page.type('input[name="basePrice"]', '30');
      await page.type('input[name="baseDuration"]', '30');
      
      await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && !btn.disabled && btn.textContent.includes('Add Service');
      });
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !document.querySelector('input[name="name"]'), { timeout: 5000 });
      
      // 7. Add Workers & 8. Configure Commission
      console.log('Navigating to HR / Workers...');
      await page.goto('http://localhost:5173/owner/hr', { waitUntil: 'networkidle0' });
      
      console.log('Waiting and Clicking Add Worker...');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Worker')));
      const addWorkerBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Worker')));
      await addWorkerBtn.click();
      
      await page.waitForSelector('input[name="email"]');
      await page.type('input[name="email"]', 'worker_e2e_25@example.com');
      await page.type('input[name="title"]', 'Stylist');
      await page.type('input[name="commission"]', '50'); // Step 9: Configure Commission
      await page.type('textarea[name="bio"]', 'Experienced stylist');
      
      await page.waitForSelector('button[type="submit"]');
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !document.querySelector('input[name="email"]'), { timeout: 5000 });
      
      console.log('Worker Added!');

    }

    console.log('Phase 1 Registration and Setup completed successfully!');
  } catch (err) {
    console.error('FAILED:', err.message);
    console.log('Taking failure screenshot...');
    await page.screenshot({ path: 'e2e-screenshot-failure.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

runPhase1();
