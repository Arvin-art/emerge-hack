// Seat Abandoner — Reaches seat map, hovers indecisively, never clicks, triggers SEAT_ABANDONMENT
const { chromium } = require('playwright');
const axios = require('axios');

const SITE    = 'http://localhost:5173';
const BACKEND = 'http://localhost:3001';

async function run() {
  console.log('\n[SeatAbandoner] ━━━ Starting Seat Abandonment Simulation ━━━');
  const browser = await chromium.launch({ headless: false, slowMo: 120 });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(SITE);
  await page.waitForLoadState('networkidle');

  // Search
  await page.fill('input[placeholder="New York (JFK)"]', 'Boston (BOS)');
  await page.fill('input[placeholder="Los Angeles (LAX)"]', 'Seattle (SEA)');
  await page.locator('input[type="date"]').fill('2026-07-04');
  await page.click('button:has-text("Search Flights")');
  await page.waitForURL('**/details', { timeout: 5000 });

  // Details
  await page.fill('#first-name',             'Sam');
  await page.fill('[data-cache="lastName"]', 'Parker');
  await page.fill('[data-cache="email"]',    'sam.parker@example.com');
  await page.waitForTimeout(2500);
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/seat', { timeout: 5000 });
  console.log('[SeatAbandoner] Reached /seat — hovering indecisively...');

  // Hover seats without clicking
  const hoverSeats = ['12A', '12C', '13E', '15B', '17D', '19F', '11C', '14E'];
  for (const seatId of hoverSeats) {
    const rect = page.locator(`rect[data-seat="${seatId}"]`);
    if (await rect.count() > 0) {
      await rect.hover();
      await page.waitForTimeout(1800);
    }
  }

  console.log('[SeatAbandoner] Dwelling without selection...');
  await page.waitForTimeout(8000);

  await axios.post(`${BACKEND}/report-crack`, {
    type:        'SEAT_ABANDONMENT',
    severity:    'HIGH',
    page:        '/seat',
    description: 'User hovered 8 seats over 20s on /seat without selecting — decision paralysis, no guidance shown',
  });

  console.log('[SeatAbandoner] Crack reported ✓');
  await page.waitForTimeout(2000);
  await browser.close();
  console.log('[SeatAbandoner] ━━━ Done ━━━\n');
}

run().catch(e => { console.error('[SeatAbandoner] Error:', e.message); process.exit(1); });
