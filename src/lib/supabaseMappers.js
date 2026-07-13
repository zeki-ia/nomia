// Traduce entre las filas de Supabase (snake_case, numeric-as-string) y el shape
// camelCase que ya usa toda la UI.

export function empleadoFromDb(row) {
  return {
    id: row.id,
    codigo: row.codigo,
    legajo: row.legajo || '',
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
    codigo: data.codigo,
    legajo: data.legajo || null,
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

// Sugiere el próximo código secuencial (C-019, C-020, ...) en base a los existentes.
// `offset` permite generar varios códigos distintos para un mismo lote (ej. import masivo).
export function nextCodigo(empleadosExistentes, offset = 0) {
  const max = empleadosExistentes.reduce((m, e) => {
    const n = parseInt(String(e.codigo || '').replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `C-${String(max + 1 + offset).padStart(3, '0')}`;
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

export function clienteFromDb(row) {
  return { id: row.id, nombre: row.nombre, createdAt: row.created_at };
}

export function perfilFromDb(row) {
  return { id: row.id, email: row.email, nombre: row.nombre, rol: row.rol, clienteId: row.cliente_id };
}

export function costoRealFromDb(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    anio: row.anio,
    mes: row.mes,
    centroCosto: row.centro_costo,
    monto: Number(row.monto),
    nota: row.nota,
    fuente: row.fuente,
  };
}

export function costoRealToDb(data, clienteId) {
  return {
    cliente_id: clienteId,
    anio: data.anio,
    mes: data.mes,
    centro_costo: data.centroCosto || 'TOTAL',
    monto: data.monto,
    nota: data.nota || null,
    fuente: data.fuente || 'manual',
  };
}
