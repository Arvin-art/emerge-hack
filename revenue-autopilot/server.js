require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MOCK_COMPETITORS = [
  { airline: 'Delta',    price: 1380, note: 'middle seat',         highlight: false },
  { airline: 'United',   price: 1290, note: '1 stop',              highlight: false },
  { airline: 'AeroBook', price: 1200, note: 'window seat — yours', highlight: true  },
];

const SYSTEM_PROMPT = `You are a concierge AI for AeroBook, a premium flight booking service.
A user is about to abandon their booking. Your job: one persuasive, human intervention.
Sound like a sharp, empathetic salesperson. Not a bot. Use first name only.
Be specific to their exact data (name, seat).
Max 2 sentences for message. No filler. No em-dashes.

When frictionType is DWELL_TIMEOUT and clarifyAnswer is null:
  Set clarify to a short yes/no question like "Is it the price, [name]?"
  Set ctaAction to "complete", offer to null.

When frictionType is DWELL_TIMEOUT and clarifyAnswer is "price":
  Set ctaAction to "offer".
  Set offer.competitors to the mockCompetitors from input.
  Set incentive to: { "type": "discount", "label": "10% off applied", "code": "STAY10", "finalPrice": 1080 }.
  Set clarify to null.

When frictionType is DWELL_TIMEOUT and clarifyAnswer is "other":
  Treat as EXIT_INTENT — urgency framing, ctaAction "complete", clarify null, offer null.

For all other frictionTypes:
  Set clarify to null, offer to null.
  STATE_LOSS: restore framing, ctaAction "restore".
  EXIT_INTENT: urgency framing, ctaAction "complete".
  RAGE_CLICK: help framing, ctaAction "help".

Return ONLY a JSON object — no prose, no markdown fences:
{
  "headline": string,
  "message": string,
  "ctaLabel": string,
  "ctaAction": "complete" | "restore" | "help" | "offer",
  "clarify": null | string,
  "offer": null | {
    "competitors": [{ "airline": string, "price": number, "note": string, "highlight": boolean }],
    "incentive": { "type": string, "label": string, "code": string, "finalPrice": number }
  }
}`;

const FALLBACK_PAYLOAD = {
  headline: 'Still with you.',
  message: 'Your details are saved. One click to finish your booking.',
  ctaLabel: 'Complete my booking →',
  ctaAction: 'complete',
  clarify: null,
  offer: null,
};

async function callClaude(frictionType, cachedData, clarifyAnswer = null) {
  const userMsg = JSON.stringify({
    frictionType,
    clarifyAnswer,
    user: {
      name: cachedData.firstName || 'traveler',
      seat: cachedData.seat || null,
      email: cachedData.email || null,
    },
    mockCompetitors: MOCK_COMPETITORS,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });

  return JSON.parse(response.content[0].text.trim());
}

async function callClaudeWithFallback(frictionType, cachedData, clarifyAnswer = null) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Claude timeout')), 4000)
  );
  try {
    return await Promise.race([callClaude(frictionType, cachedData, clarifyAnswer), timeoutPromise]);
  } catch (err) {
    console.error('[Claude] Falling back:', err.message);
    return FALLBACK_PAYLOAD;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let cracks = [];
let savedRevenue = 0;

app.post('/report-crack', (req, res) => {
  const crack = { ...req.body, timestamp: new Date().toISOString() };
  cracks.push(crack);
  console.log(`[Backend] Crack: ${crack.type} — ${crack.description}`);
  io.emit('crack_detected', crack);
  res.json({ ok: true });
});

app.get('/cracks', (_req, res) => res.json(cracks));

io.on('connection', (socket) => {
  console.log(`[Backend] Client connected: ${socket.id}`);
  socket.emit('init', { cracks, savedRevenue });

  socket.on('deploy_concierge', () => {
    console.log('[Backend] Concierge DEPLOYED');
    io.emit('concierge_status', { status: 'ACTIVE' });
  });

  socket.on('transaction_saved', ({ amount }) => {
    savedRevenue += amount;
    console.log(`[Backend] +$${amount} saved | Total: $${savedRevenue}`);
    io.emit('revenue_updated', { savedRevenue });
  });

  socket.on('generate_redemption', async ({ frictionType, cachedData }) => {
    console.log(`[Claude] generate_redemption — type: ${frictionType}, user: ${cachedData?.firstName || 'unknown'}`);
    const payload = await callClaudeWithFallback(frictionType, cachedData);
    socket.emit('redemption_ready', { ...payload, cachedData, frictionType });
  });

  socket.on('clarify_response', async ({ answer, frictionType, cachedData }) => {
    console.log(`[Claude] clarify_response — answer: ${answer}, type: ${frictionType}`);
    const payload = await callClaudeWithFallback(frictionType, cachedData, answer);
    socket.emit('redemption_ready', { ...payload, cachedData, frictionType });
  });
});

server.listen(3001, () => console.log('[Backend] http://localhost:3001'));
