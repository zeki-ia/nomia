// Cliente de IA — habla con el proxy serverless /api/agent (Anthropic API).
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
  "seguroManagerUSD": number (USD mensuales, solo Manager/Director/CEO),
  "bonos.<Seniority>": number (N° de sueldos de bono anual; Seniority ∈ Junior, Standard, Semi Senior, Senior, Team Lead, Head, Manager, Director, CEO)
}`;

// Interpreta un pedido en lenguaje natural y devuelve una propuesta de cambios estructurada,
// nunca aplica nada directamente — la UI la muestra como diff y el usuario confirma.
export async function proponerCambiosParametros(textoUsuario, parametrosActuales, bonosActuales) {
  const system = `Sos el copiloto de configuración de Nomia, una app de presupuesto de payroll para PyMEs argentinas.
El usuario va a describir en lenguaje natural un cambio de política de costos (ej: un reclamo sindical, un nuevo beneficio, un ajuste de bono).
Tu trabajo es traducir ese pedido a cambios concretos sobre estos parámetros (esquema): ${PARAM_SCHEMA}

Estado actual de parámetros: ${JSON.stringify(parametrosActuales)}
Estado actual de bonos por seniority: ${JSON.stringify(bonosActuales)}

Respondé SOLO con JSON (sin texto ni markdown alrededor), con esta forma exacta:
{"cambios": [{"path": "<clave del esquema>", "label": "<nombre humano del parámetro>", "valorActual": <valor actual>, "valorNuevo": <valor propuesto>, "justificacion": "<por qué, en una frase>"}], "resumen": "<resumen de 1-2 frases de la interpretación>"}
Si el pedido es ambiguo o no corresponde a ningún parámetro del esquema, devolvé "cambios": [] y explicá por qué en "resumen".
Los porcentajes siempre van como fracción (2% → 0.02), nunca como 2.`;

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
