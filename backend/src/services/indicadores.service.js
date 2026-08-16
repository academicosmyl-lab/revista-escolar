/**
 * indicadores.service.js
 * Lee los Excel de datos-indicadores/ al iniciar y expone métodos de consulta.
 * Cachea todo en memoria para respuestas rápidas.
 */

const path = require('path');
const fs   = require('fs');
const XLSX = require('xlsx');

// ── Ruta de los archivos ─────────────────────────────────────────────────────
const DATOS_DIR = path.join(__dirname, '../../datos-indicadores');

// ── Cache global ─────────────────────────────────────────────────────────────
/** @type {Array<EstudianteRow>} */
let CACHE = [];
let CACHE_LISTO = false;

// ── Grupos sensibles (INPEC / discapacidad) ───────────────────────────────────
function esGrupoSensible(nombreHoja) {
  const n = (nombreHoja || '').toUpperCase();
  return n.includes('INPEC') || n.includes('DISCAPACIDAD') || n.includes('DISC.');
}

// ── Parser del nombre de archivo ──────────────────────────────────────────────
// Formato nuevo: carpeta=año, archivo="SEDE_JORNADA (N).xlsx" o "SEDE_JORNADA.xlsx"
function parsearNombreArchivo(nombreArchivo, anio) {
  // Quitar extensión y sufijo numérico tipo " (18)"
  const base = nombreArchivo
    .replace(/\.xlsx$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();

  // Separar en sede y jornada por el primer "_"
  const idx = base.indexOf('_');
  const sedeParte    = (idx === -1 ? base         : base.slice(0, idx)).trim().toUpperCase();
  const jornadaParte = (idx === -1 ? 'DESCONOCIDA': base.slice(idx + 1)).trim().toUpperCase();

  // Normalizar sede
  let sede = 'Desconocida';
  if (sedeParte.includes('GENERAL'))                                  sede = 'General Santander';
  else if (sedeParte.includes('SAUCES'))                              sede = 'Los Sauces';
  else if (sedeParte.includes('TÉCNICO') || sedeParte.includes('TECNICO')) sede = 'Técnico Industrial';

  // Normalizar jornada
  let jornada = 'Desconocida';
  if      (jornadaParte.includes('FIN DE SEMANA') || jornadaParte.includes('FIN-DE-SEMANA')) jornada = 'Fin de Semana';
  else if (jornadaParte.includes('NOCTURNA'))  jornada = 'Nocturna';
  else if (jornadaParte.includes('MAÑANA') || jornadaParte.includes('MANANA')) jornada = 'Mañana';
  else if (jornadaParte.includes('TARDE'))     jornada = 'Tarde';
  else if (jornadaParte.includes('UNICA') || jornadaParte.includes('ÚNICA'))   jornada = 'Única';

  return { anio, sede, jornada };
}

// ── Parser del nombre de hoja → grado y grupo ────────────────────────────────
// Ejemplos: "PRIMERO 1", "DÉCIMO 2", "CICLO IV 1 Inpec", "UNDÉCIMO 1"
function parsearHoja(nombreHoja) {
  const n = (nombreHoja || '').trim();
  // Separar último token (posiblemente número de grupo)
  const partes = n.split(/\s+/);
  const ultimo = partes[partes.length - 1];
  const esSensible = esGrupoSensible(n);

  // Si empieza con CICLO → ciclos (adultos)
  if (n.toUpperCase().startsWith('CICLO')) {
    // "CICLO IV 1 Inpec" → grado="Ciclo IV", grupo="1"
    const matchCiclo = n.match(/CICLO\s+([IVXLC]+)\s+(\d+)/i);
    if (matchCiclo) {
      return {
        grado:    `Ciclo ${matchCiclo[1].toUpperCase()}`,
        grupo:    matchCiclo[2],
        sensible: esSensible,
        hoja:     n,
      };
    }
  }

  // Formato normal: "PRIMERO 1", "SÉPTIMO 3"
  if (partes.length >= 2 && /^\d+$/.test(ultimo)) {
    const grado = partes.slice(0, -1).join(' ');
    return {
      grado:    grado.charAt(0).toUpperCase() + grado.slice(1).toLowerCase(),
      grupo:    ultimo,
      sensible: esSensible,
      hoja:     n,
    };
  }

  // Fallback: todo el nombre como grado, grupo "1"
  return {
    grado:    n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(),
    grupo:    '1',
    sensible: esSensible,
    hoja:     n,
  };
}

// ── Parsear áreas desde fila de encabezados ──────────────────────────────────
// Las áreas están en columnas: 3, 8, 13, 18, 23… (cada 5 columnas)
// El nombre puede incluir " (100 %)" u otros sufijos — los limpiamos.
const NOMBRES_NO_AREA = new Set([
  'AC','ACUM','ACUM FINAL','PROM','PROMEDIO',
  'MATPERD','MAT PERD','MATPERD 3P',
  'PUESTO','PUESTO FINAL','N','ESTUDIANTE','DISCAPACIDAD',
]);

function esNombreDeArea(nombre) {
  if (!nombre || typeof nombre !== 'string') return false;
  const n = nombre.trim().toUpperCase();
  // Excluir encabezados de período: P1, P2, P3, P4, P5, P6, P7
  if (/^P\d/.test(n)) return false;
  // Excluir nombres de resumen
  if (NOMBRES_NO_AREA.has(n)) return false;
  // Excluir "PROM X" donde X es un número
  if (/^PROM\s*\d*$/.test(n)) return false;
  // Excluir "PERDIDA PROM"
  if (n.includes('PERDIDA')) return false;
  return n.length >= 3;
}

function parsearAreas(filaAreas, filaHeaders) {
  const areas = [];
  if (!Array.isArray(filaAreas)) return areas;

  // Detectar formato por la fila de encabezados:
  // Multi-período (5 cols/área): encabezados tienen P2, P3 → áreas cada 5 cols desde col 3
  // Período único (1 col/área):  solo P1 → áreas consecutivas desde col 2
  const headers = Array.isArray(filaHeaders) ? filaHeaders : [];
  const esMultiPeriodo = headers.some(h =>
    typeof h === 'string' && /\bP[23]\b|\bP[23]\s*[-–]/i.test(h.trim())
  );

  const limpiar = s => s.trim()
    .replace(/\s*\(\s*\d*\s*%\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  if (esMultiPeriodo) {
    // Áreas cada 5 columnas a partir de col 3
    for (let col = 3; col < filaAreas.length; col += 5) {
      const nombre = filaAreas[col];
      if (nombre && typeof nombre === 'string' && nombre.trim()) {
        const n = limpiar(nombre);
        if (n.includes('MATPERD') || n === 'ACUM FINAL' || n === 'PUESTO FINAL') break;
        if (esNombreDeArea(n)) areas.push({ nombre: n, colInicio: col, singlePeriod: false });
      }
    }
  } else {
    // Áreas consecutivas a partir de col 2 (formato período único)
    for (let col = 2; col < filaAreas.length; col++) {
      const nombre = filaAreas[col];
      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) continue;
      const n = limpiar(nombre);
      if (n.includes('MATPERD') || n.includes('PUESTO') || n === 'ACUM FINAL') break;
      if (esNombreDeArea(n)) areas.push({ nombre: n, colInicio: col, singlePeriod: true });
    }
  }
  return areas;
}

// ── Parsear un estudiante de una fila ─────────────────────────────────────────
function parsearEstudiante(fila, areas, metadatos) {
  if (!Array.isArray(fila) || fila.length < 3) return null;

  const nombre = fila[1];
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) return null;
  // Ignorar filas de encabezado residuales
  if (nombre.trim().toUpperCase() === 'ESTUDIANTE') return null;

  const discapacidad = fila[2] ? String(fila[2]).trim() : null;

  const notas = {};
  const esSinglePeriod = areas.length > 0 && areas[0].singlePeriod;

  for (const area of areas) {
    const c = area.colInicio;
    if (area.singlePeriod) {
      // Período único: solo columna P1
      const p1 = typeof fila[c] === 'number' && fila[c] > 0 ? fila[c] : null;
      notas[area.nombre] = { p1, p2: null, p3: null, ac: p1 };
    } else {
      const p1 = typeof fila[c]   === 'number' && fila[c]   > 0 ? fila[c]   : null;
      const p2 = typeof fila[c+1] === 'number' && fila[c+1] > 0 ? fila[c+1] : null;
      const p3 = typeof fila[c+2] === 'number' && fila[c+2] > 0 ? fila[c+2] : null;
      const ac = typeof fila[c+3] === 'number' && fila[c+3] > 0 ? fila[c+3] : null;
      notas[area.nombre] = { p1, p2, p3, ac };
    }
  }

  let acumFinal = null;
  let puestoFinal = null;

  if (esSinglePeriod) {
    // Período único: acumFinal = promedio de notas P1 de todas las áreas
    const grades = Object.values(notas).map(n => n.p1).filter(v => v !== null);
    acumFinal = grades.length
      ? parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(3))
      : null;
    // Puesto: último entero positivo después de la última área
    const lastAreaCol = areas[areas.length - 1].colInicio;
    const afterAreas = fila.slice(lastAreaCol + 1).filter(v => typeof v === 'number' && Number.isInteger(v) && v > 0);
    puestoFinal = afterAreas.length > 0 ? afterAreas[afterAreas.length - 1] : null;
  } else {
    // Acumulado final multi-período: buscar desde el final el primer decimal en rango 0-5.5
    const tail = fila.slice(-6).filter(v => v !== null);
    const numericos = tail.filter(v => typeof v === 'number');
    if (numericos.length >= 2) {
      for (let k = numericos.length - 1; k >= 0; k--) {
        const v = numericos[k];
        if (v > 0 && v <= 5.5 && !Number.isInteger(v)) {
          acumFinal = parseFloat(v.toFixed(3));
          const siguiente = numericos[k + 1];
          if (siguiente && Number.isInteger(siguiente) && siguiente > 0) {
            puestoFinal = siguiente;
          }
          break;
        }
      }
      if (acumFinal === null) {
        for (let k = numericos.length - 1; k >= 0; k--) {
          if (numericos[k] > 0 && numericos[k] <= 5.5) {
            acumFinal = parseFloat(numericos[k].toFixed(3));
            break;
          }
        }
      }
    }
  }

  return {
    nombre:     nombre.trim(),
    discapacidad,
    notas,
    acumFinal,
    puestoFinal,
    ...metadatos,
  };
}

// ── Cargar todos los Excel ────────────────────────────────────────────────────
// Estructura: datos-indicadores/{año}/{SEDE_JORNADA.xlsx}
function cargarTodosLosExcel() {
  if (!fs.existsSync(DATOS_DIR)) {
    console.warn(`[indicadores] Directorio no encontrado: ${DATOS_DIR}`);
    CACHE_LISTO = true;
    return;
  }

  // Leer subcarpetas que sean años (4 dígitos)
  const carpetasAnio = fs.readdirSync(DATOS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map(e => e.name)
    .sort();

  if (carpetasAnio.length === 0) {
    console.warn('[indicadores] No se encontraron carpetas de años en datos-indicadores/');
    CACHE_LISTO = true;
    return;
  }

  console.log(`[indicadores] Años detectados: ${carpetasAnio.join(', ')}`);
  let totalEstudiantes = 0;
  let totalArchivos = 0;

  for (const anio of carpetasAnio) {
    const carpetaAnio = path.join(DATOS_DIR, anio);
    const archivos = fs.readdirSync(carpetaAnio)
      .filter(f => f.toLowerCase().endsWith('.xlsx'));

    console.log(`[indicadores] ${anio}: ${archivos.length} archivos`);

    for (const archivo of archivos) {
      try {
        const ruta = path.join(carpetaAnio, archivo);
        const wb   = XLSX.readFile(ruta, { cellDates: false });

        const { sede, jornada } = parsearNombreArchivo(archivo, anio);
        totalArchivos++;

        for (const nombreHoja of wb.SheetNames) {
          try {
            const ws    = wb.Sheets[nombreHoja];
            const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

            if (!filas || filas.length < 7) continue;

            const { grado, grupo, sensible } = parsearHoja(nombreHoja);

            let filaAreas = -1;
            let filaEstudiantes = -1;
            for (let r = 0; r < Math.min(filas.length, 10); r++) {
              const f = filas[r];
              if (!Array.isArray(f)) continue;
              if (
                f[3] && typeof f[3] === 'string' && f[3].trim().length > 2 &&
                !String(f[3]).trim().toUpperCase().startsWith('P1') &&
                !String(f[3]).trim().toUpperCase().startsWith('N')
              ) {
                filaAreas = r;
              }
              if (
                filaAreas !== -1 &&
                f[1] && typeof f[1] === 'string' &&
                (f[1].trim().toUpperCase() === 'ESTUDIANTE' || f[0] === 'N')
              ) {
                filaEstudiantes = r + 1;
                break;
              }
            }

            if (filaAreas === -1) continue;
            const areas = parsearAreas(filas[filaAreas], filas[filaAreas + 1]);
            if (areas.length === 0) continue;

            if (filaEstudiantes === -1) filaEstudiantes = filaAreas + 2;

            const metadatos = { anio, sede, jornada, grado, grupo, sensible, archivo, hoja: nombreHoja };

            for (let i = filaEstudiantes; i < filas.length; i++) {
              const est = parsearEstudiante(filas[i], areas, metadatos);
              if (est) {
                CACHE.push(est);
                totalEstudiantes++;
              }
            }
          } catch (errHoja) {
            console.warn(`[indicadores] Error en hoja "${nombreHoja}" de "${archivo}": ${errHoja.message}`);
          }
        }
      } catch (errArchivo) {
        console.warn(`[indicadores] Error leyendo "${archivo}": ${errArchivo.message}`);
      }
    }
  }

  CACHE_LISTO = true;
  console.log(`[indicadores] Cache lista: ${totalEstudiantes} estudiantes de ${totalArchivos} archivos (${carpetasAnio.length} años).`);
}

// Inicializar al cargar el módulo
cargarTodosLosExcel();

// ── Helpers de filtrado ───────────────────────────────────────────────────────
function aplicarFiltros(filtros = {}) {
  return CACHE.filter(e => {
    if (filtros.anio    && e.anio    !== filtros.anio)    return false;
    if (filtros.sede    && e.sede    !== filtros.sede)    return false;
    if (filtros.jornada && e.jornada !== filtros.jornada) return false;
    if (filtros.grado   && e.grado   !== filtros.grado)   return false;
    if (filtros.grupo   && e.grupo   !== filtros.grupo)   return false;
    return true;
  });
}

function promedioPeriodo(notas, area, periodo) {
  // periodo: 'p1'|'p2'|'p3'|'ac'|null (null = promedio de ac)
  const valores = [];
  for (const est of notas) {
    if (est.notas[area]) {
      const v = est.notas[area][periodo || 'ac'];
      if (typeof v === 'number') valores.push(v);
    }
  }
  if (valores.length === 0) return null;
  return parseFloat((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2));
}

function todasLasAreas(estudiantes) {
  const set = new Set();
  for (const e of estudiantes) Object.keys(e.notas).forEach(a => set.add(a));
  return Array.from(set).sort();
}

// ── API pública del servicio ──────────────────────────────────────────────────

function getAnios() {
  return [...new Set(CACHE.map(e => e.anio))].filter(Boolean).sort().reverse();
}

function getSedes() {
  return [...new Set(CACHE.map(e => e.sede))].filter(Boolean).sort();
}

function getJornadas(sede) {
  return [...new Set(
    CACHE.filter(e => !sede || e.sede === sede).map(e => e.jornada)
  )].filter(Boolean).sort();
}

function getGrados(sede, jornada) {
  return [...new Set(
    CACHE.filter(e =>
      (!sede    || e.sede    === sede) &&
      (!jornada || e.jornada === jornada)
    ).map(e => e.grado)
  )].filter(Boolean).sort();
}

function getGrupos(sede, jornada, grado) {
  return [...new Set(
    CACHE.filter(e =>
      (!sede    || e.sede    === sede)    &&
      (!jornada || e.jornada === jornada) &&
      (!grado   || e.grado   === grado)
    ).map(e => e.grupo)
  )].filter(Boolean).sort();
}

function getAreas(filtros = {}) {
  return todasLasAreas(aplicarFiltros(filtros));
}

function getResumen(filtros = {}) {
  const datos = aplicarFiltros(filtros);
  if (datos.length === 0) return { totalEstudiantes: 0, promedioGeneral: null, pctRiesgo: null, areaCritica: null };

  const areas = todasLasAreas(datos);

  // Promedio general (ac de cada estudiante)
  const promediosEst = datos
    .map(e => e.acumFinal)
    .filter(v => typeof v === 'number');

  const promedioGeneral = promediosEst.length
    ? parseFloat((promediosEst.reduce((a, b) => a + b, 0) / promediosEst.length).toFixed(2))
    : null;

  const enRiesgo = promediosEst.filter(v => v < 3.0).length;
  const pctRiesgo = promediosEst.length
    ? parseFloat(((enRiesgo / promediosEst.length) * 100).toFixed(1))
    : null;

  // Área más crítica (menor promedio ac)
  let areaCritica = null;
  let menorPromedio = Infinity;
  for (const area of areas) {
    const prom = promedioPeriodo(datos, area, 'ac');
    if (prom !== null && prom < menorPromedio) {
      menorPromedio = prom;
      areaCritica   = area;
    }
  }

  return {
    totalEstudiantes: datos.length,
    promedioGeneral,
    pctRiesgo,
    areaCritica,
    promedioAreaCritica: areaCritica ? menorPromedio : null,
  };
}

function getPromediosPorArea(filtros = {}) {
  const datos = aplicarFiltros(filtros);
  const areas = todasLasAreas(datos);
  const periodo = filtros.periodo || 'ac';

  return areas.map(area => ({
    area,
    promedio: promedioPeriodo(datos, area, periodo),
  })).filter(x => x.promedio !== null);
}

function getEvolucionPeriodos(filtros = {}) {
  const datos = aplicarFiltros(filtros);
  const areas = filtros.area
    ? [filtros.area.toUpperCase()]
    : todasLasAreas(datos);

  return areas.map(area => ({
    area,
    p1: promedioPeriodo(datos, area, 'p1'),
    p2: promedioPeriodo(datos, area, 'p2'),
    p3: promedioPeriodo(datos, area, 'p3'),
    ac: promedioPeriodo(datos, area, 'ac'),
  })).filter(x => x.p1 !== null || x.p2 !== null || x.p3 !== null);
}

function getComparacion(filtros = {}) {
  // filtros.tipo: 'grado'|'area'|'grupo'
  // filtros.a y filtros.b: valores a comparar
  const { tipo = 'grado', a, b } = filtros;

  const buildFiltroBase = () => ({
    sede:    filtros.sede,
    jornada: filtros.jornada,
  });

  if (tipo === 'grado') {
    const datosA = aplicarFiltros({ ...buildFiltroBase(), grado: a });
    const datosB = aplicarFiltros({ ...buildFiltroBase(), grado: b });
    const areas  = [...new Set([...todasLasAreas(datosA), ...todasLasAreas(datosB)])].sort();
    return {
      etiquetaA: a || 'Grupo A',
      etiquetaB: b || 'Grupo B',
      areas,
      promediosA: areas.map(ar => promedioPeriodo(datosA, ar, 'ac')),
      promediosB: areas.map(ar => promedioPeriodo(datosB, ar, 'ac')),
    };
  }

  if (tipo === 'grupo') {
    const datosA = aplicarFiltros({ ...buildFiltroBase(), grado: filtros.grado, grupo: a });
    const datosB = aplicarFiltros({ ...buildFiltroBase(), grado: filtros.grado, grupo: b });
    const areas  = [...new Set([...todasLasAreas(datosA), ...todasLasAreas(datosB)])].sort();
    return {
      etiquetaA: `Grupo ${a}`,
      etiquetaB: `Grupo ${b}`,
      areas,
      promediosA: areas.map(ar => promedioPeriodo(datosA, ar, 'ac')),
      promediosB: areas.map(ar => promedioPeriodo(datosB, ar, 'ac')),
    };
  }

  if (tipo === 'area') {
    const datos = aplicarFiltros(buildFiltroBase());
    const aUp   = (a || '').toUpperCase();
    const bUp   = (b || '').toUpperCase();
    return {
      etiquetaA: aUp || 'Área A',
      etiquetaB: bUp || 'Área B',
      periodos:  ['P1', 'P2', 'P3'],
      promediosA: [
        promedioPeriodo(datos, aUp, 'p1'),
        promedioPeriodo(datos, aUp, 'p2'),
        promedioPeriodo(datos, aUp, 'p3'),
      ],
      promediosB: [
        promedioPeriodo(datos, bUp, 'p1'),
        promedioPeriodo(datos, bUp, 'p2'),
        promedioPeriodo(datos, bUp, 'p3'),
      ],
    };
  }

  return null;
}

function getEstudiante(nombre, filtros = {}) {
  if (!nombre) return null;
  const nombreBuscar = nombre.trim().toUpperCase();
  const candidatos   = aplicarFiltros(filtros).filter(
    e => e.nombre.toUpperCase() === nombreBuscar
  );
  if (candidatos.length === 0) return null;

  // Si hay varios (por ejemplo mismo nombre en varios grados), tomar el primero
  const est = candidatos[0];
  // Construir perfil con evolución por área
  const perfil = {
    nombre:    est.nombre,
    sede:      est.sede,
    jornada:   est.jornada,
    grado:     est.grado,
    grupo:     est.grupo,
    acumFinal: est.acumFinal,
    puesto:    est.puestoFinal,
    notas:     est.notas,
    // Radar: nota ac por área
    radar: Object.entries(est.notas).map(([area, vals]) => ({
      area,
      p1: vals.p1,
      p2: vals.p2,
      p3: vals.p3,
      ac: vals.ac,
    })),
  };
  return perfil;
}

function getBuscadorEstudiantes(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toUpperCase();
  const resultados = [];
  const vistos     = new Set();

  for (const e of CACHE) {
    if (e.nombre.toUpperCase().includes(q)) {
      const clave = `${e.nombre}|${e.sede}|${e.jornada}|${e.grado}|${e.grupo}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        resultados.push({
          nombre:  e.nombre,
          sede:    e.sede,
          jornada: e.jornada,
          grado:   e.grado,
          grupo:   e.grupo,
        });
        if (resultados.length >= 10) break;
      }
    }
  }
  return resultados;
}

function getHeatmap(filtros = {}) {
  const datos  = aplicarFiltros(filtros);
  const areas  = todasLasAreas(datos);
  const grados = [...new Set(datos.map(e => e.grado))].sort();

  const matriz = grados.map(grado => {
    const datosGrado = datos.filter(e => e.grado === grado);
    return {
      grado,
      valores: areas.map(area => promedioPeriodo(datosGrado, area, 'ac')),
    };
  });

  return { areas, grados, matriz };
}

function getRanking(filtros = {}) {
  const datos = aplicarFiltros(filtros).filter(e => !e.sensible); // excluir INPEC/discapacidad

  const conAcum = datos
    .filter(e => typeof e.acumFinal === 'number')
    .sort((a, b) => b.acumFinal - a.acumFinal);

  const top10 = conAcum.slice(0, 10).map(e => ({
    nombre:  e.nombre,
    sede:    e.sede,
    grado:   e.grado,
    grupo:   e.grupo,
    acum:    e.acumFinal,
  }));

  const bottom10 = conAcum.slice(-10).reverse().map(e => ({
    nombre: e.nombre,
    sede:   e.sede,
    grado:  e.grado,
    grupo:  e.grupo,
    acum:   e.acumFinal,
  }));

  return { top10, bottom10 };
}

function estaListo() {
  return CACHE_LISTO;
}

module.exports = {
  getAnios,
  getSedes,
  getJornadas,
  getGrados,
  getGrupos,
  getAreas,
  getResumen,
  getPromediosPorArea,
  getEvolucionPeriodos,
  getComparacion,
  getEstudiante,
  getBuscadorEstudiantes,
  getHeatmap,
  getRanking,
  estaListo,
};
