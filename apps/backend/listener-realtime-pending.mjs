// listener-realtime-pending.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY; // service_role (server-side)
const PENDING_URL   = process.env.PENDING_URL || 'https://smartcondominiumbackend.onrender.com/api/notificaciones/process-pending?limit=50';
const INTERNAL_TOKEN = process.env.INTERNAL_NOTIF_TOKEN || ''; // si no usas token, queda vacío

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

async function flushPending(loop = true) {
  const headers = INTERNAL_TOKEN ? { 'X-Internal-Token': INTERNAL_TOKEN } : {};
  while (true) {
    const res = await fetch(PENDING_URL, { method: 'POST', headers, timeout: 30_000 });
    if (!res.ok) throw new Error(`process-pending ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const count = Number(data?.count ?? 0);
    if (!loop || count === 0) break;
  }
}

function shouldRun(payload) {
  const nuevo = payload?.new || {};
  return String(nuevo.estado || '').toLowerCase() === 'pendiente';
}

async function start() {
  // Barrido inicial por si quedó algo pendiente antes de arrancar
  try { await flushPending(true); } catch {}

  const channel = supabase.channel('sc_notif_pending_v1');

  channel.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notificacion_envio' },
    async (payload) => { if (shouldRun(payload)) { try { await flushPending(true); } catch {} } }
  );

  channel.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'notificacion_envio' },
    async (payload) => { if (shouldRun(payload)) { try { await flushPending(true); } catch {} } }
  );

  const status = await channel.subscribe();
  console.log('Realtime subscribe status:', status);

  // Watchdog: por si se pierde algún evento
  setInterval(async () => { try { await flushPending(true); } catch {} }, 60_000);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
