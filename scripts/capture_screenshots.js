const puppeteer = require('../frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'https://supportdesk-frontend-ecgs.onrender.com';
const BACKEND_URL = 'https://supportdesk-backend-ypdr.onrender.com';
const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1.5 });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/')) {
      const targetUrl = url.replace(/https:\/\/[^/]+\/api\//, `${BACKEND_URL}/api/`);
      req.continue({ url: targetUrl });
    } else {
      req.continue();
    }
  });

  try {
    // 1. Dashboard
    console.log('1. Capturing My Dashboard...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('main', { timeout: 15000 });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard.png') });

    // 2. Ticket Queue
    console.log('2. Capturing All Tickets Queue...');
    await page.goto(`${BASE_URL}/queue`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ticket-queue.png') });

    // 3. Investigation Workbench
    console.log('3. Capturing Investigation Workbench (SUP-10001)...');
    await page.goto(`${BASE_URL}/workbench/SUP-10001`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'investigation-workbench.png') });

    // 4. Diagnostic Checklist
    console.log('4. Capturing Diagnostic Checklist...');
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3, h2'));
      const target = headings.find(h => h.textContent && h.textContent.includes('Diagnostic Checklist'));
      if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        window.scrollTo(0, 350);
      }
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'diagnostic-checklist.png') });

    // 5. Ticket History & Investigation Notes
    console.log('5. Capturing Ticket History & Notes...');
    await page.evaluate(() => {
      window.scrollTo(0, 850);
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ticket-history.png') });

    // 6. AI Assistant panel
    console.log('6. Capturing AI Assistant...');
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ai-assistant.png') });

    // 7. Resolution Workflow Modal
    console.log('7. Capturing Resolution Workflow Modal...');
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    const resolveBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Resolve Ticket'));
    });
    if (resolveBtn && resolveBtn.asElement()) {
      await resolveBtn.asElement().click();
      await sleep(2000);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'resolution-workflow.png') });
      
      // Close modal
      const cancelBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent && (b.textContent.includes('Cancel') || b.textContent.includes('Close')));
      });
      if (cancelBtn && cancelBtn.asElement()) {
        await cancelBtn.asElement().click();
        await sleep(500);
      }
    }

    // 8. Escalation Quality Gate
    console.log('8. Capturing Escalation Quality Gate...');
    await page.goto(`${BASE_URL}/escalation/SUP-10001`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'escalation-quality-gate.png') });

    // 9. Engineering Handoff
    console.log('9. Capturing Engineering Handoff...');
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'engineering-handoff.png') });

    // 10. Team Insights / Operational Intelligence
    console.log('10. Capturing Team Insights...');
    await page.goto(`${BASE_URL}/intelligence`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'team-insights.png') });

    // 11. AI Provider Health / AI Status
    console.log('11. Capturing AI Status & Telemetry...');
    await page.goto(`${BASE_URL}/ai-health`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ai-provider-health.png') });

    console.log('All 11 target screenshots captured successfully with live backend data!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

capture();
