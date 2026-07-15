import { NavLink } from 'react-router-dom';
import { COLORS } from '../data/seed.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◇' },
  { to: '/empleados', label: 'Dotación', icon: '☰' },
  { to: '/parametros', label: 'Parámetros', icon: '⚙' },
  { to: '/escenarios', label: 'Escenarios', icon: '⌥' },
  { to: '/real-vs-presupuesto', label: 'Real vs. Presupuesto', icon: '⇄' },
  { to: '/reportes', label: 'Reportes', icon: '▤' },
];

export function Sidebar({ perfil, clientes, clienteActivoId, onCambiarCliente, onVolverAClientes, onLogout }) {
  const esAdmin = perfil?.rol === 'admin';
  return (
    <div style={{
      width: 236, flexShrink: 0, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`,
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '24px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: COLORS.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Sora', fontWeight: 800, color: '#fff', fontSize: 16,
          }}>N</div>
          <div>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 17, color: COLORS.navy }}>Nomia</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>Delenio People</div>
          </div>
        </div>
      </div>

      {esAdmin && clientes && clienteActivoId && (
        <div style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select
            value={clienteActivoId || ''}
            onChange={(e) => onCambiarCliente(Number(e.target.value))}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${COLORS.borderStrong}`,
              fontSize: 12.5, fontWeight: 600, color: COLORS.navy, background: COLORS.bg,
            }}
          >
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button
            onClick={onVolverAClientes}
            style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: 11.5, color: COLORS.muted, fontWeight: 600, cursor: 'pointer', padding: '2px 2px' }}
          >← Todos los clientes</button>
        </div>
      )}

      <nav style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {(!esAdmin || clienteActivoId) && NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
              fontSize: 14, fontWeight: 600,
              color: isActive ? COLORS.primary : COLORS.muted,
              background: isActive ? COLORS.primarySoft : 'transparent',
            })}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {esAdmin && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
              fontSize: 14, fontWeight: 600, marginTop: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 20,
              color: isActive ? COLORS.primary : COLORS.muted,
              background: isActive ? COLORS.primarySoft : 'transparent',
            })}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>◆</span>
            Administración
          </NavLink>
        )}
      </nav>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}` }}>
        {perfil && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: COLORS.navy, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil.nombre || perfil.email}
            </div>
            <button onClick={onLogout} style={{ background: 'none', border: 'none', fontSize: 11.5, color: COLORS.muted, fontWeight: 700, cursor: 'pointer' }}>
              Salir
            </button>
          </div>
        )}
        <div style={{ fontSize: 11, color: COLORS.mutedSoft }}>Presupuesto 2026 · Argentina</div>
      </div>
    </div>
  );
}

export function TopBar({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 32px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface,
    }}>
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: COLORS.navy }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>{actions}</div>
    </div>
  );
}

export function Page({ children }) {
  return <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>{children}</div>;
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18,
      padding: 20, ...style,
    }}>{children}</div>
  );
}

export function KpiCard({ label, value, sub, accent }) {
  return (
    <Card style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Sora', fontSize: 26, fontWeight: 700, color: accent || COLORS.navy }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 6 }}>{sub}</div>}
    </Card>
  );
}

export function Button({ children, onClick, variant = 'primary', type = 'button', disabled, style }) {
  const variants = {
    primary: { background: COLORS.primary, color: '#fff', border: 'none' },
    secondary: { background: COLORS.surface, color: COLORS.navy, border: `1px solid ${COLORS.borderStrong}` },
    ghost: { background: 'transparent', color: COLORS.primary, border: 'none' },
    danger: { background: COLORS.dangerSoft, color: COLORS.danger, border: 'none' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 18px', borderRadius: 999, fontWeight: 700, fontSize: 13.5,
        opacity: disabled ? 0.5 : 1, transition: 'opacity .15s',
        ...variants[variant], ...style,
      }}
    >{children}</button>
  );
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: { bg: COLORS.surfaceMuted, cl: COLORS.muted },
    green: { bg: COLORS.greenSoft, cl: COLORS.greenDeep },
    blue: { bg: COLORS.primarySoft, cl: COLORS.primary },
    warning: { bg: COLORS.warningSoft, cl: COLORS.warning },
    danger: { bg: COLORS.dangerSoft, cl: COLORS.danger },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      background: t.bg, color: t.cl, fontSize: 11.5, fontWeight: 700,
      padding: '3px 10px', borderRadius: 999, display: 'inline-block',
    }}>{children}</span>
  );
}

export function Table({ columns, rows, onRowClick, keyField = 'id' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{
                textAlign: col.align || 'left', padding: '10px 14px', fontSize: 11.5,
                fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.3,
                borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap',
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[keyField]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = COLORS.bg; }}
              onMouseLeave={(e) => { if (onRowClick) e.currentTarget.style.background = 'transparent'; }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{
                  padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`,
                  textAlign: col.align || 'left', color: COLORS.navy, whiteSpace: 'nowrap',
                }}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <EmptyState label="Sin datos todavía" />}
    </div>
  );
}

export function EmptyState({ label }) {
  return <div style={{ padding: '32px 0', textAlign: 'center', color: COLORS.mutedSoft, fontSize: 13.5 }}>{label}</div>;
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: COLORS.navy }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: COLORS.mutedSoft }}>{hint}</span>}
    </label>
  );
}

export const inputStyle = {
  padding: '9px 12px', borderRadius: 10, border: `1px solid ${COLORS.borderStrong}`,
  fontSize: 13.5, color: COLORS.navy, background: COLORS.surface,
};

export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(16,20,31,0.4)', zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 20px', overflowY: 'auto',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.surface, borderRadius: 20, padding: 24, width, maxWidth: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: COLORS.navy }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: COLORS.muted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.muted, fontSize: 13 }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', border: `2px solid ${COLORS.border}`,
        borderTopColor: COLORS.primary, animation: 'nomia-spin 0.7s linear infinite',
      }} />
      {label}
    </div>
  );
}
