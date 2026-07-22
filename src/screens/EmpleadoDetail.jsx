import { useState } from 'react';
import { TopBar, Page, Card, Field, Button, inputStyle } from '../components/ui.jsx';
import { SENIORITIES, CECOS, MESES, COLORS } from '../data/seed.js';
import { nextCodigo } from '../lib/supabaseMappers.js';

const BLANK = {
  codigo: '', legajo: '', nombre: '', cargo: '', seniority: 'Standard', centroCosto: CECOS[0].code,
  fechaIngreso: '2026-01-01', sueldoBase: 1000000,
  comisionPct: 0, bonoCustomerPct: 0, horasExtraN: 0,
  mesesActivo: Array(12).fill(1), fechaFin: '',
};

export default function EmpleadoDetail({ empleado, empleados = [], onSave, onDelete, onBack, isNew }) {
  const [form, setForm] = useState(() => (empleado ? { ...empleado } : { ...BLANK, codigo: nextCodigo(empleados) }));

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleMes = (i) => setForm((f) => {
    const meses = [...f.mesesActivo];
    meses[i] = meses[i] ? 0 : 1;
    return { ...f, mesesActivo: meses };
  });

  const puedeGuardar = form.nombre.trim() && form.codigo.trim();

  const guardar = () => {
    onSave({ ...form, id: empleado?.id });
    onBack();
  };

  return (
    <>
      <TopBar
        title={isNew ? 'Nuevo empleado' : form.nombre}
        subtitle={isNew ? 'Cargalo a la dotación' : `${form.cargo} · ${form.seniority}`}
        actions={<>
          <Button variant="secondary" onClick={onBack}>← Volver</Button>
          {!isNew && <Button variant="danger" onClick={() => onDelete(empleado.id)}>Eliminar</Button>}
          <Button onClick={guardar} disabled={!puedeGuardar}>Guardar</Button>
        </>}
      />
      <Page>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Código" hint="Código de posición en el presupuesto">
              <input style={inputStyle} value={form.codigo} onChange={(e) => set('codigo', e.target.value)} />
            </Field>
            <Field label="N° de legajo">
              <input style={inputStyle} value={form.legajo || ''} onChange={(e) => set('legajo', e.target.value)} />
            </Field>
            <Field label="Nombre y apellido">
              <input style={inputStyle} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </Field>
            <Field label="Cargo">
              <input style={inputStyle} value={form.cargo} onChange={(e) => set('cargo', e.target.value)} />
            </Field>
            <Field label="Seniority">
              <select style={inputStyle} value={form.seniority} onChange={(e) => set('seniority', e.target.value)}>
                {SENIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Centro de costo">
              <select style={inputStyle} value={form.centroCosto} onChange={(e) => set('centroCosto', e.target.value)}>
                {CECOS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Fecha de ingreso">
              <input type="date" style={inputStyle} value={form.fechaIngreso?.slice(0, 10)} onChange={(e) => set('fechaIngreso', e.target.value)} />
            </Field>
            <Field label="Fin de contrato" hint="Opcional — activa alertas 30/15/7 días antes">
              <input type="date" style={inputStyle} value={form.fechaFin?.slice(0, 10) || ''} onChange={(e) => set('fechaFin', e.target.value || null)} />
            </Field>
            <Field label="Sueldo base ARS (Ene)">
              <input type="number" style={inputStyle} value={form.sueldoBase} onChange={(e) => set('sueldoBase', Number(e.target.value))} />
            </Field>
            <Field label="Comisión (% del sueldo)" hint="Ej: ventas, SDR">
              <input type="number" step="0.01" style={inputStyle} value={form.comisionPct} onChange={(e) => set('comisionPct', Number(e.target.value))} />
            </Field>
            <Field label="Bono Customer (% del sueldo)">
              <input type="number" step="0.01" style={inputStyle} value={form.bonoCustomerPct} onChange={(e) => set('bonoCustomerPct', Number(e.target.value))} />
            </Field>
            <Field label="Horas extra (N°)">
              <input type="number" style={inputStyle} value={form.horasExtraN} onChange={(e) => set('horasExtraN', Number(e.target.value))} />
            </Field>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Meses activo en 2026</h3>
          <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 14 }}>
            Marcá los meses en los que el empleado está activo — reemplaza a fecha de alta/baja en el cálculo.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MESES.map((mes, i) => (
              <button
                key={mes}
                onClick={() => toggleMes(i)}
                style={{
                  padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                  background: form.mesesActivo[i] ? COLORS.primary : COLORS.surfaceMuted,
                  color: form.mesesActivo[i] ? '#fff' : COLORS.muted,
                }}
              >{mes}</button>
            ))}
          </div>
        </Card>
      </Page>
    </>
  );
}
