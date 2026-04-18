// Wanderer — Goes to Payment, navigates back twice, detects state loss
const { chromium } = require('playwright');
const axios = require('axios');

const SITE    = 'http://localhost:5173';
const BACKEND = 'http://localhost:3001';

async function run() {
  console.log('\n[Wanderer] ━━━ Starting Back-Button State-Wipe Simulation ━━━');
  const browser = await chromium.launch({ headless: false, slowMo: 250 });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(SITE);
  await page.waitForLoadState('networkidle');
  console.log('[Wanderer] Site loaded');

  // Step 1 — Search
  await page.fill('input[placeholder="New York (JFK)"]', 'New York (JFK)');
  await page.fill('input[placeholder="Los Angeles (LAX)"]', 'Los Angeles (LAX)');
  await page.locator('input[type="date"]').fill('2026-05-20');
  await page.click('button:has-text("Search Flights")');
  await page.waitForURL('**/details', { timeout: 5000 });
  console.log('[Wanderer] Searched flights → /details');

  // Step 2 — Fill Details
  await page.fill('#first-name',             'John');
  await page.fill('[data-cache="lastName"]', 'Doe');
  await page.fill('[data-cache="email"]',    'john.doe@example.com');
  console.log('[Wanderer] Filled passenger details — waiting 3s for concierge cache...');
  await page.waitForTimeout(3000);

  // Step 3 — Seat Selection
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/seat', { timeout: 5000 });
  console.log('[Wanderer] Reached /seat');
  await page.locator('rect[data-seat="14A"]').click();
  await page.waitForTimeout(300);

  // Step 4 — Payment
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/payment', { timeout: 5000 });
  console.log('[Wanderer] Reached /payment');

  // Step 5 — ⚠ First Back: /payment → /seat
  await page.click('button:has-text("← Back")');
  await page.waitForURL('**/seat', { timeout: 5000 });
  console.log('[Wanderer] Back to /seat');

  // Step 6 — ⚠ Second Back: /seat → /details (THE CRACK)
  await page.click('button:has-text("← Back")');
  await page.waitForURL('**/details', { timeout: 5000 });
  console.log('[Wanderer] Back to /details — checking state loss...');

  // Step 7 — Check state loss
  const val = await page.inputValue('#first-name');
  if (val === '') {
    console.log('[Wanderer] ⚠  STATE_LOSS confirmed — form empty after back navigation!');
    await axios.post(`${BACKEND}/report-crack`, {
      type:        'STATE_LOSS',
      severity:    'HIGH',
      page:        '/payment → /seat → /details',
      description: 'All passenger fields cleared navigating back through /seat — 15% of users abandon here',
    });
    console.log('[Wanderer] Crack reported ✓');
  } else {
    console.log('[Wanderer] No state loss — value:', val);
  }

  await page.waitForTimeout(2500);
  await browser.close();
  console.log('[Wanderer] ━━━ Done ━━━\n');
}

run().catch(e => { console.error('[Wanderer] Error:', e.message); process.exit(1); });
