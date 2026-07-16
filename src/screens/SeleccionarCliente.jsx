import { useState } from 'react';
import { TopBar, Page, Card } from '../components/ui.jsx';
import { COLORS } from '../data/seed.js';

export default function SeleccionarCliente({ clientes, perfiles, escSummary = [], onSeleccionar }) {
  const [searchQ, setSearchQ] = useState('');
  const nUsuarios = (clienteId) => perfiles.filter((p) => p.clienteId === clienteId).length;
  const filtrados = searchQ
    ? clientes.filter(c => c.nombre.toLowerCase().includes(searchQ.toLowerCase()))
    : clientes;

  // KPIs
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const conEscenario = new Set(escSummary.map(e => e.cliente_id)).size;
  const sinActividadMes = clientes.filter(c =>
    !escSummary.some(e => e.cliente_id === c.id && e.fecha?.startsWith(currentMonth))
  ).length;

  const kpiStyle = {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  };

  return (
    <>
      <TopBar title="Clientes" subtitle="Seleccioná un cliente para acceder a su dotación, parámetros y presupuesto"
        actions={
          <a href="https://hub.talenio.tech" target="_blank" rel="noreferrer"
            style={{ padding: '7px 14px', borderRadius: 8, background: COLORS.primary, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            + Gestionar en Hub
          </a>
        }
      />
      <Page>
        {/* KPI row */}
        {clientes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={kpiStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total clientes</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.navy, lineHeight: 1.1 }}>{clientes.length}</div>
            </div>
            <div style={kpiStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Con escenario</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary, lineHeight: 1.1 }}>{conEscenario}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>al menos 1 guardado</div>
            </div>
            <div style={kpiStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sin actividad este mes</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: sinActividadMes > 0 ? '#B45309' : COLORS.navy, lineHeight: 1.1 }}>{sinActividadMes}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>sin escenario en {currentMonth}</div>
            </div>
          </div>
        )}

        {clientes.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 20, color: COLORS.mutedSoft, fontSize: 13.5 }}>
              Todavía no hay clientes cargados. Creá el primero desde Administración.
            </div>
          </Card>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Buscar cliente…"
                style={{ width: '100%', maxWidth: 340, padding: '9px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 13.5, color: COLORS.navy, background: COLORS.surface, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {filtrados.map((c) => (
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
                  {escSummary.some(e => e.cliente_id === c.id && e.fecha?.startsWith(currentMonth)) && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#15803D', fontWeight: 600 }}>✓ Activo este mes</div>
                  )}
                </button>
              ))}
              {filtrados.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: COLORS.muted, fontSize: 13.5 }}>
                  Sin resultados para "{searchQ}"
                </div>
              )}
            </div>
          </>
        )}
      </Page>
    </>
  );
}
