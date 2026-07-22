import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Sidebar, Spinner, Button } from './components/ui.jsx';
import { COLORS, DEFAULT_PARAMETROS, DEFAULT_MACRO, DEFAULT_BONOS } from './data/seed.js';
import { computePresupuesto } from './lib/payrollEngine.js';
import { supabase } from './lib/supabaseClient.js';
import {
  empleadoFromDb, empleadoToDb, nextCodigo, conceptoFromDb, escenarioFromDb,
  clienteFromDb, perfilFromDb, costoRealFromDb, costoRealToDb,
} from './lib/supabaseMappers.js';
import { crearClienteAdmin } from './lib/adminClient.js';

import Login from './screens/Login.jsx';
import CompletarRegistro from './screens/CompletarRegistro.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Empleados from './screens/Empleados.jsx';
import EmpleadoDetail from './screens/EmpleadoDetail.jsx';
import Parametros from './screens/Parametros.jsx';
import Escenarios from './screens/Escenarios.jsx';
import EscenarioDetail from './screens/EscenarioDetail.jsx';
import Reportes from './screens/Reportes.jsx';
import ImportarEmpleados from './screens/ImportarEmpleados.jsx';
import RealVsPresupuesto from './screens/RealVsPresupuesto.jsx';
import SeleccionarCliente from './screens/SeleccionarCliente.jsx';

function FullScreen({ children }) {
  return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg }}>{children}</div>;
}

function HubRedirect() {
  useEffect(() => {
    const redirectUrl = encodeURIComponent(window.location.origin)
    window.location.href = `https://hub.talenio.tech?redirect=${redirectUrl}`
  }, [])
  return null
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [perfil, setPerfil] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(true);
  const [subStatus, setSubStatus] = useState(null); // null=cargando, 'active'|'none'|'no_company'|'no_product'

  useEffect(() => {
    // INITIAL_SESSION: Supabase lo dispara una vez al arrancar con la sesión ya resuelta
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') {
        setSession(s ?? null)
        if (!s) {
          window.location.href = `https://hub.talenio.tech?redirect=${encodeURIComponent(window.location.origin)}`
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        window.location.href = 'https://hub.talenio.tech'
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setPerfil(null); setPerfilLoading(false); return; }
    setPerfilLoading(true);
    supabase.from('nomia_perfiles').select('*').eq('id', session.user.id).single().then(async ({ data }) => {
      if (data) {
        const p = perfilFromDb(data);
        setPerfil(p);
        if (p.rol !== 'admin') {
          // Verificar suscripción activa de la empresa
          supabase.from('users').select('company_id, products').eq('id', session.user.id).maybeSingle().then(({ data: u }) => {
            if (!u?.company_id) { setSubStatus('no_company'); return; }
            if (u.products?.length > 0 && !u.products.includes('nomia')) { setSubStatus('no_product'); return; }
            supabase.from('subscriptions').select('status').eq('company_id', u.company_id).eq('product', 'nomia').maybeSingle().then(({ data: sub }) => {
              setSubStatus(sub?.status || 'none');
            });
          });
        } else {
          setSubStatus('active');
        }
      } else if (session.user.email?.endsWith('@delenio.net')) {
        // Admin @delenio.net: crear perfil via hub API (service role bypasa RLS)
        const { data: { session: s } } = await supabase.auth.getSession();
        await fetch('https://hub.talenio.tech/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token}` },
          body: JSON.stringify({ action: 'syncAdminProfiles', adminUserId: session.user.id, adminEmail: session.user.email }),
        }).catch(() => {});
        setPerfil({ id: session.user.id, email: session.user.email, nombre: session.user.email.split('@')[0], rol: 'admin', clienteId: null });
        setSubStatus('active');
      } else {
        setPerfil(null);
        setSubStatus('none');
      }
      setPerfilLoading(false);
    });
  }, [session?.user?.id]);

  const logout = () => supabase.auth.signOut();

  const subLoading = perfil && perfil.rol !== 'admin' && subStatus === null;

  if (session === undefined || (session && perfilLoading) || subLoading) {
    return <FullScreen><Spinner label="Cargando…" /></FullScreen>;
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <HubRedirect />} />
      <Route path="/completar-registro" element={<CompletarRegistro />} />
      <Route path="/*" element={
        !session ? <Navigate to="/login" replace />
        : !perfil || (perfil.rol === 'cliente' && !perfil.clienteId) ? <SinAcceso perfil={perfil} onLogout={logout} />
        : subStatus !== 'active' ? <SinSuscripcion status={subStatus} onLogout={logout} />
        : <AppAutenticada perfil={perfil} onLogout={logout} />
      } />
    </Routes>
  );
}

function SinAcceso({ perfil, onLogout }) {
  return (
    <FullScreen>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: COLORS.navy, marginBottom: 8 }}>Sin acceso a Nomia</div>
        <div style={{ color: COLORS.muted, fontSize: 13.5, marginBottom: 20, lineHeight: 1.6 }}>
          Tu cuenta ({perfil?.email || 'desconocida'}) está autenticada pero no tiene un perfil asignado. Contactá a tu administrador en{' '}
          <a href="https://hub.talenio.tech" style={{ color: COLORS.primary, fontWeight: 600 }}>hub.talenio.tech</a>.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="https://hub.talenio.tech" style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>Ir al Hub</a>
          <Button variant="secondary" onClick={onLogout}>Cerrar sesión</Button>
        </div>
      </div>
    </FullScreen>
  );
}

function SinSuscripcion({ status, onLogout }) {
  const msgs = {
    no_company: 'Tu usuario no tiene una empresa asignada. Contactá a tu administrador.',
    no_product: 'Tu usuario no tiene acceso habilitado a Nomia. Contactá a tu administrador.',
    none:       'Tu empresa no tiene una suscripción activa en Nomia.',
    suspended:  'Tu suscripción a Nomia está suspendida.',
  };
  return (
    <FullScreen>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: COLORS.navy, marginBottom: 8 }}>Acceso no disponible</div>
        <div style={{ color: COLORS.muted, fontSize: 13.5, marginBottom: 20, lineHeight: 1.6 }}>
          {msgs[status] || 'No tenés acceso activo a Nomia.'}{' '}
          Podés gestionar tu suscripción en{' '}
          <a href="https://hub.talenio.tech" style={{ color: COLORS.primary, fontWeight: 600 }}>hub.talenio.tech</a>.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="https://hub.talenio.tech" style={{ padding: '9px 20px', background: COLORS.primary, color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>Ir al Hub</a>
          <Button variant="secondary" onClick={onLogout}>Cerrar sesión</Button>
        </div>
      </div>
    </FullScreen>
  );
}

function AppAutenticada({ perfil, onLogout }) {
  const esAdmin = perfil.rol === 'admin';
  const [clientes, setClientes] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [clienteActivoId, setClienteActivoId] = useState(esAdmin ? null : perfil.clienteId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [parametros, setParametros] = useState(null);
  const [macro, setMacro] = useState(null);
  const [bonos, setBonos] = useState(null);
  const [conceptosCustom, setConceptosCustom] = useState([]);
  const [escenarios, setEscenarios] = useState([]);
  const [costosReales, setCostosReales] = useState([]);
  const [escSummary, setEscSummary] = useState([]); // resumen de escenarios para KPIs del selector

  // Clientes + perfiles: admins leen via hub API (service role bypasa RLS)
  useEffect(() => {
    (async () => {
      let clientes = [];
      if (esAdmin) {
        try {
          const { data: { session: s } } = await supabase.auth.getSession();
          const res = await fetch('https://hub.talenio.tech/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token}` },
            body: JSON.stringify({ action: 'getNomiaClientes' }),
          });
          const json = await res.json();
          clientes = (json.clientes || []).map(clienteFromDb);
        } catch { /* fallback a Supabase */ }
      }
      if (!esAdmin || clientes.length === 0) {
        const { data } = await supabase.from('nomia_clientes').select('*').order('nombre');
        clientes = (data || []).map(clienteFromDb);
      }
      const [pfRes, escRes] = await Promise.all([
        supabase.from('nomia_perfiles').select('*').order('email'),
        supabase.from('nomia_escenarios').select('cliente_id, fecha'),
      ]);
      setClientes(clientes);
      setPerfiles((pfRes.data || []).map(perfilFromDb));
      setEscSummary(escRes.data || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Datos del cliente activo — se recargan cada vez que un admin cambia de cliente.
  useEffect(() => {
    if (!clienteActivoId) return;
    setLoading(true);
    (async () => {
      const [empRes, confRes, concRes, escRes, realRes] = await Promise.all([
        supabase.from('nomia_empleados').select('*').eq('cliente_id', clienteActivoId).order('id'),
        supabase.from('nomia_configuracion').select('*').eq('cliente_id', clienteActivoId).maybeSingle(),
        supabase.from('nomia_conceptos_custom').select('*').eq('cliente_id', clienteActivoId).order('id'),
        supabase.from('nomia_escenarios').select('*').eq('cliente_id', clienteActivoId).order('fecha', { ascending: false }),
        supabase.from('nomia_costos_reales').select('*').eq('cliente_id', clienteActivoId).order('mes'),
      ]);
      const firstError = empRes.error || confRes.error || concRes.error || escRes.error || realRes.error;
      if (firstError) {
        setError(firstError.message || 'No se pudo conectar con Supabase.');
        setLoading(false);
        return;
      }
      setEmpleados(empRes.data.map(empleadoFromDb));
      setParametros(confRes.data ? confRes.data.parametros : DEFAULT_PARAMETROS);
      setMacro(confRes.data ? confRes.data.macro : DEFAULT_MACRO);
      setBonos(confRes.data ? confRes.data.bonos : DEFAULT_BONOS);
      setConceptosCustom(concRes.data.map(conceptoFromDb));
      setEscenarios(escRes.data.map(escenarioFromDb));
      setCostosReales(realRes.data.map(costoRealFromDb));
      setLoading(false);
    })();
  }, [clienteActivoId]);

  const presupuesto = useMemo(
    () => (parametros ? computePresupuesto(empleados, parametros, macro, bonos, conceptosCustom) : null),
    [empleados, parametros, macro, bonos, conceptosCustom]
  );

  // Cache costoMensualARS in parametros so the cron can read it without a schema migration
  useEffect(() => {
    if (!presupuesto?.costoMensualARS || !parametros || !clienteActivoId) return;
    const cached = parametros._presupuestoMensualARS;
    if (JSON.stringify(cached) === JSON.stringify(presupuesto.costoMensualARS)) return;
    updateParametros(prev => ({ ...prev, _presupuestoMensualARS: presupuesto.costoMensualARS }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuesto?.costoMensualARS?.join(','), clienteActivoId]);

  const pendingPatchRef = useRef({});
  const flushTimeoutRef = useRef(null);
  const persistConfiguracion = useCallback((patch) => {
    Object.assign(pendingPatchRef.current, patch);
    clearTimeout(flushTimeoutRef.current);
    flushTimeoutRef.current = setTimeout(async () => {
      const toSend = pendingPatchRef.current;
      pendingPatchRef.current = {};
      await supabase.from('nomia_configuracion').update({ ...toSend, updated_at: new Date().toISOString() }).eq('cliente_id', clienteActivoId);
    }, 400);
  }, [clienteActivoId]);

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
      cliente_id: clienteActivoId,
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
        .insert({ ...empleadoToDb(conCodigo), cliente_id: clienteActivoId }).select().single();
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
    const { data: inserted, error: err } = await supabase.from('nomia_empleados')
      .insert(conCodigos.map((r) => ({ ...empleadoToDb(r), cliente_id: clienteActivoId }))).select();
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
      cliente_id: clienteActivoId,
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

  const crearCostoReal = async (data) => {
    const centroCosto = data.centroCosto || 'TOTAL';
    const { data: row, error: err } = await supabase.from('nomia_costos_reales')
      .upsert(costoRealToDb({ ...data, centroCosto }, clienteActivoId), { onConflict: 'cliente_id,anio,mes,centro_costo' }).select().single();
    if (err) return console.error(err);
    setCostosReales((prev) => [
      ...prev.filter((c) => !(c.anio === data.anio && c.mes === data.mes && c.centroCosto === centroCosto)),
      costoRealFromDb(row),
    ]);
  };

  const eliminarCostoRealById = async (id) => {
    const { error: err } = await supabase.from('nomia_costos_reales').delete().eq('id', id);
    if (err) return console.error(err);
    setCostosReales((prev) => prev.filter((c) => c.id !== id));
  };

  const importarCostosReales = async (rows) => {
    const payload = rows.map((r) => costoRealToDb(r, clienteActivoId));
    const { data: inserted, error: err } = await supabase.from('nomia_costos_reales')
      .upsert(payload, { onConflict: 'cliente_id,anio,mes,centro_costo' }).select();
    if (err) return console.error(err);
    const nuevos = inserted.map(costoRealFromDb);
    setCostosReales((prev) => {
      const claves = new Set(nuevos.map((n) => `${n.anio}-${n.mes}-${n.centroCosto}`));
      return [...prev.filter((c) => !claves.has(`${c.anio}-${c.mes}-${c.centroCosto}`)), ...nuevos];
    });
  };

  const eliminarCostoReal = async (mes) => {
    const entrada = costosReales.find((c) => c.mes === mes && c.centroCosto === 'TOTAL');
    if (!entrada) return;
    const { error: err } = await supabase.from('nomia_costos_reales').delete().eq('id', entrada.id);
    if (err) return console.error(err);
    setCostosReales((prev) => prev.filter((c) => c.id !== entrada.id));
  };

  const crearCliente = async (nombre) => {
    const { cliente } = await crearClienteAdmin(nombre);
    setClientes((prev) => [...prev, clienteFromDb(cliente)].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

  if (error) {
    return (
      <FullScreen>
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.danger }}>No se pudo conectar con la base de datos</div>
          <div style={{ color: COLORS.muted, fontSize: 13.5, marginTop: 8 }}>{error}</div>
        </div>
      </FullScreen>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        perfil={perfil} clientes={esAdmin ? clientes : null} clienteActivoId={clienteActivoId}
        onCambiarCliente={setClienteActivoId} onVolverAClientes={() => setClienteActivoId(null)} onLogout={onLogout}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/*" element={
            !clienteActivoId ? (
              <SeleccionarCliente clientes={clientes} perfiles={perfiles} escSummary={escSummary} onSeleccionar={setClienteActivoId} />
            ) : (loading || !parametros) ? (
              <FullScreen><Spinner label="Cargando presupuesto…" /></FullScreen>
            ) : (
              <ClienteWorkspace
                presupuesto={presupuesto} costosReales={costosReales} empleados={empleados}
                parametros={parametros} macro={macro} bonos={bonos} conceptosCustom={conceptosCustom}
                escenarios={escenarios}
                onBulkUpdate={bulkUpdateEmpleados} onBulkDelete={bulkDeleteEmpleados}
                onSaveEmpleado={upsertEmpleado} onDeleteEmpleado={deleteEmpleado} onImportEmpleados={importarEmpleados}
                updateParametros={updateParametros} updateMacro={updateMacro} updateBonos={updateBonos}
                crearConcepto={crearConcepto} actualizarConcepto={actualizarConcepto} eliminarConcepto={eliminarConcepto}
                guardarEscenario={guardarEscenario} deleteEscenario={deleteEscenario}
                crearCostoReal={crearCostoReal} eliminarCostoReal={eliminarCostoReal} eliminarCostoRealById={eliminarCostoRealById} importarCostosReales={importarCostosReales}
              />
            )
          } />
        </Routes>
      </div>
    </div>
  );
}

function ClienteWorkspace({
  presupuesto, costosReales, empleados, parametros, macro, bonos, conceptosCustom, escenarios,
  onBulkUpdate, onBulkDelete, onSaveEmpleado, onDeleteEmpleado, onImportEmpleados,
  updateParametros, updateMacro, updateBonos, crearConcepto, actualizarConcepto, eliminarConcepto,
  guardarEscenario, deleteEscenario, crearCostoReal, eliminarCostoReal, eliminarCostoRealById, importarCostosReales,
}) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard presupuesto={presupuesto} costosReales={costosReales} empleados={empleados} />} />
      <Route path="empleados" element={
        <EmpleadosRoute empleados={empleados} onBulkUpdate={onBulkUpdate} onBulkDelete={onBulkDelete} />
      } />
      <Route path="empleados/nuevo" element={<EmpleadoNuevoRoute empleados={empleados} onSave={onSaveEmpleado} />} />
      <Route path="empleados/importar" element={<ImportarEmpleadosRoute onImport={onImportEmpleados} />} />
      <Route path="empleados/:id" element={<EmpleadoDetailRoute empleados={empleados} onSave={onSaveEmpleado} onDelete={onDeleteEmpleado} />} />
      <Route path="parametros" element={
        <Parametros
          parametros={parametros} macro={macro} bonos={bonos} conceptosCustom={conceptosCustom}
          setParametros={updateParametros} setMacro={updateMacro} setBonos={updateBonos}
          onCrearConcepto={crearConcepto} onActualizarConcepto={actualizarConcepto} onEliminarConcepto={eliminarConcepto}
        />
      } />
      <Route path="escenarios" element={<EscenariosRoute escenarios={escenarios} onGuardar={guardarEscenario} onDelete={deleteEscenario} presupuesto={presupuesto} />} />
      <Route path="escenarios/:id" element={<EscenarioDetailRoute escenarios={escenarios} presupuestoActual={presupuesto} costosReales={costosReales} />} />
      <Route path="real-vs-presupuesto" element={
        <RealVsPresupuesto
          presupuesto={presupuesto} costosReales={costosReales}
          onCrear={crearCostoReal} onEliminar={eliminarCostoReal}
          onEliminarById={eliminarCostoRealById} onImportar={importarCostosReales}
          alertaUmbral={parametros?._alertaUmbral ?? 0.05}
          onUpdateUmbral={(v) => updateParametros(prev => ({ ...prev, _alertaUmbral: v }))}
        />
      } />
      <Route path="reportes" element={<Reportes presupuesto={presupuesto} />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
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

function EscenarioDetailRoute({ escenarios, presupuestoActual, costosReales }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const escenario = escenarios.find((e) => String(e.id) === id);
  if (!escenario) return <Navigate to="/escenarios" replace />;
  return <EscenarioDetail escenario={escenario} presupuestoActual={presupuestoActual} costosReales={costosReales} onBack={() => navigate('/escenarios')} />;
}
