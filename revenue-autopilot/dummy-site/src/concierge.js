import { io } from 'socket.io-client';

let conciergeActive = sessionStorage.getItem('concierge_active') === 'true';
let socket = null;
let onShowCardRef = null;
let dwellTimer = null;
let clickHistory = [];
let deadClickTargets = new Map();

function setActive() {
  conciergeActive = true;
  sessionStorage.setItem('concierge_active', 'true');
  updateIndicator(true);
  console.log('[Concierge] ACTIVE — watching for friction');
}

function updateIndicator(active) {
  let el = document.getElementById('concierge-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'concierge-indicator';
    Object.assign(el.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '9998',
      padding: '8px 16px', borderRadius: '980px', fontSize: '12px',
      fontWeight: '500', fontFamily: 'Inter, system-ui, sans-serif',
      letterSpacing: '-0.1px', transition: 'all 0.3s',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    });
    document.body.appendChild(el);
  }
  if (active) {
    el.textContent = '● Concierge Active';
    Object.assign(el.style, { background: '#34c759', color: '#fff' });
  } else {
    el.textContent = '○ Concierge Standby';
    Object.assign(el.style, { background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)' });
  }
}

function requestRedemption(frictionType, cachedData) {
  console.log(`[Concierge] ${frictionType} → requesting redemption`);
  onShowCardRef?.('loading');
  socket.emit('generate_redemption', { frictionType, cachedData });
}

function reportClientCrack(type, severity, description, x = 0, y = 0, element = null) {
  // TRACK_CLICK always fires for heatmap (even in standby mode)
  if (!socket) return;
  if (type !== 'TRACK_CLICK' && type !== 'API_LATENCY' && !conciergeActive) return;
  socket.emit('client_crack', {
    type, 
    severity, 
    page: window.location.pathname, 
    description,
    x, y,
    element
  });
}

// Intercept fetch to mock API Latency for Data Engineer & Developer Persona
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const t0 = performance.now();
  try {
    const response = await originalFetch.apply(this, args);
    const t1 = performance.now();
    const duration = t1 - t0;
    
    // Explicitly target API requests to trigger mock latency events
    if (args[0] && typeof args[0] === 'string' && args[0].includes('/api/') && duration > 500) {
      reportClientCrack('API_LATENCY', 'MEDIUM', `Request to ${args[0]} took ${Math.round(duration)}ms.`);
    }
    
    // Simulate Schema Mismatch randomly
    if (args[0] && typeof args[0] === 'string' && args[0].includes('/api/') && Math.random() > 0.8) {
      reportClientCrack('SCHEMA_MISMATCH', 'HIGH', `Unannounced attribute drop in response from ${args[0]}. Downstream pipelines stalling.`);
    }
    
    return response;
  } catch (err) {
    reportClientCrack('JS_ERROR', 'HIGH', `Fetch failed completely: ${err.message}`);
    throw err;
  }
};

export function sendClarifyResponse(answer, frictionType, cachedData) {
  onShowCardRef?.('loading');
  socket.emit('clarify_response', { answer, frictionType, cachedData });
}

export function startDwellTimer(stepName, thresholdMs = 12000) {
  clearTimeout(dwellTimer);
  dwellTimer = setTimeout(() => {
    if (!conciergeActive) return;
    const cached = sessionStorage.getItem('concierge_cache');
    if (!cached) return;
    const data = JSON.parse(cached);
    if (Object.values(data).some(Boolean)) {
      console.log(`[Concierge] DWELL_TIMEOUT on ${stepName}`);
      requestRedemption('DWELL_TIMEOUT', data);
    }
  }, thresholdMs);
}

export function clearDwellTimer() {
  clearTimeout(dwellTimer);
}

export function initConcierge(onShowCard) {
  onShowCardRef = onShowCard;
  updateIndicator(conciergeActive);

  if (!socket) {
    socket = io('http://localhost:3001');

    socket.on('connect', () => console.log('[Concierge] Connected to backend'));
    socket.on('concierge_status', ({ status }) => {
      if (status === 'ACTIVE') setActive();
    });
    socket.on('init', () => {
      if (sessionStorage.getItem('concierge_active') === 'true') setActive();
    });
    socket.on('redemption_ready', (payload) => {
      onShowCardRef?.(payload);
    });
  } else {
    onShowCardRef = onShowCard;
  }

  // 1. Dwell Data Caching
  setInterval(() => {
    const inputs = document.querySelectorAll('input[data-cache]');
    if (!inputs.length) return;
    const cache = {};
    inputs.forEach(inp => { if (inp.value) cache[inp.dataset.cache] = inp.value; });
    if (Object.keys(cache).length) sessionStorage.setItem('concierge_cache', JSON.stringify(cache));
  }, 2000);

  // 2. Exit Intent
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY > 0) return;
    if (!conciergeActive) return;
    const cached = sessionStorage.getItem('concierge_cache');
    if (!cached) return;
    const data = JSON.parse(cached);
    if (Object.values(data).some(Boolean)) {
      requestRedemption('EXIT_INTENT', data);
    }
  });

  // 3. RAGE AND DEAD CLICK TRACKING
  document.addEventListener('click', (e) => {
    const now = Date.now();
    
    // ALWAYS TRACK CLICKS FOR HEATMAP (even if standby)
    // Capture semantic label of what was clicked
    const t = e.target;
    const tag = t.tagName || 'ELEMENT';
    let label = t.innerText?.trim().slice(0, 30) || t.getAttribute('aria-label') || t.id || t.className?.split(' ')[0] || tag;
    if (!label || label.length < 1) label = tag;
    
    reportClientCrack('TRACK_CLICK', 'INFO', 'Standard click', e.pageX, e.pageY, label);

    // synthetic API_LATENCY mocking — fires independently of conciergeActive
    if (Math.random() > 0.9) {
      const urls = ['/api/v1/auth', '/api/v1/pricing/quote', '/api/v2/seats/reserve'];
      const ms = Math.floor(Math.random() * 4000) + 1200;
      reportClientCrack('API_LATENCY', 'HIGH', `Request to ${urls[Math.floor(Math.random() * urls.length)]} took ${ms}ms.`, 0, 0, null);
    }

    if (!conciergeActive) return;

    // DEAD CLICK DETECTION
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    const interactable = e.target.closest(interactiveTags.join(','));
    if (!interactable) {
      const elHtml = e.target.outerHTML.substring(0, 40) + '...';
      const count = (deadClickTargets.get(e.target) || 0) + 1;
      deadClickTargets.set(e.target, count);
      if (count === 3) {
        reportClientCrack('DEAD_CLICK', 'LOW', `User repeatedly clicked non-interactive structural element: ${elHtml}`, e.pageX, e.pageY);
      }
    }

    // RAGE CLICK DETECTION
    clickHistory.push(now);
    clickHistory = clickHistory.filter(time => now - time < 800); // 800ms rolling window
    if (clickHistory.length >= 4) {
      reportClientCrack('RAGE_CLICK', 'HIGH', 'User clicked 4+ times in 800ms out of pure frustration.', e.pageX, e.pageY);
      clickHistory = []; // Reset window
    }
  }, true);
}

export function checkFriction(onShowCard) {
  onShowCardRef = onShowCard;
  setTimeout(() => {
    if (!conciergeActive) return;
    const first = document.querySelector('#first-name');
    if (!first || first.value !== '') return;
    const cached = sessionStorage.getItem('concierge_cache');
    if (!cached) return;
    const data = JSON.parse(cached);
    if (data.firstName) {
      requestRedemption('STATE_LOSS', data);
    }
  }, 500);
}

export function reportTransaction(amount) {
  socket?.emit('transaction_saved', { amount });
  sessionStorage.removeItem('concierge_cache');
  sessionStorage.removeItem('concierge_active');
  conciergeActive = false;
  clearDwellTimer();
  updateIndicator(false);
}
