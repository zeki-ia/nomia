// Paleta e identidad — tomadas de la marca real de Delenio People (deleniopeople.talenio.tech)
export const COLORS = {
  primary:      '#2B3FE0',
  primaryDeep:  '#002EE5',
  primarySoft:  '#EEF0FF',
  navy:         '#10141F',
  green:        '#22B24C',
  greenSoft:    '#E7FBF3',
  greenDeep:    '#1B4A2E',
  teal:         '#65E3C3',
  mint:         '#8CFFB0',
  bg:           '#F8F9FE',
  surface:      '#FFFFFF',
  surfaceMuted: '#E7E9EF',
  border:       '#E7E9EF',
  borderStrong: '#DFE2E9',
  text:         '#10141F',
  muted:        '#7B8299',
  mutedSoft:    '#9AA1B5',
  warning:      '#B7791F',
  warningSoft:  '#FFF7E6',
  danger:       '#D64545',
  dangerSoft:   '#FDECEC',
};

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const SENIORITIES = ['Junior', 'Standard', 'Semi Senior', 'Senior', 'Team Lead', 'Head', 'Manager', 'Director', 'CEO'];

export const CECOS = [
  { code: 'PROD', label: 'Producto' },
  { code: 'DEV', label: 'Desarrollo' },
  { code: 'INFR', label: 'Infraestructura' },
  { code: 'CTR', label: 'Customer' },
  { code: 'SALES', label: 'Ventas' },
  { code: 'HR-A', label: 'RRHH' },
  { code: 'COR-A', label: 'Administración' },
  { code: 'BILL', label: 'Facturación' },
];

export const DEFAULT_BONOS = {
  'Junior': 0,
  'Standard': 0,
  'Semi Senior': 0,
  'Senior': 0,
  'Team Lead': 1,
  'Head': 2,
  'Manager': 3,
  'Director': 4,
  'CEO': 6,
};

export const PARAM_UNIDADES = [
  { code: 'pct', label: '%' },
  { code: 'ars', label: 'ARS/mes' },
  { code: 'usd', label: 'USD/mes' },
];

// Catálogo completo de parámetros estructurales que el motor de cálculo sabe interpretar
// (cada uno alimenta una fórmula puntual: aguinaldo, vacaciones, cargas sociales, etc.).
// `parametros` en el estado de la app es un SUBSET de este catálogo — se pueden eliminar
// filas (el motor las trata como 0/no aplica) y volver a agregarlas desde "Restaurar".
export const PARAMETRO_CATALOGO = [
  { key: 'contribucionesPatronalesPct', label: 'Contribuciones patronales (%)', unidad: 'pct', valor: 0.249 },
  { key: 'alimentacion', label: 'Asignación Alimentación (ARS)', unidad: 'ars', valor: 350000 },
  { key: 'conectividad', label: 'Asignación Conectividad (ARS)', unidad: 'ars', valor: 60000 },
  { key: 'seguroSalud', label: 'Seguro de Salud (ARS)', unidad: 'ars', valor: 230000 },
  { key: 'plusVacacionalPct', label: 'Plus vacacional (%)', unidad: 'pct', valor: 0.2 },
  { key: 'ajustePerformancePct', label: 'Ajuste performance (%)', unidad: 'pct', valor: 0 },
  { key: 'provisionIndemnizacionPct', label: 'Provisión indemnización (%)', unidad: 'pct', valor: 0.03 },
  { key: 'topeHorasExtra', label: 'Tope horas extra', unidad: 'pct', valor: 0 },
  { key: 'seguroManagerUSD', label: 'Seguro Manager & Up (USD)', unidad: 'usd', valor: 250 },
];

export const DEFAULT_PARAMETROS = PARAMETRO_CATALOGO.map((p) => ({ ...p }));

export const CONCEPTO_TIPOS = [
  { code: 'pctSueldo', label: '% del sueldo bruto mensual' },
  { code: 'montoFijo', label: 'Monto fijo mensual (ARS)' },
];

export const CONCEPTO_ALCANCES = [
  { code: 'todos', label: 'Todos los empleados' },
  { code: 'ceco', label: 'Centro de costo específico' },
  { code: 'seniority', label: 'Seniority específico' },
];

// Variables de costo customizables por la PyME (aportes sindicales, beneficios extra, etc.)
// además de los parámetros fijos del modelo. El usuario las crea, edita y elimina desde
// Parámetros → Conceptos.
export const DEFAULT_CONCEPTOS_CUSTOM = [
  {
    id: 1,
    nombre: 'Aporte sindical Ventas',
    tipo: 'pctSueldo',
    valor: 0.02,
    alcance: { tipo: 'ceco', valor: 'SALES' },
    activo: false,
  },
];

// IPC, ajuste salarial y devaluación son arrays de 12 posiciones (una por mes) porque la
// inflación/devaluación no es uniforme mes a mes. La posición 0 (Ene) no se usa como "tasa"
// (Ene es el mes base de la serie) — arranca a aplicarse desde la posición 1 (Ene→Feb).
export const DEFAULT_MACRO = {
  ipcMensualPct: Array(12).fill(0.025),
  ajusteSalarialPct: Array(12).fill(0.025),
  tcActivo: 'ccl',
  tiposCambio: {
    oficial: { label: 'Oficial', inicial: 1300, devaluacionPct: Array(12).fill(0.02) },
    blue:    { label: 'Blue',    inicial: 1360, devaluacionPct: Array(12).fill(0.02) },
    mep:     { label: 'MEP',     inicial: 1330, devaluacionPct: Array(12).fill(0.02) },
    ccl:     { label: 'CCL',     inicial: 1345, devaluacionPct: Array(12).fill(0.02) },
  },
};

function emp(id, nombre, cargo, seniority, cargoCeco, sueldoBase, opts = {}) {
  return {
    id,
    codigo: `C-${String(id).padStart(3, '0')}`,
    nombre,
    cargo,
    seniority,
    centroCosto: cargoCeco,
    fechaIngreso: opts.fechaIngreso || '2022-03-01',
    sueldoBase,
    comisionPct: opts.comisionPct || 0,
    bonoCustomerPct: opts.bonoCustomerPct || 0,
    horasExtraN: opts.horasExtraN || 0,
    mesesActivo: opts.mesesActivo || Array(12).fill(1),
  };
}

export const SEED_EMPLEADOS = [
  emp(1, 'Lucía Fernández', 'CEO', 'CEO', 'COR-A', 9500000, { fechaIngreso: '2016-11-14' }),
  emp(2, 'Martín Ibarra', 'Director de Producto', 'Director', 'PROD', 7500000, { fechaIngreso: '2016-12-15' }),
  emp(3, 'Sofía Gómez', 'Manager de RRHH', 'Manager', 'HR-A', 5200000, { fechaIngreso: '2021-07-05' }),
  emp(4, 'Nicolás Paz', 'Manager de Desarrollo', 'Manager', 'DEV', 5400000, { fechaIngreso: '2020-02-10' }),
  emp(5, 'Camila Rossi', 'Head de Customer', 'Head', 'CTR', 4600000, { fechaIngreso: '2019-01-20' }),
  emp(6, 'Tomás Acosta', 'Team Lead Desarrollo', 'Team Lead', 'DEV', 3400000, { fechaIngreso: '2019-09-20' }),
  emp(7, 'Valentina Suárez', 'Team Lead Customer', 'Team Lead', 'CTR', 3400000, { fechaIngreso: '2018-12-03' }),
  emp(8, 'Bruno Medina', 'Senior Backend', 'Senior', 'DEV', 2600000, { fechaIngreso: '2021-02-22' }),
  emp(9, 'Julieta Cano', 'Senior Infraestructura', 'Senior', 'INFR', 2700000, { fechaIngreso: '2020-05-14' }),
  emp(10, 'Franco Díaz', 'Semi Senior Producto', 'Semi Senior', 'PROD', 1800000, { fechaIngreso: '2016-11-14' }),
  emp(11, 'Agustina López', 'Semi Senior Desarrollo', 'Semi Senior', 'DEV', 1850000, { fechaIngreso: '2018-07-10' }),
  emp(12, 'Ramiro Torres', 'Ejecutivo de Ventas', 'Standard', 'SALES', 1300000, { comisionPct: 0.08, fechaIngreso: '2022-04-01' }),
  emp(13, 'Milagros Vera', 'Ejecutiva de Ventas', 'Standard', 'SALES', 1300000, { comisionPct: 0.08, fechaIngreso: '2023-01-16' }),
  emp(14, 'Iván Castro', 'Soporte al Cliente', 'Standard', 'CTR', 1300000, { bonoCustomerPct: 0.05, fechaIngreso: '2020-11-16' }),
  emp(15, 'Delfina Molina', 'Analista de Facturación', 'Standard', 'BILL', 1350000, { fechaIngreso: '2021-06-08' }),
  emp(16, 'Facundo Herrera', 'Analista de Administración', 'Standard', 'COR-A', 1300000, { fechaIngreso: '2022-09-01' }),
  emp(17, 'Camila Ortiz', 'Junior Desarrollo', 'Junior', 'DEV', 950000, {
    fechaIngreso: '2026-07-01',
    mesesActivo: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  }),
  emp(18, 'Santiago Rey', 'Soporte al Cliente', 'Junior', 'CTR', 950000, {
    bonoCustomerPct: 0.04,
    fechaIngreso: '2019-06-24',
    mesesActivo: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  }),
];
