import { useMemo, useState } from 'react';
import { TopBar, Page, Card, Table, Badge, Button, Modal, Field, inputStyle } from '../components/ui.jsx';
import { CECOS, SENIORITIES, COLORS } from '../data/seed.js';
import { fmtARS } from '../lib/payrollEngine.js';

export default function Empleados({ empleados, onRowClick, onNew, onImport, onBulkUpdate, onBulkDelete }) {
  const [query, setQuery] = useState('');
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter((e) =>
      e.nombre.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q) || e.centroCosto.toLowerCase().includes(q)
    );
  }, [empleados, query]);

  const cecoLabel = (code) => CECOS.find((c) => c.code === code)?.label || code;

  const toggleUno = (id) => setSeleccion((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const todosVisiblesSeleccionados = filtrados.length > 0 && filtrados.every((e) => seleccion.has(e.id));
  const toggleTodos = () => setSeleccion((prev) => {
    if (todosVisiblesSeleccionados) {
      const next = new Set(prev);
      filtrados.forEach((e) => next.delete(e.id));
      return next;
    }
    const next = new Set(prev);
    filtrados.forEach((e) => next.add(e.id));
    return next;
  });

  const limpiarSeleccion = () => setSeleccion(new Set());

  const columns = [
    {
      key: 'sel', label: <input type="checkbox" checked={todosVisiblesSeleccionados} onChange={toggleTodos} />,
      render: (r) => (
        <input
          type="checkbox"
          checked={seleccion.has(r.id)}
          onChange={() => toggleUno(r.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'seniority', label: 'Seniority', render: (r) => <Badge tone="blue">{r.seniority}</Badge> },
    { key: 'centroCosto', label: 'CeCo', render: (r) => cecoLabel(r.centroCosto) },
    { key: 'sueldoBase', label: 'Sueldo Base (Ene)', align: 'right', render: (r) => fmtARS(r.sueldoBase) },
    {
      key: 'activo', label: 'Estado',
      render: (r) => {
        const activos = r.mesesActivo.filter(Boolean).length;
        return activos === 12
          ? <Badge tone="green">Activo todo el año</Badge>
          : <Badge tone="warning">{activos} de 12 meses</Badge>;
      },
    },
  ];

  return (
    <>
      <TopBar title="Dotación" subtitle={`${empleados.length} empleados cargados`} actions={<>
        <Button variant="secondary" onClick={onImport}>⬆ Importar</Button>
        <Button onClick={onNew}>+ Nuevo empleado</Button>
      </>} />
      <Page>
        <Card style={{ padding: 12 }}>
          <input
            placeholder="Buscar por nombre, cargo o centro de costo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </Card>

        {seleccion.size > 0 && (
          <Card style={{ background: COLORS.primarySoft, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.primary }}>{seleccion.size} empleado{seleccion.size === 1 ? '' : 's'} seleccionado{seleccion.size === 1 ? '' : 's'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={limpiarSeleccion}>Cancelar</Button>
              <Button variant="secondary" onClick={() => setShowBulkEdit(true)}>Editar en lote</Button>
              <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Eliminar seleccionados</Button>
            </div>
          </Card>
        )}

        <Card style={{ padding: 0 }}>
          <Table columns={columns} rows={filtrados} onRowClick={onRowClick} />
        </Card>
      </Page>

      {showBulkEdit && (
        <BulkEditModal
          count={seleccion.size}
          onClose={() => setShowBulkEdit(false)}
          onConfirm={(changes) => {
            onBulkUpdate([...seleccion], changes);
            setShowBulkEdit(false);
            limpiarSeleccion();
          }}
        />
      )}

      {showBulkDelete && (
        <Modal title="Eliminar empleados" onClose={() => setShowBulkDelete(false)}>
          <div style={{ fontSize: 14, color: COLORS.navy, marginBottom: 20 }}>
            ¿Seguro que querés eliminar {seleccion.size} empleado{seleccion.size === 1 ? '' : 's'} de la dotación? Esta acción no se puede deshacer.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setShowBulkDelete(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { onBulkDelete([...seleccion]); setShowBulkDelete(false); limpiarSeleccion(); }}>
              Eliminar {seleccion.size}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function BulkEditModal({ count, onClose, onConfirm }) {
  const [centroCosto, setCentroCosto] = useState('');
  const [seniority, setSeniority] = useState('');
  const [ajustePct, setAjustePct] = useState('');
  const [estado, setEstado] = useState('nocambiar');

  const confirmar = () => {
    const changes = {};
    if (centroCosto) changes.centroCosto = centroCosto;
    if (seniority) changes.seniority = seniority;
    if (ajustePct) changes.ajusteSueldoPct = Number(ajustePct) / 100;
    if (estado !== 'nocambiar') changes.estado = estado; // 'activo' | 'inactivo'
    onConfirm(changes);
  };

  const hayAlgo = centroCosto || seniority || ajustePct || estado !== 'nocambiar';

  return (
    <Modal title={`Editar ${count} empleado${count === 1 ? '' : 's'} en lote`} onClose={onClose} width={480}>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 16 }}>
        Dejá en blanco lo que no quieras cambiar. Solo se aplican los campos que completes.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Centro de costo">
          <select style={inputStyle} value={centroCosto} onChange={(e) => setCentroCosto(e.target.value)}>
            <option value="">No cambiar</option>
            {CECOS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Seniority">
          <select style={inputStyle} value={seniority} onChange={(e) => setSeniority(e.target.value)}>
            <option value="">No cambiar</option>
            {SENIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Ajuste de sueldo base (%)" hint="Ej: 10 para +10%, -5 para -5%. Se aplica sobre el sueldo actual de cada empleado.">
          <input type="number" step="0.5" style={inputStyle} value={ajustePct} onChange={(e) => setAjustePct(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Estado en el año">
          <select style={inputStyle} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="nocambiar">No cambiar</option>
            <option value="activo">Marcar activo todo el año</option>
            <option value="inactivo">Marcar inactivo todo el año</option>
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={!hayAlgo}>Aplicar cambios</Button>
      </div>
    </Modal>
  );
}
