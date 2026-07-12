import { useState } from 'react';
import { TopBar, Page, Card, Button, Badge, Spinner } from '../components/ui.jsx';
import { COLORS } from '../data/seed.js';
import { parseEmpleadosFile, descargarPlantillaCSV } from '../lib/importParser.js';
import { fmtARS } from '../lib/payrollEngine.js';

export default function ImportarEmpleados({ onImport, onBack }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(0);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true); setError(''); setRows(null); setDone(0);
    try {
      const res = await parseEmpleadosFile(file);
      if (res.errors.length) setError(res.errors.join(' '));
      setRows(res.rows);
    } catch (err) {
      setError('No se pudo leer el archivo. Verificá que sea un .csv o .xlsx válido.');
    }
    setLoading(false);
  };

  const validas = (rows || []).filter((r) => r.ok);
  const invalidas = (rows || []).filter((r) => !r.ok);

  const confirmarImportacion = () => {
    onImport(validas.map((r) => r.data));
    setDone(validas.length);
  };

  return (
    <>
      <TopBar
        title="Importar dotación"
        subtitle="Subí un CSV o Excel — funciona con la hoja 04_BBDD del modelo original"
        actions={<Button variant="secondary" onClick={onBack}>← Volver</Button>}
      />
      <Page>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>1. Elegí el archivo</h3>
              <div style={{ fontSize: 12.5, color: COLORS.muted }}>
                Columnas esperadas: Nombre, Cargo, Seniority, Centro de Costo, Fecha Ingreso, Sueldo Base, Comisión %, Bono Customer %, Horas Extras, y Ene…Dic (1/0).
              </div>
            </div>
            <Button variant="ghost" onClick={descargarPlantillaCSV}>⬇ Descargar plantilla</Button>
          </div>
          <div style={{ marginTop: 16 }}>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={onFile} />
          </div>
        </Card>

        {loading && <Spinner label={`Leyendo ${fileName}…`} />}
        {error && <Card style={{ background: COLORS.dangerSoft, border: 'none' }}><div style={{ color: COLORS.danger, fontSize: 13.5 }}>{error}</div></Card>}

        {rows && rows.length > 0 && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>2. Revisá y confirmá</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge tone="green">{validas.length} listas para importar</Badge>
                {invalidas.length > 0 && <Badge tone="danger">{invalidas.length} con errores</Badge>}
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={th}>Fila</th>
                    <th style={th}>Nombre</th>
                    <th style={th}>Cargo</th>
                    <th style={th}>Seniority</th>
                    <th style={th}>CeCo</th>
                    <th style={{ ...th, textAlign: 'right' }}>Sueldo Base</th>
                    <th style={th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNumber} style={{ background: r.ok ? 'transparent' : COLORS.dangerSoft }}>
                      <td style={td}>{r.rowNumber}</td>
                      <td style={td}>{r.data.nombre || '—'}</td>
                      <td style={td}>{r.data.cargo || '—'}</td>
                      <td style={td}>{r.data.seniority}</td>
                      <td style={td}>{r.data.centroCosto}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtARS(r.data.sueldoBase)}</td>
                      <td style={td}>
                        {r.ok ? <Badge tone="green">OK</Badge> : <Badge tone="danger">{r.errors.join('; ')}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 18 }}>
              {done > 0 ? (
                <Badge tone="green">✓ Se importaron {done} empleados</Badge>
              ) : (
                <Button onClick={confirmarImportacion} disabled={validas.length === 0}>
                  Importar {validas.length} empleado{validas.length === 1 ? '' : 's'}
                </Button>
              )}
            </div>
          </Card>
        )}
      </Page>
    </>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#7B8299', textTransform: 'uppercase', borderBottom: '1px solid #E7E9EF', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', borderBottom: '1px solid #E7E9EF', whiteSpace: 'nowrap' };
