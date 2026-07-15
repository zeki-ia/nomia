import { useState } from 'react';
import { COLORS } from '../data/seed.js';
import { Button, inputStyle, Spinner } from '../components/ui.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [forgotMode, setForgotMode] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : err.message);
    setLoading(false);
  };

  const conGoogle = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  };

  const enviarReset = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    if (err) setError(err.message);
    else { setInfo('Te enviamos un email para restablecer tu contraseña.'); setForgotMode(false); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, padding: 20 }}>
      <div style={{ width: 380, maxWidth: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, background: COLORS.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Sora', fontWeight: 800, color: '#fff', fontSize: 18,
          }}>N</div>
          <div>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 19, color: COLORS.navy }}>Nomia</div>
            <div style={{ fontSize: 11.5, color: COLORS.muted }}>Delenio People</div>
          </div>
        </div>

        {info && <div style={{ color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 14 }}>{info}</div>}

        {forgotMode ? (
          <form onSubmit={enviarReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.</p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: COLORS.navy }}>Email</span>
              <input type="email" required autoFocus style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {error && <div style={{ color: COLORS.danger, fontSize: 13 }}>{error}</div>}
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? <Spinner label="Enviando…" /> : 'Enviar enlace'}
            </Button>
            <button type="button" onClick={() => { setForgotMode(false); setError(''); }} style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 12.5, cursor: 'pointer', padding: 0 }}>
              ← Volver al login
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={entrar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: COLORS.navy }}>Email</span>
                <input type="email" required autoFocus style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: COLORS.navy }}>Contraseña</span>
                <input type="password" required style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>

              {error && <div style={{ color: COLORS.danger, fontSize: 13 }}>{error}</div>}

              <Button type="submit" disabled={loading} style={{ marginTop: 6, width: '100%' }}>
                {loading ? <Spinner label="Ingresando…" /> : 'Iniciar sesión'}
              </Button>
            </form>

            <button type="button" onClick={() => { setForgotMode(true); setError(''); }} style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 12.5, cursor: 'pointer', marginTop: 10, padding: 0 }}>
              ¿Olvidaste tu contraseña?
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <span style={{ fontSize: 11.5, color: COLORS.mutedSoft }}>o</span>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            </div>

            <Button variant="secondary" onClick={conGoogle} style={{ width: '100%' }}>Continuar con Google</Button>

            <div style={{ fontSize: 11.5, color: COLORS.mutedSoft, marginTop: 20, textAlign: 'center' }}>
              ¿Necesitás una cuenta? Solicitá acceso a tu administrador en{' '}
              <a href="https://hub.talenio.tech" target="_blank" rel="noreferrer" style={{ color: COLORS.primary, fontWeight: 700, textDecoration: 'none' }}>hub.talenio.tech</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

