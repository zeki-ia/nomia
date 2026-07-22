import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TopBar, Page, KpiCard, Card, Button, Spinner } from '../components/ui.jsx';
import { COLORS, MESES } from '../data/seed.js';
import { fmtARS, fmtUSD, fmtNum, fmtPct, calcularDesvios } from '../lib/payrollEngine.js';
import { generarResumenEjecutivo } from '../lib/aiClient.js';

export default function Dashboard({ presupuesto, costosReales, empleados = [] }) {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const desvios = calcularDesvios(presupuesto.costoMensualARS, costosReales);

  const chartData = MESES.map((mes, i) => ({
    mes,
    ARS: Math.round(presupuesto.costoMensualARS[i]),
    HC: presupuesto.headcountMensual[i],
  }));

  const pedirResumen = async () => {
    setLoading(true); setError(''); setResumen('');
    try {
      const texto = await generarResumenEjecutivo({
        totalAnualARS: Math.round(presupuesto.totalAnualARS),
        totalAnualUSD: Math.round(presupuesto.totalAnualUSD),
        headcountPromedio: presupuesto.headcountPromedio,
        costoEnero: Math.round(presupuesto.costoMensualARS[0]),
        costoDiciembre: Math.round(presupuesto.costoMensualARS[11]),
        porCeco: presupuesto.porCeco.map((c) => ({ ceco: c.key, costoARS: Math.round(c.costoARS), pct: c.pct })),
        porSeniority: presupuesto.porSeniority.map((c) => ({ seniority: c.key, costoARS: Math.round(c.costoARS) })),
      });
      setResumen(texto);
    } catch (e) {
      setError(e.message || 'No se pudo generar el resumen. Verificá que ANTHROPIC_API_KEY esté configurada.');
    }
    setLoading(false);
  };

  const isEmpty = presupuesto.headcountPromedio === 0;

  // Contract expiry alerts — 30/15/7 day thresholds
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const vencimientos = empleados
    .filter((e) => e.fechaFin)
    .map((e) => {
      const fin = new Date(e.fechaFin); fin.setHours(0, 0, 0, 0);
      const dias = Math.round((fin - today) / (1000 * 60 * 60 * 24));
      return { ...e, dias };
    })
    .filter((e) => e.dias >= 0 && e.dias <= 30)
    .sort((a, b) => a.dias - b.dias);

  if (isEmpty) {
    return (
      <>
        <TopBar title="Dashboard" subtitle="Presupuesto de payroll" />
        <Page>
          <div style={{ maxWidth: 540, margin: '32px auto', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.navy, marginBottom: 8, fontFamily: 'Sora, sans-serif' }}>
              ¡Empezá tu presupuesto!
            </div>
            <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.65, marginBottom: 32 }}>
              Todavía no hay empleados cargados. Seguí estos 3 pasos para tener tu primer presupuesto de payroll.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 32 }}>
              {[
                { n: 1, icon: '👥', title: 'Cargá tus empleados', desc: 'Importá un Excel con tu nómina o agregalos uno a uno.', path: '/empleados', label: 'Ir a Empleados' },
                { n: 2, icon: '⚙️', title: 'Configurá los parámetros', desc: 'Definí los supuestos macro: inflación, ajuste salarial y tipos de cambio.', path: '/parametros', label: 'Ir a Parámetros' },
                { n: 3, icon: '📊', title: 'Generá tu primer presupuesto', desc: 'Con los empleados cargados el dashboard se activa automáticamente. Podés guardar escenarios para comparar supuestos.', path: '/escenarios', label: 'Ver Escenarios' },
              ].map((s) => (
                <div key={s.n} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${COLORS.border}`, background: '#fff', alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: COLORS.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, letterSpacing: 0.5, marginBottom: 2 }}>PASO {s.n}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, marginBottom: 3 }}>{s.title}</div>
                    <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                  <Button variant="secondary" onClick={() => navigate(s.path)} style={{ flexShrink: 0, alignSelf: 'center' }}>{s.label} →</Button>
                </div>
              ))}
            </div>
          </div>
        </Page>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dashboard" subtitle="Presupuesto de payroll 2026" actions={
        <Button onClick={pedirResumen} disabled={loading}>{loading ? 'Generando…' : '✦ Resumen ejecutivo IA'}</Button>
      } />
      <Page>
        {(resumen || error || loading) && (
          <Card style={{ background: COLORS.primarySoft, border: 'none' }}>
            {loading && <Spinner label="Analizando el presupuesto…" />}
            {error && <div style={{ color: COLORS.danger, fontSize: 13.5 }}>{error}</div>}
            {resumen && <div style={{ fontSize: 14, color: COLORS.navy, lineHeight: 1.6 }}>{resumen}</div>}
          </Card>
        )}

        {vencimientos.length > 0 && (
          <Card style={{ background: '#fffbea', border: '1.5px solid #fcd34d', padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#92400e' }}>
                {vencimientos.length === 1 ? '1 contrato por vencer' : `${vencimientos.length} contratos por vencer`}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {vencimientos.map((e) => {
                const urgency = e.dias <= 7 ? { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: `${e.dias}d` }
                  : e.dias <= 15 ? { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', label: `${e.dias}d` }
                  : { bg: '#fffbea', border: '#fde68a', text: '#92400e', label: `${e.dias}d` };
                return (
                  <div key={e.id} onClick={() => navigate(`/empleados/${e.id}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                    borderRadius: 9, background: urgency.bg, border: `1px solid ${urgency.border}`, cursor: 'pointer',
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: urgency.text }}>{e.nombre}</span>
                      <span style={{ fontSize: 12, color: COLORS.muted, marginLeft: 8 }}>{e.cargo} · {e.centroCosto}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: urgency.text, background: '#fff', borderRadius: 6, padding: '3px 8px', border: `1px solid ${urgency.border}` }}>
                      {e.dias === 0 ? 'Hoy' : `${urgency.label} restantes`}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>
                      {new Date(e.fechaFin).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <KpiCard label="Costo anual (ARS)" value={fmtARS(presupuesto.totalAnualARS)} accent={COLORS.primary} />
          <KpiCard label="Costo anual (USD)" value={fmtUSD(presupuesto.totalAnualUSD)} accent={COLORS.green} />
          <KpiCard label="Headcount promedio" value={fmtNum(presupuesto.headcountPromedio)} />
          <KpiCard label="Costo prom. mensual / empleado" value={fmtARS(presupuesto.costoPromedioMensualPorEmpleado)} />
        </div>

        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Costo por mes (ARS)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={44} />
              <Tooltip formatter={(v) => fmtARS(v)} contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 13 }} />
              <Bar dataKey="ARS" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Costo anual por centro de costo</h3>
            <BreakdownList rows={presupuesto.porCeco} />
          </Card>
          <Card style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Costo anual por seniority</h3>
            <BreakdownList rows={presupuesto.porSeniority} />
          </Card>
        </div>

        <Card style={{ cursor: 'pointer' }} onClick={() => navigate('/real-vs-presupuesto')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Real vs. Presupuesto</h3>
            <span style={{ fontSize: 12.5, color: COLORS.primary, fontWeight: 700 }}>Ver detalle →</span>
          </div>
          {desvios.mesesCargados === 0 ? (
            <div style={{ fontSize: 13, color: COLORS.muted }}>Todavía no cargaste costo real de ningún mes.</div>
          ) : (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>Meses cargados</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{desvios.mesesCargados} / 12</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>Desvío acumulado</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: desvios.desvioAcumuladoARS > 0 ? COLORS.warning : COLORS.green }}>
                  {desvios.desvioAcumuladoARS > 0 ? '+' : ''}{fmtPct(desvios.desvioAcumuladoPct)}
                </div>
              </div>
            </div>
          )}
        </Card>
      </Page>
    </>
  );
}

function BreakdownList({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((row) => (
        <div key={row.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: COLORS.navy }}>{row.key}</span>
            <span style={{ color: COLORS.muted }}>{fmtARS(row.costoARS)} · {fmtPct(row.pct)}</span>
          </div>
          <div style={{ height: 6, background: COLORS.surfaceMuted, borderRadius: 999 }}>
            <div style={{ height: 6, width: `${Math.max(row.pct * 100, 2)}%`, background: COLORS.primary, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
