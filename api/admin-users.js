// Vercel serverless function — gestión de usuarios (invitar/eliminar) para el panel de admin.
// Usa la service role key de Supabase, que nunca se expone al cliente. Solo un admin autenticado
// (verificado server-side) puede invocar estas acciones — ver nomia_perfiles.rol.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en variables de entorno' });
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Falta autenticación' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Sesión inválida' });

  const { data: perfil } = await supabaseAdmin.from('nomia_perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'admin') return res.status(403).json({ error: 'Solo un administrador puede gestionar usuarios' });

  const { action } = req.body || {};

  try {
    if (action === 'invite') {
      const { email, nombre, rol, cliente_id, redirectTo } = req.body;
      if (!email) return res.status(400).json({ error: 'Falta el email' });

      let targetId;
      const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (inviteErr) {
        if (!String(inviteErr.message || '').toLowerCase().includes('already')) {
          return res.status(400).json({ error: inviteErr.message });
        }
        const { data: existente } = await supabaseAdmin.from('nomia_perfiles').select('id').eq('email', email).maybeSingle();
        if (!existente) return res.status(400).json({ error: 'El usuario ya existe en Supabase Auth pero no se encontró su perfil de Nomia.' });
        targetId = existente.id;
      } else {
        targetId = invited.user.id;
      }

      const { error: updErr } = await supabaseAdmin.from('nomia_perfiles')
        .update({ nombre: nombre || null, rol: rol || 'cliente', cliente_id: cliente_id || null })
        .eq('id', targetId);
      if (updErr) return res.status(400).json({ error: updErr.message });

      return res.status(200).json({ ok: true, id: targetId });
    }

    if (action === 'remove') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Falta el id' });
      if (id === user.id) return res.status(400).json({ error: 'No podés eliminar tu propio usuario' });
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (delErr) return res.status(400).json({ error: delErr.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  } catch (err) {
    console.error('Error en admin-users:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
