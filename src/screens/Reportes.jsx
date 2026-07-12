import { useState } from 'react';
import { TopBar, Page, Card, Button, Spinner } from '../components/ui.jsx';
import { COLORS, MESES } from '../data/seed.js';
import { fmtARS } from '../lib/payrollEngine.js';
import { preguntarSobrePresupuesto } from '../lib/aiClient.js';

export default function Reportes({ presupuesto }) {
  const exportarCSV = () => {
    const header = ['Concepto (ARS)', ...MESES, 'Total 2026'];
    const rows = presupuesto.consolidadoPorConcepto.map((c) => [c.label, ...c.porMes.map((v) => Math.round(v)), Math.round(c.total)]);
    rows.push(['TOTAL COSTO EMPRESA ARS', ...presupuesto.costoMensualARS.map((v) => Math.round(v)), Math.round(presupuesto.totalAnualARS)]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nomia-consolidado-2026.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <TopBar title="Reportes" subtitle="Consolidado anual por concepto" actions={
        <Button onClick={exportarCSV}>⬇ Exportar CSV</Button>
      } />
      <Page>
        <Card style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Concepto (ARS)</th>
                  {MESES.map((m) => <th key={m} style={{ ...th, textAlign: 'right' }}>{m}</th>)}
                  <th style={{ ...th, textAlign: 'right' }}>Total 2026</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.consolidadoPorConcepto.map((c) => (
                  <tr key={c.key}>
                    <td style={td}>{c.label}</td>
                    {c.porMes.map((v, i) => <td key={i} style={{ ...td, textAlign: 'right' }}>{fmtARS(v)}</td>)}
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmtARS(c.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, fontWeight: 800 }}>TOTAL COSTO EMPRESA</td>
                  {presupuesto.costoMensualARS.map((v, i) => <td key={i} style={{ ...td, textAlign: 'right', fontWeight: 800 }}>{fmtARS(v)}</td>)}
                  <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: COLORS.primary }}>{fmtARS(presupuesto.totalAnualARS)}</td>
                </tr>
                <tr>
                  <td style={td}>Headcount</td>
                  {presupuesto.headcountMensual.map((v, i) => <td key={i} style={{ ...td, textAlign: 'right' }}>{v}</td>)}
                  <td style={{ ...td, textAlign: 'right' }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <ChatPresupuesto presupuesto={presupuesto} />
      </Page>
    </>
  );
}

function ChatPresupuesto({ presupuesto }) {
  const [pregunta, setPregunta] = useState('');
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resumen = {
    totalAnualARS: Math.round(presupuesto.totalAnualARS),
    totalAnualUSD: Math.round(presupuesto.totalAnualUSD),
    headcountPromedio: presupuesto.headcountPromedio,
    porCeco: presupuesto.porCeco.map((c) => ({ ceco: c.key, costoARS: Math.round(c.costoARS), costoUSD: Math.round(c.costoUSD), pct: c.pct })),
    porSeniority: presupuesto.porSeniority.map((c) => ({ seniority: c.key, costoARS: Math.round(c.costoARS) })),
    consolidadoPorConcepto: presupuesto.consolidadoPorConcepto.map((c) => ({ concepto: c.label, total: Math.round(c.total) })),
  };

  const enviar = async () => {
    if (!pregunta.trim()) return;
    const nuevoHistorial = [...historial, { role: 'user', content: pregunta }];
    setHistorial(nuevoHistorial);
    setPregunta(''); setLoading(true); setError('');
    try {
      const respuesta = await preguntarSobrePresupuesto(pregunta, resumen, historial);
      setHistorial([...nuevoHistorial, { role: 'assistant', content: respuesta }]);
    } catch (e) {
      setError(e.message || 'No se pudo responder. Verificá que ANTHROPIC_API_KEY esté configurada.');
    }
    setLoading(false);
  };

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>✦ Preguntale al presupuesto</h3>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 16 }}>
        Ej: "¿cuánto nos cuesta el equipo de Desarrollo en dólares?" o "¿qué concepto pesa más en el total?"
      </div>

      {historial.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 320, overflowY: 'auto' }}>
          {historial.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? COLORS.primary : COLORS.surfaceMuted,
              color: m.role === 'user' ? '#fff' : COLORS.navy,
              padding: '10px 14px', borderRadius: 14, fontSize: 13.5, maxWidth: '80%',
            }}>{m.content}</div>
          ))}
        </div>
      )}
      {loading && <Spinner label="Pensando…" />}
      {error && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder="Escribí tu pregunta…"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 999, border: `1px solid ${COLORS.borderStrong}`, fontSize: 13.5 }}
        />
        <Button onClick={enviar} disabled={loading || !pregunta.trim()}>Enviar</Button>
      </div>
    </Card>
  );
}

const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7B8299', textTransform: 'uppercase', borderBottom: '1px solid #E7E9EF', whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', borderBottom: '1px solid #E7E9EF', whiteSpace: 'nowrap' };
