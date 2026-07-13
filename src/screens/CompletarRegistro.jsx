import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../data/seed.js';
import { Button, inputStyle } from '../components/ui.jsx';
import { supabase } from '../lib/supabaseClient.js';

// Landing de la invitación: Supabase ya estableció la sesión a partir del link
// del mail (token en la URL). Acá el usuario elige su contraseña definitiva.
export default function CompletarRegistro() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const confirmar = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== password2) return setError('Las contraseñas no coinciden.');
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(err.message);
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, padding: 20 }}>
      <div style={{ width: 380, maxWidth: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 32 }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: COLORS.navy, marginBottom: 6 }}>Elegí tu contraseña</h1>
        <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 22 }}>Último paso para activar tu cuenta de Nomia.</div>
        <form onSubmit={confirmar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: COLORS.navy }}>Nueva contraseña</span>
            <input type="password" required autoFocus style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: COLORS.navy }}>Repetí la contraseña</span>
            <input type="password" required style={inputStyle} value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </label>
          {error && <div style={{ color: COLORS.danger, fontSize: 13 }}>{error}</div>}
          <Button type="submit" disabled={loading} style={{ marginTop: 6, width: '100%' }}>
            {loading ? '…' : 'Activar cuenta'}
          </Button>
        </form>
      </div>
    </div>
  );
}
