import { io } from 'socket.io-client';

let conciergeActive = sessionStorage.getItem('concierge_active') === 'true';
let socket = null;
let onShowCardRef = null;
let dwellTimer = null;

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
      console.log('[Concierge] redemption_ready received');
      onShowCardRef?.(payload);
    });
  } else {
    onShowCardRef = onShowCard;
  }

  setInterval(() => {
    const inputs = document.querySelectorAll('input[data-cache]');
    if (!inputs.length) return;
    const cache = {};
    inputs.forEach(inp => { if (inp.value) cache[inp.dataset.cache] = inp.value; });
    if (Object.keys(cache).length) {
      sessionStorage.setItem('concierge_cache', JSON.stringify(cache));
    }
  }, 2000);

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
}

export function checkFriction(onShowCard) {
  onShowCardRef = onShowCard;
  setTimeout(() => {
    if (!conciergeActive) {
      console.log('[Concierge] Standby — not deployed yet');
      return;
    }
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
