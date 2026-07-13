import { useState } from 'react';
import { COLORS } from '../data/seed.js';
import { Button, inputStyle, Spinner } from '../components/ui.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function Login() {
  const [modo, setModo] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupOk, setSignupOk] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : err.message);
    setLoading(false);
  };

  const crearCuenta = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) return setError(err.message);
    setSignupOk(true);
  };

  const conGoogle = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
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

        {signupOk ? (
          <div style={{ fontSize: 13.5, color: COLORS.navy, lineHeight: 1.6 }}>
            Cuenta creada. Revisá tu mail para confirmarla y después pedile a tu administrador que te asigne un cliente
            — hasta entonces vas a poder iniciar sesión pero no vas a ver datos.
            <Button variant="secondary" onClick={() => { setSignupOk(false); setModo('login'); }} style={{ width: '100%', marginTop: 16 }}>
              Ir a iniciar sesión
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={modo === 'login' ? entrar : crearCuenta} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                {loading ? <Spinner label={modo === 'login' ? 'Ingresando…' : 'Creando cuenta…'} /> : (modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
              </Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <span style={{ fontSize: 11.5, color: COLORS.mutedSoft }}>o</span>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            </div>

            <Button variant="secondary" onClick={conGoogle} style={{ width: '100%' }}>Continuar con Google</Button>

            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 20, textAlign: 'center' }}>
              {modo === 'login' ? (
                <>¿No tenés cuenta? <button type="button" onClick={() => { setModo('signup'); setError(''); }} style={linkStyle}>Creá una</button></>
              ) : (
                <>¿Ya tenés cuenta? <button type="button" onClick={() => { setModo('login'); setError(''); }} style={linkStyle}>Iniciá sesión</button></>
              )}
            </div>
            <div style={{ fontSize: 11, color: COLORS.mutedSoft, marginTop: 10, textAlign: 'center' }}>
              Crear una cuenta no te da acceso a ningún presupuesto por sí solo — necesitás que un administrador te asigne un cliente.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const linkStyle = { background: 'none', border: 'none', color: COLORS.primary, fontWeight: 700, cursor: 'pointer', padding: 0, font: 'inherit' };
