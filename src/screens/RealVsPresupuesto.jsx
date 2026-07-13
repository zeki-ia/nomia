import { useState } from 'react';
import { TopBar, Page, Card, Field, Button, Modal, Badge, inputStyle } from '../components/ui.jsx';
import { COLORS, MESES } from '../data/seed.js';
import { calcularDesvios, fmtARS, fmtPct } from '../lib/payrollEngine.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function RealVsPresupuesto({ presupuesto, costosReales, onCrear, onEliminar, onImportar }) {
  const [modal, setModal] = useState(false);
  const [modalImport, setModalImport] = useState(false);

  const { filas, mesesCargados, desvioAcumuladoARS, desvioAcumuladoPct } = calcularDesvios(presupuesto.costoMensualARS, costosReales);

  const chartData = filas.map((f) => ({ mes: f.mes, Presupuesto: Math.round(f.presupuesto), Real: f.tieneReal ? Math.round(f.real) : null }));

  return (
    <>
      <TopBar
        title="Real vs. Presupuesto"
        subtitle="Cargá el costo real de cada mes para ver desvíos contra lo presupuestado"
        actions={<>
          <Button variant="secondary" onClick={() => setModalImport(true)}>⬆ Importar CSV</Button>
          <Button onClick={() => setModal(true)}>+ Cargar mes</Button>
        </>}
      />
      <Page>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted, marginBottom: 8 }}>Meses cargados</div>
            <div style={{ fontFamily: 'Sora', fontSize: 26, fontWeight: 700 }}>{mesesCargados} / 12</div>
          </Card>
          <Card style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted, marginBottom: 8 }}>Desvío acumulado (ARS)</div>
            <div style={{ fontFamily: 'Sora', fontSize: 26, fontWeight: 700, color: desvioAcumuladoARS > 0 ? COLORS.warning : desvioAcumuladoARS < 0 ? COLORS.green : COLORS.navy }}>
              {mesesCargados ? `${desvioAcumuladoARS > 0 ? '+' : ''}${fmtARS(desvioAcumuladoARS)}` : '—'}
            </div>
          </Card>
          <Card style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted, marginBottom: 8 }}>Desvío acumulado (%)</div>
            <div style={{ fontFamily: 'Sora', fontSize: 26, fontWeight: 700, color: desvioAcumuladoPct > 0 ? COLORS.warning : desvioAcumuladoPct < 0 ? COLORS.green : COLORS.navy }}>
              {mesesCargados ? `${desvioAcumuladoPct > 0 ? '+' : ''}${fmtPct(desvioAcumuladoPct)}` : '—'}
            </div>
          </Card>
        </div>

        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Presupuesto vs. Real por mes (ARS)</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} />
                <Tooltip formatter={(v) => fmtARS(v)} />
                <Legend />
                <Line type="monotone" dataKey="Presupuesto" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Real" stroke={COLORS.warning} strokeWidth={2} connectNulls={false} />
              </LineChart>
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
                  <th style={{ ...th, textAlign: 'right' }}>Desvío %</th>
                  <th style={{ ...th, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.mes}>
                    <td style={td}>{f.mes}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmtARS(f.presupuesto)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{f.tieneReal ? fmtARS(f.real) : <span style={{ color: COLORS.mutedSoft }}>Sin cargar</span>}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {f.tieneReal ? (
                        <Badge tone={f.desvioARS > 0 ? 'warning' : f.desvioARS < 0 ? 'green' : 'default'}>
                          {f.desvioARS > 0 ? '+' : ''}{fmtARS(f.desvioARS)}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{f.tieneReal ? `${f.desvioPct > 0 ? '+' : ''}${fmtPct(f.desvioPct)}` : '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {f.tieneReal && (
                        <Button variant="danger" onClick={() => onEliminar(f.mesIndex + 1)}>Eliminar</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Page>

      {modal && <CargarMesModal onClose={() => setModal(false)} onCrear={onCrear} />}
      {modalImport && <ImportarCsvModal onClose={() => setModalImport(false)} onImportar={onImportar} />}
    </>
  );
}

function CargarMesModal({ onClose, onCrear }) {
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(1);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  const guardar = () => {
    if (!monto) return;
    onCrear({ anio: Number(anio), mes: Number(mes), monto: Number(monto), nota: nota.trim() || null });
    onClose();
  };

  return (
    <Modal title="Cargar costo real del mes" onClose={onClose} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Año">
            <input type="number" style={inputStyle} value={anio} onChange={(e) => setAnio(e.target.value)} />
          </Field>
          <Field label="Mes">
            <select style={inputStyle} value={mes} onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Costo real total (ARS)">
          <input type="number" style={inputStyle} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Ej: 145000000" />
        </Field>
        <Field label="Nota (opcional)">
          <input style={inputStyle} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: incluye extras de diciembre" />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!monto}>Guardar</Button>
      </div>
    </Modal>
  );
}

function ImportarCsvModal({ onClose, onImportar }) {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const texto = await file.text();
    const [headerLine, ...lines] = texto.trim().split(/\r?\n/);
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
    const idxAnio = headers.indexOf('año') !== -1 ? headers.indexOf('año') : headers.indexOf('anio');
    const idxMes = headers.indexOf('mes');
    const idxMonto = headers.indexOf('monto');
    const idxNota = headers.indexOf('nota');
    if (idxAnio === -1 || idxMes === -1 || idxMonto === -1) {
      setError('El CSV necesita columnas: Año, Mes, Monto (y opcionalmente Nota).');
      return;
    }
    const parsed = lines.filter(Boolean).map((line) => {
      const cols = line.split(',');
      return {
        anio: Number(cols[idxAnio]), mes: Number(cols[idxMes]), monto: Number(cols[idxMonto]),
        nota: idxNota !== -1 ? (cols[idxNota] || '').trim() || null : null,
      };
    }).filter((r) => r.anio && r.mes && !isNaN(r.monto));
    setFilas(parsed);
  };

  return (
    <Modal title="Importar costos reales (CSV)" onClose={onClose} width={480}>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 14 }}>
        Columnas: Año, Mes (1-12), Monto, Nota (opcional). Ej: <code>2026,1,132000000,</code>
      </div>
      <input type="file" accept=".csv" onChange={onFile} />
      {error && <div style={{ color: COLORS.danger, fontSize: 13, marginTop: 10 }}>{error}</div>}
      {filas && (
        <div style={{ marginTop: 14, fontSize: 13, color: COLORS.navy }}>{filas.length} filas listas para importar.</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onImportar(filas); onClose(); }} disabled={!filas || filas.length === 0}>
          Importar {filas?.length || ''}
        </Button>
      </div>
    </Modal>
  );
}

const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap' };
