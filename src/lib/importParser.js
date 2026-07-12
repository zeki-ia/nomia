// Parser de importación masiva de dotación — acepta CSV o XLSX, incluyendo
// una exportación directa de la hoja "04_BBDD" del Excel original de Delenio.
import * as XLSX from 'xlsx';
import { SENIORITIES, CECOS, MESES } from '../data/seed.js';

function normalizeHeader(h) {
  return String(h || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/[^a-z0-9%\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const FIELD_ALIASES = {
  nombre: ['nombre y apellido', 'nombre', 'empleado'],
  cargo: ['cargo', 'puesto'],
  seniority: ['seniority', 'nivel'],
  centroCosto: ['centro de costo', 'ceco', 'centro de costos'],
  fechaIngreso: ['fecha ingreso', 'fecha de ingreso'],
  sueldoBase: ['sueldo base ars ene', 'sueldo base', 'sueldo base ene', 'sueldo base ars'],
  comisionPct: ['comision %', 'comision'],
  bonoCustomerPct: ['bono customer %', 'bono customer'],
  horasExtraN: ['horas extras n', 'horas extra n', 'horas extras', 'horas extra'],
};

const MES_ALIASES = MESES.map((m) => normalizeHeader(m));

function buildHeaderMap(headers) {
  const map = {}; // normalizedHeader -> field
  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(norm)) map[h] = { field };
    }
    const mesIdx = MES_ALIASES.indexOf(norm);
    if (mesIdx !== -1) map[h] = { field: 'mes', mesIndex: mesIdx };
  });
  return map;
}

function toDateString(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

function toBool01(value) {
  if (value === undefined || value === '') return null;
  const s = String(value).trim().toLowerCase();
  return ['1', 'si', 'sí', 'true', 'x', 'activo'].includes(s) ? 1 : ['0', 'no', 'false', 'inactivo'].includes(s) ? 0 : null;
}

function matchCeco(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const byCode = CECOS.find((c) => c.code.toLowerCase() === s.toLowerCase());
  if (byCode) return byCode.code;
  const byLabel = CECOS.find((c) => c.label.toLowerCase() === s.toLowerCase());
  if (byLabel) return byLabel.code;
  return s.toUpperCase();
}

function matchSeniority(value) {
  const s = String(value || '').trim();
  return SENIORITIES.find((sn) => sn.toLowerCase() === s.toLowerCase()) || '';
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === '') return fallback;
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function toPct(value) {
  if (value === undefined || value === '') return 0;
  const n = Number(String(value).replace('%', '').replace(',', '.'));
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n; // acepta "8" (=8%) o "0.08"
}

function pickSheet(workbook) {
  const bbddName = workbook.SheetNames.find((n) => normalizeHeader(n).includes('bbdd'));
  return workbook.Sheets[bbddName || workbook.SheetNames[0]];
}

const isCsv = (file) => file.type === 'text/csv' || /\.csv$/i.test(file.name);

export async function parseEmpleadosFile(file) {
  // Los .csv se leen como texto (UTF-8 ya decodificado por el browser); si se leyeran
  // como ArrayBuffer, XLSX no siempre detecta la codificación y rompe los acentos.
  const workbook = isCsv(file)
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheet = pickSheet(workbook);
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

  if (json.length === 0) return { rows: [], errors: ['El archivo no tiene filas de datos.'] };

  const headerMap = buildHeaderMap(Object.keys(json[0]));

  const rows = json.map((raw, i) => {
    const parsed = { mesesActivo: Array(12).fill(null) };
    for (const [header, value] of Object.entries(raw)) {
      const mapping = headerMap[header];
      if (!mapping) continue;
      if (mapping.field === 'mes') parsed.mesesActivo[mapping.mesIndex] = toBool01(value);
      else parsed[mapping.field] = value;
    }

    const nombre = String(parsed.nombre || '').trim();
    const seniority = matchSeniority(parsed.seniority);
    const sueldoBase = toNumber(parsed.sueldoBase, 0);
    const errors = [];
    if (!nombre) errors.push('Falta el nombre');
    if (!seniority) errors.push(`Seniority inválido ("${parsed.seniority || ''}"). Debe ser uno de: ${SENIORITIES.join(', ')}`);
    if (!sueldoBase) errors.push('Falta o es inválido el sueldo base');

    const mesesActivo = parsed.mesesActivo.map((v) => (v === null ? 1 : v));

    return {
      rowNumber: i + 2, // +1 header +1 base-1
      ok: errors.length === 0,
      errors,
      data: {
        nombre,
        cargo: String(parsed.cargo || '').trim(),
        seniority: seniority || 'Standard',
        centroCosto: matchCeco(parsed.centroCosto) || CECOS[0].code,
        fechaIngreso: toDateString(parsed.fechaIngreso) || '2026-01-01',
        sueldoBase,
        comisionPct: toPct(parsed.comisionPct),
        bonoCustomerPct: toPct(parsed.bonoCustomerPct),
        horasExtraN: toNumber(parsed.horasExtraN, 0),
        mesesActivo,
      },
    };
  });

  return { rows, errors: [] };
}

export const PLANTILLA_HEADERS = [
  'Nombre y Apellido', 'Cargo', 'Seniority', 'Centro de Costo', 'Fecha Ingreso',
  'Sueldo Base ARS (Ene)', 'Comisión %', 'Bono Customer %', 'Horas Extras (N°)',
  ...MESES,
];

export function descargarPlantillaCSV() {
  const ejemplo = ['Ana Pérez', 'Analista', 'Standard', 'DEV', '2024-03-01', '1300000', '0', '0', '0', ...Array(12).fill(1)];
  const csv = [PLANTILLA_HEADERS, ejemplo].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'nomia-plantilla-importar-dotacion.csv';
  a.click();
  URL.revokeObjectURL(url);
}
