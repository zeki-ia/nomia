import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TopBar, Page, KpiCard, Card, Button, Spinner } from '../components/ui.jsx';
import { COLORS, MESES } from '../data/seed.js';
import { fmtARS, fmtUSD, fmtNum, fmtPct, calcularDesvios } from '../lib/payrollEngine.js';
import { generarResumenEjecutivo } from '../lib/aiClient.js';

export default function Dashboard({ presupuesto, costosReales }) {
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
