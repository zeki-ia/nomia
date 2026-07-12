// Cliente de IA — habla con el proxy serverless /api/agent (Anthropic API).
import { CECOS, SENIORITIES } from '../data/seed.js';

const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(messages, system, maxTokens = 1200) {
  let res;
  try {
    res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
    });
  } catch {
    throw new Error('No se pudo contactar /api/agent. ¿Está corriendo "vercel dev" (o el servidor con la función serverless) y configurada ANTHROPIC_API_KEY?');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`El servidor de IA no respondió con datos válidos (status ${res.status}). Corré "vercel dev" para que /api/agent funcione en local.`);
  }

  if (!res.ok) throw new Error(data?.error?.message || data?.error || 'Error al contactar la IA');
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return text;
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

const PARAM_SCHEMA = `{
  "contribucionesPatronalesPct": number (0-1, ej 0.249 = 24.9%),
  "alimentacion": number (ARS mensuales por empleado activo),
  "conectividad": number (ARS mensuales por empleado activo),
  "seguroSalud": number (ARS mensuales por empleado activo),
  "plusVacacionalPct": number (0-1),
  "ajustePerformancePct": number (0-1),
  "provisionIndemnizacionPct": number (0-1),
  "topeHorasExtra": number,
  "seguroManagerUSD": number (USD mensuales, solo Manager/Director/CEO)
}`;

// Interpreta un pedido en lenguaje natural y devuelve una propuesta de cambios estructurada
// (nuevos costeos, o ajustes a parámetros/bonos existentes) — nunca aplica nada directamente,
// la UI la muestra como diff y el usuario confirma cada cambio.
export async function proponerCambiosParametros(textoUsuario, parametrosActuales, bonosActuales) {
  // parametrosActuales es una lista [{key, valor, ...}] — se manda como mapa key:valor simple para la IA.
  const parametrosMap = Object.fromEntries(parametrosActuales.map((p) => [p.key, p.valor]));
  const system = `Sos el copiloto de costeo de Nomia, una app de presupuesto de payroll para PyMEs argentinas.
El usuario describe en lenguaje natural un pedido de costeo. Puede ser: (a) un COSTEO NUEVO que no existe todavía
(aporte sindical, beneficio, seguro, premio — algo que se suma al presupuesto), o un ajuste a (b) un parámetro
estructural existente, o (c) el bono anual de un seniority. Elegí el tipo que corresponda para cada cambio que detectes.

(a) Costeo nuevo — "tipo":"nuevo_concepto":
{"tipo":"nuevo_concepto","label":"<nombre del costeo>","conceptoTipo":"pctSueldo"|"montoFijo","valorNuevo":<number>,"alcance":{"tipo":"todos"|"ceco"|"seniority","valor":<code o null>},"justificacion":"<por qué>"}
- "pctSueldo": valorNuevo es % del sueldo bruto mensual, como número (2 → 2%), NUNCA como fracción (nunca 0.02).
- "montoFijo": valorNuevo es un monto fijo en ARS por mes.
- alcance.valor: si alcance.tipo es "ceco", uno de estos códigos: ${CECOS.map((c) => `${c.code} (${c.label})`).join(', ')}. Si es "seniority", uno de: ${SENIORITIES.join(', ')}. Si es "todos", null.

(b) Ajuste a un parámetro estructural existente — "tipo":"parametro":
{"tipo":"parametro","path":"<clave del esquema>","label":"<nombre humano>","valorActual":<valor actual>,"valorNuevo":<valor propuesto>,"justificacion":"..."}
Esquema: ${PARAM_SCHEMA}. Los porcentajes acá SÍ van como fracción (2% → 0.02).
Si una clave no aparece en "Estado actual de parámetros" es porque el usuario la eliminó — no la ajustes; si el pedido
igual tiene sentido, proponela como "nuevo_concepto" en su lugar.

(c) Ajuste al bono anual de un seniority — "tipo":"bono":
{"tipo":"bono","path":"bonos.<Seniority>","label":"Bono <Seniority>","valorActual":{"tipo":"sueldos"|"pctAnual","valor":number},"valorNuevo":{"tipo":"sueldos"|"pctAnual","valor":number},"justificacion":"..."}
"sueldos" = cantidad de sueldos extra por año (valor=3 → 3 sueldos). "pctAnual" = % del salario anual, y ACÁ SÍ va
como fracción (20% → 0.2), igual que los parámetros estructurales. Seniority ∈ ${SENIORITIES.join(', ')}.

Estado actual de parámetros: ${JSON.stringify(parametrosMap)}
Estado actual de bonos por seniority: ${JSON.stringify(bonosActuales)}

Respondé SOLO con JSON (sin texto ni markdown alrededor), con esta forma exacta:
{"cambios": [ /* uno o más objetos de tipo (a), (b) o (c) */ ], "resumen": "<resumen de 1-2 frases de la interpretación>"}
Si el pedido es ambiguo o no corresponde a nada de esto, devolvé "cambios": [] y explicá por qué en "resumen".`;

  const text = await callClaude([{ role: 'user', content: textoUsuario }], system);
  return parseJson(text);
}

export async function generarResumenEjecutivo(resumenPresupuesto) {
  const system = `Sos un analista financiero de RRHH. Te paso un resumen numérico de un presupuesto anual de costo de nómina (en ARS y USD) de una PyME argentina.
Escribí un resumen ejecutivo de 3 a 5 oraciones, en español rioplatense, tono directo y profesional, para presentarle a la dirección de la empresa.
Mencioná el costo total, cómo se compara el primer mes vs el último (efecto inflación/ajuste/devaluación), y qué concepto o centro de costo pesa más. No uses markdown, solo texto plano.`;
  return callClaude([{ role: 'user', content: JSON.stringify(resumenPresupuesto) }], system, 500);
}

export async function preguntarSobrePresupuesto(pregunta, resumenPresupuesto, historial = []) {
  const system = `Sos el asistente de Nomia. Respondé preguntas sobre el presupuesto de payroll de la empresa usando ÚNICAMENTE estos datos ya calculados (en ARS y USD): ${JSON.stringify(resumenPresupuesto)}
Respondé en español rioplatense, corto y concreto (2-4 oraciones), citando números cuando corresponda. Si la pregunta no se puede responder con estos datos, decilo.`;
  const messages = [...historial, { role: 'user', content: pregunta }];
  return callClaude(messages, system, 600);
}
