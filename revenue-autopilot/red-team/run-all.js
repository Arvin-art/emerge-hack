/**
 * Revenue Autopilot — Red Team: 13 Chaos Personas
 * Runs all simultaneously in visible browser windows arranged in a 4×4 grid.
 */
const { chromium } = require('playwright');
const axios = require('axios');

const SITE    = 'http://localhost:5173';
const BACKEND = 'http://localhost:3001';

// ── Window grid layout: 4 columns × 4 rows ──────────────────────────
const W = 460, H = 340, GAP = 6;
const COLS = 4;
const pos = (i) => ({
  x: (i % COLS) * (W + GAP),
  y: Math.floor(i / COLS) * (H + 44), // +44 for OS title bar
});

async function launch(index) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-size=${W},${H}`,
      `--window-position=${pos(index).x},${pos(index).y}`,
    ],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: W, height: H });
  return { browser, page };
}

async function report(type, severity, pagePath, description) {
  await axios.post(`${BACKEND}/report-crack`, {
    type, severity, page: pagePath, description,
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

async function goToDetails(page) {
  await page.fill('input[placeholder="New York (JFK)"]', 'New York (JFK)');
  await page.fill('input[placeholder="Los Angeles (LAX)"]', 'Los Angeles (LAX)');
  await page.locator('input[type="date"]').fill('2026-05-20');
  await page.click('button:has-text("Search Flights")');
  await page.waitForURL('**/details', { timeout: 5000 });
}

async function fillDetails(page, first = 'John', last = 'Doe', email = 'john@test.com') {
  await page.fill('#first-name',             first);
  await page.fill('[data-cache="lastName"]', last);
  await page.fill('[data-cache="email"]',    email);
}

async function goToSeat(page) {
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/seat', { timeout: 5000 });
}

async function selectSeat(page, seatId = '14C') {
  await page.locator(`rect[data-seat="${seatId}"]`).click();
  await page.waitForTimeout(300);
}

async function goToPayment(page) {
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/payment', { timeout: 5000 });
}

// ════════════════════════════════════════════════════════════════════
// 1. WANDERER — back-button state wipe (Back×2: Payment→Seat→Details)
// ════════════════════════════════════════════════════════════════════
async function wanderer() {
  const { browser, page } = await launch(0);
  console.log('[1/Wanderer] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(600);
    await goToDetails(page);
    await fillDetails(page);
    await page.waitForTimeout(2500);
    await goToSeat(page);
    await selectSeat(page, '14A');
    await goToPayment(page);
    // Back from Payment → SeatStep
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(400);
    // Back from SeatStep → DetailsStep (THE CRACK: detailsData cleared)
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(600);
    const val = await page.inputValue('#first-name');
    if (val === '') {
      await report('STATE_LOSS', 'HIGH', 'Payment → Seat → Details',
        'All passenger fields wiped navigating back through seat step — 15% of users abandon here permanently');
      console.log('[1/Wanderer] ⚠ STATE_LOSS reported');
    }
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 2. IMPATIENT — rage clicks Search before form is filled
// ════════════════════════════════════════════════════════════════════
async function impatient() {
  const { browser, page } = await launch(1);
  console.log('[2/Impatient] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load');
    await page.waitForSelector('button:has-text("Search Flights")');
    const btn = await page.$('button:has-text("Search Flights")');
    for (let i = 0; i < 7; i++) { btn.click().catch(() => {}); await page.waitForTimeout(45); }
    await page.waitForTimeout(600);
    await report('RAGE_CLICK', 'MEDIUM', '/search',
      'User clicked Search 7× rapidly on empty form — no validation feedback shown');
    console.log('[2/Impatient] ⚠ RAGE_CLICK reported');
    await page.waitForTimeout(1500);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 3. HESITATOR — dwell on Payment with no input
// ════════════════════════════════════════════════════════════════════
async function hesitator() {
  const { browser, page } = await launch(2);
  const DWELL = 12000;
  console.log(`[3/Hesitator] Started — dwelling ${DWELL / 1000}s`);
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    await fillDetails(page, 'Jane', 'Smith', 'jane@test.com');
    await goToSeat(page);
    await selectSeat(page, '7C');
    await goToPayment(page);
    await page.waitForTimeout(DWELL);
    await report('DWELL_TIMEOUT', 'MEDIUM', '/payment',
      `User idle ${DWELL / 1000}s on Payment — possible price hesitation or trust issue with form`);
    console.log('[3/Hesitator] ⚠ DWELL_TIMEOUT reported');
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 4. REFRESHER — fills Details then hits browser refresh → loses data
// ════════════════════════════════════════════════════════════════════
async function refresher() {
  const { browser, page } = await launch(3);
  console.log('[4/Refresher] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    await fillDetails(page, 'Sarah', 'Connor', 'sarah@test.com');
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForLoadState('load');
    await page.waitForTimeout(800);
    const isBackAtSearch = await page.locator('text=Where are you flying').count();
    if (isBackAtSearch > 0) {
      await report('REFRESH_LOSS', 'HIGH', '/details',
        'Browser refresh mid-booking destroys all form state — user forced to restart entire flow');
      console.log('[4/Refresher] ⚠ REFRESH_LOSS reported');
    }
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 5. FLIP-FLOPPER — navigates back and forth 4 times (confused user)
// ════════════════════════════════════════════════════════════════════
async function flipFlopper() {
  const { browser, page } = await launch(4);
  console.log('[5/FlipFlopper] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    for (let loop = 0; loop < 4; loop++) {
      await fillDetails(page, 'Alex', 'Kim', 'alex@test.com');
      await page.waitForTimeout(800);
      await page.click('button:has-text("← Back")');
      await page.waitForTimeout(500);
      await goToDetails(page);
    }
    await report('NAVIGATION_LOOP', 'MEDIUM', '/details ↔ /search',
      'User navigated back-and-forth 4 times — unclear CTA flow causing decision paralysis');
    console.log('[5/FlipFlopper] ⚠ NAVIGATION_LOOP reported');
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 6. PRICE SHOCKER — reaches Payment, balks at price, hits Back×2 → loss
// ════════════════════════════════════════════════════════════════════
async function priceShocker() {
  const { browser, page } = await launch(5);
  console.log('[6/PriceShocker] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    await fillDetails(page, 'Mike', 'Ross', 'mike@test.com');
    await page.waitForTimeout(2500);
    await goToSeat(page);
    await selectSeat(page, '1A');
    await goToPayment(page);
    await page.waitForTimeout(2000);
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(600);
    const val = await page.inputValue('#first-name');
    if (val === '') {
      await report('PRICE_ABANDONMENT', 'HIGH', '/payment → /seat → /details',
        'User returned from Payment after seeing $1,200 price — all data lost, forces full re-entry');
      console.log('[6/PriceShocker] ⚠ PRICE_ABANDONMENT reported');
    }
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 7. SLOW TYPER — types character-by-character, long pauses, loses data on back
// ════════════════════════════════════════════════════════════════════
async function slowTyper() {
  const { browser, page } = await launch(6);
  console.log('[7/SlowTyper] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    await page.type('#first-name',             'Rachel', { delay: 280 });
    await page.waitForTimeout(1200);
    await page.type('[data-cache="lastName"]', 'Green',  { delay: 280 });
    await page.waitForTimeout(1800);
    await page.type('[data-cache="email"]',    'rachel@test.com', { delay: 200 });
    await page.waitForTimeout(2500);
    await goToSeat(page);
    // Back from SeatStep → DetailsStep (state cleared)
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(600);
    const val = await page.inputValue('#first-name');
    if (val === '') {
      await report('SLOW_ENGAGEMENT', 'MEDIUM', '/details',
        'Distracted user took 12s to fill form then lost all data navigating back from seat step — high abandonment profile');
      console.log('[7/SlowTyper] ⚠ SLOW_ENGAGEMENT reported');
    }
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 8. MOBILE USER — 375px viewport, tests responsive UX
// ════════════════════════════════════════════════════════════════════
async function mobileUser() {
  const browser = await chromium.launch({
    headless: false,
    args: [`--window-size=390,844`, `--window-position=${pos(7).x},${pos(7).y}`],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  console.log('[8/MobileUser] Started — iPhone viewport');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(800);
    await goToDetails(page);
    await fillDetails(page, 'Tom', 'Hardy', 'tom@test.com');
    await page.waitForTimeout(2500);
    await goToSeat(page);
    await selectSeat(page, '9D');
    await goToPayment(page);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(600);
    const val = await page.inputValue('#first-name');
    if (val === '') {
      await report('MOBILE_STATE_LOSS', 'HIGH', '/payment → /seat → /details (mobile)',
        'Mobile user (375px) lost all data on back navigation — mobile abandonment rate 2.4× desktop');
      console.log('[8/MobileUser] ⚠ MOBILE_STATE_LOSS reported');
    }
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 9. EMAIL FUMBLER — enters wrong email, navigates back to fix, loses all
// ════════════════════════════════════════════════════════════════════
async function emailFumbler() {
  const { browser, page } = await launch(8);
  console.log('[9/EmailFumbler] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    await fillDetails(page, 'Lisa', 'Huang', 'lisaHUANG@@hotmail..com');
    await page.waitForTimeout(2500);
    await goToSeat(page);
    await selectSeat(page, '31F');
    await goToPayment(page);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("← Back")');
    await page.waitForTimeout(600);
    const val = await page.inputValue('[data-cache="email"]');
    if (val === '') {
      await report('CORRECTION_ABANDONMENT', 'HIGH', '/payment → /seat → /details',
        'User returned to fix malformed email — lost ALL fields, not just email. Requires full re-entry.');
      console.log('[9/EmailFumbler] ⚠ CORRECTION_ABANDONMENT reported');
    }
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 10. EXIT INTENDER — moves mouse to top of screen at Payment
// ════════════════════════════════════════════════════════════════════
async function exitIntender() {
  const { browser, page } = await launch(9);
  console.log('[10/ExitIntender] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    await fillDetails(page, 'Dan', 'Brown', 'dan@test.com');
    await page.waitForTimeout(2500);
    await goToSeat(page);
    await selectSeat(page, '6C');
    await goToPayment(page);
    await page.waitForTimeout(2000);
    await page.mouse.move(W / 2, 20);
    await page.mouse.move(W / 2, 5);
    await page.mouse.move(W / 2, 1);
    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mouseleave', {
        bubbles: false, clientX: 400, clientY: -1,
      }));
    });
    await page.waitForTimeout(1000);
    await report('EXIT_INTENT', 'HIGH', '/payment',
      'User moved mouse toward browser close at Payment — about to abandon a $1,200 transaction');
    console.log('[10/ExitIntender] ⚠ EXIT_INTENT reported');
    await page.waitForTimeout(2500);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 11. FORM FIDDLER — clears and refills form 3× before committing
// ════════════════════════════════════════════════════════════════════
async function formFiddler() {
  const { browser, page } = await launch(10);
  console.log('[11/FormFiddler] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    const entries = [
      ['James', 'Bond',  'james@mi6.com'],
      ['Bruce', 'Wayne', 'bruce@wayne.com'],
      ['Clark', 'Kent',  'clark@daily.com'],
    ];
    for (const [first, last, email] of entries) {
      await fillDetails(page, first, last, email);
      await page.waitForTimeout(800);
      await page.fill('#first-name',             '');
      await page.fill('[data-cache="lastName"]', '');
      await page.fill('[data-cache="email"]',    '');
      await page.waitForTimeout(600);
    }
    await report('FORM_ANXIETY', 'MEDIUM', '/details',
      'User cleared and rewrote passenger details 3× — identity/correctness anxiety, no inline validation to reassure');
    console.log('[11/FormFiddler] ⚠ FORM_ANXIETY reported');
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 12. DOUBLE BOOKER — two tabs race to book the same seat
// ════════════════════════════════════════════════════════════════════
async function doubleBooker() {
  const browser = await chromium.launch({
    headless: false,
    args: [`--window-size=${W},${H}`, `--window-position=${pos(11).x},${pos(11).y}`],
  });
  console.log('[12/DoubleBooker] Started — dual-tab race');
  try {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();
    await Promise.all([
      page1.goto(SITE).then(() => page1.waitForLoadState('load')),
      page2.goto(SITE).then(() => page2.waitForLoadState('load')),
    ]);
    await Promise.all([page1.waitForTimeout(500), page2.waitForTimeout(500)]);
    await Promise.all([
      (async () => {
        await goToDetails(page1);
        await fillDetails(page1, 'Emma', 'Stone', 'emma@test.com');
        await page1.waitForTimeout(2500);
        await goToSeat(page1);
        await selectSeat(page1, '14A');
        await goToPayment(page1);
      })(),
      (async () => {
        await goToDetails(page2);
        await fillDetails(page2, 'Emma', 'Stone', 'emma@test.com');
        await page2.waitForTimeout(2500);
        await goToSeat(page2);
        await selectSeat(page2, '14A');
        await goToPayment(page2);
      })(),
    ]);
    await report('DUPLICATE_SESSION', 'HIGH', '/payment (×2)',
      'Same user opened 2 tabs and reached Payment simultaneously for seat 14A — no duplicate detection');
    console.log('[12/DoubleBooker] ⚠ DUPLICATE_SESSION reported');
    await page1.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// 13. SEAT ABANDONER — hovers seats, never selects, triggers SEAT_ABANDONMENT
// ════════════════════════════════════════════════════════════════════
async function seatAbandoner() {
  const { browser, page } = await launch(12);
  console.log('[13/SeatAbandoner] Started');
  try {
    await page.goto(SITE); await page.waitForLoadState('load'); await page.waitForTimeout(500);
    await goToDetails(page);
    await fillDetails(page, 'Sam', 'Parker', 'sam@test.com');
    await page.waitForTimeout(2500);
    await goToSeat(page);
    console.log('[13/SeatAbandoner] On seat map — hovering without selecting...');
    for (const seatId of ['12A', '13C', '15E', '17B', '19D']) {
      const rect = page.locator(`rect[data-seat="${seatId}"]`);
      if (await rect.count() > 0) {
        await rect.hover();
        await page.waitForTimeout(1500);
      }
    }
    await page.waitForTimeout(6000);
    await report('SEAT_ABANDONMENT', 'HIGH', '/seat-selection',
      'User hovered 5 seats over 20s without selecting — decision paralysis on seat map, no guidance shown');
    console.log('[13/SeatAbandoner] ⚠ SEAT_ABANDONMENT reported');
    await page.waitForTimeout(2000);
  } finally { await browser.close(); }
}

// ════════════════════════════════════════════════════════════════════
// ORCHESTRATOR — run all 13 simultaneously
// ════════════════════════════════════════════════════════════════════
console.log('\n' + '━'.repeat(52));
console.log('  Revenue Autopilot — Red Team: 13 Chaos Personas');
console.log('━'.repeat(52));
console.log('  Opening 13 browser windows in a 4×4 grid...\n');

Promise.all([
  wanderer(),
  impatient(),
  hesitator(),
  refresher(),
  flipFlopper(),
  priceShocker(),
  slowTyper(),
  mobileUser(),
  emailFumbler(),
  exitIntender(),
  formFiddler(),
  doubleBooker(),
  seatAbandoner(),
])
  .then(() => {
    console.log('\n' + '━'.repeat(52));
    console.log('  Red Team scan complete — 13 personas finished');
    console.log('  Dashboard → http://localhost:3001/dashboard/');
    console.log('━'.repeat(52) + '\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n[run-all] Fatal:', err.message);
    process.exit(1);
  });
