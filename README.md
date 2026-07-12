# Nomia — Presupuesto de Payroll

App para armar y presupuestar el costo anual de nómina de una PyME (sueldos, cargas sociales, SAC, vacaciones, bonos, beneficios e indemnización), con parámetros de costeo 100% configurables y un copiloto de IA para ajustarlos en lenguaje natural.

Construida para Delenio People, a partir del modelo de Excel `Presupuesto_Payroll_2026_Delenio_v2`.

## Qué hace

- **Dashboard**: costo anual en ARS/USD, headcount promedio, costo por mes, por centro de costo y por seniority.
- **Dotación**: alta, edición y baja de empleados (seniority, centro de costo, sueldo, variable, meses activos).
- **Parámetros**: contribuciones patronales, beneficios, plus vacacional, indemnización, bonos por seniority y supuestos macro (IPC, ajuste salarial, tipos de cambio) — todos editables a mano o **por chat en lenguaje natural** (el copiloto propone el cambio y vos lo confirmás antes de aplicarlo).
- **Escenarios**: guardá versiones del presupuesto y compará el impacto de cada supuesto contra el presupuesto actual.
- **Reportes**: consolidado anual por concepto, exportable a CSV, y un chat para hacerle preguntas libres al presupuesto ya calculado.

El motor de cálculo (`src/lib/payrollEngine.js`) replica las fórmulas mes a mes del Excel original.

## Stack

React 18 + Vite + react-router-dom (cada pantalla tiene su propia URL: `/dashboard`, `/empleados`, `/empleados/:id`, `/parametros`, `/escenarios`, `/escenarios/:id`, `/reportes`) + recharts para gráficos. Las funciones de IA (copiloto de configuración, resumen ejecutivo, chat del presupuesto) llaman a la Anthropic API a través de un proxy serverless (`api/agent.js`), igual que en Delenio ATS.

No hay backend/DB en esta versión: los datos de dotación y parámetros viven en memoria (se resetean al recargar la página). Pensado para pasar a Supabase más adelante si se necesita persistencia real y multi-usuario.

## Correr en local

### Prerrequisitos
- Node.js 18 o superior
- Una API key de Anthropic → https://console.anthropic.com/api-keys

### Pasos

```bash
cd nomia
npm install
cp .env.example .env
# completá ANTHROPIC_API_KEY en .env
npm run dev
```

Abrí http://localhost:5173.

> **Nota:** con `npm run dev` la app funciona completa, pero el copiloto IA, el resumen ejecutivo y el chat del presupuesto necesitan que la función serverless `/api/agent` esté corriendo. Para eso, usá Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

Vercel CLI levanta el frontend y las funciones serverless en un solo comando. Te va a pedir la variable `ANTHROPIC_API_KEY` (o corré `vercel env add ANTHROPIC_API_KEY`).

## Deploy en Vercel

1. Subí el repo a GitHub.
2. Entrá a https://vercel.com, creá una cuenta e importá el repositorio.
3. En **Settings → Environment Variables**, agregá `ANTHROPIC_API_KEY` (marcá Production, Preview y Development).
4. Redeployá desde la pestaña **Deployments**.

Vercel te da una URL pública tipo `https://nomia-xxx.vercel.app`, lista para compartir con el equipo o mostrarle a un cliente.

## Qué es real y qué es simulado en este prototipo

- **Real**: el motor de cálculo completo, el CRUD de dotación, parámetros y escenarios, la exportación a CSV, y las tres funciones de IA (corren contra la Anthropic API real vía `/api/agent`, no están mockeadas).
- **Simulado / pendiente para producción**: no hay autenticación ni multi-tenant (un solo presupuesto en memoria por sesión), no hay persistencia entre recargas (agregar Supabase para eso), y los supuestos macro (IPC, tipos de cambio) se cargan a mano — en producción podrían traerse de una fuente de datos económicos real.
