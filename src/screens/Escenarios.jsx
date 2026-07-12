import { useState } from 'react';
import { TopBar, Page, Card, Table, Button, Modal, Field, inputStyle, Badge, EmptyState } from '../components/ui.jsx';
import { computePresupuesto, fmtARS, fmtPct } from '../lib/payrollEngine.js';

export default function Escenarios({ escenarios, presupuesto, onGuardar, onDelete, onRowClick }) {
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState('');

  const confirmarGuardado = () => {
    if (!nombre.trim()) return;
    onGuardar(nombre.trim());
    setNombre('');
    setShowModal(false);
  };

  const rows = escenarios.map((esc) => {
    const p = computePresupuesto(esc.empleados, esc.parametros, esc.macro, esc.bonos, esc.conceptosCustom || []);
    const delta = presupuesto.totalAnualARS ? (p.totalAnualARS - presupuesto.totalAnualARS) / presupuesto.totalAnualARS : 0;
    return { ...esc, totalAnualARS: p.totalAnualARS, headcountPromedio: p.headcountPromedio, delta };
  });

  const columns = [
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

  return (
    <>
      <TopBar title="Escenarios" subtitle="Guardá versiones del presupuesto y compará el impacto de cada supuesto" actions={
        <Button onClick={() => setShowModal(true)}>+ Guardar escenario actual</Button>
      } />
      <Page>
        <Card style={{ padding: 0 }}>
          {rows.length === 0
            ? <EmptyState label="Todavía no guardaste ningún escenario. Ajustá parámetros y guardá una versión para comparar." />
            : <Table columns={columns} rows={rows} onRowClick={onRowClick} />}
        </Card>
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
