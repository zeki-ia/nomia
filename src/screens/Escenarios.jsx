import { useState } from 'react';
import { TopBar, Page, Card, Table, Button, Modal, Field, inputStyle, Badge, EmptyState } from '../components/ui.jsx';
import { computePresupuesto, fmtARS, fmtNum, fmtPct, downloadCSV } from '../lib/payrollEngine.js';
import { COLORS, MESES } from '../data/seed.js';

export default function Escenarios({ escenarios, presupuesto, onGuardar, onDelete, onRowClick }) {
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  const confirmarGuardado = () => {
    if (!nombre.trim()) return;
    onGuardar(nombre.trim());
    setNombre('');
    setShowModal(false);
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const computed = escenarios.map((esc) => {
    const p = computePresupuesto(esc.empleados, esc.parametros, esc.macro, esc.bonos, esc.conceptosCustom || []);
    const delta = presupuesto.totalAnualARS ? (p.totalAnualARS - presupuesto.totalAnualARS) / presupuesto.totalAnualARS : 0;
    return { ...esc, _p: p, totalAnualARS: p.totalAnualARS, headcountPromedio: p.headcountPromedio, delta };
  });

  const baseColumns = [
    { key: 'nombre', label: 'Escenario' },
    { key: 'fecha', label: 'Guardado', render: (r) => new Date(r.fecha).toLocaleDateString('es-AR') },
    { key: 'headcountPromedio', label: 'HC promedio', align: 'right', render: (r) => r.headcountPromedio.toFixed(1) },
    { key: 'totalAnualARS', label: 'Costo anual (ARS)', align: 'right', render: (r) => fmtARS(r.totalAnualARS) },
    {
      key: 'delta', label: 'vs. presupuesto actual', align: 'right',
      render: (r) => <Badge tone={r.delta > 0 ? 'warning' : r.delta < 0 ? 'green' : 'default'}>
        {r.delta > 0 ? '+' : ''}{fmtPct(r.delta)}
      </Badge>,
    },
    {
      key: 'acciones', label: '', align: 'right',
      render: (r) => <Button variant="danger" onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}>Eliminar</Button>,
    },
  ];

  const compareColumns = [
    {
      key: '_sel', label: '', align: 'right',
      render: (r) => (
        <input
          type="checkbox"
          checked={compareIds.includes(r.id)}
          onChange={() => toggleCompare(r.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: COLORS.primary }}
        />
      ),
    },
    ...baseColumns.filter((c) => c.key !== 'acciones'),
  ];

  const escA = compareIds[0] ? computed.find((e) => e.id === compareIds[0]) : null;
  const escB = compareIds[1] ? computed.find((e) => e.id === compareIds[1]) : null;

  const rows = computed;

  return (
    <>
      <TopBar title="Escenarios" subtitle="Guardá versiones del presupuesto y compará el impacto de cada supuesto" actions={<>
        {rows.length >= 2 && (
          <Button variant="secondary" onClick={() => { setCompareMode((v) => !v); setCompareIds([]); }}>
            {compareMode ? '✕ Cancelar comparación' : '⇄ Comparar escenarios'}
          </Button>
        )}
        {rows.length > 0 && !compareMode && <Button variant="secondary" onClick={() => downloadCSV('escenarios.csv', ['nombre','fecha','headcountPromedio','costoAnualARS','deltaVsActual'], rows.map(r => ({ nombre: r.nombre, fecha: new Date(r.fecha).toLocaleDateString('es-AR'), headcountPromedio: r.headcountPromedio.toFixed(1), costoAnualARS: r.totalAnualARS, deltaVsActual: fmtPct(r.delta) })))}>↓ Exportar CSV</Button>}
        <Button onClick={() => setShowModal(true)}>+ Guardar escenario actual</Button>
      </>} />
      <Page>
        {compareMode && (
          <div style={{ padding: '10px 16px', borderRadius: 12, background: COLORS.primarySoft, fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>
            {compareIds.length === 0 && 'Seleccioná dos escenarios para comparar.'}
            {compareIds.length === 1 && 'Seleccioná un segundo escenario.'}
            {compareIds.length === 2 && `Comparando: ${escA?.nombre} vs. ${escB?.nombre}`}
          </div>
        )}

        <Card style={{ padding: 0 }}>
          {rows.length === 0
            ? <EmptyState label="Todavía no guardaste ningún escenario. Ajustá parámetros y guardá una versión para comparar." />
            : <Table
                columns={compareMode ? compareColumns : baseColumns}
                rows={rows}
                onRowClick={compareMode ? (r) => toggleCompare(r.id) : onRowClick}
              />}
        </Card>

        {compareMode && escA && escB && <ComparePanel escA={escA} escB={escB} />}
      </Page>

      {showModal && (
        <Modal title="Guardar escenario actual" onClose={() => setShowModal(false)}>
          <Field label="Nombre del escenario" hint='Ej: "Base 2026" o "+2% sindicato desde abril"'>
            <input style={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={confirmarGuardado} disabled={!nombre.trim()}>Guardar</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function DeltaCell({ a, b, fmt = fmtARS, reverse = false }) {
  const diff = b - a;
  const pct = a !== 0 ? diff / Math.abs(a) : 0;
  const positive = reverse ? diff < 0 : diff > 0;
  const color = diff === 0 ? COLORS.muted : positive ? COLORS.danger : COLORS.green;
  return (
    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
      <div style={{ color, fontWeight: 700, fontSize: 13 }}>
        {diff > 0 ? '+' : ''}{fmt(diff)}
      </div>
      <div style={{ color: COLORS.muted, fontSize: 11 }}>
        {diff > 0 ? '+' : ''}{fmtPct(pct)}
      </div>
    </td>
  );
}

function ComparePanel({ escA, escB }) {
  const pA = escA._p;
  const pB = escB._p;

  const thStyle = { padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `1px solid ${COLORS.border}`, textAlign: 'right' };
  const tdL = { padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, fontWeight: 600, color: COLORS.navy, fontSize: 13, whiteSpace: 'nowrap' };
  const tdR = { padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, textAlign: 'right', color: COLORS.navy, fontSize: 13, fontVariantNumeric: 'tabular-nums' };

  // KPIs
  const kpis = [
    { label: 'Costo anual (ARS)', a: pA.totalAnualARS, b: pB.totalAnualARS, fmt: fmtARS },
    { label: 'Costo anual (USD)', a: pA.totalAnualUSD, b: pB.totalAnualUSD, fmt: (v) => `U$D ${fmtNum(Math.round(v))}` },
    { label: 'HC promedio', a: pA.headcountPromedio, b: pB.headcountPromedio, fmt: (v) => v.toFixed(1), reverse: true },
    { label: 'Costo prom./empleado/mes', a: pA.costoPromedioMensualPorEmpleado, b: pB.costoPromedioMensualPorEmpleado, fmt: fmtARS },
  ];

  // All concept labels (union)
  const allConceptLabels = [
    ...pA.consolidadoPorConcepto.map((c) => ({ key: c.key, label: c.label })),
    ...pB.consolidadoPorConcepto.filter((c) => !pA.consolidadoPorConcepto.find((x) => x.key === c.key)).map((c) => ({ key: c.key, label: c.label })),
  ];

  // All ceco keys (union)
  const allCecos = [...new Set([...pA.porCeco.map((c) => c.key), ...pB.porCeco.map((c) => c.key)])];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI summary */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px', fontWeight: 700, fontSize: 14, color: COLORS.navy, borderBottom: `1px solid ${COLORS.border}` }}>
          Resumen
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Indicador</th>
                <th style={thStyle}>{escA.nombre}</th>
                <th style={thStyle}>{escB.nombre}</th>
                <th style={thStyle}>Δ (B − A)</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((kpi) => (
                <tr key={kpi.label}>
                  <td style={tdL}>{kpi.label}</td>
                  <td style={tdR}>{kpi.fmt(kpi.a)}</td>
                  <td style={tdR}>{kpi.fmt(kpi.b)}</td>
                  <DeltaCell a={kpi.a} b={kpi.b} fmt={kpi.fmt} reverse={kpi.reverse} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Monthly costs */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px', fontWeight: 700, fontSize: 14, color: COLORS.navy, borderBottom: `1px solid ${COLORS.border}` }}>
          Costo mensual ARS
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Mes</th>
                <th style={thStyle}>{escA.nombre}</th>
                <th style={thStyle}>{escB.nombre}</th>
                <th style={thStyle}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {MESES.map((mes, i) => (
                <tr key={mes}>
                  <td style={tdL}>{mes}</td>
                  <td style={tdR}>{fmtARS(pA.costoMensualARS[i])}</td>
                  <td style={tdR}>{fmtARS(pB.costoMensualARS[i])}</td>
                  <DeltaCell a={pA.costoMensualARS[i]} b={pB.costoMensualARS[i]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* By concept */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px', fontWeight: 700, fontSize: 14, color: COLORS.navy, borderBottom: `1px solid ${COLORS.border}` }}>
          Por concepto (costo anual ARS)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Concepto</th>
                <th style={thStyle}>{escA.nombre}</th>
                <th style={thStyle}>{escB.nombre}</th>
                <th style={thStyle}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {allConceptLabels.map(({ key, label }) => {
                const cA = pA.consolidadoPorConcepto.find((c) => c.key === key);
                const cB = pB.consolidadoPorConcepto.find((c) => c.key === key);
                const vA = cA?.total ?? 0;
                const vB = cB?.total ?? 0;
                return (
                  <tr key={key}>
                    <td style={tdL}>{label}</td>
                    <td style={tdR}>{fmtARS(vA)}</td>
                    <td style={tdR}>{fmtARS(vB)}</td>
                    <DeltaCell a={vA} b={vB} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* By cost center */}
      {allCecos.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', fontWeight: 700, fontSize: 14, color: COLORS.navy, borderBottom: `1px solid ${COLORS.border}` }}>
            Por centro de costo (costo anual ARS)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Centro de costo</th>
                  <th style={thStyle}>{escA.nombre}</th>
                  <th style={thStyle}>{escB.nombre}</th>
                  <th style={thStyle}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {allCecos.map((ceco) => {
                  const vA = pA.porCeco.find((c) => c.key === ceco)?.costoARS ?? 0;
                  const vB = pB.porCeco.find((c) => c.key === ceco)?.costoARS ?? 0;
                  return (
                    <tr key={ceco}>
                      <td style={tdL}>{ceco}</td>
                      <td style={tdR}>{fmtARS(vA)}</td>
                      <td style={tdR}>{fmtARS(vB)}</td>
                      <DeltaCell a={vA} b={vB} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
