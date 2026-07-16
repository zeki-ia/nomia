// Cliente para /api/admin-users — invitar/eliminar usuarios. Requiere ser admin
// (verificado server-side con la service role key, nunca con la anon key).
import { supabase } from './supabaseClient.js';

async function callAdminUsers(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa.');

  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`El servidor no respondió con datos válidos (status ${res.status}). Corré "vercel dev" para que /api/admin-users funcione en local.`);
  }
  if (!res.ok) throw new Error(data?.error || 'Error al gestionar el usuario');
  return data;
}

export function invitarUsuario({ email, nombre, rol, clienteId }) {
  return callAdminUsers({
    action: 'invite', email, nombre, rol, cliente_id: clienteId,
    redirectTo: `${window.location.origin}/completar-registro`,
  });
}

export function crearClienteAdmin(nombre) {
  return callAdminUsers({ action: 'createCliente', nombre });
}

export function eliminarUsuario(id) {
  return callAdminUsers({ action: 'remove', id });
}
