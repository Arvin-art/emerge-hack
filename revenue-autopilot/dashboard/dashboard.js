const socket = io('http://localhost:3001');

// State
let currentRole = 'analyst';
const REVENUE_PER_CRACK = 1200;
let crackCount = 0;
let savedRevenue = 0;
let logTotal = 0;

// Sub-nav configuration
const ROLE_CONFIG = {
  'analyst': [
    { id: 'overview', label: 'Drop-off Overview' },
    { id: 'heatmaps', label: 'Heatmaps' }
  ],
  'developer': [
    { id: 'triage', label: 'Friction Triage' },
    { id: 'performance', label: 'API & Performance' }
  ],
  'pm': [
    { id: 'exec', label: 'Executive Performance' },
    { id: 'simulator', label: 'AI Impact Simulator' }
  ]
};

// DOM Elements
const roleNavItems = document.querySelectorAll('#role-nav .nav-item');
const subnavContainer = document.getElementById('subnav-container');
const screensContainers = document.querySelectorAll('.role-screens');
const deployBtn = document.getElementById('deploy-btn');
const deployStatus = document.getElementById('deploy-status');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// Metrics DOM
const crackCountEl = document.getElementById('crack-count');
const revenueRiskEl = document.getElementById('revenue-risk');
const revenueSavedEl = document.getElementById('revenue-saved');

// Feeds DOM
const analystFeed = document.getElementById('analyst-feed');
const devTriageBody = document.getElementById('dev-triage-body');
const devPerfFeed = document.getElementById('dev-perf-feed');
const deSchemaFeed = document.getElementById('de-schema-feed');
const logCountEl = document.getElementById('log-count');
const pmMetricsClone = document.getElementById('pm-metrics-clone');

// Behavioural metric counters
let totalClicks = 0;
let rageClickCount = 0;
let dwellSamples = [];
let abandonmentEvents = 0;

// Utils
function fmt(n) { return `$${n.toLocaleString()}`; }
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Routing & Navigation ───
function switchRole(role) {
  currentRole = role;
  
  // Update sidebar active states
  roleNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.role === role);
  });

  // Render Subnav
  const tabs = ROLE_CONFIG[role] || [];
  subnavContainer.innerHTML = tabs.map((tab, idx) => `
    <div class="subnav-item ${idx === 0 ? 'active' : ''}" data-target-screen="${tab.id}">${tab.label}</div>
  `).join('');

  // Attach subnav listeners
  const subnavItems = subnavContainer.querySelectorAll('.subnav-item');
  subnavItems.forEach(item => {
    item.addEventListener('click', () => switchScreen(role, item.dataset.targetScreen, item));
  });

  // Show right role container
  screensContainers.forEach(container => {
    container.classList.toggle('active', container.dataset.roleScreen === role);
  });

  // Default to first screen
  if (tabs.length > 0) switchScreen(role, tabs[0].id, subnavItems[0]);

  // Clone metrics for PM view if needed
  if (role === 'pm') {
    const origMetrics = document.querySelector('.metrics-grid').innerHTML;
    if (pmMetricsClone) pmMetricsClone.innerHTML = origMetrics;
  }
}

function switchScreen(role, screenId, triggerEl) {
  // Update subnav active class
  subnavContainer.querySelectorAll('.subnav-item').forEach(item => item.classList.remove('active'));
  if (triggerEl) triggerEl.classList.add('active');

  // Update screens within the role container
  const container = document.querySelector(`.role-screens[data-role-screen="${role}"]`);
  if (!container) return;
  const screens = container.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.classList.toggle('active', screen.dataset.screen === screenId);
  });
}

// Attach sidebar listeners
roleNavItems.forEach(item => {
  item.addEventListener('click', () => switchRole(item.dataset.role));
});

// Initialize first role
switchRole('analyst');


// ─── Data & Rendering ───
let funnelBase = 100;
let fStats = { d: 100, t: 100, p: 100 };

function updateMetrics() {
  if (crackCountEl) crackCountEl.textContent = crackCount;
  
  // Total clicks
  const tcEl = document.getElementById('total-clicks');
  if (tcEl) tcEl.textContent = totalClicks.toLocaleString();
  
  // Rage click count
  const rcEl = document.getElementById('rage-count');
  if (rcEl) rcEl.textContent = rageClickCount;
  
  // Abandonment rate = abandonment events / total tracked click sessions
  const arEl = document.getElementById('abandon-rate');
  if (arEl) {
    const rate = totalClicks > 0 ? Math.min(100, Math.round((abandonmentEvents / Math.max(1, crackCount)) * 100)) : 0;
    arEl.textContent = rate + '%';
  }
  
  // Avg dwell time on payment
  const dwEl = document.getElementById('avg-dwell');
  if (dwEl) {
    if (dwellSamples.length > 0) {
      const avg = Math.round(dwellSamples.reduce((a, b) => a + b, 0) / dwellSamples.length);
      dwEl.textContent = avg + 's';
    } else {
      dwEl.textContent = '—';
    }
  }
  
  if (revenueSavedEl) revenueSavedEl.textContent = fmt(savedRevenue);
  
  // PM Executive financial metrics
  const pmRisk = crackCount * REVENUE_PER_CRACK;
  const pmRiskEl = document.getElementById('pm-revenue-risk');
  const pmSavedEl = document.getElementById('pm-revenue-saved');
  const pmRateEl = document.getElementById('pm-recovery-rate');
  if (pmRiskEl) pmRiskEl.textContent = fmt(pmRisk);
  if (pmSavedEl) pmSavedEl.textContent = fmt(savedRevenue);
  if (pmRateEl) {
    const rate = pmRisk > 0 ? Math.round((savedRevenue / pmRisk) * 100) : 0;
    pmRateEl.textContent = rate + '%';
  }
}

function updateFunnel(page) {
  if (page.includes('details')) fStats.d = Math.max(10, fStats.d - 2);
  if (page.includes('seat'))    { fStats.d = Math.max(10, fStats.d - 1); fStats.t = Math.max(10, fStats.t - 3); }
  if (page.includes('payment')) { fStats.d = Math.max(10, fStats.d - 1); fStats.t = Math.max(10, fStats.t - 1); fStats.p = Math.max(10, fStats.p - 4); }
  
  const elD = document.getElementById('funnel-d');
  const elT = document.getElementById('funnel-t');
  const elP = document.getElementById('funnel-p');
  
  if (elD) { elD.style.width = fStats.d + '%'; elD.textContent = fStats.d + '%'; }
  if (elT) { elT.style.width = fStats.t + '%'; elT.textContent = fStats.t + '%'; }
  if (elP) { elP.style.width = fStats.p + '%'; elP.textContent = fStats.p + '%'; }
}

let activeHeatmapPage = '/details';
let savedDots = [];

const pageFilter = document.getElementById('heatmap-page-filter');
const hmIframe = document.getElementById('heatmap-iframe');
const clickPageLabel = document.getElementById('click-page-label');
if (pageFilter && hmIframe) {
  pageFilter.addEventListener('change', (e) => {
    activeHeatmapPage = e.target.value;
    hmIframe.src = `http://localhost:5173${activeHeatmapPage}`;
    if (clickPageLabel) clickPageLabel.textContent = activeHeatmapPage;
    renderDots();
    renderClickList();
  });
}

// Click element leaderboard
let clickTargetCounts = {}; // { page: { tagLabel: count }}

function getElementLabel(tag, type, id, cls) {
  if (tag === 'BUTTON') return `⏎ Button`;
  if (tag === 'INPUT') return `⌨ Input [${type || 'text'}]`;
  if (tag === 'SELECT') return `▼ Select`;
  if (tag === 'A') return `→ Link`;
  if (id) return `#${id}`;
  if (cls) return `.${cls.split(' ')[0]}`;
  return tag || 'Element';
}

function renderClickList() {
  const listEl = document.getElementById('click-list');
  if (!listEl) return;
  const pageData = clickTargetCounts[activeHeatmapPage] || {};
  const sorted = Object.entries(pageData).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (sorted.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No clicks recorded yet.</div>';
    return;
  }
  const maxVal = sorted[0][1];
  listEl.innerHTML = sorted.map(([label, count]) => `
    <div class="click-list-row">
      <span class="click-list-label" title="${label}">${label}</span>
      <div class="click-list-bar-track">
        <div class="click-list-bar-fill" style="width:${Math.round((count/maxVal)*100)}%"></div>
      </div>
      <span class="click-list-count">${count}</span>
    </div>
  `).join('');
}

function renderDots() {
  const overlay = document.getElementById('heatmap-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  // The iframe renders a 1440px-wide page scaled by 0.6 inside the wrapper
  // Dots arrive with raw page coords (0-1440). Scale them by 0.6 to match.
  const SCALE = 0.6;

  savedDots.filter(d => d.page === activeHeatmapPage).forEach(d => {
    const dot = document.createElement('div');
    dot.className = 'dynamic hotspot';
    dot.style.left = `${d.x * SCALE}px`;
    dot.style.top  = `${d.y * SCALE}px`;
    
    if (d.isStandard) {
      dot.style.background = 'rgba(130,180,255,0.55)';
      dot.style.width  = '14px';
      dot.style.height = '14px';
      dot.style.filter = 'blur(5px)';
    } else if (d.type === 'RAGE_CLICK') {
      dot.style.background = 'rgba(255,69,58,0.9)';
      dot.style.width  = '28px';
      dot.style.height = '28px';
      dot.style.filter = 'blur(8px)';
    } else {
      dot.style.background = 'rgba(255,214,10,0.85)';
      dot.style.width  = '20px';
      dot.style.height = '20px';
      dot.style.filter = 'blur(6px)';
    }
    
    overlay.appendChild(dot);
  });
}

function renderLog(crack) {
  logTotal++;
  if (logCountEl) logCountEl.textContent = `${logTotal} event${logTotal !== 1 ? 's' : ''}`;

  const sev = (crack.severity || 'medium').toLowerCase();
  
  // Funnel Deductions
  if (crack.page) updateFunnel(crack.page);

  // Dynamic Heatmap Plotting — store every event with coordinates
  if (crack.x != null && crack.y != null) {
    let cp = String(crack.page || '').trim();
    if (cp === '') cp = '/';
    const isStandard = crack.type === 'TRACK_CLICK';
    savedDots.push({ x: crack.x, y: crack.y, type: crack.type, page: cp, isStandard });
    if (savedDots.length > 500) savedDots.shift();
    renderDots();
    
    // Update click element list — track ALL event types by their label
    if (!clickTargetCounts[cp]) clickTargetCounts[cp] = {};
    // For regular clicks use the element label; for errors use the crack type as label
    const label = (crack.type === 'TRACK_CLICK' && crack.element) ? crack.element
                  : crack.type !== 'TRACK_CLICK' ? `⚠ ${crack.type}`
                  : 'Unknown';
    clickTargetCounts[cp][label] = (clickTargetCounts[cp][label] || 0) + 1;
    renderClickList();
    
    if (isStandard) return; // standard clicks don't go into chart or feeds
  } else if (crack.type === 'TRACK_CLICK') {
    return; // no coords, nothing to render
  }

  // Behavioural counters
  if (crack.type === 'TRACK_CLICK') {
    totalClicks++;
  } else if (crack.type === 'RAGE_CLICK') {
    rageClickCount++;
  } else if (['EXIT_INTENT','STATE_LOSS','PRICE_ABANDONMENT','SEAT_ABANDONMENT','MOBILE_STATE_LOSS','CORRECTION_ABANDONMENT'].includes(crack.type)) {
    abandonmentEvents++;
  } else if (crack.type === 'DWELL_TIMEOUT') {
    // Parse dwell seconds from description if possible, default 12
    const match = (crack.description || '').match(/(\d+)s/);
    dwellSamples.push(match ? parseInt(match[1]) : 12);
    if (dwellSamples.length > 50) dwellSamples.shift();
  }
  updateMetrics();

  // 1. Analyst Feed (Catch-all visual representation of dropoff)
  const el = document.createElement('div');
  el.className = `log-entry ${sev}`;
  el.dataset.crackType = crack.type;
  el.innerHTML = `
    <span class="log-time">${fmtTime(crack.timestamp)}</span>
    <span class="log-badge">${crack.type}</span>
    <span class="log-page">${crack.page || '—'}</span>
    <span class="log-desc">${crack.description || ''}</span>
  `;
  if (analystFeed) {
    const empty = analystFeed.querySelector('.log-empty');
    if (empty) empty.remove();
    analystFeed.prepend(el);
  }

  // 2. Developer Triage Table (Only actionable DOM errors)
  if (['RAGE_CLICK', 'DEAD_CLICK', 'JS_ERROR', 'NAVIGATION_LOOP'].includes(crack.type)) {
    const tr = document.createElement('tr');
    
    let fix = 'Review user flow logic';
    if(crack.type === 'RAGE_CLICK') fix = `<span style="color:var(--warning)">Expand Hitbox / Add Loader</span>`;
    if(crack.type === 'DEAD_CLICK') fix = `<span style="color:var(--framer-blue)">Convert &lt;div&gt; to &lt;button&gt;</span>`;
    if(crack.type === 'JS_ERROR') fix = `<span style="color:var(--danger)">Inspect Console Stack Trace</span>`;
    
    tr.innerHTML = `
      <td><span class="log-badge" style="background:var(--danger-glow);color:var(--danger)">${crack.type}</span></td>
      <td>1</td>
      <td class="td-alert">${crack.page || 'unknown'}</td>
      <td class="td-fix" style="font-size:12px; font-weight:500;">${fix}</td>
    `;
    if (devTriageBody) devTriageBody.prepend(tr);
  }

  // 3. Developer Perf Feed (Latency)
  if (crack.type === 'API_LATENCY') {
    const pl = document.createElement('div');
    pl.className = `log-entry high`;
    pl.innerHTML = `
      <span class="log-time">${fmtTime(crack.timestamp)}</span>
      <span class="log-badge" style="background:var(--warning-glow);color:var(--warning)">LATENCY</span>
      <span class="log-page">${crack.page || 'API'}</span>
      <span class="log-desc">${crack.description}</span>
    `;
    if (devPerfFeed) devPerfFeed.prepend(pl);
  }
}

// ─── PM Executive Insights ───
function seedPMInsights() {
  const el = document.getElementById('pm-insights-list');
  if (!el) return;
  
  const insights = [
    {
      priority: 'CRITICAL', color: '#dc2626', bg: '#fef2f2',
      title: 'State Loss on Back Navigation',
      body: `${Math.round(crackCount * 0.25)} users lost form data going back — a persistent session store (localStorage) on every step would eliminate this entirely.`
    },
    {
      priority: 'HIGH', color: '#d97706', bg: '#fffbeb',
      title: 'Price Reveal Abandonment at Payment',
      body: `Users reach payment, see the full fare, and immediately leave. Add progressive price disclosure — show base fare early so the final price isn\'t a shock.`
    },
    {
      priority: 'HIGH', color: '#d97706', bg: '#fffbeb',
      title: 'Mobile Conversion Gap (2.4x Desktop)',
      body: `Mobile users abandon at 2.4x the rate of desktop. Prioritize responsive form layouts, sticky CTAs, and thumb-friendly seat maps in the next sprint.`
    },
    {
      priority: 'MEDIUM', color: '#2563eb', bg: '#eff6ff',
      title: 'Expand Concierge Trigger Conditions',
      body: `Concierge recovered $${savedRevenue.toLocaleString()} so far. Auto-trigger after 10s of dwell on Payment (not just exit intent) to capture hesitation-based drop-offs earlier.`
    },
    {
      priority: 'MEDIUM', color: '#2563eb', bg: '#eff6ff',
      title: 'Seat Selection Causing Decision Paralysis',
      body: `Users loop back-and-forth on seat selection. Add a progress bar and a "Continue with recommended seat" shortcut to reduce cognitive load.`
    },
  ];

  el.innerHTML = insights.map(ins => `
    <div style="padding:16px 20px; border-bottom:1px solid #f0f1f3; display:flex; gap:16px; align-items:flex-start;">
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <span style="font-size:10px; font-weight:700; color:${ins.color}; background:${ins.bg}; padding:2px 8px; border-radius:4px; letter-spacing:0.5px; border:1px solid ${ins.color}30;">${ins.priority}</span>
          <strong style="font-size:13px; color:#111827;">${ins.title}</strong>
        </div>
        <p style="font-size:13px; color:#6b7280; line-height:1.6; margin:0;">${ins.body}</p>
      </div>
    </div>
  `).join('');
}

// ─── Socket Events ───
socket.on('connect', () => {
  statusDot.classList.add('live');
  if (statusText) statusText.textContent = 'Connected to Core';
});

socket.on('disconnect', () => {
  statusDot.classList.remove('live');
  if (statusText) statusText.textContent = 'Disconnected';
});

socket.on('init', ({ cracks, savedRevenue: saved }) => {
  crackCount = cracks.length;
  savedRevenue = saved;
  updateMetrics();
  seedPMInsights();
  
  if (analystFeed) analystFeed.innerHTML = '';
  if (devTriageBody) devTriageBody.innerHTML = '';

  cracks.forEach(renderLog);
});

socket.on('crack_detected', (crack) => {
  crackCount++;
  updateMetrics();
  renderLog(crack);
});

socket.on('revenue_updated', ({ savedRevenue: saved }) => {
  savedRevenue = saved;
  updateMetrics();
});

socket.on('concierge_status', ({ status }) => {
  if (status === 'ACTIVE') {
    deployBtn.disabled = true;
    deployBtn.textContent = '✓ Concierge Active';
    deployStatus.textContent = '● Watching for global friction';
    deployStatus.classList.add('active');
  }
});

deployBtn.addEventListener('click', () => {
  socket.emit('deploy_concierge');
});

// ─── AI Simulator (PM View) ───
const simBtn = document.getElementById('ai-sim-btn');
const simInput = document.getElementById('ai-sim-input');
const simResultsContainer = document.getElementById('sim-results-container');
const simOutputBox = document.getElementById('sim-output-box');

if (simBtn) {
  simBtn.addEventListener('click', () => {
    const query = simInput.value.trim();
    if (!query) return;

    simBtn.textContent = 'Simulating...';
    simBtn.disabled = true;
    simResultsContainer.style.display = 'none';

    // Mock API call to our server
    socket.emit('simulate_ab_test', {
      proposedChange: query,
      currentRisk: crackCount * REVENUE_PER_CRACK
    });
  });
}

socket.on('simulation_result', (result) => {
  simBtn.textContent = 'Run Simulation';
  simBtn.disabled = false;
  simResultsContainer.style.display = 'block';
  
  // Render markdown-ish layout manually
  simOutputBox.innerHTML = result.markdown
    .replace(/\n\n/g, '<br><br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
});

// ─── Chart.js Setup ───
let crackTypeFrequencies = {}; 
let frictionChart = null;
let activeChartFilter = null;

function initChart() {
  const ctx = document.getElementById('friction-pie-chart');
  if (!ctx || !window.Chart) return;
  
  Chart.defaults.color = '#a6a6a6';
  Chart.defaults.font.family = 'Inter, sans-serif';
  
  frictionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#2563eb', '#dc2626', '#d97706', '#16a34a', '#7c3aed', '#0891b2'
        ],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, padding: 12, font: { size: 11 }, color: '#6b7280' }
        }
      },
      onClick: (e, elements) => {
         if (elements.length > 0) {
            const index = elements[0].index;
            const clickedLabel = frictionChart.data.labels[index];
            activeChartFilter = clickedLabel;
            
            const btn = document.getElementById('chart-reset-btn');
            if(btn) btn.style.display = 'inline-block';
            
            filterFeedLogs();
         }
      }
    }
  });

  const resetBtn = document.getElementById('chart-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeChartFilter = null;
      resetBtn.style.display = 'none';
      filterFeedLogs();
    });
  }
}

function updateChart(type) {
  if (type === 'TRACK_CLICK') return;
  
  crackTypeFrequencies[type] = (crackTypeFrequencies[type] || 0) + 1;
  
  if (!frictionChart) return;

  // Sort all types by frequency, keep top 4 named + group rest as 'Other'
  const sorted = Object.entries(crackTypeFrequencies)
    .sort((a, b) => b[1] - a[1]);
  
  const TOP_N = 4;
  const top = sorted.slice(0, TOP_N);
  const others = sorted.slice(TOP_N);
  const otherTotal = others.reduce((sum, [, v]) => sum + v, 0);

  const labels = top.map(([k]) => k);
  const data   = top.map(([, v]) => v);
  if (otherTotal > 0) {
    labels.push('Other');
    data.push(otherTotal);
  }

  frictionChart.data.labels = labels;
  frictionChart.data.datasets[0].data = data;
  frictionChart.update('none'); // 'none' skips re-animation for perf
}

function filterFeedLogs() {
  const logs = document.querySelectorAll('#analyst-feed .log-entry');
  
  // compute the current top-4 labels so we know what 'Other' covers
  const sorted = Object.entries(crackTypeFrequencies).sort((a, b) => b[1] - a[1]);
  const topLabels = new Set(sorted.slice(0, 4).map(([k]) => k));

  logs.forEach(log => {
    if (!activeChartFilter) {
      log.style.display = 'flex';
    } else if (activeChartFilter === 'Other') {
      // show only types NOT in the top 4
      log.style.display = !topLabels.has(log.dataset.crackType) ? 'flex' : 'none';
    } else {
      log.style.display = log.dataset.crackType === activeChartFilter ? 'flex' : 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', initChart);
