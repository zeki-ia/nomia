import { useState, useRef, useCallback } from 'react';
import { TopBar, Page, Card, Field, Button, Modal, Badge, inputStyle } from '../components/ui.jsx';
import { COLORS, MESES } from '../data/seed.js';
import { calcularDesvios, fmtARS, fmtPct } from '../lib/payrollEngine.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const TABS = ['Resumen', 'Por concepto', 'Por persona'];
const YEAR = new Date().getFullYear();

export default function RealVsPresupuesto({
  presupuesto, costosReales,
  onCrear, onEliminar, onEliminarById, onImportar,
  alertaUmbral = 0.05, onUpdateUmbral,
}) {
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState(null); // 'total' | 'detalle' | 'import'
  const [alertModal, setAlertModal] = useState(false);

  const costosTotales  = costosReales.filter(c => c.centroCosto === 'TOTAL');
  const costosConcepto = costosReales.filter(c => c.centroCosto?.startsWith('CONCEPTO:'));
  const costosPersona  = costosReales.filter(c => c.centroCosto?.startsWith('PERSONA:'));

  const { filas, mesesCargados, desvioAcumuladoARS, desvioAcumuladoPct } =
    calcularDesvios(presupuesto.costoMensualARS, costosTotales);

  const overThreshold = mesesCargados > 0 && desvioAcumuladoPct > alertaUmbral;

  const exportAll = () => {
    const wb = XLSX.utils.book_new();

    // Hoja resumen
    const resumen = filas.map(f => ({
      Mes: f.mes,
      Presupuesto: f.presupuesto,
      Real: f.tieneReal ? f.real : '',
      'Desvío ARS': f.desvioARS ?? '',
      'Desvío %': f.desvioPct != null ? fmtPct(f.desvioPct) : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');

    // Hoja conceptos
    if (costosConcepto.length) {
      const rows = costosConcepto.map(c => ({
        Concepto: c.centroCosto.replace('CONCEPTO:', ''),
        Año: c.anio, Mes: c.mes, Monto: c.monto, Nota: c.nota || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Por concepto');
    }

    // Hoja personas
    if (costosPersona.length) {
      const rows = costosPersona.map(c => ({
        Persona: c.centroCosto.replace('PERSONA:', ''),
        Año: c.anio, Mes: c.mes, Monto: c.monto, Nota: c.nota || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Por persona');
    }

    XLSX.writeFile(wb, `real-vs-presupuesto-${YEAR}.xlsx`);
  };

  return (
    <>
      <TopBar
        title="Real vs. Presupuesto"
        subtitle="Registrá el costo real por mes, concepto y persona para seguir desvíos"
        actions={<>
          <Button variant="secondary" onClick={exportAll}>↓ Exportar Excel</Button>
          <Button variant="secondary" onClick={() => setModal('import')}>⬆ Importar</Button>
          <Button variant="secondary" onClick={() => setAlertModal(true)}>
            {overThreshold ? '🔴' : '🟢'} Alerta {Math.round(alertaUmbral * 100)}%
          </Button>
          <Button onClick={() => setModal('total')}>+ Mes total</Button>
          <Button onClick={() => setModal('detalle')}>+ Detalle</Button>
        </>}
      />
      <Page>
        {/* Alerta visible si supera umbral */}
        {overThreshold && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 18px', background: '#fff1f2',
            border: '1.5px solid #fca5a5', borderRadius: 12, marginBottom: 16,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#b91c1c' }}>
                Desvío acumulado supera el umbral ({Math.round(alertaUmbral * 100)}%)
              </div>
              <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                El costo real acumulado está {Math.round(desvioAcumuladoPct * 100)}% por encima del presupuesto.
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <KpiCard label="Meses cargados" value={`${mesesCargados} / 12`} />
          <KpiCard
            label="Desvío acumulado"
            value={mesesCargados ? `${desvioAcumuladoPct > 0 ? '+' : ''}${fmtPct(desvioAcumuladoPct)}` : '—'}
            tone={desvioAcumuladoPct > 0 ? 'danger' : desvioAcumuladoPct < 0 ? 'green' : 'neutral'}
          />
          <KpiCard
            label="Monto extra"
            value={mesesCargados ? `${desvioAcumuladoARS > 0 ? '+' : ''}${fmtARS(desvioAcumuladoARS)}` : '—'}
            tone={desvioAcumuladoARS > 0 ? 'danger' : desvioAcumuladoARS < 0 ? 'green' : 'neutral'}
          />
          <KpiCard label="Conceptos cargados" value={new Set(costosConcepto.map(c => c.centroCosto)).size} />
          <KpiCard label="Personas cargadas" value={new Set(costosPersona.map(c => c.centroCosto)).size} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13.5,
                background: tab === i ? COLORS.primary : COLORS.surface,
                color: tab === i ? '#fff' : COLORS.muted,
                transition: 'all .15s',
              }}
            >{t}</button>
          ))}
        </div>

        {tab === 0 && (
          <ResumenTab
            filas={filas}
            chartData={filas.map(f => ({
              mes: f.mes,
              Presupuesto: Math.round(f.presupuesto),
              Real: f.tieneReal ? Math.round(f.real) : null,
              desvio: f.tieneReal ? Math.round(f.desvioARS) : null,
            }))}
            onEliminar={onEliminar}
          />
        )}
        {tab === 1 && (
          <DetalleTab
            tipo="concepto"
            costos={costosConcepto}
            prefix="CONCEPTO:"
            label="Concepto"
            presupuesto={presupuesto}
            onEliminarById={onEliminarById}
          />
        )}
        {tab === 2 && (
          <DetalleTab
            tipo="persona"
            costos={costosPersona}
            prefix="PERSONA:"
            label="Persona"
            presupuesto={presupuesto}
            onEliminarById={onEliminarById}
          />
        )}
      </Page>

      {modal === 'total' && (
        <CargarMesModal onClose={() => setModal(null)} onCrear={onCrear} />
      )}
      {modal === 'detalle' && (
        <CargarDetalleModal onClose={() => setModal(null)} onCrear={onCrear} />
      )}
      {modal === 'import' && (
        <ImportarModal onClose={() => setModal(null)} onImportar={onImportar} />
      )}
      {alertModal && (
        <AlertaModal
          umbral={alertaUmbral}
          onClose={() => setAlertModal(false)}
          onGuardar={(v) => { onUpdateUmbral?.(v); setAlertModal(false); }}
        />
      )}
    </>
  );
}

// ── Resumen tab ──────────────────────────────────────────────────────────────

function ResumenTab({ filas, chartData, onEliminar }) {
  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: COLORS.navy }}>
          Presupuesto vs. Real por mes
        </h3>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPres" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={44} />
              <Tooltip formatter={(v, name) => [fmtARS(v), name]} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="Presupuesto" stroke={COLORS.primary} strokeWidth={2} fill="url(#gradPres)" dot={false} />
              <Area type="monotone" dataKey="Real" stroke={COLORS.warning} strokeWidth={2} fill="url(#gradReal)" connectNulls={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Mes</th>
                <th style={{ ...th, textAlign: 'right' }}>Presupuesto</th>
                <th style={{ ...th, textAlign: 'right' }}>Real</th>
                <th style={{ ...th, textAlign: 'right' }}>Desvío</th>
                <th style={{ ...th, textAlign: 'right' }}>%</th>
                <th style={{ ...th }}></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.mes} style={{ background: f.desvioPct > 0.05 ? '#fff8f8' : undefined }}>
                  <td style={td}><span style={{ fontWeight: 600 }}>{f.mes}</span></td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtARS(f.presupuesto)}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {f.tieneReal ? fmtARS(f.real) : <span style={{ color: COLORS.mutedSoft, fontSize: 12 }}>Sin cargar</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {f.tieneReal ? (
                      <span style={{ fontWeight: 700, color: f.desvioARS > 0 ? COLORS.warning : COLORS.green, fontVariantNumeric: 'tabular-nums' }}>
                        {f.desvioARS > 0 ? '+' : ''}{fmtARS(f.desvioARS)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {f.tieneReal ? (
                      <span style={{ fontWeight: 700, color: f.desvioPct > 0 ? COLORS.warning : COLORS.green }}>
                        {f.desvioPct > 0 ? '+' : ''}{fmtPct(f.desvioPct)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ ...td }}>
                    {f.tieneReal && (
                      <button
                        onClick={() => onEliminar(f.mesIndex + 1)}
                        style={{ padding: '3px 10px', borderRadius: 7, border: `1px solid ${COLORS.danger}`, background: '#fff1f2', color: COLORS.danger, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}
                      >Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ── Detalle tab (concepto / persona) ──────────────────────────────────────────

function DetalleTab({ costos, prefix, label, onEliminarById }) {
  const nombres = [...new Set(costos.map(c => c.centroCosto.replace(prefix, '')))].sort();
  const mesesConDatos = [...new Set(costos.map(c => c.mes))].sort((a, b) => a - b);

  const lookup = {};
  for (const c of costos) {
    const nombre = c.centroCosto.replace(prefix, '');
    lookup[`${nombre}-${c.mes}`] = c;
  }

  if (!nombres.length) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Sin datos de {label.toLowerCase()}s</div>
          <div style={{ fontSize: 13 }}>
            Usá "＋ Detalle" para cargar costos por {label.toLowerCase()},
            o importá un Excel con columna <strong>{label}</strong>.
          </div>
        </div>
      </Card>
    );
  }

  const totalesPorMes = {};
  for (const mes of mesesConDatos) {
    totalesPorMes[mes] = nombres.reduce((s, n) => s + (lookup[`${n}-${mes}`]?.monto || 0), 0);
  }

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>{label}</th>
              {mesesConDatos.map(m => <th key={m} style={{ ...th, textAlign: 'right' }}>{MESES[m - 1]}</th>)}
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {nombres.map(nombre => {
              const filaTotal = mesesConDatos.reduce((s, m) => s + (lookup[`${nombre}-${m}`]?.monto || 0), 0);
              return (
                <tr key={nombre}>
                  <td style={{ ...td, fontWeight: 600 }}>{nombre}</td>
                  {mesesConDatos.map(m => {
                    const c = lookup[`${nombre}-${m}`];
                    return (
                      <td key={m} style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {c ? (
                          <span
                            title="Click para eliminar"
                            onClick={() => onEliminarById?.(c.id)}
                            style={{ cursor: 'pointer', color: COLORS.navy }}
                          >{fmtARS(c.monto)}</span>
                        ) : <span style={{ color: COLORS.mutedSoft, fontSize: 11 }}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtARS(filaTotal)}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: `2px solid ${COLORS.border}`, background: COLORS.bg }}>
              <td style={{ ...td, fontWeight: 700 }}>Total</td>
              {mesesConDatos.map(m => (
                <td key={m} style={{ ...td, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtARS(totalesPorMes[m] || 0)}
                </td>
              ))}
              <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {fmtARS(Object.values(totalesPorMes).reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ padding: '8px 14px', fontSize: 11.5, color: COLORS.muted }}>
        Hacé click en un monto para eliminarlo.
      </div>
    </Card>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────

function CargarMesModal({ onClose, onCrear }) {
  const [anio, setAnio] = useState(YEAR);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  const guardar = () => {
    if (!monto) return;
    onCrear({ anio: Number(anio), mes: Number(mes), monto: Number(monto), nota: nota.trim() || null, centroCosto: 'TOTAL' });
    onClose();
  };

  return (
    <Modal title="Cargar costo real del mes" onClose={onClose} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Año">
            <input type="number" style={inputStyle} value={anio} onChange={e => setAnio(e.target.value)} />
          </Field>
          <Field label="Mes">
            <select style={inputStyle} value={mes} onChange={e => setMes(e.target.value)}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Costo real total (ARS)">
          <input type="number" style={inputStyle} value={monto} onChange={e => setMonto(e.target.value)} placeholder="Ej: 145000000" />
        </Field>
        <Field label="Nota (opcional)">
          <input style={inputStyle} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: incluye extras de diciembre" />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!monto}>Guardar</Button>
      </div>
    </Modal>
  );
}

function CargarDetalleModal({ onClose, onCrear }) {
  const [tipo, setTipo] = useState('concepto');
  const [anio, setAnio] = useState(YEAR);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  const guardar = () => {
    if (!monto || !nombre.trim()) return;
    const prefix = tipo === 'concepto' ? 'CONCEPTO:' : 'PERSONA:';
    onCrear({
      anio: Number(anio), mes: Number(mes),
      monto: Number(monto),
      nota: nota.trim() || null,
      centroCosto: `${prefix}${nombre.trim()}`,
    });
    onClose();
  };

  return (
    <Modal title="Cargar detalle (concepto o persona)" onClose={onClose} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Tipo">
          <select style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="concepto">Por concepto (Sueldo bruto, Cargas, etc.)</option>
            <option value="persona">Por persona</option>
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Año">
            <input type="number" style={inputStyle} value={anio} onChange={e => setAnio(e.target.value)} />
          </Field>
          <Field label="Mes">
            <select style={inputStyle} value={mes} onChange={e => setMes(e.target.value)}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Field label={tipo === 'concepto' ? 'Concepto' : 'Persona (nombre completo)'}>
          <input
            style={inputStyle}
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder={tipo === 'concepto' ? 'Ej: Sueldo bruto' : 'Ej: Juan Pérez'}
          />
        </Field>
        <Field label="Monto (ARS)">
          <input type="number" style={inputStyle} value={monto} onChange={e => setMonto(e.target.value)} placeholder="Ej: 2500000" />
        </Field>
        <Field label="Nota (opcional)">
          <input style={inputStyle} value={nota} onChange={e => setNota(e.target.value)} />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!monto || !nombre.trim()}>Guardar</Button>
      </div>
    </Modal>
  );
}

function ImportarModal({ onClose, onImportar }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const totalData = [
      { Año: YEAR, Mes: 1, Monto: 130000000, Nota: 'Total enero' },
      { Año: YEAR, Mes: 2, Monto: 133000000, Nota: '' },
    ];
    const concData = [
      { Año: YEAR, Mes: 1, Concepto: 'Sueldo bruto', Monto: 80000000, Nota: '' },
      { Año: YEAR, Mes: 1, Concepto: 'Cargas sociales', Monto: 30000000, Nota: '' },
    ];
    const persData = [
      { Año: YEAR, Mes: 1, Persona: 'Juan Pérez', Monto: 4500000, Nota: '' },
      { Año: YEAR, Mes: 1, Persona: 'Ana Gómez', Monto: 3800000, Nota: '' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totalData), 'Total mensual');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(concData), 'Por concepto');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(persData), 'Por persona');
    XLSX.writeFile(wb, 'template-costos-reales.xlsx');
  };

  const processFile = useCallback(async (file) => {
    setError('');
    setRows(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const parsed = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!data.length) continue;

        const hdr = Object.keys(data[0]).map(h => h.toLowerCase().trim());
        const has = key => hdr.some(h => h === key || h.startsWith(key.slice(0, 3)));

        const idxAnio   = hdr.findIndex(h => h.startsWith('a') && (h.includes('ñ') || h.includes('n')));
        const idxMes    = hdr.findIndex(h => h === 'mes');
        const idxMonto  = hdr.findIndex(h => h === 'monto');
        const idxNota   = hdr.findIndex(h => h === 'nota');
        const idxConc   = hdr.findIndex(h => h === 'concepto');
        const idxPers   = hdr.findIndex(h => h === 'persona');
        const keys      = Object.keys(data[0]);

        if (idxMes === -1 || idxMonto === -1) continue;

        for (const row of data) {
          const vals = Object.values(row);
          const anio = idxAnio !== -1 ? Number(vals[idxAnio]) : YEAR;
          const mes  = Number(vals[idxMes]);
          const monto = Number(vals[idxMonto]);
          if (!mes || isNaN(monto)) continue;

          const nota = idxNota !== -1 ? (String(vals[idxNota]).trim() || null) : null;

          if (idxConc !== -1) {
            const concepto = String(vals[idxConc]).trim();
            if (concepto) parsed.push({ anio, mes, monto, nota, centroCosto: `CONCEPTO:${concepto}` });
          } else if (idxPers !== -1) {
            const persona = String(vals[idxPers]).trim();
            if (persona) parsed.push({ anio, mes, monto, nota, centroCosto: `PERSONA:${persona}` });
          } else {
            parsed.push({ anio, mes, monto, nota, centroCosto: 'TOTAL' });
          }
        }
      }

      if (!parsed.length) {
        setError('No se encontraron filas válidas. Verificá que el archivo tenga las columnas Año, Mes, Monto.');
        return;
      }
      setRows(parsed);
    } catch (e) {
      setError('No se pudo leer el archivo: ' + e.message);
    }
  }, []);

  const onFileInput = e => { const f = e.target.files?.[0]; if (f) processFile(f); };
  const onDrop = e => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const byType = rows ? {
    total: rows.filter(r => r.centroCosto === 'TOTAL').length,
    concepto: rows.filter(r => r.centroCosto?.startsWith('CONCEPTO:')).length,
    persona: rows.filter(r => r.centroCosto?.startsWith('PERSONA:')).length,
  } : null;

  return (
    <Modal title="Importar costos reales" onClose={onClose} width={520}>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 14, lineHeight: 1.6 }}>
        Aceptamos <strong>.xlsx</strong> y <strong>.csv</strong>. El archivo puede tener hasta 3 hojas:
        una para totales mensuales, una para conceptos, una para personas.
        Columnas requeridas: <code>Año</code>, <code>Mes</code>, <code>Monto</code>.
        Para detalle: <code>Concepto</code> o <code>Persona</code>.
      </div>

      <button
        onClick={downloadTemplate}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          border: `1px solid ${COLORS.primary}`, background: '#fff',
          color: COLORS.primary, fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', marginBottom: 16,
        }}
      >↓ Descargar template de ejemplo</button>

      {/* Drop zone */}
      <div
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? COLORS.primary : COLORS.border}`,
          borderRadius: 12, padding: '32px 20px', textAlign: 'center',
          background: dragging ? '#f0f4ff' : COLORS.bg, cursor: 'pointer',
          transition: 'all .15s',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.navy }}>
          Arrastrar archivo aquí o hacer click
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>.xlsx, .xls, .csv</div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {error && <div style={{ color: COLORS.danger, fontSize: 13, marginTop: 12 }}>{error}</div>}

      {byType && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: COLORS.green, marginBottom: 6 }}>
            ✓ {rows.length} registros listos para importar
          </div>
          {byType.total > 0 && <div style={{ color: COLORS.muted }}>• {byType.total} totales mensuales</div>}
          {byType.concepto > 0 && <div style={{ color: COLORS.muted }}>• {byType.concepto} por concepto</div>}
          {byType.persona > 0 && <div style={{ color: COLORS.muted }}>• {byType.persona} por persona</div>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onImportar(rows); onClose(); }} disabled={!rows?.length}>
          Importar {rows?.length ? `(${rows.length})` : ''}
        </Button>
      </div>
    </Modal>
  );
}

function AlertaModal({ umbral, onClose, onGuardar }) {
  const [val, setVal] = useState(Math.round(umbral * 100));

  return (
    <Modal title="Configurar alerta de desvío" onClose={onClose} width={380}>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 1.6 }}>
        Cuando el desvío acumulado supere este umbral, Nomia te va a enviar un email de alerta.
      </div>
      <Field label="Umbral de alerta (%)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="number" min={1} max={50} step={1}
            style={{ ...inputStyle, width: 80 }}
            value={val}
            onChange={e => setVal(Number(e.target.value))}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy }}>%</span>
        </div>
      </Field>
      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
        Valor actual: {Math.round(umbral * 100)}%. Recomendado: 5%.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onGuardar(val / 100)} disabled={!val || val < 1}>Guardar</Button>
      </div>
    </Modal>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, tone }) {
  const colors = { danger: COLORS.warning, green: COLORS.green, neutral: COLORS.navy };
  return (
    <Card style={{ flex: 1, minWidth: 160, padding: '16px 18px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Sora', fontSize: 24, fontWeight: 800,
        color: tone ? colors[tone] : COLORS.navy,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </Card>
  );
}

const th = {
  textAlign: 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 700,
  color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.3px',
  borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap',
};
const td = { padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap' };
