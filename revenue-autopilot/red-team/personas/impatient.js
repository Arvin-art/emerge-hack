// Impatient — Rage-clicks Search without filling fields
const { chromium } = require('playwright');
const axios = require('axios');

const SITE    = 'http://localhost:5173';
const BACKEND = 'http://localhost:3001';

async function run() {
  console.log('\n[Impatient] ━━━ Starting Rage-Click Simulation ━━━');
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(SITE);
  await page.waitForLoadState('networkidle');
  console.log('[Impatient] Site loaded — rage-clicking Search...');

  const btn = page.locator('button:has-text("Search Flights")');
  for (let i = 1; i <= 6; i++) {
    await btn.click({ delay: 60 });
    console.log(`[Impatient]  click ${i}/6`);
  }

  await page.waitForTimeout(800);
  console.log('[Impatient] Reporting RAGE_CLICK crack...');

  await axios.post(`${BACKEND}/report-crack`, {
    type:        'RAGE_CLICK',
    severity:    'MEDIUM',
    page:        '/search',
    description: 'User clicked Search button 6× rapidly with no validation feedback shown — form appears unresponsive',
  });

  console.log('[Impatient] Crack reported ✓');
  await page.waitForTimeout(1500);
  await browser.close();
  console.log('[Impatient] ━━━ Done ━━━\n');
}

run().catch(e => { console.error('[Impatient] Error:', e.message); process.exit(1); });
