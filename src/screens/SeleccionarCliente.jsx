import { TopBar, Page, Card } from '../components/ui.jsx';
import { COLORS } from '../data/seed.js';

// Landing del admin: primero elegís el cliente, después entrás a ver sus funcionalidades
// (Dashboard, Dotación, Parámetros, etc.) — mismo patrón que PromotIA y Climia.
export default function SeleccionarCliente({ clientes, perfiles, onSeleccionar }) {
  const nUsuarios = (clienteId) => perfiles.filter((p) => p.clienteId === clienteId).length;

  return (
    <>
      <TopBar title="Elegí un cliente" subtitle="Cada cliente tiene su propia dotación, parámetros y presupuesto" />
      <Page>
        {clientes.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 20, color: COLORS.mutedSoft, fontSize: 13.5 }}>
              Todavía no hay clientes cargados. Creá el primero desde Administración.
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {clientes.map((c) => (
              <button
                key={c.id}
                onClick={() => onSeleccionar(c.id)}
                style={{
                  textAlign: 'left', background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'border-color .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, marginBottom: 6 }}>{c.nombre}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{nUsuarios(c.id)} usuario{nUsuarios(c.id) === 1 ? '' : 's'}</div>
              </button>
            ))}
          </div>
        )}
      </Page>
    </>
  );
}
