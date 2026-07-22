/**
 * Vercel Cron: runs on the 1st of each month at 11:00 AM UTC
 * Schedule: 0 11 1 * *
 *
 * For each active Nomia client:
 *   - Reads cached presupuesto (costoMensualARS) from nomia_configuracion.parametros._presupuestoMensualARS
 *   - Reads nomia_costos_reales (centro_costo = 'TOTAL') for the current year
 *   - If cumulative deviation > threshold (parametros._alertaUmbral, default 5%), sends alert email
 *
 * Also callable as POST /api/cron-budget-alert for manual trigger or on-save checks:
 *   Body: { clienteId, presupuestoMensualARS, costoMensual, alertaUmbral, adminEmail }
 */

import { createClient } from '@supabase/supabase-js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Supabase env missing' });
  if (!RESEND_API_KEY) return res.status(200).json({ ok: false, skipped: 'RESEND_API_KEY not configured' });

  const body = req.body || {};

  // ── On-save check (from the app): single client, immediate ───────────────
  if (body.mode === 'check') {
    const { adminEmail, clienteNombre, presupuestoMensualARS, costoMensualARS, alertaUmbral = 0.05, year } = body;
    if (!adminEmail || !presupuestoMensualARS || !costoMensualARS) {
      return res.status(400).json({ error: 'Faltan campos para check' });
    }
    const { alerta, desvioAcumuladoPct } = evaluarDesvio(presupuestoMensualARS, costoMensualARS, alertaUmbral, year);
    if (alerta) {
      await sendAlertEmail(RESEND_API_KEY, adminEmail, clienteNombre, desvioAcumuladoPct, presupuestoMensualARS, costoMensualARS, year);
    }
    return res.status(200).json({ ok: true, alerta, desvioAcumuladoPct });
  }

  // ── Cron: scan all active clients ────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const year = new Date().getFullYear();

  // Get all active nomia subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('product', 'nomia')
    .in('status', ['active', 'trialing']);

  if (!subs?.length) return res.status(200).json({ ok: true, sent: 0, note: 'Sin suscripciones activas' });

  // Load auth users for email lookup
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = Object.fromEntries((authUsers || []).map(u => [u.id, u.email]));

  const results = [];

  for (const sub of subs) {
    try {
      const companyId = sub.company_id;

      // Get nomia cliente_id (nomia uses its own nomia_clientes table, linked by company_id indirectly via perfiles)
      const { data: perfiles } = await supabase
        .from('nomia_perfiles')
        .select('cliente_id, id')
        .eq('company_id', companyId)
        .limit(5);

      const clienteId = perfiles?.[0]?.cliente_id;
      if (!clienteId) { results.push({ company_id: companyId, note: 'Sin cliente nomia' }); continue; }

      // Get admin email
      let adminEmail = null;
      for (const p of perfiles || []) {
        adminEmail = emailByUserId[p.id];
        if (adminEmail) break;
      }
      if (!adminEmail) {
        // Fallback: Hub users table
        const { data: hubUsers } = await supabase.from('users').select('id').eq('company_id', companyId).limit(3);
        for (const u of hubUsers || []) {
          adminEmail = emailByUserId[u.id];
          if (adminEmail) break;
        }
      }
      if (!adminEmail) { results.push({ clienteId, note: 'Sin email admin' }); continue; }

      // Get configuration
      const { data: conf } = await supabase
        .from('nomia_configuracion')
        .select('parametros, macro, bonos')
        .eq('cliente_id', clienteId)
        .maybeSingle();

      const presupuestoMensualARS = conf?.parametros?._presupuestoMensualARS;
      if (!presupuestoMensualARS?.length) { results.push({ clienteId, note: 'Sin presupuesto cacheado' }); continue; }

      const alertaUmbral = conf?.parametros?._alertaUmbral ?? 0.05;

      // Get real costs for this year
      const { data: reales } = await supabase
        .from('nomia_costos_reales')
        .select('mes, monto')
        .eq('cliente_id', clienteId)
        .eq('anio', year)
        .eq('centro_costo', 'TOTAL');

      const costoMensualARS = Array(12).fill(null);
      for (const r of reales || []) costoMensualARS[r.mes - 1] = Number(r.monto);

      // Get cliente name
      const { data: cliente } = await supabase.from('nomia_clientes').select('nombre').eq('id', clienteId).maybeSingle();
      const clienteNombre = cliente?.nombre || 'Tu empresa';

      const { alerta, desvioAcumuladoPct } = evaluarDesvio(presupuestoMensualARS, costoMensualARS, alertaUmbral, year);

      if (alerta) {
        await sendAlertEmail(RESEND_API_KEY, adminEmail, clienteNombre, desvioAcumuladoPct, presupuestoMensualARS, costoMensualARS, year);
        results.push({ clienteId, sent: 1, desvioAcumuladoPct: Math.round(desvioAcumuladoPct * 1000) / 10 + '%', adminEmail });
      } else {
        results.push({ clienteId, sent: 0, note: `Desvío ${Math.round((desvioAcumuladoPct||0) * 1000) / 10}% — bajo umbral` });
      }
    } catch (e) {
      results.push({ error: e.message });
    }
  }

  const totalSent = results.reduce((s, r) => s + (r.sent || 0), 0);
  console.log('[cron-budget-alert]', new Date().toISOString(), results);
  return res.status(200).json({ ok: true, totalSent, results });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function evaluarDesvio(presupuestoMensualARS, costoMensualARS, umbral, year) {
  const cargados = costoMensualARS.map((real, i) => real !== null ? { presupuesto: presupuestoMensualARS[i], real } : null).filter(Boolean);
  if (!cargados.length) return { alerta: false, desvioAcumuladoPct: 0 };
  const totalPresupuesto = cargados.reduce((s, r) => s + r.presupuesto, 0);
  const totalReal = cargados.reduce((s, r) => s + r.real, 0);
  const desvioAcumuladoPct = totalPresupuesto ? (totalReal - totalPresupuesto) / totalPresupuesto : 0;
  return { alerta: desvioAcumuladoPct > umbral, desvioAcumuladoPct };
}

function fmtARS(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
}

async function sendAlertEmail(resendKey, email, clienteNombre, desvioAcumuladoPct, presupuestoMensualARS, costoMensualARS, year) {
  const pct = Math.round(desvioAcumuladoPct * 1000) / 10;
  const cargados = costoMensualARS.map((real, i) => real !== null ? { mes: MESES[i], presupuesto: presupuestoMensualARS[i], real } : null).filter(Boolean);
  const totalPres = cargados.reduce((s, r) => s + r.presupuesto, 0);
  const totalReal = cargados.reduce((s, r) => s + r.real, 0);

  const filasMeses = cargados.map(r => {
    const d = r.real - r.presupuesto;
    const dp = r.presupuesto ? d / r.presupuesto : 0;
    const color = d > 0 ? '#dc2626' : '#16a34a';
    return `<tr>
      <td style="padding:7px 14px;font-size:13px;color:#374151">${r.mes}</td>
      <td style="padding:7px 14px;font-size:13px;text-align:right">${fmtARS(r.presupuesto)}</td>
      <td style="padding:7px 14px;font-size:13px;text-align:right">${fmtARS(r.real)}</td>
      <td style="padding:7px 14px;font-size:13px;font-weight:700;color:${color};text-align:right">${d > 0 ? '+' : ''}${Math.round(dp * 1000) / 10}%</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:28px 32px">
    <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:.5px;margin-bottom:4px">⚠ ALERTA DE DESVÍO PRESUPUESTARIO</div>
    <div style="font-size:22px;font-weight:800;color:#fff">${clienteNombre}</div>
    <div style="font-size:14px;color:rgba(255,255,255,.85);margin-top:2px">Nómina ${year}</div>
  </div>

  <div style="padding:24px 32px;border-bottom:1px solid #f1f5f9">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div style="border:1.5px solid #fecaca;border-radius:12px;padding:16px 18px;background:#fff1f2">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;margin-bottom:8px">DESVÍO ACUMULADO</div>
        <div style="font-size:38px;font-weight:900;color:#dc2626;line-height:1">+${pct}%</div>
        <div style="font-size:12px;color:#64748b;margin-top:6px">sobre presupuesto</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;margin-bottom:8px">MONTO EXTRA</div>
        <div style="font-size:24px;font-weight:800;color:#dc2626;line-height:1">${fmtARS(totalReal - totalPres)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:6px">Real ${fmtARS(totalReal)}</div>
      </div>
    </div>
  </div>

  <div style="padding:20px 32px;border-bottom:1px solid #f1f5f9">
    <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;margin-bottom:12px">DETALLE POR MES</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="padding:6px 14px;font-size:11px;font-weight:700;color:#94a3b8;text-align:left;border-bottom:1px solid #e5e7eb">Mes</th>
        <th style="padding:6px 14px;font-size:11px;font-weight:700;color:#94a3b8;text-align:right;border-bottom:1px solid #e5e7eb">Presupuesto</th>
        <th style="padding:6px 14px;font-size:11px;font-weight:700;color:#94a3b8;text-align:right;border-bottom:1px solid #e5e7eb">Real</th>
        <th style="padding:6px 14px;font-size:11px;font-weight:700;color:#94a3b8;text-align:right;border-bottom:1px solid #e5e7eb">Desvío</th>
      </tr></thead>
      <tbody>${filasMeses}</tbody>
    </table>
  </div>

  <div style="padding:24px 32px;text-align:center">
    <a href="${process.env.APP_URL || 'https://nomia.talenio.tech'}/real-vs-presupuesto" style="display:inline-block;background:#002EE5;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Ver análisis completo →</a>
    <div style="margin-top:16px;font-size:11px;color:#94a3b8">Nomia · Delenio People · Alerta automática de desvío presupuestario.</div>
  </div>

</div></body></html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Nomia <alertas@talenio.tech>',
      to: [email],
      subject: `⚠ Alerta nómina — ${clienteNombre} superó el presupuesto en +${pct}%`,
      html,
    }),
  });
}
