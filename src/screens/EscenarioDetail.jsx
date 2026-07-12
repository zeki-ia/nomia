import { TopBar, Page, Card, Button, KpiCard } from '../components/ui.jsx';
import { COLORS, MESES } from '../data/seed.js';
import { computePresupuesto, fmtARS, fmtUSD, fmtNum, fmtPct } from '../lib/payrollEngine.js';

export default function EscenarioDetail({ escenario, presupuestoActual, onBack }) {
  const p = computePresupuesto(escenario.empleados, escenario.parametros, escenario.macro, escenario.bonos, escenario.conceptosCustom || []);
  const delta = presupuestoActual.totalAnualARS ? (p.totalAnualARS - presupuestoActual.totalAnualARS) / presupuestoActual.totalAnualARS : 0;

  return (
    <>
      <TopBar
        title={escenario.nombre}
        subtitle={`Guardado el ${new Date(escenario.fecha).toLocaleString('es-AR')}`}
        actions={<Button variant="secondary" onClick={onBack}>← Volver</Button>}
      />
      <Page>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <KpiCard label="Costo anual (ARS) — escenario" value={fmtARS(p.totalAnualARS)} accent={COLORS.primary} />
          <KpiCard label="Costo anual (ARS) — actual" value={fmtARS(presupuestoActual.totalAnualARS)} />
          <KpiCard
            label="Diferencia vs. actual"
            value={`${delta > 0 ? '+' : ''}${fmtPct(delta)}`}
            accent={delta > 0 ? COLORS.warning : delta < 0 ? COLORS.green : COLORS.navy}
          />
          <KpiCard label="Headcount promedio" value={fmtNum(p.headcountPromedio)} />
        </div>

        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Costo por mes — escenario vs. actual (ARS)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Concepto</th>
                  {MESES.map((m) => <th key={m} style={{ ...th, textAlign: 'right' }}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td}>{escenario.nombre}</td>
                  {p.costoMensualARS.map((v, i) => <td key={i} style={{ ...td, textAlign: 'right' }}>{fmtARS(v)}</td>)}
                </tr>
                <tr>
                  <td style={td}>Actual</td>
                  {presupuestoActual.costoMensualARS.map((v, i) => <td key={i} style={{ ...td, textAlign: 'right', color: COLORS.muted }}>{fmtARS(v)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Costo total en USD</h3>
            <div style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700, marginTop: 8 }}>{fmtUSD(p.totalAnualUSD)}</div>
          </Card>
        </div>
      </Page>
    </>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#7B8299', borderBottom: '1px solid #E7E9EF', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', borderBottom: '1px solid #E7E9EF', whiteSpace: 'nowrap' };
