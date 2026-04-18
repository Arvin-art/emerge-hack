const socket = io('http://localhost:3001');
const REVENUE_PER_CRACK = 1200;
let crackCount = 0;
let logTotal   = 0;

const crackCountEl   = document.getElementById('crack-count');
const revenueRiskEl  = document.getElementById('revenue-risk');
const revenueSavedEl = document.getElementById('revenue-saved');
const deployBtn      = document.getElementById('deploy-btn');
const deployStatus   = document.getElementById('deploy-status');
const logFeed        = document.getElementById('log-feed');
const logCountEl     = document.getElementById('log-count');
const statusDot      = document.getElementById('status-dot');
const statusText     = document.getElementById('status-text');

function fmt(n)  { return `$${n.toLocaleString()}`; }
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateRisk() {
  revenueRiskEl.textContent = fmt(crackCount * REVENUE_PER_CRACK);
}

function clearEmpty() {
  const empty = logFeed.querySelector('.log-empty');
  if (empty) empty.remove();
}

function addLog(crack) {
  clearEmpty();
  logTotal++;
  if (logCountEl) logCountEl.textContent = `${logTotal} event${logTotal !== 1 ? 's' : ''}`;

  const sev = (crack.severity || 'medium').toLowerCase();
  const el  = document.createElement('div');
  el.className = `log-entry severity-${sev}`;
  el.innerHTML = `
    <span class="log-time">${fmtTime(crack.timestamp)}</span>
    <span class="log-badge">${crack.type}</span>
    <span class="log-page">${crack.page || '—'}</span>
    <span class="log-desc">${crack.description || ''}</span>
  `;
  logFeed.prepend(el);
}

function goLive() {
  statusDot.classList.add('live');
  if (statusText) statusText.textContent = 'Connected';
}

function activateConcierge() {
  deployBtn.disabled = true;
  deployBtn.textContent = '✓ Concierge Active';
  deployStatus.textContent = '● Concierge ACTIVE — watching for friction events on the site';
  deployStatus.classList.add('active');
}

socket.on('connect',  goLive);
socket.on('disconnect', () => {
  statusDot.classList.remove('live');
  if (statusText) statusText.textContent = 'Disconnected';
});

socket.on('init', ({ cracks, savedRevenue }) => {
  crackCount = cracks.length;
  crackCountEl.textContent  = crackCount;
  revenueSavedEl.textContent = fmt(savedRevenue);
  updateRisk();
  cracks.forEach(addLog);
});

socket.on('crack_detected', (crack) => {
  crackCount++;
  crackCountEl.textContent = crackCount;
  updateRisk();
  addLog(crack);
});

socket.on('revenue_updated', ({ savedRevenue }) => {
  revenueSavedEl.textContent = fmt(savedRevenue);
});

socket.on('concierge_status', ({ status }) => {
  if (status === 'ACTIVE') activateConcierge();
});

deployBtn.addEventListener('click', () => {
  socket.emit('deploy_concierge');
});
