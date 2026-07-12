// Traduce entre las filas de Supabase (snake_case, numeric-as-string) y el shape
// camelCase que ya usa toda la UI. `codigo` no se persiste: se deriva del id.
const codigoFor = (id) => `C-${String(id).padStart(3, '0')}`;

export function empleadoFromDb(row) {
  return {
    id: row.id,
    codigo: codigoFor(row.id),
    nombre: row.nombre,
    cargo: row.cargo,
    seniority: row.seniority,
    centroCosto: row.centro_costo,
    fechaIngreso: row.fecha_ingreso,
    sueldoBase: Number(row.sueldo_base),
    comisionPct: Number(row.comision_pct),
    bonoCustomerPct: Number(row.bono_customer_pct),
    horasExtraN: Number(row.horas_extra_n),
    mesesActivo: row.meses_activo,
  };
}

export function empleadoToDb(data) {
  return {
    nombre: data.nombre,
    cargo: data.cargo,
    seniority: data.seniority,
    centro_costo: data.centroCosto,
    fecha_ingreso: data.fechaIngreso,
    sueldo_base: data.sueldoBase,
    comision_pct: data.comisionPct || 0,
    bono_customer_pct: data.bonoCustomerPct || 0,
    horas_extra_n: data.horasExtraN || 0,
    meses_activo: data.mesesActivo,
  };
}

export function conceptoFromDb(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    valor: Number(row.valor),
    alcance: row.alcance,
    activo: row.activo,
  };
}

export function escenarioFromDb(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    fecha: row.fecha,
    empleados: row.empleados,
    parametros: row.parametros,
    macro: row.macro,
    bonos: row.bonos,
    conceptosCustom: row.conceptos_custom || [],
  };
}
