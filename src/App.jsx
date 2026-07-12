import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Sidebar, Spinner } from './components/ui.jsx';
import { COLORS } from './data/seed.js';
import { computePresupuesto } from './lib/payrollEngine.js';
import { supabase } from './lib/supabaseClient.js';
import { empleadoFromDb, empleadoToDb, nextCodigo, conceptoFromDb, escenarioFromDb } from './lib/supabaseMappers.js';

import Dashboard from './screens/Dashboard.jsx';
import Empleados from './screens/Empleados.jsx';
import EmpleadoDetail from './screens/EmpleadoDetail.jsx';
import Parametros from './screens/Parametros.jsx';
import Escenarios from './screens/Escenarios.jsx';
import EscenarioDetail from './screens/EscenarioDetail.jsx';
import Reportes from './screens/Reportes.jsx';
import ImportarEmpleados from './screens/ImportarEmpleados.jsx';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [parametros, setParametros] = useState(null);
  const [macro, setMacro] = useState(null);
  const [bonos, setBonos] = useState(null);
  const [conceptosCustom, setConceptosCustom] = useState([]);
  const [escenarios, setEscenarios] = useState([]);

  useEffect(() => {
    (async () => {
      const [empRes, confRes, concRes, escRes] = await Promise.all([
        supabase.from('nomia_empleados').select('*').order('id'),
        supabase.from('nomia_configuracion').select('*').eq('id', 1).single(),
        supabase.from('nomia_conceptos_custom').select('*').order('id'),
        supabase.from('nomia_escenarios').select('*').order('fecha', { ascending: false }),
      ]);
      const firstError = empRes.error || confRes.error || concRes.error || escRes.error;
      if (firstError) {
        setError(firstError.message || 'No se pudo conectar con Supabase.');
        setLoading(false);
        return;
      }
      setEmpleados(empRes.data.map(empleadoFromDb));
      setParametros(confRes.data.parametros);
      setMacro(confRes.data.macro);
      setBonos(confRes.data.bonos);
      setConceptosCustom(concRes.data.map(conceptoFromDb));
      setEscenarios(escRes.data.map(escenarioFromDb));
      setLoading(false);
    })();
  }, []);

  const presupuesto = useMemo(
    () => (parametros ? computePresupuesto(empleados, parametros, macro, bonos, conceptosCustom) : null),
    [empleados, parametros, macro, bonos, conceptosCustom]
  );

  // Cambios seguidos (ej: tipeando varios meses de IPC, o tipo+valor de un bono) se
  // acumulan y mandan en un solo request — dos updates casi simultáneos pueden resolver
  // en cualquier orden y el más nuevo terminaría pisado por el más viejo.
  const pendingPatchRef = useRef({});
  const flushTimeoutRef = useRef(null);
  const persistConfiguracion = useCallback((patch) => {
    Object.assign(pendingPatchRef.current, patch);
    clearTimeout(flushTimeoutRef.current);
    flushTimeoutRef.current = setTimeout(async () => {
      const toSend = pendingPatchRef.current;
      pendingPatchRef.current = {};
      await supabase.from('nomia_configuracion').update({ ...toSend, updated_at: new Date().toISOString() }).eq('id', 1);
    }, 400);
  }, []);

  const updateParametros = useCallback((updater) => {
    setParametros((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistConfiguracion({ parametros: next });
      return next;
    });
  }, [persistConfiguracion]);

  const updateMacro = useCallback((updater) => {
    setMacro((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistConfiguracion({ macro: next });
      return next;
    });
  }, [persistConfiguracion]);

  const updateBonos = useCallback((updater) => {
    setBonos((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistConfiguracion({ bonos: next });
      return next;
    });
  }, [persistConfiguracion]);

  const crearConcepto = async (data) => {
    const { data: row, error: err } = await supabase.from('nomia_conceptos_custom').insert({
      nombre: data.nombre, tipo: data.tipo, valor: data.valor, alcance: data.alcance, activo: data.activo,
    }).select().single();
    if (err) return console.error(err);
    setConceptosCustom((prev) => [...prev, conceptoFromDb(row)]);
  };

  const actualizarConcepto = async (id, changes) => {
    const patch = {};
    if (changes.nombre !== undefined) patch.nombre = changes.nombre;
    if (changes.tipo !== undefined) patch.tipo = changes.tipo;
    if (changes.valor !== undefined) patch.valor = changes.valor;
    if (changes.alcance !== undefined) patch.alcance = changes.alcance;
    if (changes.activo !== undefined) patch.activo = changes.activo;
    const { data: row, error: err } = await supabase.from('nomia_conceptos_custom').update(patch).eq('id', id).select().single();
    if (err) return console.error(err);
    setConceptosCustom((prev) => prev.map((c) => (c.id === id ? conceptoFromDb(row) : c)));
  };

  const eliminarConcepto = async (id) => {
    const { error: err } = await supabase.from('nomia_conceptos_custom').delete().eq('id', id);
    if (err) return console.error(err);
    setConceptosCustom((prev) => prev.filter((c) => c.id !== id));
  };

  const upsertEmpleado = async (data) => {
    if (data.id) {
      const { data: row, error: err } = await supabase.from('nomia_empleados')
        .update(empleadoToDb(data)).eq('id', data.id).select().single();
      if (err) return console.error(err);
      setEmpleados((prev) => prev.map((e) => (e.id === data.id ? empleadoFromDb(row) : e)));
    } else {
      const conCodigo = { ...data, codigo: data.codigo?.trim() || nextCodigo(empleados) };
      const { data: row, error: err } = await supabase.from('nomia_empleados')
        .insert(empleadoToDb(conCodigo)).select().single();
      if (err) return console.error(err);
      setEmpleados((prev) => [...prev, empleadoFromDb(row)]);
    }
  };

  const deleteEmpleado = async (id) => {
    const { error: err } = await supabase.from('nomia_empleados').delete().eq('id', id);
    if (err) return console.error(err);
    setEmpleados((prev) => prev.filter((e) => e.id !== id));
  };

  const bulkDeleteEmpleados = async (ids) => {
    const { error: err } = await supabase.from('nomia_empleados').delete().in('id', ids);
    if (err) return console.error(err);
    const idSet = new Set(ids);
    setEmpleados((prev) => prev.filter((e) => !idSet.has(e.id)));
  };

  const bulkUpdateEmpleados = async (ids, changes) => {
    const idSet = new Set(ids);
    const rows = empleados.filter((e) => idSet.has(e.id)).map((e) => {
      const patch = { id: e.id };
      if (changes.centroCosto) patch.centro_costo = changes.centroCosto;
      if (changes.seniority) patch.seniority = changes.seniority;
      if (changes.ajusteSueldoPct) patch.sueldo_base = Math.round(e.sueldoBase * (1 + changes.ajusteSueldoPct));
      if (changes.estado === 'activo') patch.meses_activo = Array(12).fill(1);
      if (changes.estado === 'inactivo') patch.meses_activo = Array(12).fill(0);
      return patch;
    });
    const { data: updated, error: err } = await supabase.from('nomia_empleados').upsert(rows).select();
    if (err) return console.error(err);
    const byId = new Map(updated.map((row) => [row.id, empleadoFromDb(row)]));
    setEmpleados((prev) => prev.map((e) => byId.get(e.id) || e));
  };

  const importarEmpleados = async (rows) => {
    const conCodigos = rows.map((r, i) => ({ ...r, codigo: r.codigo?.trim() || nextCodigo(empleados, i) }));
    const { data: inserted, error: err } = await supabase.from('nomia_empleados').insert(conCodigos.map(empleadoToDb)).select();
    if (err) return console.error(err);
    setEmpleados((prev) => [...prev, ...inserted.map(empleadoFromDb)]);
  };

  const guardarEscenario = async (nombre) => {
    const snapshot = {
      nombre,
      fecha: new Date().toISOString(),
      empleados: JSON.parse(JSON.stringify(empleados)),
      parametros: { ...parametros },
      macro: JSON.parse(JSON.stringify(macro)),
      bonos: { ...bonos },
      conceptos_custom: JSON.parse(JSON.stringify(conceptosCustom)),
    };
    const { data: row, error: err } = await supabase.from('nomia_escenarios').insert(snapshot).select().single();
    if (err) return console.error(err);
    const mapped = escenarioFromDb(row);
    setEscenarios((prev) => [mapped, ...prev]);
    return mapped;
  };

  const deleteEscenario = async (id) => {
    const { error: err } = await supabase.from('nomia_escenarios').delete().eq('id', id);
    if (err) return console.error(err);
    setEscenarios((prev) => prev.filter((e) => e.id !== id));
  };

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.danger }}>No se pudo conectar con la base de datos</div>
        <div style={{ color: COLORS.muted, fontSize: 13.5, maxWidth: 420 }}>{error}</div>
        <div style={{ color: COLORS.mutedSoft, fontSize: 12.5 }}>Verificá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</div>
      </div>
    );
  }

  if (loading || !parametros) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg }}>
        <Spinner label="Cargando presupuesto…" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard presupuesto={presupuesto} />} />
          <Route path="/empleados" element={
            <EmpleadosRoute empleados={empleados} onBulkUpdate={bulkUpdateEmpleados} onBulkDelete={bulkDeleteEmpleados} />
          } />
          <Route path="/empleados/nuevo" element={<EmpleadoNuevoRoute empleados={empleados} onSave={upsertEmpleado} />} />
          <Route path="/empleados/importar" element={<ImportarEmpleadosRoute onImport={importarEmpleados} />} />
          <Route path="/empleados/:id" element={<EmpleadoDetailRoute empleados={empleados} onSave={upsertEmpleado} onDelete={deleteEmpleado} />} />
          <Route path="/parametros" element={
            <Parametros
              parametros={parametros} macro={macro} bonos={bonos} conceptosCustom={conceptosCustom}
              setParametros={updateParametros} setMacro={updateMacro} setBonos={updateBonos}
              onCrearConcepto={crearConcepto} onActualizarConcepto={actualizarConcepto} onEliminarConcepto={eliminarConcepto}
            />
          } />
          <Route path="/escenarios" element={<EscenariosRoute escenarios={escenarios} onGuardar={guardarEscenario} onDelete={deleteEscenario} presupuesto={presupuesto} />} />
          <Route path="/escenarios/:id" element={<EscenarioDetailRoute escenarios={escenarios} presupuestoActual={presupuesto} />} />
          <Route path="/reportes" element={<Reportes presupuesto={presupuesto} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function EmpleadosRoute({ empleados, onBulkUpdate, onBulkDelete }) {
  const navigate = useNavigate();
  return (
    <Empleados
      empleados={empleados}
      onRowClick={(e) => navigate(`/empleados/${e.id}`)}
      onNew={() => navigate('/empleados/nuevo')}
      onImport={() => navigate('/empleados/importar')}
      onBulkUpdate={onBulkUpdate}
      onBulkDelete={onBulkDelete}
    />
  );
}

function ImportarEmpleadosRoute({ onImport }) {
  const navigate = useNavigate();
  return (
    <ImportarEmpleados
      onImport={onImport}
      onBack={() => navigate('/empleados')}
    />
  );
}

function EmpleadoNuevoRoute({ empleados, onSave }) {
  const navigate = useNavigate();
  return (
    <EmpleadoDetail
      empleados={empleados}
      onSave={onSave}
      onBack={() => navigate('/empleados')}
      isNew
    />
  );
}

function EmpleadoDetailRoute({ empleados, onSave, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const empleado = empleados.find((e) => String(e.id) === id);
  if (!empleado) return <Navigate to="/empleados" replace />;
  return (
    <EmpleadoDetail
      empleado={empleado}
      empleados={empleados}
      onSave={onSave}
      onDelete={(empId) => { onDelete(empId); navigate('/empleados'); }}
      onBack={() => navigate('/empleados')}
    />
  );
}

function EscenariosRoute({ escenarios, onGuardar, onDelete, presupuesto }) {
  const navigate = useNavigate();
  return (
    <Escenarios
      escenarios={escenarios}
      presupuesto={presupuesto}
      onGuardar={onGuardar}
      onDelete={onDelete}
      onRowClick={(e) => navigate(`/escenarios/${e.id}`)}
    />
  );
}

function EscenarioDetailRoute({ escenarios, presupuestoActual }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const escenario = escenarios.find((e) => String(e.id) === id);
  if (!escenario) return <Navigate to="/escenarios" replace />;
  return <EscenarioDetail escenario={escenario} presupuestoActual={presupuestoActual} onBack={() => navigate('/escenarios')} />;
}
