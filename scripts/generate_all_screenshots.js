const puppeteer = require('../frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'https://supportdesk-frontend-ecgs.onrender.com';
const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting screenshot generation from live site:', BASE_URL);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  try {
    // 1. Dashboard
    console.log('1. Dashboard...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard.png') });

    // 2. All Tickets Queue
    console.log('2. Ticket Queue...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('All Tickets'));
      if (btn) btn.click();
    });
    await sleep(3000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ticket-queue.png') });

    // 3. Select a ticket to open workbench (click first row in the table)
    console.log('3. Opening ticket in Workbench...');
    await page.evaluate(() => {
      // Find row or ticket ID button in the queue
      const buttons = Array.from(document.querySelectorAll('button, td, div'));
      const ticketLink = buttons.find(b => b.textContent && b.textContent.trim().startsWith('SUP-'));
      if (ticketLink) {
        ticketLink.closest('button, tr, div.cursor-pointer')?.click();
      }
    });
    await sleep(3500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'investigation-workbench.png') });

    // 4. Diagnostic Checklist view
    console.log('4. Diagnostic Checklist...');
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'diagnostic-checklist.png') });

    // 5. Ticket History & Investigation Notes
    console.log('5. Ticket History...');
    await page.evaluate(() => {
      window.scrollTo(0, 850);
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ticket-history.png') });

    // 6. AI Assistant Widget
    console.log('6. AI Assistant...');
    await page.evaluate(() => {
      window.scrollTo(0, 150);
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ai-assistant.png') });

    // 7. Resolution Workflow Modal
    console.log('7. Resolution Workflow Modal...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(800);
    const resolveBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Resolve Ticket'));
    });
    if (resolveBtn && resolveBtn.asElement()) {
      await resolveBtn.asElement().click();
      await sleep(2500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'resolution-workflow.png') });
      
      // Close modal
      const cancelBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent && (b.textContent.includes('Cancel') || b.textContent.includes('Close')));
      });
      if (cancelBtn && cancelBtn.asElement()) {
        await cancelBtn.asElement().click();
        await sleep(800);
      }
    }

    // 8. Escalation Quality Gate
    console.log('8. Escalation Quality Gate...');
    const escalateBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && (b.textContent.includes('Review Escalation') || b.textContent.includes('Escalate to Engineering') || b.textContent.includes('Quality Gate')));
    });
    if (escalateBtn && escalateBtn.asElement()) {
      await escalateBtn.asElement().click();
    } else {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const navBtn = btns.find(b => b.textContent && b.textContent.includes('Escalation Review'));
        if (navBtn) navBtn.click();
      });
    }
    await sleep(3500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'escalation-quality-gate.png') });

    // 9. Engineering Handoff
    console.log('9. Engineering Handoff...');
    await page.evaluate(() => {
      window.scrollTo(0, 600);
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'engineering-handoff.png') });

    // 10. Team Insights / Operational Intelligence
    console.log('10. Team Insights...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const navBtn = btns.find(b => b.textContent && b.textContent.includes('Team Insights'));
      if (navBtn) navBtn.click();
    });
    await sleep(4000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'team-insights.png') });

    // 11. AI Status
    console.log('11. AI Status...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const navBtn = btns.find(b => b.textContent && b.textContent.includes('AI Status'));
      if (navBtn) navBtn.click();
    });
    await sleep(3500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ai-provider-health.png') });

    console.log('SUCCESS: All 11 screenshots captured from live production deployment!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

run();
