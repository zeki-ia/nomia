import { useState } from 'react';
import { TopBar, Page, Card, Field, Button, Modal, inputStyle, Spinner, Badge } from '../components/ui.jsx';
import { SENIORITIES, CECOS, COLORS, CONCEPTO_TIPOS, CONCEPTO_ALCANCES } from '../data/seed.js';
import { fmtARS, fmtPct } from '../lib/payrollEngine.js';
import { proponerCambiosParametros } from '../lib/aiClient.js';

const TABS = [
  { key: 'macro', label: 'Supuestos macro' },
  { key: 'costeo', label: 'Costeo' },
  { key: 'bonos', label: 'Bonos por seniority' },
  { key: 'conceptos', label: 'Conceptos' },
  { key: 'copiloto', label: '✦ Copiloto IA' },
];

const PARAM_LABELS = {
  contribucionesPatronalesPct: 'Contribuciones patronales (%)',
  alimentacion: 'Asignación Alimentación (ARS)',
  conectividad: 'Asignación Conectividad (ARS)',
  seguroSalud: 'Seguro de Salud (ARS)',
  plusVacacionalPct: 'Plus vacacional (%)',
  ajustePerformancePct: 'Ajuste performance (%)',
  provisionIndemnizacionPct: 'Provisión indemnización (%)',
  topeHorasExtra: 'Tope horas extra',
  seguroManagerUSD: 'Seguro Manager & Up (USD)',
};

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
        {tab === 'costeo' && <CosteoTab parametros={parametros} setParametros={setParametros} />}
        {tab === 'bonos' && <BonosTab bonos={bonos} setBonos={setBonos} />}
        {tab === 'conceptos' && (
          <ConceptosTab
            conceptos={conceptosCustom}
            onCrear={onCrearConcepto}
            onActualizar={onActualizarConcepto}
            onEliminar={onEliminarConcepto}
          />
        )}
        {tab === 'copiloto' && (
          <CopilotoTab parametros={parametros} bonos={bonos} setParametros={setParametros} setBonos={setBonos} />
        )}
      </Page>
    </>
  );
}

function MacroTab({ macro, setMacro }) {
  const set = (key, value) => setMacro((m) => ({ ...m, [key]: value }));
  const setTC = (key, field, value) => setMacro((m) => ({
    ...m, tiposCambio: { ...m.tiposCambio, [key]: { ...m.tiposCambio[key], [field]: value } },
  }));

  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Field label="IPC mensual (%)" hint="Inflación mensual supuesta">
          <input type="number" step="0.001" style={inputStyle} value={macro.ipcMensualPct}
            onChange={(e) => set('ipcMensualPct', Number(e.target.value))} />
        </Field>
        <Field label="Ajuste salarial mensual (%)">
          <input type="number" step="0.001" style={inputStyle} value={macro.ajusteSalarialPct}
            onChange={(e) => set('ajusteSalarialPct', Number(e.target.value))} />
        </Field>
        <Field label="Tipo de cambio activo" hint="Define toda la conversión ARS → USD del modelo">
          <select style={inputStyle} value={macro.tcActivo} onChange={(e) => set('tcActivo', e.target.value)}>
            {Object.entries(macro.tiposCambio).map(([key, tc]) => <option key={key} value={key}>{tc.label}</option>)}
          </select>
        </Field>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tipos de cambio (ARS por USD)</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(macro.tiposCambio).map(([key, tc]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 90, fontWeight: 700, fontSize: 13 }}>{tc.label}</div>
            <input type="number" style={{ ...inputStyle, width: 130 }} value={tc.inicial}
              onChange={(e) => setTC(key, 'inicial', Number(e.target.value))} />
            <span style={{ fontSize: 12, color: COLORS.muted }}>valor inicial (Ene)</span>
            <input type="number" step="0.001" style={{ ...inputStyle, width: 100 }} value={tc.devaluacionPct}
              onChange={(e) => setTC(key, 'devaluacionPct', Number(e.target.value))} />
            <span style={{ fontSize: 12, color: COLORS.muted }}>devaluación mensual</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CosteoTab({ parametros, setParametros }) {
  const set = (key, value) => setParametros((p) => ({ ...p, [key]: value }));
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Object.entries(PARAM_LABELS).map(([key, label]) => (
          <Field key={key} label={label}>
            <input type="number" step="0.001" style={inputStyle} value={parametros[key]}
              onChange={(e) => set(key, Number(e.target.value))} />
          </Field>
        ))}
      </div>
    </Card>
  );
}

function BonosTab({ bonos, setBonos }) {
  const set = (seniority, value) => setBonos((b) => ({ ...b, [seniority]: value }));
  return (
    <Card>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 16 }}>
        N° de sueldos de bono anual por seniority. Se mensualiza como (N° sueldos × sueldo base) / 12.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {SENIORITIES.map((s) => (
          <Field key={s} label={s}>
            <input type="number" step="0.5" style={inputStyle} value={bonos[s] ?? 0}
              onChange={(e) => set(s, Number(e.target.value))} />
          </Field>
        ))}
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
        <div style={{ fontSize: 12.5, color: COLORS.muted, maxWidth: 520 }}>
          Variables de costo propias de la empresa: aportes sindicales, beneficios extra u otros conceptos que no están en el modelo base.
          Se aplican como % del sueldo bruto mensual o como monto fijo en ARS, a todos los empleados o a un centro de costo / seniority puntual.
        </div>
        <Button onClick={() => setModal('new')}>+ Nuevo concepto</Button>
      </div>

      {conceptos.length === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.muted, padding: '20px 0' }}>Todavía no creaste ningún concepto propio.</div>
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
        <Modal title="Eliminar concepto" onClose={() => setAEliminar(null)}>
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
    <Modal title={concepto ? 'Editar concepto' : 'Nuevo concepto'} onClose={onClose} width={480}>
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
        <Button onClick={guardar} disabled={!puedeGuardar}>{concepto ? 'Guardar cambios' : 'Crear concepto'}</Button>
      </div>
    </Modal>
  );
}

function CopilotoTab({ parametros, bonos, setParametros, setBonos }) {
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
      if (c.path.startsWith('bonos.')) {
        const seniority = c.path.replace('bonos.', '');
        setBonos((b) => ({ ...b, [seniority]: c.valorNuevo }));
      } else {
        setParametros((p) => ({ ...p, [c.path]: c.valorNuevo }));
      }
    });
    setAplicado(true);
  };

  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Configurá parámetros en lenguaje natural</h3>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 14 }}>
        Ej: "el sindicato de comercio pide 2% adicional sobre el sueldo bruto" o "subí el bono de los gerentes a 4 sueldos".
        La IA propone el cambio, vos lo confirmás antes de aplicarlo.
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Describí el cambio de política de costos…"
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
            <div style={{ fontSize: 13, color: COLORS.muted }}>No se detectaron cambios de parámetros para este pedido.</div>
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
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.label}</div>
                      <div style={{ fontSize: 12.5, color: COLORS.muted }}>{c.justificacion}</div>
                    </div>
                    <Badge tone="default">{c.valorActual}</Badge>
                    <span style={{ color: COLORS.mutedSoft }}>→</span>
                    <Badge tone="green">{c.valorNuevo}</Badge>
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
