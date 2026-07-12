import { useState } from 'react';
import { TopBar, Page, Card, Field, Button, Modal, inputStyle, Spinner, Badge } from '../components/ui.jsx';
import { SENIORITIES, CECOS, COLORS, CONCEPTO_TIPOS, CONCEPTO_ALCANCES, MESES, PARAMETRO_CATALOGO, BONO_TIPOS } from '../data/seed.js';
import { fmtARS, fmtPct } from '../lib/payrollEngine.js';
import { proponerCambiosParametros } from '../lib/aiClient.js';

const TABS = [
  { key: 'macro', label: 'Supuestos macro' },
  { key: 'costeo', label: 'Costeo' },
  { key: 'bonos', label: 'Bonos por seniority' },
  { key: 'copiloto', label: '✦ Copiloto IA' },
];

export default function Parametros({
  parametros, macro, bonos, conceptosCustom, setParametros, setMacro, setBonos,
  onCrearConcepto, onActualizarConcepto, onEliminarConcepto,
}) {
  const [tab, setTab] = useState('macro');

  return (
    <>
      <TopBar title="Parámetros de costeo" subtitle="Ajustá los supuestos que alimentan el motor de cálculo" />
      <Page>
        <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 16px', borderRadius: 999, border: 'none', fontSize: 13.5, fontWeight: 700,
                background: tab === t.key ? COLORS.primary : 'transparent',
                color: tab === t.key ? '#fff' : COLORS.muted,
              }}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'macro' && <MacroTab macro={macro} setMacro={setMacro} />}
        {tab === 'costeo' && (
          <>
            <CosteoTab parametros={parametros} setParametros={setParametros} />
            <ConceptosTab
              conceptos={conceptosCustom}
              onCrear={onCrearConcepto}
              onActualizar={onActualizarConcepto}
              onEliminar={onEliminarConcepto}
            />
          </>
        )}
        {tab === 'bonos' && <BonosTab bonos={bonos} setBonos={setBonos} />}
        {tab === 'copiloto' && (
          <CopilotoTab
            parametros={parametros} bonos={bonos} setParametros={setParametros} setBonos={setBonos}
            onCrearConcepto={onCrearConcepto}
          />
        )}
      </Page>
    </>
  );
}

function MonthlyRatesRow({ label, hint, values, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>{hint}</div>}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {MESES.map((m, i) => (
          <div key={m} style={{ flex: '0 0 60px' }}>
            <div style={{ fontSize: 11, color: COLORS.muted, textAlign: 'center', marginBottom: 4 }}>{m}</div>
            <input
              type="number" step="0.001"
              disabled={i === 0}
              value={i === 0 ? '' : values[i]}
              placeholder={i === 0 ? 'base' : undefined}
              onChange={(e) => onChange(i, Number(e.target.value))}
              style={{ ...inputStyle, width: 60, padding: '8px 4px', textAlign: 'center', opacity: i === 0 ? 0.4 : 1 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroTab({ macro, setMacro }) {
  const set = (key, value) => setMacro((m) => ({ ...m, [key]: value }));
  const setTC = (key, field, value) => setMacro((m) => ({
    ...m, tiposCambio: { ...m.tiposCambio, [key]: { ...m.tiposCambio[key], [field]: value } },
  }));
  const setMonthly = (key, i, value) => setMacro((m) => {
    const next = [...m[key]]; next[i] = value; return { ...m, [key]: next };
  });
  const setTCMonthly = (key, i, value) => setMacro((m) => {
    const arr = [...m.tiposCambio[key].devaluacionPct]; arr[i] = value;
    return { ...m, tiposCambio: { ...m.tiposCambio, [key]: { ...m.tiposCambio[key], devaluacionPct: arr } } };
  });

  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Field label="Tipo de cambio activo" hint="Define toda la conversión ARS → USD del modelo">
          <select style={inputStyle} value={macro.tcActivo} onChange={(e) => set('tcActivo', e.target.value)}>
            {Object.entries(macro.tiposCambio).map(([key, tc]) => <option key={key} value={key}>{tc.label}</option>)}
          </select>
        </Field>
      </div>

      <MonthlyRatesRow
        label="IPC mensual (%)"
        hint="Inflación asumida mes a mes — no tiene por qué ser uniforme. Ene es el mes base de la serie."
        values={macro.ipcMensualPct}
        onChange={(i, v) => setMonthly('ipcMensualPct', i, v)}
      />
      <MonthlyRatesRow
        label="Ajuste salarial mensual (%)"
        hint="Ajuste de sueldos asumido mes a mes."
        values={macro.ajusteSalarialPct}
        onChange={(i, v) => setMonthly('ajusteSalarialPct', i, v)}
      />

      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 16px' }}>Tipos de cambio (ARS por USD)</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {Object.entries(macro.tiposCambio).map(([key, tc]) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 90, fontWeight: 700, fontSize: 13 }}>{tc.label}</div>
              <input type="number" style={{ ...inputStyle, width: 130 }} value={tc.inicial}
                onChange={(e) => setTC(key, 'inicial', Number(e.target.value))} />
              <span style={{ fontSize: 12, color: COLORS.muted }}>valor inicial (Ene)</span>
            </div>
            <MonthlyRatesRow
              label="Devaluación mensual (%)"
              values={tc.devaluacionPct}
              onChange={(i, v) => setTCMonthly(key, i, v)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function CosteoTab({ parametros, setParametros }) {
  const set = (key, value) => setParametros((prev) => prev.map((p) => (p.key === key ? { ...p, valor: value } : p)));
  const eliminar = (key) => setParametros((prev) => prev.filter((p) => p.key !== key));
  const restaurar = (key) => {
    const item = PARAMETRO_CATALOGO.find((p) => p.key === key);
    if (item) setParametros((prev) => [...prev, { ...item }]);
  };
  const faltantes = PARAMETRO_CATALOGO.filter((c) => !parametros.some((p) => p.key === c.key));

  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Parámetros estructurales</h3>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 16 }}>
        Estos alimentan fórmulas puntuales del motor (aguinaldo, vacaciones, cargas sociales). Si tu empresa
        no aplica alguno, eliminalo — el motor lo trata como si valiera 0. Para costeos nuevos que no están acá,
        usá "Otros costeos" más abajo.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {parametros.map((p) => (
          <div key={p.key} style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '10px 14px',
            border: `1px solid ${COLORS.border}`, borderRadius: 12,
          }}>
            <div style={{ flex: '1 1 220px', fontWeight: 700, fontSize: 13.5 }}>{p.label}</div>
            <input type="number" step="0.001" style={{ ...inputStyle, width: 160 }} value={p.valor}
              onChange={(e) => set(p.key, Number(e.target.value))} />
            <Button variant="danger" onClick={() => eliminar(p.key)}>Eliminar</Button>
          </div>
        ))}
        {parametros.length === 0 && (
          <div style={{ fontSize: 13, color: COLORS.muted, padding: '12px 0' }}>Eliminaste todos los parámetros estructurales — ninguno se está aplicando al presupuesto.</div>
        )}
      </div>

      {faltantes.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 10 }}>Eliminados (no se aplican al presupuesto):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {faltantes.map((f) => (
              <Button key={f.key} variant="secondary" onClick={() => restaurar(f.key)}>+ Restaurar "{f.label}"</Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function BonosTab({ bonos, setBonos }) {
  // Igual que el resto de la app: los % se guardan como fracción (0.2 = 20%), nunca como 20.
  const setValor = (seniority, displayValue) => setBonos((b) => {
    const current = b[seniority] || { tipo: 'sueldos', valor: 0 };
    const valor = current.tipo === 'pctAnual' ? displayValue / 100 : displayValue;
    return { ...b, [seniority]: { ...current, valor } };
  });
  const setTipo = (seniority, tipo) => setBonos((b) => ({ ...b, [seniority]: { ...(b[seniority] || { valor: 0 }), tipo } }));

  return (
    <Card>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 16 }}>
        Bono anual por seniority, como cantidad de sueldos extra o como % del salario anual. Se mensualiza como provisión:
        "sueldos" → (N × sueldo base)/12; "% del salario anual" → % × sueldo base (por mes).
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {SENIORITIES.map((s) => {
          const bono = bonos[s] || { tipo: 'sueldos', valor: 0 };
          const displayValue = bono.tipo === 'pctAnual' ? bono.valor * 100 : bono.valor;
          return (
            <Field key={s} label={s}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" step="0.5" style={{ ...inputStyle, flex: '0 0 100px' }} value={displayValue}
                  onChange={(e) => setValor(s, Number(e.target.value))} />
                <select style={inputStyle} value={bono.tipo} onChange={(e) => setTipo(s, e.target.value)}>
                  {BONO_TIPOS.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
            </Field>
          );
        })}
      </div>
    </Card>
  );
}

function alcanceLabel(alcance) {
  if (!alcance || alcance.tipo === 'todos') return 'Todos los empleados';
  if (alcance.tipo === 'ceco') return CECOS.find((c) => c.code === alcance.valor)?.label || alcance.valor;
  if (alcance.tipo === 'seniority') return alcance.valor;
  return '—';
}

function ConceptosTab({ conceptos, onCrear, onActualizar, onEliminar }) {
  const [modal, setModal] = useState(null); // null | 'new' | concepto
  const [aEliminar, setAEliminar] = useState(null);

  return (
    <Card>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Otros costeos</h3>
          <div style={{ fontSize: 12.5, color: COLORS.muted, maxWidth: 520 }}>
            Costeos propios de la empresa: aportes sindicales, beneficios extra u otros conceptos que no están en el modelo base.
            Se incluyen en el costeo como % del sueldo bruto mensual o como monto fijo en ARS, a todos los empleados o a un
            centro de costo / seniority puntual. También los puede crear el Copiloto IA a partir de un pedido en lenguaje natural.
          </div>
        </div>
        <Button onClick={() => setModal('new')}>+ Nuevo costeo</Button>
      </div>

      {conceptos.length === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.muted, padding: '20px 0' }}>Todavía no creaste ningún costeo propio.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conceptos.map((c) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '12px 14px',
              border: `1px solid ${COLORS.border}`, borderRadius: 12, opacity: c.activo ? 1 : 0.55,
            }}>
              <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.nombre}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{alcanceLabel(c.alcance)}</div>
              </div>
              <Badge tone="blue">{c.tipo === 'pctSueldo' ? fmtPct(c.valor) : fmtARS(c.valor)}</Badge>
              <Badge tone={c.activo ? 'green' : 'default'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
              <Button variant="secondary" onClick={() => onActualizar(c.id, { activo: !c.activo })}>
                {c.activo ? 'Desactivar' : 'Activar'}
              </Button>
              <Button variant="secondary" onClick={() => setModal(c)}>Editar</Button>
              <Button variant="danger" onClick={() => setAEliminar(c)}>Eliminar</Button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ConceptoModal
          concepto={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === 'new') onCrear(data);
            else onActualizar(modal.id, data);
            setModal(null);
          }}
        />
      )}

      {aEliminar && (
        <Modal title="Eliminar costeo" onClose={() => setAEliminar(null)}>
          <div style={{ fontSize: 14, color: COLORS.navy, marginBottom: 20 }}>
            ¿Seguro que querés eliminar "{aEliminar.nombre}"? Va a dejar de sumarse al presupuesto.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { onEliminar(aEliminar.id); setAEliminar(null); }}>Eliminar</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function ConceptoModal({ concepto, onClose, onSave }) {
  const [nombre, setNombre] = useState(concepto?.nombre || '');
  const [tipo, setTipo] = useState(concepto?.tipo || 'pctSueldo');
  const [valor, setValor] = useState(
    concepto ? (concepto.tipo === 'pctSueldo' ? concepto.valor * 100 : concepto.valor) : ''
  );
  const [alcanceTipo, setAlcanceTipo] = useState(concepto?.alcance?.tipo || 'todos');
  const [alcanceValor, setAlcanceValor] = useState(concepto?.alcance?.valor || '');
  const [activo, setActivo] = useState(concepto ? concepto.activo : true);

  const opcionesAlcance = alcanceTipo === 'ceco' ? CECOS.map((c) => ({ value: c.code, label: c.label }))
    : alcanceTipo === 'seniority' ? SENIORITIES.map((s) => ({ value: s, label: s }))
    : [];

  const puedeGuardar = nombre.trim() && Number(valor) > 0 && (alcanceTipo === 'todos' || alcanceValor);

  const guardar = () => {
    onSave({
      nombre: nombre.trim(),
      tipo,
      valor: tipo === 'pctSueldo' ? Number(valor) / 100 : Number(valor),
      alcance: alcanceTipo === 'todos' ? { tipo: 'todos' } : { tipo: alcanceTipo, valor: alcanceValor },
      activo,
    });
  };

  return (
    <Modal title={concepto ? 'Editar costeo' : 'Nuevo costeo'} onClose={onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Nombre">
          <input style={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Aporte sindical" />
        </Field>
        <Field label="Tipo">
          <select style={inputStyle} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {CONCEPTO_TIPOS.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </Field>
        <Field label={tipo === 'pctSueldo' ? 'Valor (%)' : 'Valor (ARS mensuales)'}>
          <input type="number" step={tipo === 'pctSueldo' ? '0.1' : '1000'} style={inputStyle} value={valor}
            onChange={(e) => setValor(e.target.value)} placeholder={tipo === 'pctSueldo' ? '2' : '50000'} />
        </Field>
        <Field label="Alcance">
          <select style={inputStyle} value={alcanceTipo} onChange={(e) => { setAlcanceTipo(e.target.value); setAlcanceValor(''); }}>
            {CONCEPTO_ALCANCES.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
          </select>
        </Field>
        {alcanceTipo !== 'todos' && (
          <Field label={alcanceTipo === 'ceco' ? 'Centro de costo' : 'Seniority'}>
            <select style={inputStyle} value={alcanceValor} onChange={(e) => setAlcanceValor(e.target.value)}>
              <option value="">Elegí una opción</option>
              {opcionesAlcance.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activar este concepto en el presupuesto
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!puedeGuardar}>{concepto ? 'Guardar cambios' : 'Crear costeo'}</Button>
      </div>
    </Modal>
  );
}

function cambioValorLabel(c) {
  if (c.tipo === 'nuevo_concepto') return c.conceptoTipo === 'pctSueldo' ? `${c.valorNuevo}%` : fmtARS(c.valorNuevo);
  if (typeof c.valorNuevo === 'object' && c.valorNuevo) {
    return c.valorNuevo.tipo === 'pctAnual' ? `${fmtPct(c.valorNuevo.valor)} anual` : `${c.valorNuevo.valor} sueldos`;
  }
  return String(c.valorNuevo);
}

function cambioValorActualLabel(c) {
  if (c.tipo === 'nuevo_concepto') return 'nuevo';
  if (typeof c.valorActual === 'object' && c.valorActual) {
    return c.valorActual.tipo === 'pctAnual' ? `${fmtPct(c.valorActual.valor)} anual` : `${c.valorActual.valor} sueldos`;
  }
  return String(c.valorActual);
}

function CopilotoTab({ parametros, bonos, setParametros, setBonos, onCrearConcepto }) {
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propuesta, setPropuesta] = useState(null);
  const [seleccion, setSeleccion] = useState({});
  const [aplicado, setAplicado] = useState(false);

  const consultar = async () => {
    if (!texto.trim()) return;
    setLoading(true); setError(''); setPropuesta(null); setAplicado(false);
    try {
      const res = await proponerCambiosParametros(texto, parametros, bonos);
      setPropuesta(res);
      const sel = {};
      (res.cambios || []).forEach((c, i) => { sel[i] = true; });
      setSeleccion(sel);
    } catch (e) {
      setError(e.message || 'No se pudo interpretar el pedido. Verificá que ANTHROPIC_API_KEY esté configurada.');
    }
    setLoading(false);
  };

  const aplicarCambios = () => {
    (propuesta.cambios || []).forEach((c, i) => {
      if (!seleccion[i]) return;
      if (c.tipo === 'nuevo_concepto') {
        onCrearConcepto({
          nombre: c.label,
          tipo: c.conceptoTipo,
          valor: c.conceptoTipo === 'pctSueldo' ? Number(c.valorNuevo) / 100 : Number(c.valorNuevo),
          alcance: c.alcance || { tipo: 'todos' },
          activo: true,
        });
      } else if (c.tipo === 'bono') {
        const seniority = c.path.replace('bonos.', '');
        setBonos((b) => ({ ...b, [seniority]: c.valorNuevo }));
      } else {
        setParametros((prev) => prev.map((p) => (p.key === c.path ? { ...p, valor: c.valorNuevo } : p)));
      }
    });
    setAplicado(true);
  };

  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Configurá costeos en lenguaje natural</h3>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 14 }}>
        Ej: "el sindicato de comercio pide 2% adicional sobre el sueldo bruto de todo el equipo de ventas" (crea un costeo nuevo),
        "subí el bono de los gerentes a 4 sueldos" o "el bono de los directores pasa a ser 20% del salario anual" (edita un
        parámetro existente). La IA propone el cambio, vos lo confirmás antes de aplicarlo.
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Describí el costeo o cambio de política…"
          rows={3}
          style={{ ...inputStyle, flex: 1, resize: 'vertical' }}
        />
        <Button onClick={consultar} disabled={loading || !texto.trim()}>{loading ? '…' : 'Interpretar'}</Button>
      </div>

      {loading && <Spinner label="Analizando el pedido…" />}
      {error && <div style={{ color: COLORS.danger, fontSize: 13.5 }}>{error}</div>}

      {propuesta && (
        <div>
          <div style={{ fontSize: 13.5, color: COLORS.navy, marginBottom: 16, fontStyle: 'italic' }}>{propuesta.resumen}</div>
          {(propuesta.cambios || []).length === 0 ? (
            <div style={{ fontSize: 13, color: COLORS.muted }}>No se detectaron costeos ni cambios para este pedido.</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {propuesta.cambios.map((c, i) => (
                  <label key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    border: `1px solid ${COLORS.border}`, borderRadius: 12, cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={!!seleccion[i]}
                      onChange={(e) => setSeleccion((s) => ({ ...s, [i]: e.target.checked }))} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {c.label} {c.tipo === 'nuevo_concepto' && <Badge tone="blue">nuevo costeo</Badge>}
                      </div>
                      <div style={{ fontSize: 12.5, color: COLORS.muted }}>{c.justificacion}</div>
                    </div>
                    <Badge tone="default">{cambioValorActualLabel(c)}</Badge>
                    <span style={{ color: COLORS.mutedSoft }}>→</span>
                    <Badge tone="green">{cambioValorLabel(c)}</Badge>
                  </label>
                ))}
              </div>
              <Button onClick={aplicarCambios} disabled={aplicado}>{aplicado ? '✓ Aplicado' : 'Aplicar cambios seleccionados'}</Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
