import { useState } from 'react';
import { TopBar, Page, Card, Field, Button, Modal, Table, Badge, inputStyle, EmptyState } from '../../components/ui.jsx';
import { COLORS } from '../../data/seed.js';

const TABS = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'usuarios', label: 'Usuarios' },
];

export default function Admin({
  clientes, perfiles, currentUserId,
  onCrearCliente, onInvitarUsuario, onActualizarPerfil, onEliminarUsuario, onEntrarCliente,
}) {
  const [tab, setTab] = useState('clientes');
  const [filtroClienteId, setFiltroClienteId] = useState(null);

  return (
    <>
      <TopBar title="Administración" subtitle="Clientes y usuarios de Nomia" />
      <Page>
        <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'usuarios') return; setFiltroClienteId(null); }}
              style={{
                padding: '8px 16px', borderRadius: 999, border: 'none', fontSize: 13.5, fontWeight: 700,
                background: tab === t.key ? COLORS.primary : 'transparent',
                color: tab === t.key ? '#fff' : COLORS.muted,
              }}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'clientes' && (
          <ClientesTab
            clientes={clientes} perfiles={perfiles} onCrear={onCrearCliente}
            onEntrar={onEntrarCliente}
            onVerCuentas={(clienteId) => { setFiltroClienteId(clienteId); setTab('usuarios'); }}
          />
        )}
        {tab === 'usuarios' && (
          <UsuariosTab
            clientes={clientes} perfiles={perfiles} currentUserId={currentUserId}
            filtroClienteId={filtroClienteId} onCambiarFiltro={setFiltroClienteId}
            onInvitar={onInvitarUsuario} onActualizar={onActualizarPerfil} onEliminar={onEliminarUsuario}
          />
        )}
      </Page>
    </>
  );
}

function ClientesTab({ clientes, perfiles, onCrear, onVerCuentas, onEntrar }) {
  const [modal, setModal] = useState(false);
  const [nombre, setNombre] = useState('');

  const rows = clientes.map((c) => ({ ...c, nUsuarios: perfiles.filter((p) => p.clienteId === c.id).length }));

  const columns = [
    { key: 'nombre', label: 'Cliente' },
    { key: 'nUsuarios', label: 'Cuentas', align: 'right' },
    {
      key: 'acciones', label: '', align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={(e) => { e.stopPropagation(); onVerCuentas(r.id); }}>Ver cuentas</Button>
          <Button onClick={(e) => { e.stopPropagation(); onEntrar(r.id); }}>Entrar →</Button>
        </div>
      ),
    },
  ];

  const crear = () => {
    if (!nombre.trim()) return;
    onCrear(nombre.trim());
    setNombre(''); setModal(false);
  };

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12.5, color: COLORS.muted, maxWidth: 460 }}>
          Cada cliente tiene su propia dotación, parámetros, escenarios y presupuesto — completamente aislados del resto. El admin siempre tiene acceso a los datos y las cuentas de todos los clientes.
        </div>
        <Button onClick={() => setModal(true)}>+ Nuevo cliente</Button>
      </div>
      {rows.length === 0 ? <EmptyState label="Todavía no hay clientes cargados." /> : <Table columns={columns} rows={rows} onRowClick={(r) => onEntrar(r.id)} />}

      {modal && (
        <Modal title="Nuevo cliente" onClose={() => setModal(false)} width={420}>
          <Field label="Nombre del cliente">
            <input style={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus placeholder="Ej: Acme SA" />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={crear} disabled={!nombre.trim()}>Crear</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function UsuariosTab({ clientes, perfiles, currentUserId, filtroClienteId, onCambiarFiltro, onInvitar, onActualizar, onEliminar }) {
  const [modal, setModal] = useState(false);
  const [aEditar, setAEditar] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [error, setError] = useState('');

  const clienteNombre = (id) => clientes.find((c) => c.id === id)?.nombre || '—';
  const filtrados = filtroClienteId ? perfiles.filter((p) => p.clienteId === filtroClienteId) : perfiles;

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'nombre', label: 'Nombre', render: (r) => r.nombre || '—' },
    { key: 'rol', label: 'Rol', render: (r) => <Badge tone={r.rol === 'admin' ? 'blue' : 'default'}>{r.rol}</Badge> },
    { key: 'cliente', label: 'Cliente', render: (r) => (r.rol === 'admin' ? '— (acceso a todos)' : clienteNombre(r.clienteId)) },
    {
      key: 'acciones', label: '', align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setAEditar(r); }}>Editar</Button>
          <Button
            variant="danger"
            onClick={(e) => { e.stopPropagation(); setAEliminar(r); }}
            disabled={r.id === currentUserId}
          >Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: COLORS.muted, maxWidth: 420 }}>
          Invitar manda un mail para que la persona active su cuenta y elija su contraseña. Un cliente puede tener varios usuarios; el admin puede editar o eliminar la cuenta de cualquiera.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={filtroClienteId || ''}
            onChange={(e) => onCambiarFiltro(e.target.value ? Number(e.target.value) : null)}
            style={{ ...inputStyle, minWidth: 180 }}
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <Button onClick={() => setModal(true)}>+ Invitar usuario</Button>
        </div>
      </div>
      {filtrados.length === 0 ? <EmptyState label="No hay cuentas para este filtro." /> : <Table columns={columns} rows={filtrados} />}

      {modal && (
        <InvitarModal
          clientes={clientes}
          clienteIdInicial={filtroClienteId}
          onClose={() => { setModal(false); setError(''); }}
          onInvitar={async (data) => {
            try {
              await onInvitar(data);
              setModal(false); setError('');
            } catch (e) {
              setError(e.message);
            }
          }}
          error={error}
        />
      )}

      {aEditar && (
        <EditarModal
          perfil={aEditar}
          clientes={clientes}
          onClose={() => setAEditar(null)}
          onGuardar={async (changes) => { await onActualizar(aEditar.id, changes); setAEditar(null); }}
        />
      )}

      {aEliminar && (
        <Modal title="Eliminar usuario" onClose={() => setAEliminar(null)}>
          <div style={{ fontSize: 14, color: COLORS.navy, marginBottom: 20 }}>
            ¿Seguro que querés eliminar el acceso de "{aEliminar.email}"? No va a poder volver a entrar a Nomia.
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

function EditarModal({ perfil, clientes, onClose, onGuardar }) {
  const [nombre, setNombre] = useState(perfil.nombre || '');
  const [rol, setRol] = useState(perfil.rol);
  const [clienteId, setClienteId] = useState(perfil.clienteId || clientes[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const puedeGuardar = rol === 'admin' || clienteId;

  const guardar = async () => {
    setLoading(true);
    await onGuardar({ nombre: nombre.trim() || null, rol, cliente_id: rol === 'admin' ? null : Number(clienteId) });
    setLoading(false);
  };

  return (
    <Modal title={`Editar ${perfil.email}`} onClose={onClose} width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Nombre">
          <input style={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </Field>
        <Field label="Rol">
          <select style={inputStyle} value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="cliente">Cliente (ve solo su presupuesto)</option>
            <option value="admin">Admin de Delenio (ve todos los clientes)</option>
          </select>
        </Field>
        {rol === 'cliente' && (
          <Field label="Cliente">
            <select style={inputStyle} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!puedeGuardar || loading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </Modal>
  );
}

function InvitarModal({ clientes, onClose, onInvitar, error }) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('cliente');
  const [clienteId, setClienteId] = useState(clientes[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const puedeInvitar = email.trim() && (rol === 'admin' || clienteId);

  const invitar = async () => {
    setLoading(true);
    await onInvitar({ email: email.trim(), nombre: nombre.trim(), rol, clienteId: rol === 'admin' ? null : Number(clienteId) });
    setLoading(false);
  };

  return (
    <Modal title="Invitar usuario" onClose={onClose} width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email">
          <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Nombre (opcional)">
          <input style={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Rol">
          <select style={inputStyle} value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="cliente">Cliente (ve solo su presupuesto)</option>
            <option value="admin">Admin de Delenio (ve todos los clientes)</option>
          </select>
        </Field>
        {rol === 'cliente' && (
          <Field label="Cliente">
            <select style={inputStyle} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
        )}
        {error && <div style={{ color: COLORS.danger, fontSize: 13 }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={invitar} disabled={!puedeInvitar || loading}>{loading ? 'Invitando…' : 'Invitar'}</Button>
      </div>
    </Modal>
  );
}
