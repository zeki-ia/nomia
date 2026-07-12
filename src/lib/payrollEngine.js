// Motor de cálculo de costo empresa — réplica fiel de las fórmulas del modelo
// "Presupuesto_Payroll_2026_Delenio_v2" (hojas 00_Macro, 01_Parametros, 02_Bonos, 04_BBDD, Ene..Dic).
import { MESES } from '../data/seed.js';

const round = (n) => Math.round(n || 0);

function yearsBetween(fechaIngreso, refDate) {
  const start = new Date(fechaIngreso);
  const diffDays = (refDate - start) / (1000 * 60 * 60 * 24);
  return diffDays / 365.25;
}

function diasVacacionesPorAntiguedad(years) {
  if (years > 20) return 35;
  if (years > 10) return 28;
  if (years > 5) return 21;
  return 14;
}

// Serie de 12 meses que compone un valor mensual con una tasa variable por mes (IPC,
// devaluación, etc.). `tasas[m]` es la tasa aplicada al pasar del mes m-1 al mes m
// (tasas[0], la de Ene, no se usa: Ene es el valor base de la serie).
function serieCompuesta(base, tasas, months = 12) {
  const out = [base];
  for (let m = 1; m < months; m++) out.push(out[m - 1] * (1 + (tasas[m] ?? 0)));
  return out;
}

// Índice salarial acumulado: Ene = 1, luego compone el ajuste salarial de cada mes.
function serieIndiceSalarial(ajusteSalarialPct, months = 12) {
  const out = [1];
  for (let m = 1; m < months; m++) out.push(out[m - 1] * (1 + (ajusteSalarialPct[m] ?? 0)));
  return out;
}

// `parametros` es una lista (no un objeto fijo): se pueden eliminar filas del catálogo
// estructural, y el motor las trata como neutras (0) en vez de romper el cálculo.
function paramValue(parametros, key, fallback = 0) {
  const item = parametros.find((p) => p.key === key);
  return item ? item.valor : fallback;
}

export function buildSeries(parametros, macro, conceptosCustom = [], year = 2026) {
  const indiceSalarial = serieIndiceSalarial(macro.ajusteSalarialPct);
  const alimentacion = serieCompuesta(paramValue(parametros, 'alimentacion'), macro.ipcMensualPct);
  const conectividad = serieCompuesta(paramValue(parametros, 'conectividad'), macro.ipcMensualPct);
  const seguroSalud = serieCompuesta(paramValue(parametros, 'seguroSalud'), macro.ipcMensualPct);
  const tiposCambio = {};
  for (const [key, tc] of Object.entries(macro.tiposCambio)) {
    tiposCambio[key] = serieCompuesta(tc.inicial, tc.devaluacionPct);
  }
  const tcActivo = tiposCambio[macro.tcActivo];
  const monthDates = MESES.map((_, i) => new Date(year, i, 1));
  const conceptosCustomSeries = {};
  for (const c of conceptosCustom) {
    if (c.tipo === 'montoFijo') conceptosCustomSeries[c.id] = serieCompuesta(c.valor, macro.ipcMensualPct);
  }
  return { indiceSalarial, alimentacion, conectividad, seguroSalud, tiposCambio, tcActivo, monthDates, conceptosCustomSeries };
}

const MANAGER_LEVELS = new Set(['Manager', 'Director', 'CEO']);

function aplicaConcepto(concepto, empleado) {
  const alcance = concepto.alcance || { tipo: 'todos' };
  if (alcance.tipo === 'ceco') return empleado.centroCosto === alcance.valor;
  if (alcance.tipo === 'seniority') return empleado.seniority === alcance.valor;
  return true;
}

export function computeEmpleadoMes(empleado, mesIndex, series, parametros, bonos, conceptosCustom = []) {
  const activo = empleado.mesesActivo[mesIndex] ? 1 : 0;
  const indice = series.indiceSalarial[mesIndex];

  const sueldoBase = round(empleado.sueldoBase * indice * (1 + paramValue(parametros, 'ajustePerformancePct'))) * activo;
  const comisiones = round(sueldoBase * empleado.comisionPct);
  const bonoCustomer = round(sueldoBase * empleado.bonoCustomerPct);
  const horasExtras = round((sueldoBase / 30 / 8) * empleado.horasExtraN * paramValue(parametros, 'topeHorasExtra'));
  const totalVariable = comisiones + bonoCustomer + horasExtras;

  const nSueldosBono = bonos[empleado.seniority] || 0;
  const bonoAnual = round((nSueldosBono * sueldoBase) / 12);

  const sac = round((sueldoBase + totalVariable + bonoAnual) / 12);

  const antiguedad = yearsBetween(empleado.fechaIngreso, series.monthDates[mesIndex]);
  const diasVac = activo === 0 ? 0 : diasVacacionesPorAntiguedad(antiguedad);
  const plusVacacional = round(((sueldoBase + totalVariable) / 30) * (diasVac / 12) * paramValue(parametros, 'plusVacacionalPct'));

  const alimentacion = round(series.alimentacion[mesIndex] * activo);
  const conectividad = round(series.conectividad[mesIndex] * activo);
  const seguroSalud = round(series.seguroSalud[mesIndex] * activo);
  const totalBeneficios = alimentacion + conectividad + seguroSalud;

  const contribuciones = round((sueldoBase + totalVariable + sac + bonoAnual + plusVacacional) * paramValue(parametros, 'contribucionesPatronalesPct'));
  const seguroMgrUp = round((MANAGER_LEVELS.has(empleado.seniority) ? paramValue(parametros, 'seguroManagerUSD') * series.tcActivo[mesIndex] : 0) * activo);
  const totalAportes = contribuciones + seguroMgrUp;

  const provIndemnizacion = round((sueldoBase + totalVariable + bonoAnual + plusVacacional + totalBeneficios + totalAportes) * paramValue(parametros, 'provisionIndemnizacionPct'));

  const costosCustomPorConcepto = {};
  let costosCustom = 0;
  for (const c of conceptosCustom) {
    if (!c.activo || !aplicaConcepto(c, empleado)) continue;
    const monto = c.tipo === 'pctSueldo'
      ? round(sueldoBase * c.valor)
      : round((series.conceptosCustomSeries[c.id]?.[mesIndex] || 0) * activo);
    costosCustomPorConcepto[c.id] = monto;
    costosCustom += monto;
  }

  const totalCostoARS = sueldoBase + totalVariable + bonoAnual + sac + plusVacacional + totalBeneficios + totalAportes + provIndemnizacion + costosCustom;
  const totalCostoUSD = series.tcActivo[mesIndex] ? totalCostoARS / series.tcActivo[mesIndex] : 0;

  return {
    empleadoId: empleado.id, mesIndex, activo, hc: activo,
    sueldoBase, comisiones, bonoCustomer, horasExtras, totalVariable,
    bonoAnual, sac, diasVac, plusVacacional,
    alimentacion, conectividad, seguroSalud, totalBeneficios,
    contribuciones, seguroMgrUp, totalAportes, provIndemnizacion,
    costosCustom, costosCustomPorConcepto,
    totalCostoARS, totalCostoUSD,
  };
}

export function computePresupuesto(empleados, parametros, macro, bonos, conceptosCustom = [], year = 2026) {
  const series = buildSeries(parametros, macro, conceptosCustom, year);
  const porEmpleado = empleados.map((empleado) => ({
    empleado,
    meses: MESES.map((_, mesIndex) => computeEmpleadoMes(empleado, mesIndex, series, parametros, bonos, conceptosCustom)),
  }));

  const conceptos = [
    ['sueldoBase', 'Sueldo Base'], ['comisiones', 'Comisiones'], ['bonoCustomer', 'Bono Customer'],
    ['horasExtras', 'Horas Extras'], ['bonoAnual', 'Bono Anual (mens.)'], ['sac', 'SAC (prov.)'],
    ['plusVacacional', 'Plus Vacacional'], ['totalBeneficios', 'Total Beneficios'],
    ['contribuciones', 'Contribuciones'], ['seguroMgrUp', 'Seguro Mgr & Up'],
    ['provIndemnizacion', 'Prov. Indemnización'],
  ];

  const consolidadoPorConcepto = [
    ...conceptos.map(([key, label]) => {
      const porMes = MESES.map((_, mesIndex) => porEmpleado.reduce((sum, e) => sum + e.meses[mesIndex][key], 0));
      return { key, label, porMes, total: porMes.reduce((a, b) => a + b, 0) };
    }),
    ...conceptosCustom.filter((c) => c.activo).map((c) => {
      const porMes = MESES.map((_, mesIndex) => porEmpleado.reduce((sum, e) => sum + (e.meses[mesIndex].costosCustomPorConcepto[c.id] || 0), 0));
      return { key: `custom_${c.id}`, label: c.nombre, porMes, total: porMes.reduce((a, b) => a + b, 0) };
    }),
  ];

  const costoMensualARS = MESES.map((_, mesIndex) => porEmpleado.reduce((sum, e) => sum + e.meses[mesIndex].totalCostoARS, 0));
  const costoMensualUSD = MESES.map((_, mesIndex) => porEmpleado.reduce((sum, e) => sum + e.meses[mesIndex].totalCostoUSD, 0));
  const headcountMensual = MESES.map((_, mesIndex) => porEmpleado.reduce((sum, e) => sum + e.meses[mesIndex].hc, 0));

  const totalAnualARS = costoMensualARS.reduce((a, b) => a + b, 0);
  const totalAnualUSD = costoMensualUSD.reduce((a, b) => a + b, 0);
  const headcountPromedio = headcountMensual.reduce((a, b) => a + b, 0) / 12;

  const porCeco = groupBy(porEmpleado, (e) => e.empleado.centroCosto, totalAnualARS);
  const porSeniority = groupBy(porEmpleado, (e) => e.empleado.seniority, totalAnualARS);

  return {
    series, porEmpleado, consolidadoPorConcepto,
    costoMensualARS, costoMensualUSD, headcountMensual,
    totalAnualARS, totalAnualUSD, headcountPromedio,
    costoPromedioMensualPorEmpleado: headcountPromedio ? totalAnualARS / 12 / headcountPromedio : 0,
    porCeco, porSeniority,
  };
}

function groupBy(porEmpleado, keyFn, totalAnualARS) {
  const map = new Map();
  for (const e of porEmpleado) {
    const key = keyFn(e);
    const costoARS = e.meses.reduce((s, m) => s + m.totalCostoARS, 0);
    const costoUSD = e.meses.reduce((s, m) => s + m.totalCostoUSD, 0);
    const hcProm = e.meses.reduce((s, m) => s + m.hc, 0) / 12;
    const prev = map.get(key) || { key, costoARS: 0, costoUSD: 0, hcProm: 0 };
    prev.costoARS += costoARS;
    prev.costoUSD += costoUSD;
    prev.hcProm += hcProm;
    map.set(key, prev);
  }
  return [...map.values()]
    .map((row) => ({ ...row, pct: totalAnualARS ? row.costoARS / totalAnualARS : 0 }))
    .sort((a, b) => b.costoARS - a.costoARS);
}

export const fmtARS = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
export const fmtUSD = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
export const fmtPct = (n) => new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 }).format(n || 0);
export const fmtNum = (n) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n || 0);
