// Hesitator — Dwells on Payment page without input
const { chromium } = require('playwright');
const axios = require('axios');

const SITE     = 'http://localhost:5173';
const BACKEND  = 'http://localhost:3001';
const DWELL_MS = 12000;

async function run() {
  console.log('\n[Hesitator] ━━━ Starting Dwell-Time Simulation ━━━');
  const browser = await chromium.launch({ headless: false, slowMo: 180 });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(SITE);
  await page.waitForLoadState('networkidle');

  // Step 1 — Search
  await page.fill('input[placeholder="New York (JFK)"]', 'Chicago (ORD)');
  await page.fill('input[placeholder="Los Angeles (LAX)"]', 'Miami (MIA)');
  await page.locator('input[type="date"]').fill('2026-06-10');
  await page.click('button:has-text("Search Flights")');
  await page.waitForURL('**/details', { timeout: 5000 });

  // Step 2 — Details
  await page.fill('#first-name',             'Jane');
  await page.fill('[data-cache="lastName"]', 'Smith');
  await page.fill('[data-cache="email"]',    'jane.smith@example.com');
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/seat', { timeout: 5000 });

  // Step 3 — Seat Selection
  await page.locator('rect[data-seat="7C"]').click();
  await page.waitForTimeout(300);
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/payment', { timeout: 5000 });

  console.log(`[Hesitator] Reached /payment — dwelling ${DWELL_MS / 1000}s without input...`);
  await page.waitForTimeout(DWELL_MS);

  await axios.post(`${BACKEND}/report-crack`, {
    type:        'DWELL_TIMEOUT',
    severity:    'MEDIUM',
    page:        '/payment',
    description: `User idle ${DWELL_MS / 1000}s on /payment — no card input detected, likely hesitation or trust issue`,
  });

  console.log('[Hesitator] Crack reported ✓');
  await browser.close();
  console.log('[Hesitator] ━━━ Done ━━━\n');
}

run().catch(e => { console.error('[Hesitator] Error:', e.message); process.exit(1); });
