'use strict';

// ÍNDICE DEL ARCHIVO (cada sección está marcada con una barra de "=====" más abajo):
//   1. PANTALLA DE CARGA CON LOGO Y ESPIRAL (reutilizable en todas las misiones y pantallas)
//   2. CONFIGURACIÓN
//   3. DATOS: AUDIO
//   4. DATOS: TANQUES
//   5. DATOS: PASIVAS DE COMANDANTE
//   6. DATOS: COMANDANTES (imagen = la del menú, voces, pasiva)
//   7. DATOS: LA MISIÓN (eliminar al tanque bandera)
//   8. GEOMETRÍA (utilidades)
//   9. CARGA DEL MAPA
//  10. COLISIONES
//  11. RUTAS (malla de navegación + A* + suavizado)
//  12. LÍNEA DE VISIÓN (LOS) — los polígonos opacos tapan la vista y los disparos
//  13. PINTADO DEL MAPA — plano militar con tintes suaves
//  14. CARGA DE RECURSOS
//  15. ESTADO GLOBAL
//  16. UNIDADES
//  17. ESTADÍSTICAS (vida · confianza · estrés · estabilidad · estado)
//  18. COMANDANTES / PASIVAS
//  19. RECONOCIMIENTO / NIEBLA DE GUERRA
//  20. MOVIMIENTO
//  21. COMBATE
//  22. EFECTOS VISUALES (destello de boca, impactos, humo, explosiones)
//  23. IA ENEMIGA
//  24. CÁMARA TÁCTICA
//  25. RENDER
//  26. INTERFAZ (panel de información, botones, avisos)
//  27. SELECCIÓN, BOTONES Y ATAJOS
//  28. ENTRADA (ratón, rueda, teclado)
//  29. VICTORIA / DERROTA
//  30. ANIMACIÓN DE ENTRADA · CARGA DE LA MISIÓN
//  31. GAME LOOP
//  32. MAPAS EMBEBIDOS — JSON exportados de tu editor
//

// =====================================================================
// PANTALLA DE CARGA CON LOGO Y ESPIRAL (reutilizable en todas las misiones y pantallas)
//   pvLoader.show()  → aparece el logo con la espiral · pvLoader.hide() → se va
//   pvLoader.fill(svg) → dibuja una espiral dentro de cualquier <svg class="pvl-spiral"> (p. ej. la tarjeta de la misión)
// =====================================================================
const pvLoader = {
  fill(svg) {
    let out = '';
    for (let a = 0; a < 3; a++) {                                  // tres brazos de espiral desfasados
      let d = '';
      for (let i = 0; i <= 120; i++) {
        const t = i / 120, ang = t * 2.3 * Math.PI * 2 + a * (Math.PI * 2 / 3), r = 56 + t * 42;
        d += (i ? 'L' : 'M') + (Math.cos(ang) * r).toFixed(1) + ' ' + (Math.sin(ang) * r).toFixed(1) + ' ';
      }
      out += '<path pathLength="100" d="' + d + '"/>';
    }
    svg.innerHTML = out;
  },
  init() { document.querySelectorAll('.pvl-spiral').forEach(s => this.fill(s)); },
  show() { const el = document.getElementById('pv-loader'); if (el) el.classList.add('on'); },
  hide() { const el = document.getElementById('pv-loader'); if (el) el.classList.remove('on'); }
};
/* =====================================================================
   ¡PANZER VOR!  —  KUROMORIMINE · MISIÓN 1                 kuromorimine-mision1.js
   ---------------------------------------------------------------------
   Misión independiente: no toca el menú ni el resto del proyecto.
   Canvas 2D, sin librerías. El mapa sale del JSON del editor (MAPA_KUROMORIMINE, al final).
   OBJETIVO: destruir al TANQUE BANDERA de Pravda. Pravda espera en emboscada (no ataca hasta que
   ves a alguno de sus tanques): 2 KV-2 flanquean la carretera y varios T-34 protegen la bandera.
   Tu equipo (Kuromorimine): 3 Panther + 3 Tiger y el comandante (Panther o Tiger según lo que
   elijas en el menú). Al empezar, los tanques entran conduciendo desde el borde derecho del mapa.

   SECCIONES (en este orden):
     CONFIGURACIÓN · DATOS (tanques, pasivas, comandantes, misión)
     GEOMETRÍA · CARGA DEL MAPA · COLISIONES · RUTAS · VISIÓN (LOS)
     PINTADO DEL MAPA · CARGA DE RECURSOS · UNIDADES · ESTADÍSTICAS
     COMANDANTES / PASIVAS · RECONOCIMIENTO · MOVIMIENTO · COMBATE
     PROYECTILES · EFECTOS · IA ENEMIGA · AUDIO · RENDER · CÁMARA
     INTERFAZ · ENTRADA · VICTORIA/DERROTA · ANIMACIÓN DE ENTRADA · GAME LOOP · MAPA EMBEBIDO
   ===================================================================== */


// =====================================================================
// CONFIGURACIÓN
// =====================================================================
const ROOT = '../';              // ruta hacia la carpeta raíz del proyecto (donde está assets/ e index.html)
const CONFIG = {
  // Esta página vive en  html/  →  el menú y los recursos están una carpeta más arriba (ROOT = '../')
  menuUrl: '../index.html',  // a dónde vuelven los botones "VOLVER AL MENÚ"
  nextUrl: null,             // misión siguiente tras la victoria (null = vuelve al menú)

  // Carpetas donde se buscan las imágenes de tanques (se prueba en orden).
  tankImageDirs: ['assets/imagenes/tanques/', 'assets/imagenes/tanques/img/'],

  mapScale: 1.5,             // resolución a la que se pre-pinta el mapa (1.5 = 2880×1620)
  unitRadius: 14,            // radio de colisión de un tanque (px del mapa)
  navCell: 8,                // tamaño de celda de la malla de rutas
  fogScale: 0.25,            // resolución de la niebla (1/4 del mapa)
  fogRays: 72,               // rayos por unidad para el campo de visión
  visionTick: 0.05,          // s entre recálculos de visión

  // ¿Qué bloquea el paso? (true = intransitable). Cambia aquí si quieres otras reglas.
  blocks: { bosque: true, elevacion: true, terrenoElevado: true, edificio: true, agua: true, urbana: false },  // urbana: ya NO bloquea; solo bloquean los edificios (calles anchas entre ellos)
  elevatedTerrainTone: 2,    // los polígonos "terreno" con este tono son terreno elevado (oscuro)

  objectiveHint: true,       // muestra una zona de búsqueda aproximada del tanque bandera
  gameSpeed: 1,              // multiplicador global de velocidad de juego
  maxFx: 240,                // tope de partículas
  zoom: { min: 0.4, max: 2.4, start: 0.9 },
  cameraKeySpeed: 650,       // px/s con WASD / flechas
  lastKnownSeconds: 18,      // cuánto se muestra la "última posición conocida"
  spotSeconds: 3             // segundos que un enemigo queda revelado al disparar / ser alcanzado
};

const COLORS = {
  paper: '#ece8d8', ink: '#23262a',
  player: '#2c5f8e', enemy: '#8c2f2b', gold: '#c79a1c', white: '#ffffff'
};


// =====================================================================
// DATOS: AUDIO
// =====================================================================
const AUDIO_PATHS = {
  // Sonidos de interfaz (ya existentes en tu proyecto)
  ui: {
    hover:  'assets/audio/SFX/SE_MENU_SELECT_01.wav',
    decide: 'assets/audio/SFX/SE_MENU_DECIDE_01.wav',
    cancel: 'assets/audio/SFX/SE_MENU_CANCEL_01.wav',
    error:  'assets/audio/SFX/SE_MENU_ERROR_01.wav'
  },
  // Disparos: se intercalan (no se repite siempre el mismo)
  // Motor (se oye 1 s al seleccionar tanques genéricos y se desvanece)
  engine: 'assets/audio/SFX/SE_TANK_M_ENGINE_00 (1).wav',
  fire: [
    'assets/audio/SFX/SE_TANK_S_BULLET_FIRE_00.wav',
    'assets/audio/SFX/SE_TANK_M_BULLET_FIRE_00.wav',
    'assets/audio/SFX/SE_TANK_L_BULLET_FIRE_00.wav'
  ]
};

// Volúmenes independientes (0–1). Se guardan en el navegador.
//   ui    → sonidos de botones/interfaz (el slider "Volumen de botones")
//   sfx   → disparos
//   voice → voces de los comandantes
const VOLUME_DEFAULTS = { ui: 0.6, sfx: 0.28, voice: 0.85, engine: 0.2 };   // engine = motor al seleccionar tanques genéricos
const VOLUME_STORAGE_PREFIX = 'pv_vol_';


// =====================================================================
// DATOS: TANQUES
// Para otra escuela basta con añadir entradas aquí y usarlas en PARTS / MISSION.
// "images": nombres de archivo; se buscan en CONFIG.tankImageDirs.
// fixedGun: true = sin torreta (cazacarros): para apuntar hay que girar todo el casco (despacio).
// =====================================================================
const TANKS = {
  // Kuromorimine (tu equipo): potencia y precisión alemanas.
  panther: { name: 'Panther',  images: ['panther.webp'],
             hp: 1000, damage: 165, reload: 3.0, range: 420, speed: 58, accuracy: 0.82, vision: 380, turret: 1.9, hull: 1.8 },
  tiger:   { name: 'Tiger I',  images: ['tiger.webp'],
             hp: 1400, damage: 220, reload: 3.6, range: 450, speed: 42, accuracy: 0.84, vision: 390, turret: 1.5, hull: 1.4 },
  // Pravda (enemigo aquí). El KV-2 es artillería pesada: daño devastador pero recarga larguísima y torreta lenta.
  t34:     { name: 'T-34/76',  images: ['t34.webp'],
             hp: 950,  damage: 140, reload: 2.8, range: 380, speed: 62, accuracy: 0.78, vision: 340, turret: 2.0, hull: 2.0 },
  kv2:     { name: 'KV-2',     images: ['kv2.webp'],
             hp: 1600, damage: 560, reload: 9.5, range: 430, speed: 30, accuracy: 0.72, vision: 380, turret: 0.55, hull: 1.0 }
};


// =====================================================================
// DATOS: PASIVAS DE COMANDANTE
// Cada pasiva es independiente. Hay dos tipos:
//  · de ÁREA: tienen radio y apply(): se aplican a cada aliado vivo cercano (applyPassives).
//  · PROPIAS (radius 0): solo afectan al tanque del comandante (serenidad, avance).
// =====================================================================
const PASSIVES = {
  doctrina: {                                               // Maho · «Doctrina de combate» (de ÁREA)
    name: 'Doctrina de combate',
    summary: 'Aliados cercanos: más estabilidad y menos estrés mientras reciben fuego; combaten mejor bajo presión.',
    radius: 260,
    stabilityBonus: 11,
    stressPerSec: -2.6,
    apply(unit, commander, d, dt) {
      const k = 1 - 0.4 * (d / this.radius);              // más efecto cuanto más cerca
      unit.mods.stability += this.stabilityBonus * k;
      unit.mods.leadership = true;
      if (G.time - unit.lastUnderFireT < 4) unit.stats.stress = clamp(unit.stats.stress + this.stressPerSec * k * dt, 0, 100);
    }
  },
  ataque: {
    name: 'Ataque decidido',
    summary: 'En contacto con el enemigo (recibe fuego o tiene un blanco) su tanque recarga un 20 % más rápido.',
    radius: 0, charge: true                                 // se aplica en reloadMult (chargeMult)
  },
  equipo: {                                                 // Koume · «Espíritu de equipo» (de ÁREA)
    name: 'Espíritu de equipo',
    summary: 'Aliados cercanos mantienen la moral: sufren un 60 % menos del golpe al perder compañeras y recuperan la confianza.',
    radius: 300, shield: 0.6,                               // shield: se aplica en onAllyLost / onUnitDamaged (teamShield)
    apply(unit, commander, d, dt) {
      const k = 1 - 0.4 * (d / this.radius);
      unit.mods.leadership = true;
      unit.stats.confidence = clamp(unit.stats.confidence + 0.7 * k * dt, 0, 100);
      if (G.time - unit.lastUnderFireT < 4) unit.stats.stress = clamp(unit.stats.stress - 1.6 * k * dt, 0, 100);
    }
  }
};


// =====================================================================
// DATOS: COMANDANTES (imagen = la del menú, voces, pasiva)
// Voces: siempre los mismos números (001 · 017-019 · 043-047); solo cambia el CH.
// ch: número CH de la carpeta de voces (Maho 49 · Erika 50 · Koume 51). Si fuera null, el juego lo AVERIGUA SOLO probando
// ACT_COM_CHnn_001.wav (nn = 01…99) en la carpeta (ver detectVoiceCh). Si ya lo sabes, escríbelo y se salta la búsqueda.
// tank: tanque por defecto del comandante si el menú no manda ninguno (el menú manda ?tanque=panther|tiger1).
// =====================================================================
const mkVoices = ch => !ch ? { select: [], hit: [], kill: [] } : ({
  select: ['ACT_COM_CH' + ch + '_001.wav'],
  hit:    ['017', '018', '019'].map(n => 'ACT_COM_CH' + ch + '_' + n + '.wav'),
  kill:   ['043', '044', '045', '046', '047'].map(n => 'ACT_COM_CH' + ch + '_' + n + '.wav')
});
const COMMANDERS = {
  maho: {
    id: 'maho', name: 'Maho', tank: 'tiger',
    portrait: ['assets/imagenes/pfp/mahopfp.png', 'assets/imagenes/ch_full/maho.png'],
    voiceDir: 'assets/audio/character/Maho/', ch: '49', voices: mkVoices('49'),
    voiceCooldown: { select: 0.8, hit: 7, kill: 1.8 },
    passive: PASSIVES.doctrina
  },
  erika: {
    id: 'erika', name: 'Erika', tank: 'panther',
    portrait: ['assets/imagenes/pfp/erikapfp.png', 'assets/imagenes/ch_full/erika.png'],
    voiceDir: 'assets/audio/character/Erika/', ch: '50', voices: mkVoices('50'),
    voiceCooldown: { select: 0.8, hit: 7, kill: 1.8 },
    passive: PASSIVES.ataque
  },
  koume: {
    id: 'koume', name: 'Koume', tank: 'panther',
    portrait: ['assets/imagenes/pfp/koumepfp.png', 'assets/imagenes/ch_full/koume.png'],
    voiceDir: 'assets/audio/character/Koume/', ch: '51', voices: mkVoices('51'),
    voiceCooldown: { select: 0.8, hit: 7, kill: 1.8 },
    passive: PASSIVES.equipo
  }
};


// =====================================================================
// DATOS: LA MISIÓN
//  · allyTanks: tanque de cada aliado (UNIDAD 01…06) → 3 Panther + 3 Tiger. El comandante conduce además
//    el tanque que elija el jugador (MISSION.player.tankChoice, que viene del menú) o el de su ficha.
//  · tankBy: tanque de Pravda por nombre de spawn enemigo (los demás y el tanque bandera son T-34).
//    Los 2 KV-2 están en los flancos de la carretera (ENEMIGO 04 al norte y 05 al sur).
// =====================================================================
const MISSION = {
  id: 'kuromorimine-1',
  title: 'KUROMORIMINE — MISIÓN 1',
  victoryText: '¡El tanque bandera de Pravda ha sido destruido!',
  player: { school: 'Kuromorimine', commander: 'maho', tankChoice: null },
  enemy:  { school: 'Pravda' },
  allyTanks: ['panther', 'tiger', 'panther', 'tiger', 'panther', 'tiger'],
  tankBy: { 'ENEMIGO 04': 'kv2', 'ENEMIGO 05': 'kv2' },
  crewTank: 't34', flagTank: 't34'
};
const PARTS = [
  { n: 1, label: 'MISIÓN 1', map: () => MAPA_KUROMORIMINE,
    objective: 'Eliminar el tanque bandera de Pravda',
    brief: 'Pravda se ha atrincherado en el oeste y espera en emboscada: no atacará hasta que veas a alguno de sus tanques. Dos KV-2 vigilan los flancos de la carretera: pegan durísimo pero recargan muy despacio, así que no te quedes quieto bajo su fuego. Ojo con las elevaciones del sur: no son terreno llano, no se pueden pisar y quien está encima ve y dispara más lejos. Avanza con tus Panther y Tiger, localiza al tanque bandera (T-34) y destrúyelo. Si el comandante cae, la misión fracasa.',
    plateau: true,                       // los polígonos «terreno» de tono 1 del JSON son ELEVACIONES: se pintan como colina y no son superficie plana
    hint: true, ambush: true, flagWins: true }
];
const curPart = () => PARTS[(G.part || 1) - 1];



// =====================================================================
// GEOMETRÍA (utilidades)
// =====================================================================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
// Diferencia angular normalizada a [-π, π]  (a − b)
function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

// Hash determinista (sustituye al azar en el pintado: el mapa se ve siempre igual)
function hash2(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Polígonos como arrays planos [x0,y0,x1,y1,...]
function pointInFlat(x, y, f) {
  let inside = false;
  for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) {
    const xi = f[i], yi = f[i + 1], xj = f[j], yj = f[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Distancia² de un punto a un segmento (base de todas las colisiones contra bordes de polígonos).
function segDist2(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + t * dx - px, cy = y1 + t * dy - py;
  return cx * cx + cy * cy;
}
// ¿El punto (x,y) está a menos de r píxeles de alguna arista del polígono f? (colisión de un tanque con su radio).
function nearEdge(x, y, f, r) {
  const r2 = r * r;
  for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2)
    if (segDist2(x, y, f[j], f[j + 1], f[i], f[i + 1]) < r2) return true;
  return false;
}
// Distancia mínima del punto a las aristas del polígono (se usa para saber qué tan adentro está).
function minEdgeDist(x, y, f) {
  let best = Infinity;
  for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) {
    const d = segDist2(x, y, f[j], f[j + 1], f[i], f[i + 1]);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
// Caja envolvente [x0,y0,x1,y1] de un polígono; sirve para descartar rápido en colisiones.
function flatBBox(f) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < f.length; i += 2) {
    if (f[i] < x0) x0 = f[i]; if (f[i] > x1) x1 = f[i];
    if (f[i + 1] < y0) y0 = f[i + 1]; if (f[i + 1] > y1) y1 = f[i + 1];
  }
  return [x0, y0, x1, y1];
}
// Área con signo del polígono (su signo indica el sentido de giro de los puntos).
function signedArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]);
  return a / 2;
}


// =====================================================================
// CARGA DEL MAPA
// Lee el JSON del editor (poligonos + objetivos + spawns) y lo convierte
// en geometría de juego. También entiende el formato antiguo de
// rectángulos (bosques, colinas, zonasUrbanas, edificios, rios, carreteras).
// =====================================================================
const MAP = {
  w: 1920, h: 1080, name: '',
  polys: [], blockers: [], opaque: [],
  buildings: [], roads: [], objectives: [], spawns: []
};

const ptXY = p => (Array.isArray(p) ? [+p[0], +p[1]] : [+p.x, +p.y]);
const rectPts = r => [[r.x, r.y], [r.x + r.ancho, r.y], [r.x + r.ancho, r.y + r.alto], [r.x, r.y + r.alto]];
// Convierte una colina elíptica del editor en un polígono de puntos.
function ellipsePts(r) {
  const cx = r.x + r.ancho / 2, cy = r.y + r.alto / 2, out = [];
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; out.push([cx + Math.cos(a) * r.ancho / 2, cy + Math.sin(a) * r.alto / 2]); }
  return out;
}

// Registra un polígono del mapa (bosque, elevación, agua, edificio…) con su caja, su geometría plana y si bloquea el paso o la vista.
function addPoly(uso, tono, pts, id, extra) {
  if (pts.length < 3) return null;
  if (uso === 'lago') uso = 'agua';                              // el editor llama "lago" a las zonas de agua
  if (signedArea(pts) < 0) pts = pts.slice().reverse();          // orientación uniforme (para unir polígonos al pintar)
  const flat = new Float64Array(pts.length * 2);
  pts.forEach((p, i) => { flat[i * 2] = p[0]; flat[i * 2 + 1] = p[1]; });
  const B = CONFIG.blocks;
  const elevated = (uso === 'terreno' && tono === CONFIG.elevatedTerrainTone) || !!(extra && extra.plateau);   // plateau = la meseta de la parte 1
  const blocks = (uso === 'bosque' && B.bosque) || (uso === 'elevacion' && B.elevacion) || (elevated && B.terrenoElevado) ||
                 (uso === 'agua' && B.agua) || (uso === 'edificio' && B.edificio) || (uso === 'urbana' && B.urbana);
  const p = Object.assign({ id: id | 0, uso, tono: tono | 0, elevated, flat, bbox: flatBBox(flat), blocks: !!blocks, opaque: !!blocks && uso !== 'agua' }, extra || {});
  MAP.polys.push(p);
  return p;
}

// Edificios generados de forma DETERMINISTA dentro de cada zona urbana.
// Cuadrícula regular (≈100 px) con edificios pequeños: las calles quedan de ≥ 55 px de ancho → pasa un tanque con holgura.
function generateBuildings(poly) {
  const out = [], [x0, y0, x1, y1] = poly.bbox;
  const nx = Math.max(1, Math.floor((x1 - x0) / 100)), ny = Math.max(1, Math.floor((y1 - y0) / 100));
  const px = (x1 - x0) / nx, py = (y1 - y0) / ny;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const hx = hash2(i + poly.id * 7, j), hy = hash2(j + 3, i + poly.id * 13), hs = hash2(i * 3 + 1, j * 5 + poly.id);
      if (hs < 0.08) continue;                                   // algún solar vacío
      const w = 38 + hx * 8, h = 38 + hy * 8;                    // 38–46 px
      const cx = x0 + px * (i + 0.5) + (hx - 0.5) * 6, cy = y0 + py * (j + 0.5) + (hy - 0.5) * 6;
      out.push({ x: cx - w / 2, y: cy - h / 2, ancho: w, alto: h, tone: Math.floor(hs * 3) % 3 });
    }
  return out;
}

// CRÍTICA · Convierte el JSON del editor en el mapa jugable: polígonos, terrenos, bosques, zonas urbanas, edificios y carreteras. Después construye la rejilla de navegación y pinta el mapa.
function prepareMap(data) {
  MAP.w = data.ancho; MAP.h = data.alto; MAP.name = data.nombre || '';
  MAP.polys = []; MAP.buildings = []; MAP.roads = []; MAP.extract = null;

  // PARTS[].plateau: el terreno de tono 1 del JSON es una ELEVACIÓN: los tanques que están encima
  // disparan desde arriba y nadie puede subir; hay que rodearla. Se pinta como colina con curvas de nivel.
  const plat = !!curPart().plateau;
  (data.poligonos || []).forEach(p => {
    const isPlat = plat && p.uso === 'terreno' && (p.tono | 0) === 1;
    addPoly(isPlat ? 'elevacion' : p.uso, isPlat ? 0 : p.tono, p.puntos.map(ptXY), p.id, isPlat ? { plateau: true } : undefined);
  });
  (data.terrenos || []).forEach(r => addPoly('terreno', r.tono | 0, rectPts(r), r.id));      // terrenos rectangulares (tono 0 = parque, no bloquea)
  (data.bosques || []).forEach(r => addPoly('bosque', 0, rectPts(r), r.id));
  (data.colinas || []).forEach(r => addPoly('elevacion', 0, ellipsePts(r), r.id));
  (data.zonasUrbanas || []).forEach(r => addPoly('urbana', 0, rectPts(r), r.id));
  (data.rios || []).forEach(r => {                                   // río = polilínea con ancho → franjas bloqueadas
    const pts = (r.puntos || []).map(ptXY), hw = (r.ancho || 18) / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / L * hw, ny = (x2 - x1) / L * hw;
      addPoly('agua', 0, [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], r.id);
    }
  });
  (data.carreteras || []).forEach(r => MAP.roads.push({ pts: (r.puntos || []).map(ptXY), w: r.ancho || 14, tipo: r.tipo || 'principal' }));

  // Edificios: los del JSON + los generados en las zonas urbanas
  (data.edificios || []).forEach(r => MAP.buildings.push({ x: r.x, y: r.y, ancho: r.ancho, alto: r.alto, tone: 1 }));
  MAP.polys.filter(p => p.uso === 'urbana').forEach(z => generateBuildings(z).forEach(b => MAP.buildings.push(b)));
  MAP.buildings.forEach(b => addPoly('edificio', 0, rectPts(b), 0, { tone: b.tone }));

  MAP.blockers = MAP.polys.filter(p => p.blocks);
  MAP.opaque = MAP.polys.filter(p => p.opaque);
  MAP.objectives = (data.objetivos || []).map(o => ({ x: o.x, y: o.y, nombre: o.nombre, tipo: String(o.tipo || ''), id: o.id }));
  MAP.spawns = (data.spawns || []).map(s => ({ x: s.x, y: s.y, nombre: s.nombre, tipo: String(s.tipo || ''), id: s.id }));
}


// =====================================================================
// COLISIONES
// Usa la geometría REAL de los polígonos (no rectángulos aproximados).
// =====================================================================
// high = true: la unidad está sobre terreno elevado y este no la bloquea (emboscadores del enemigo)
// high = true: la unidad está en terreno elevado · high = polígono: está escondida en ese bosque
function blockedAt(x, y, r, high) {
  if (x < r || y < r || x > MAP.w - r || y > MAP.h - r) return true;
  const bl = MAP.blockers;
  for (let k = 0; k < bl.length; k++) {
    const p = bl[k], b = p.bbox;
    if (high && (high === true ? p.elevated : p === high)) continue;   // true = terreno elevado · polígono = el bosque donde se esconde
    if (x < b[0] - r || x > b[2] + r || y < b[1] - r || y > b[3] + r) continue;
    if (pointInFlat(x, y, p.flat) || nearEdge(x, y, p.flat, r)) return true;
  }
  return false;
}
// ¿El tramo recto entre dos puntos está libre de obstáculos para un tanque de radio r? (comprueba cada ~5 px).
function segmentClear(x1, y1, x2, y2, r) {
  const d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(d / 5));
  for (let i = 1; i <= n; i++) { const t = i / n; if (blockedAt(lerp(x1, x2, t), lerp(y1, y2, t), r)) return false; }
  return true;
}


// =====================================================================
// RUTAS  (malla de navegación + A* + suavizado)
// =====================================================================
const NAV = { cs: 8, cols: 0, rows: 0, blocked: null, comp: null, mainComp: 0 };

// CRÍTICA · Construye la rejilla de navegación (celdas de 8 px) marcando como bloqueadas las celdas con obstáculos e identifica las zonas conectadas entre sí.
function buildNav() {
  const cs = NAV.cs = CONFIG.navCell, cols = NAV.cols = Math.ceil(MAP.w / cs), rows = NAV.rows = Math.ceil(MAP.h / cs);
  const blocked = NAV.blocked = new Uint8Array(cols * rows), r = CONFIG.unitRadius + 2;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) blocked[y * cols + x] = blockedAt((x + 0.5) * cs, (y + 0.5) * cs, r) ? 1 : 0;
  // Componentes conexas (para saber qué zonas son alcanzables entre sí)
  const comp = NAV.comp = new Int32Array(cols * rows), sizes = [0], q = new Int32Array(cols * rows);
  let id = 0;
  for (let s = 0; s < cols * rows; s++) {
    if (blocked[s] || comp[s]) continue;
    id++; sizes[id] = 0; let qh = 0, qt = 0; q[qt++] = s; comp[s] = id;
    while (qh < qt) {
      const c = q[qh++], cx = c % cols, cy = (c / cols) | 0; sizes[id]++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = ny * cols + nx; if (blocked[n] || comp[n]) continue;
        if (dx && dy && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
        comp[n] = id; q[qt++] = n;
      }
    }
  }
  NAV.mainComp = sizes.indexOf(Math.max(...sizes.slice(1)));
}
// Celda libre más cercana (opcionalmente dentro de una componente concreta)
function nearestFreeCell(x, y, maxRing, compId) {
  const { cs, cols, rows, blocked, comp } = NAV, cx = (x / cs) | 0, cy = (y / cs) | 0;
  let best = -1, bd = Infinity;
  for (let dy = -maxRing; dy <= maxRing; dy++) for (let dx = -maxRing; dx <= maxRing; dx++) {
    const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    const i = ny * cols + nx; if (blocked[i]) continue;
    if (compId > 0 && comp[i] !== compId) continue;
    const d = (nx + 0.5) * cs - x, e = (ny + 0.5) * cs - y, dd = d * d + e * e;
    if (dd < bd) { bd = dd; best = i; }
  }
  return best;
}
const cellCenter = i => [(i % NAV.cols + 0.5) * NAV.cs, ((i / NAV.cols | 0) + 0.5) * NAV.cs];

// Montículo binario mínimo para A*
class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(v, k) {
    const K = this.k, V = this.v; let i = K.length; K.push(k); V.push(v);
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= K[i]) break; [K[p], K[i]] = [K[i], K[p]]; [V[p], V[i]] = [V[i], V[p]]; i = p; }
  }
  pop() {
    const K = this.k, V = this.v, top = V[0], lk = K.pop(), lv = V.pop();
    if (K.length) {
      K[0] = lk; V[0] = lv; let i = 0;
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i;
        if (l < K.length && K[l] < K[m]) m = l;
        if (r < K.length && K[r] < K[m]) m = r;
        if (m === i) break;
        [K[m], K[i]] = [K[i], K[m]]; [V[m], V[i]] = [V[i], V[m]]; i = m;
      }
    }
    return top;
  }
}

// Devuelve una lista de puntos {x,y} (sin incluir el inicio) o null si no hay camino.
function findPath(sx, sy, gx, gy) {
  const { cs, cols, rows, blocked } = NAV;
  const s = nearestFreeCell(sx, sy, 8, 0); if (s < 0) return null;
  const compId = NAV.comp[s], g = nearestFreeCell(gx, gy, 16, compId); if (g < 0) return null;
  const n = cols * rows, G = new Float32Array(n).fill(1e9), P = new Int32Array(n).fill(-1), C = new Uint8Array(n);
  const gcx = g % cols, gcy = (g / cols) | 0;
  const h = i => { const dx = Math.abs(i % cols - gcx), dy = Math.abs((i / cols | 0) - gcy); return dx + dy - 0.5858 * Math.min(dx, dy); };
  const heap = new MinHeap(); G[s] = 0; heap.push(s, h(s));
  let found = false;
  while (heap.size) {
    const c = heap.pop(); if (C[c]) continue; C[c] = 1;
    if (c === g) { found = true; break; }
    const cx = c % cols, cy = (c / cols) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const m = ny * cols + nx; if (blocked[m] || C[m]) continue;
      if (dx && dy && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
      const ng = G[c] + (dx && dy ? 1.4142 : 1);
      if (ng < G[m]) { G[m] = ng; P[m] = c; heap.push(m, ng + h(m)); }
    }
  }
  if (!found) return null;
  const cells = []; for (let c = g; c !== -1; c = P[c]) cells.push(c); cells.reverse();
  const pts = cells.map(cellCenter);
  pts[0] = [sx, sy];
  const R = CONFIG.unitRadius + 1;
  pts[pts.length - 1] = !blockedAt(gx, gy, R) && segmentClear(pts[pts.length - 2] ? pts[pts.length - 2][0] : sx, pts[pts.length - 2] ? pts[pts.length - 2][1] : sy, gx, gy, R) ? [gx, gy] : pts[pts.length - 1];
  // Suavizado por visibilidad (string-pulling)
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !segmentClear(pts[i][0], pts[i][1], pts[j][0], pts[j][1], R)) j--;
    out.push(pts[j]); i = j;
  }
  return out.slice(1).map(p => ({ x: p[0], y: p[1] }));
}


// =====================================================================
// LÍNEA DE VISIÓN (LOS)   — los polígonos opacos tapan la vista y los disparos
// =====================================================================
// Distancia desde (ox,oy) en la dirección (dx,dy) hasta el primer polígono opaco (máx. maxD)
// ign = polígonos que se ignoran (el terreno elevado desde/hacia el que se mira o dispara)
function rayDist(ox, oy, dx, dy, maxD, ign) {
  let best = maxD;
  const ex = ox + dx * maxD, ey = oy + dy * maxD;
  const minx = Math.min(ox, ex), maxx = Math.max(ox, ex), miny = Math.min(oy, ey), maxy = Math.max(oy, ey);
  const op = MAP.opaque;
  for (let k = 0; k < op.length; k++) {
    const p = op[k], b = p.bbox;
    if (ign && ign.indexOf(p) >= 0) continue;
    if (maxx < b[0] || minx > b[2] || maxy < b[1] || miny > b[3]) continue;
    const f = p.flat;
    for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) {
      const x3 = f[j], y3 = f[j + 1], sx = f[i] - x3, sy = f[i + 1] - y3;
      const den = dx * sy - dy * sx; if (den === 0) continue;
      const t = ((x3 - ox) * sy - (y3 - oy) * sx) / den;
      if (t < 0 || t >= best) continue;
      const u = ((x3 - ox) * dy - (y3 - oy) * dx) / den;
      if (u >= 0 && u <= 1) best = t;
    }
  }
  return best;
}
// Terreno elevado que contiene alguno de los dos puntos: quien está en altura ve y dispara hacia fuera,
// y se puede ver / disparar a quien está en la altura (el resto de obstáculos sí tapan).
function highPolysAt(x, y) {
  const out = [];
  for (const p of MAP.polys) if (p.elevated) { const b = p.bbox; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && pointInFlat(x, y, p.flat)) out.push(p); }
  return out;
}
// Lista de polígonos que un rayo debe ignorar: las elevaciones del tirador/objetivo y el bosque donde se esconde un tanque.
function ignAt(x1, y1, x2, y2) {
  const a = highPolysAt(x1, y1), b = highPolysAt(x2, y2);
  let out = a.length || b.length ? a.concat(b) : null;
  for (const u of G.units) {                                       // tanque escondido en un bosque: su bosque no le tapa la vista ni el tiro
    if (!u.hideIn || !u.alive) continue;
    if ((Math.abs(u.x - x1) < 0.6 && Math.abs(u.y - y1) < 0.6) || (Math.abs(u.x - x2) < 0.6 && Math.abs(u.y - y2) < 0.6)) (out = out || []).push(u.hideIn);
  }
  return out;
}
// ¿Hay un obstáculo opaco entre los dos puntos?
function losBlocked(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1); if (d < 1) return false;
  return rayDist(x1, y1, (x2 - x1) / d, (y2 - y1) / d, d, ignAt(x1, y1, x2, y2)) < d - 1;
}


// =====================================================================
// PINTADO DEL MAPA  — plano militar con tintes suaves
// Se pinta UNA vez en un canvas aparte; el juego solo lo dibuja escalado.
//   bosque → verde suave · agua → azul suave · terreno elevado y colinas → grises oscuros
//   zona urbana / edificios → grises · carreteras → estética militar
// =====================================================================
let mapCanvas = null;
const TMP = { a: null, b: null };

// Traza en el canvas el contorno cerrado de varios polígonos.
function closedPaths(g, polys) {
  g.beginPath();
  for (const p of polys) { const f = p.flat; g.moveTo(f[0], f[1]); for (let i = 2; i < f.length; i += 2) g.lineTo(f[i], f[i + 1]); g.closePath(); }
}
function edgeOnBorder(x1, y1, x2, y2) {            // aristas pegadas al borde del mapa no se contornean
  const t = 4;
  return (x1 <= t && x2 <= t) || (x1 >= MAP.w - t && x2 >= MAP.w - t) || (y1 <= t && y2 <= t) || (y1 >= MAP.h - t && y2 >= MAP.h - t);
}
// Traza solo las aristas interiores de los polígonos (ignora las pegadas al borde del mapa).
function edgePaths(g, polys) {
  g.beginPath();
  for (const p of polys) {
    const f = p.flat;
    for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) {
      if (edgeOnBorder(f[j], f[j + 1], f[i], f[i + 1])) continue;
      g.moveTo(f[j], f[j + 1]); g.lineTo(f[i], f[i + 1]);
    }
  }
}
// Limpia y reinicia un canvas temporal antes de pintar una capa.
function resetTmp(cg, S) {
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'source-over'; cg.filter = 'none';
  cg.clearRect(0, 0, cg.canvas.width, cg.canvas.height); cg.setTransform(S, 0, 0, S, 0, 0); cg.setLineDash([]);
}

// Pinta la UNIÓN de varios polígonos (sin costuras internas) con relleno translúcido,
// trama opcional, resplandor de borde opcional y contorno exterior.
function paintUnion(g, polys, o) {
  if (!polys.length) return;
  const S = CONFIG.mapScale, ga = TMP.a.getContext('2d'), gb = TMP.b.getContext('2d');
  resetTmp(ga, S); resetTmp(gb, S);
  ga.fillStyle = o.fill; closedPaths(ga, polys); ga.fill('nonzero');
  if (o.hatch) {
    ga.save(); ga.globalCompositeOperation = 'source-atop'; ga.strokeStyle = o.hatch.color; ga.lineWidth = o.hatch.w; ga.beginPath();
    for (let k = -MAP.h; k < MAP.w; k += o.hatch.step) { ga.moveTo(k, MAP.h); ga.lineTo(k + MAP.h, 0); }
    ga.stroke(); ga.restore();
  }
  if (o.edgeGlow) {
    ga.save(); ga.globalCompositeOperation = 'source-atop'; ga.filter = 'blur(9px)'; ga.strokeStyle = o.edgeGlow; ga.lineWidth = 30; ga.lineJoin = 'round';
    edgePaths(ga, polys); ga.stroke(); ga.restore();
  }
  g.save(); g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(TMP.a, 0, 0); g.restore();
  gb.strokeStyle = o.line; gb.lineWidth = o.lineW * 2; gb.lineJoin = 'round'; gb.lineCap = 'round';
  if (o.dash) gb.setLineDash(o.dash);
  edgePaths(gb, polys); gb.stroke(); gb.setLineDash([]);
  gb.globalCompositeOperation = 'destination-out'; gb.fillStyle = '#000'; closedPaths(gb, polys); gb.fill('nonzero');   // deja solo la mitad exterior
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(TMP.b, 0, 0); g.restore();
}

// Pinta el fondo del mapa con textura de papel.
function paintPaper(g) {
  g.fillStyle = COLORS.paper; g.fillRect(0, 0, MAP.w, MAP.h);
  const t = document.createElement('canvas'); t.width = t.height = 160;
  const tg = t.getContext('2d'); tg.fillStyle = '#000';
  for (let i = 0; i < 110; i++) { tg.globalAlpha = 0.04 + hash2(i, 9) * 0.07; tg.fillRect(Math.floor(hash2(i, 1) * 160), Math.floor(hash2(i, 2) * 160), 1, 1); }
  g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, MAP.w, MAP.h);
}

// Colina: bandas de altura concéntricas que siguen la forma real del polígono + curvas de nivel
function paintHill(g, p) {
  const bands = [[14, '#bdbcb2'], [34, '#a9a89e'], [58, '#979589'], [86, '#85837a'], [118, '#737169'], [156, '#625f58']];
  g.save(); closedPaths(g, [p]); g.clip();
  g.fillStyle = '#53514b'; g.fillRect(p.bbox[0] - 2, p.bbox[1] - 2, p.bbox[2] - p.bbox[0] + 4, p.bbox[3] - p.bbox[1] + 4);
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (let k = bands.length - 1; k >= 0; k--) {
    const [d, c] = bands[k];
    edgePaths(g, [p]); g.strokeStyle = '#2f2e2a'; g.lineWidth = 2 * d + 1.4; g.stroke();
    edgePaths(g, [p]); g.strokeStyle = c; g.lineWidth = 2 * d; g.stroke();
  }
  g.restore();
  g.save(); g.strokeStyle = '#26251f'; g.lineWidth = 2.2; g.lineJoin = 'round'; edgePaths(g, [p]); g.stroke(); g.restore();
  // Cota en el punto más "profundo" del polígono
  let bx = 0, by = 0, bd = -1;
  for (let y = p.bbox[1]; y < p.bbox[3]; y += 20) for (let x = p.bbox[0]; x < p.bbox[2]; x += 20) {
    if (!pointInFlat(x, y, p.flat)) continue;
    const d = minEdgeDist(x, y, p.flat); if (d > bd) { bd = d; bx = x; by = y; }
  }
  if (bd > 40) {
    g.save(); g.font = 'bold 15px "Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = 'COTA ' + (180 + ((p.id * 37) % 14) * 5);
    g.lineWidth = 4; g.strokeStyle = 'rgba(30,30,28,.8)'; g.strokeText(t, bx, by); g.fillStyle = '#e4e2d6'; g.fillText(t, bx, by); g.restore();
  }
}

// Dibuja los árboles de los bosques; la posición es determinista para que no cambie entre partidas.
function paintForestTrees(g, polys) {              // símbolos de árbol deterministas
  const seen = new Set(), step = 15;
  g.save(); g.strokeStyle = '#2f5236'; g.lineWidth = 0.9; g.globalAlpha = 0.9; g.lineJoin = 'miter'; g.beginPath();
  for (const p of polys) {
    for (let gx = Math.floor(p.bbox[0] / step) * step; gx < p.bbox[2]; gx += step)
      for (let gy = Math.floor(p.bbox[1] / step) * step; gy < p.bbox[3]; gy += step) {
        const key = gx + ',' + gy; if (seen.has(key)) continue;
        const px = gx + (hash2(gx, gy) - 0.5) * 7, py = gy + (hash2(gy, gx + 5) - 0.5) * 7;
        if (!pointInFlat(px, py, p.flat)) continue;
        seen.add(key);
        const s = 4.2 + hash2(gx + 1, gy + 2) * 2.2;
        g.moveTo(px - s * 0.7, py + s * 0.35); g.lineTo(px, py - s * 0.75); g.lineTo(px + s * 0.7, py + s * 0.35);
        g.moveTo(px, py + s * 0.35); g.lineTo(px, py + s * 0.85);
      }
  }
  g.stroke(); g.restore();
}

// Dibuja todos los edificios con sombra y tejado.
function paintBuildings(g) {
  const fills = ['#cfcec7', '#aeada6', '#8f8e88'];
  for (const b of MAP.buildings) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(b.x + 2.5, b.y + 2.5, b.ancho, b.alto);
    g.fillStyle = fills[b.tone % 3]; g.fillRect(b.x, b.y, b.ancho, b.alto);
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.1; g.strokeRect(b.x, b.y, b.ancho, b.alto);
    g.beginPath(); g.moveTo(b.x + b.ancho * 0.5, b.y); g.lineTo(b.x + b.ancho * 0.5, b.y + b.alto); g.lineWidth = 0.5; g.stroke();
  }
}

// Dibuja las carreteras en 3 pasadas (bordes → rellenos → línea central) para que los cruces se vean unidos.
function paintRoads(g) {                                // 3 pasadas (bordes → rellenos → línea central) para que los cruces se unan limpios
  const rs = MAP.roads.filter(r => r.pts.length >= 2);
  const path = r => { g.beginPath(); r.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
  g.lineJoin = 'round'; g.lineCap = 'butt';
  for (const r of rs) { path(r); g.strokeStyle = '#2b2b2b'; g.lineWidth = r.w + 3; g.stroke(); }
  for (const r of rs) { path(r); g.strokeStyle = '#e4dfc8'; g.lineWidth = r.w; g.stroke(); }
  for (const r of rs) if (r.tipo === 'principal') { path(r); g.setLineDash([9, 7]); g.strokeStyle = '#6b665a'; g.lineWidth = 0.9; g.stroke(); g.setLineDash([]); }
}

const GRID_CELL = 120;
const gridLetter = i => { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
const gridName = (x, y) => gridLetter(clamp(Math.floor(x / GRID_CELL), 0, 99)) + '-' + (clamp(Math.floor(y / GRID_CELL), 0, 99) + 1);

// Dibuja la cuadrícula del mapa con sus letras y números (A-1, B-2…).
function paintGrid(g) {
  g.save(); g.strokeStyle = 'rgba(30,30,30,.13)'; g.lineWidth = 1; g.beginPath();
  for (let x = GRID_CELL; x < MAP.w; x += GRID_CELL) { g.moveTo(x, 0); g.lineTo(x, MAP.h); }
  for (let y = GRID_CELL; y < MAP.h; y += GRID_CELL) { g.moveTo(0, y); g.lineTo(MAP.w, y); }
  g.stroke();
  g.font = 'bold 13px "Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lab = (t, x, y) => { g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText(t, x, y); g.fillStyle = '#2a2a2a'; g.fillText(t, x, y); };
  const cols = Math.ceil(MAP.w / GRID_CELL), rows = Math.ceil(MAP.h / GRID_CELL);
  for (let i = 0; i < cols; i++) { lab(gridLetter(i), i * GRID_CELL + GRID_CELL / 2, 12); lab(gridLetter(i), i * GRID_CELL + GRID_CELL / 2, MAP.h - 12); }
  for (let j = 0; j < rows; j++) { lab(String(j + 1), 12, j * GRID_CELL + GRID_CELL / 2); lab(String(j + 1), MAP.w - 12, j * GRID_CELL + GRID_CELL / 2); }
  g.restore();
}

// CRÍTICA · Pinta todo el mapa en un canvas fuera de pantalla, capa por capa; luego solo se copia en cada fotograma.
function paintMap() {
  const S = CONFIG.mapScale, w = Math.round(MAP.w * S), h = Math.round(MAP.h * S);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.scale(S, S);
  TMP.a = document.createElement('canvas'); TMP.a.width = w; TMP.a.height = h;
  TMP.b = document.createElement('canvas'); TMP.b.width = w; TMP.b.height = h;
  const by = (uso, fn) => MAP.polys.filter(p => p.uso === uso && (!fn || fn(p)));

  paintPaper(g);
  // Terreno: tono 1 = claro · tono "elevado" (2) = oscuro con trama y borde degradado
  paintUnion(g, by('terreno', p => !p.elevated && p.tono >= 1), { fill: '#a39d86', alpha: 0.28, line: '#6f6a58', lineW: 1, dash: [4, 3] });
  paintUnion(g, by('terreno', p => p.elevated), {
    fill: '#585c5a', alpha: 0.95, hatch: { color: 'rgba(255,255,255,.075)', w: 1, step: 7 }, edgeGlow: '#8e928f',
    line: '#202326', lineW: 1.7
  });
  paintUnion(g, by('terreno', p => !p.elevated && p.tono === 0), { fill: '#9bb88a', alpha: 0.22, line: '#5e7a52', lineW: 1, dash: [6, 4] });   // parque
  paintUnion(g, by('agua'), { fill: '#6f9bc2', alpha: 0.45, line: '#3a5f80', lineW: 1.3 });
  paintUnion(g, by('urbana'), {
    fill: '#8d8d8a', alpha: 0.3, hatch: { color: 'rgba(40,40,40,.25)', w: 0.8, step: 8 }, line: '#55554f', lineW: 1.1, dash: [5, 4]
  });
  by('elevacion').forEach(p => paintHill(g, p));
  const forests = by('bosque');
  paintUnion(g, forests, { fill: '#6f9a68', alpha: 0.36, line: '#3f6b43', lineW: 1.1, dash: [3, 3] });
  paintForestTrees(g, forests);
  paintRoads(g);
  paintBuildings(g);
  paintGrid(g);
  g.strokeStyle = '#1b1d20'; g.lineWidth = 3; g.strokeRect(0, 0, MAP.w, MAP.h);
  TMP.a = TMP.b = null;
  mapCanvas = c;
}


// =====================================================================
// CARGA DE RECURSOS
// Las imágenes se buscan en varias rutas; si no existen, el juego usa un
// símbolo de reemplazo y sigue funcionando.
// =====================================================================
const IMGS = {};                 // 'tank:firefly' → Image | null,  'cmd:kay' → Image | null
const MISSING = [];              // recursos que no se encontraron (se muestran en consola)

// Intenta cargar una imagen probando varias rutas; devuelve null si ninguna existe.
function loadImageList(urls) {
  return new Promise(resolve => {
    let i = 0;
    const next = () => {
      if (i >= urls.length) { resolve(null); return; }
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => { i++; next(); };
      im.src = urls[i];
    };
    next();
  });
}
const tankImageUrls = key => {
  const out = [];
  for (const f of TANKS[key].images) for (const d of CONFIG.tankImageDirs) out.push(encodeURI(ROOT + d + f));
  return out;
};
// Carga todas las imágenes (tanques, retratos) antes de empezar; los que falten se dibujan como formas simples.
async function loadAssets() {
  const tankKeys = Object.keys(TANKS);
  const jobs = [];
  for (const k of new Set(tankKeys)) jobs.push(loadImageList(tankImageUrls(k)).then(im => { IMGS['tank:' + k] = im; if (!im) MISSING.push('Tanque ' + TANKS[k].name + ' → ' + TANKS[k].images[0]); }));
  for (const cmd of Object.values(COMMANDERS))
    jobs.push(loadImageList(cmd.portrait.map(p => encodeURI(ROOT + p))).then(im => { IMGS['cmd:' + cmd.id] = im; if (!im) MISSING.push('Retrato ' + cmd.name + ' → ' + cmd.portrait[0]); }));
  await Promise.all(jobs);
  if (MISSING.length) console.warn('[Kuromorimine 1] Recursos no encontrados (se usan símbolos de reemplazo):\n - ' + MISSING.join('\n - '));
}


// =====================================================================
// ESTADO GLOBAL
// =====================================================================
const G = {
  time: 0, started: false, paused: true, over: null,        // over: null | 'victory' | 'defeat'
  units: [], projectiles: [], fx: [], wrecks: [],
  selected: null, group: [], inspect: null, box: null, follow: false, idleIndex: 0,
  cam: { x: 960, y: 540, zoom: 0.9, tx: 960, ty: 540 },
  drag: null, pan: null, keys: {}, mouse: { sx: 0, sy: 0, wx: 0, wy: 0 },
  reconTimer: 0, fogDirty: true, uiTimer: 0, relocated: [],
  part: 1, phase: 'fight',            // part: 1 | 2 · phase (parte 1): 'fight' → 'extract'
  sprung: false,                      // parte 2: ¿ya se disparó la emboscada?
  cine: null,                         // animación en curso (salida / llegada) o null
  roster: null, extractWarnT: 0
};
const view = { w: 800, h: 600, dpr: 1, cx: 400, cy: 300 };
let nextUnitId = 1;


// =====================================================================
// UNIDADES
// Cada unidad: posición, rumbo, torreta, estadísticas, orden actual, IA (enemigos).
// =====================================================================
function makeUnit(o) {
  const base = TANKS[o.tankKey];
  // Los emboscadores en altura ven más lejos y alcanzan algo más que a nivel del suelo
  const t = o.high ? Object.assign({}, base, { range: Math.round(base.range * 1.12), vision: Math.round(base.vision * 1.2) }) : base;
  // Pasiva propia del comandante (Naomi / Alisa): modifica una copia del spec de SU tanque
  const cp = o.commanderId && COMMANDERS[o.commanderId] && COMMANDERS[o.commanderId].passive;
  const t2 = cp && cp.self ? Object.assign({}, t, cp.self(t)) : t;
  const u = {
    high: !!o.high,
    hideIn: o.hideIn || null,                    // polígono del bosque en el que está escondido (solo mientras siga dentro)
    id: nextUnitId++, team: o.team, role: o.role, tankKey: o.tankKey, spec: t2, name: t.name,
    commanderId: o.commanderId || null,
    x: o.x, y: o.y, r: CONFIG.unitRadius, heading: o.heading, turret: o.heading,
    stats: { hp: t.hp, maxHp: t.hp, confidence: o.confidence, stress: o.stress, stability: 70 },
    mods: { stability: 0, leadership: false }, near: { allies: 0, foes: 0 }, mood: 'ESTABLE',
    alive: true, order: null, target: null, targetT: Math.random() * 0.25, cooldown: o.high ? 0.3 : 1 + Math.random() * 1.5,
    lastFireT: -99, lastUnderFireT: -99, spottedUntil: 0, visNow: false, spotted: false, lastKnown: null,
    announcedT: -99, stuckT: 0, stuckRef: null, visPoly: null,
    ai: o.team === 'enemy' ? { ambush: !!o.high, hold: false, react: 0, post: { x: o.x, y: o.y }, lastSeen: null, sense: Math.random() * 0.25, repath: 0, alertedAt: -99 } : null
  };
  u.stats.stability = stabilityTarget(u);
  u.mood = moodOf(u);
  return u;
}

// Coloca las unidades en los spawns del mapa (si un spawn cae en zona bloqueada,
// se mueve a la celda libre más cercana y se avisa por consola).
//  · Jugador: comandante (Panther o Tiger según lo elegido) + UNIDAD 01…06 (3 Panther y 3 Tiger, ver MISSION.allyTanks).
//  · Enemigos: T-34 salvo los de MISSION.tankBy (KV-2); el tanque bandera (objetivo) es un T-34 y vigila su puesto.
function spawnUnits() {
  G.units.length = 0; G.relocated.length = 0; nextUnitId = 1;
  const free = (x, y, label) => {
    const ci = nearestFreeCell(x, y, 2, 0);
    if (!blockedAt(x, y, CONFIG.unitRadius + 1) && ci >= 0 && NAV.comp[ci] === NAV.mainComp) return [x, y];
    const c = nearestFreeCell(x, y, 40, NAV.mainComp), p = c >= 0 ? cellCenter(c) : [x, y];
    G.relocated.push(label + ': (' + Math.round(x) + ',' + Math.round(y) + ') → (' + Math.round(p[0]) + ',' + Math.round(p[1]) + ')');
    return p;
  };
  const PART = curPart();
  const spJ = MAP.spawns.filter(s => /jugador/i.test(s.tipo));
  const spA = MAP.spawns.filter(s => /aliado/i.test(s.tipo));
  const spE = MAP.spawns.filter(s => /enemigo/i.test(s.tipo));
  const flag = MAP.objectives.find(o => /bandera|objetivo/i.test(o.tipo));                // el tanque enemigo "objetivo"
  const toward = (x, y, tx, ty) => Math.atan2(ty - y, tx - x);
  const mid = flag ? [flag.x, flag.y] : [MAP.w * 0.1, MAP.h * 0.5];
  const P = MISSION.player, PC = COMMANDERS[P.commander];

  spJ.forEach(s => { const [x, y] = free(s.x, s.y, s.nombre);
    G.units.push(makeUnit({ team: 'player', role: 'commander', tankKey: P.tankChoice || (PC && PC.tank) || 'panther', commanderId: P.commander, x, y, heading: toward(x, y, mid[0], mid[1]), confidence: 80, stress: 15 })); });
  spA.forEach((s, i) => {
    const [x, y] = free(s.x, s.y, s.nombre);
    G.units.push(makeUnit({ team: 'player', role: 'crew', tankKey: MISSION.allyTanks[i % MISSION.allyTanks.length], x, y, heading: toward(x, y, mid[0], mid[1]), confidence: 72, stress: 20 })); });
  // Enemigos: en emboscada (ai.hold) hasta que el jugador vea a alguno. Si un spawn cae dentro de un bosque, el tanque se esconde entre los árboles.
  //  · Si un spawn cae sobre una ELEVACIÓN (los polígonos de terreno elevado), el tanque está EN ALTURA: dispara con más alcance y visión,
  //    es más difícil de ver y la elevación no se puede pisar (hay que rodearla). Se queda exactamente en su spawn.
  const heights = MAP.polys.filter(p => p.elevated), forests = MAP.polys.filter(p => p.uso === 'bosque');
  const face = (x, y) => toward(x, y, G.units[0] ? G.units[0].x : mid[0], G.units[0] ? G.units[0].y : mid[1]);
  spE.forEach(s => {
    const high = heights.some(p => pointInFlat(s.x, s.y, p.flat));
    const forest = high ? null : forests.find(p => pointInFlat(s.x, s.y, p.flat)) || null;
    const [x, y] = high || forest ? [s.x, s.y] : free(s.x, s.y, s.nombre);
    const u = makeUnit({ team: 'enemy', role: 'crew', tankKey: MISSION.tankBy[s.nombre] || MISSION.crewTank, x, y, high, hideIn: forest, heading: face(x, y), confidence: 70, stress: 15 });
    if (PART.ambush) u.ai.hold = true;
    G.units.push(u);
  });
  if (flag) {
    const hiF = heights.some(p => pointInFlat(flag.x, flag.y, p.flat));                 // el tanque bandera también podría estar en una elevación
    const [x, y] = hiF ? [flag.x, flag.y] : free(flag.x, flag.y, 'Tanque bandera');
    const u = makeUnit({ team: 'enemy', role: 'flag', tankKey: MISSION.flagTank, x, y, high: hiF, heading: face(x, y), confidence: 78, stress: 12 });
    if (PART.ambush) u.ai.hold = true;
    G.units.push(u); }
  if (G.relocated.length) console.warn('[Kuromorimine 1] Posiciones reubicadas al terreno libre más cercano:\n - ' + G.relocated.join('\n - '));
}

const players = () => G.units.filter(u => u.alive && u.team === 'player');
const enemies = () => G.units.filter(u => u.alive && u.team === 'enemy');
const commanderUnit = () => G.units.find(u => u.team === 'player' && u.commanderId);
const unitImage = u => (u.commanderId ? IMGS['cmd:' + u.commanderId] : IMGS['tank:' + u.tankKey]) || null;


// =====================================================================
// ESTADÍSTICAS  (vida · confianza · estrés · estabilidad · estado)
// La estabilidad depende de confianza y estrés; influye ligeramente en el
// rendimiento (precisión, recarga, retraso al recibir órdenes).
// =====================================================================
function stabilityTarget(u) {
  const s = u.stats;
  let t = 0.55 * s.confidence + 0.45 * (100 - s.stress) + (u.mods ? u.mods.stability : 0);
  if (u.near.allies > 0) t += 4;
  if (u.near.foes >= 2 && u.near.allies === 0) t -= 8;
  return clamp(t, 0, 100);
}
// Estado de ánimo (TRANQUILO, ALERTA, NERVIOSO, PÁNICO…) según sus estadísticas.
function moodOf(u) {
  const { stress: s, stability: b } = u.stats, foes = u.near ? u.near.foes : 0;
  if (b < 20 || s > 90) return 'PÁNICO';
  if (s > 75 || b < 35) return 'ESTRESADO';
  if (s > 55 || b < 50) return 'NERVIOSO';
  if (s > 35 || (foes > 0 && s > 20)) return 'ALERTA';
  if (s < 15 && b >= 70 && foes === 0) return 'TRANQUILO';
  return 'ESTABLE';
}
// Efectos (suaves) sobre el comportamiento
const accMult   = u => clamp(0.82 + 0.18 * (u.stats.stability / 100) - (u.stats.stress > 70 ? 0.08 * (u.stats.stress - 70) / 30 : 0), 0.6, 1);
// Erika (charge): en contacto con el enemigo (recibió fuego en los últimos 6 s o tiene un blanco) recarga un 20 % más rápido.
const chargeMult = u => { const pp = passiveOf(u); return pp && pp.charge && (G.time - u.lastUnderFireT < 6 || (u.target && u.target.alive)) ? 0.8 : 1; };
const reloadMult = u => (1 + (1 - u.stats.stability / 100) * 0.3) * chargeMult(u);
const orderDelay = u => (1 - u.stats.stability / 100) * 0.9;
const speedMult  = u => (u.mood === 'PÁNICO' ? 0.9 : 1) * rushMult(u);
// AVANCE RELÁMPAGO (Rosehip): más velocidad solo mientras su tanque avanza hacia un enemigo avistado
function rushMult(u) {
  const pp = passiveOf(u); if (!pp || !pp.rush || !u.order) return 1;
  const wp = u.order.path[u.order.i]; if (!wp) return 1;
  let best = null, bd = 900;
  for (const e of enemies()) if (e.spotted) { const d = dist(u.x, u.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
  if (!best) return 1;
  return ((wp.x - u.x) * (best.x - u.x) + (wp.y - u.y) * (best.y - u.y)) > 0 ? pp.rush : 1;
}

// CRÍTICA · Cada fotograma: recalcula confianza, estrés y estabilidad de cada unidad y aplica sus efectos (puntería, recarga, retraso de órdenes).
function updateStats(dt) {
  const alive = G.units.filter(u => u.alive);
  for (const u of alive) u.mods = { stability: 0, leadership: false };
  applyPassives(dt);
  for (const u of alive) {
    const s = u.stats; let allies = 0, foes = 0;
    for (const o of alive) {
      if (o === u) continue;
      const d = dist(u.x, u.y, o.x, o.y);
      if (o.team === u.team) { if (d < 320) allies++; }
      else if (d < 300 && (u.team === 'enemy' || o.spotted)) foes++;
    }
    u.near = { allies, foes };
    const since = G.time - u.lastUnderFireT;
    let ds = foes * 0.9 * dt, dc = 0;
    if (since < 2.5) ds += 1.2 * dt; else if (since > 6) ds -= 2.4 * dt * (allies > 0 ? 1.25 : 1);
    if (foes > 0 && allies === 0) { ds += 0.8 * dt; dc -= 0.35 * dt; }      // aislada ante el enemigo
    if (since > 6) {
      if (s.confidence < 70) dc += 0.6 * dt * (1 - s.stress / 140) * (s.stress > 70 ? 0.5 : 1);   // el estrés alto frena la recuperación
      else dc -= 0.15 * dt;
    }
    const pp = passiveOf(u);
    if (pp && pp.calm) { if (ds > 0) ds *= 0.65; else if (ds < 0) ds *= 1.5; if (since > 6) dc += 0.5 * dt; }   // SERENIDAD (Klara)
    s.stress = clamp(s.stress + ds, 0, 100);
    s.confidence = clamp(s.confidence + dc, 0, 100);
    s.stability += (stabilityTarget(u) - s.stability) * Math.min(1, dt * 1.5);
    u.mood = moodOf(u);
  }
}
// Eventos que modifican las estadísticas
const passiveOf = u => (u.commanderId && COMMANDERS[u.commanderId] && COMMANDERS[u.commanderId].passive) || null;
// Evento: la unidad recibe daño → sube el estrés (menos con la pasiva «Serenidad»).
function onUnitDamaged(u, dmg) { const s = u.stats, pp = passiveOf(u); s.stress = clamp(s.stress + (8 + dmg / 25) * (pp && pp.calm ? 0.65 : 1) * (1 - teamShield(u) * 0.5), 0, 100); s.confidence = clamp(s.confidence - (6 + dmg / 40), 0, 100); u.lastUnderFireT = G.time; }
// Evento: la unidad acierta un disparo → gana confianza.
function onUnitScoredHit(u)    { u.stats.confidence = clamp(u.stats.confidence + 3, 0, 100); u.stats.stress = clamp(u.stats.stress - 1.5, 0, 100); }
// Evento: la unidad destruye un enemigo → sube su confianza y la de su equipo.
function onUnitKill(u) {
  u.stats.confidence = clamp(u.stats.confidence + 8, 0, 100); u.stats.stress = clamp(u.stats.stress - 4, 0, 100);
  for (const o of G.units) if (o.alive && o.team === u.team && o !== u) o.stats.confidence = clamp(o.stats.confidence + 2, 0, 100);
}
// Evento: cae un aliado → sube el estrés y baja la confianza de los cercanos.
function onAllyLost(lost) {
  for (const o of G.units) if (o.alive && o.team === lost.team) {
    const k = 1 - teamShield(o);                                           // Koume amortigua el golpe a las aliadas cercanas
    o.stats.stress = clamp(o.stats.stress + (dist(o.x, o.y, lost.x, lost.y) < 400 ? 18 : 12) * k, 0, 100);
    o.stats.confidence = clamp(o.stats.confidence - 12 * k, 0, 100);
  }
}
// Espíritu de equipo (Koume): fracción del golpe de moral que se evita si hay una comandante con esa pasiva cerca.
function teamShield(o) {
  for (const c of G.units) {
    if (!c.alive || c.team !== o.team || !c.commanderId) continue;
    const p = passiveOf(c);
    if (p && p.shield && dist(c.x, c.y, o.x, o.y) <= p.radius) return p.shield;
  }
  return 0;
}
// Evento: un proyectil pasa cerca → sube un poco el estrés.
function onNearMiss(u) { u.stats.stress = clamp(u.stats.stress + 4, 0, 100); u.lastUnderFireT = G.time; }
// Evento: la unidad cumple una orden → gana algo de confianza.
function onOrderDone(u) { u.stats.confidence = clamp(u.stats.confidence + 1.5, 0, 100); }


// =====================================================================
// COMANDANTES / PASIVAS
// =====================================================================
function applyPassives(dt) {
  for (const c of G.units) {
    if (!c.alive || !c.commanderId) continue;
    const cm = COMMANDERS[c.commanderId]; if (!cm || !cm.passive) continue;
    const p = cm.passive; if (!p.apply) continue;               // las pasivas propias no actúan sobre otros
    for (const u of G.units) {
      if (!u.alive || u.team !== c.team || u === c) continue;
      const d = dist(c.x, c.y, u.x, u.y);
      if (d <= p.radius) p.apply(u, c, d, dt);
    }
  }
}


// =====================================================================
// RECONOCIMIENTO / NIEBLA DE GUERRA
//  · Cada tanque del jugador ve en un radio, tapado por obstáculos opacos.
//  · Los enemigos solo se dibujan si están "spotted": en visión, o revelados
//    por disparar / ser alcanzados (CONFIG.spotSeconds).
//  · Al perder de vista a un enemigo queda su "última posición conocida".
//  · La zona explorada queda semitransparente; la no explorada, oscura.
// =====================================================================
const FOG = { canvas: null, ctx: null, explored: null, exCtx: null };

// Crea los canvas de niebla de guerra: zona visible ahora y zona ya explorada.
function initFog() {
  const s = CONFIG.fogScale, w = Math.ceil(MAP.w * s), h = Math.ceil(MAP.h * s);
  FOG.canvas = document.createElement('canvas'); FOG.canvas.width = w; FOG.canvas.height = h; FOG.ctx = FOG.canvas.getContext('2d');
  FOG.explored = document.createElement('canvas'); FOG.explored.width = w; FOG.explored.height = h; FOG.exCtx = FOG.explored.getContext('2d');
}
// CRÍTICA · Calcula el polígono de visión de una unidad lanzando rayos en todas direcciones (se detienen en obstáculos).
function computeVisPoly(u) {
  const R = u.spec.vision, n = CONFIG.fogRays, pts = new Float32Array(n * 2), off = ((u.id * 0.37) % 1) * (TAU / n);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + off, dx = Math.cos(a), dy = Math.sin(a), d = rayDist(u.x, u.y, dx, dy, R);
    pts[i * 2] = u.x + dx * d; pts[i * 2 + 1] = u.y + dy * d;
  }
  return pts;
}
// Traza un polígono a partir de un arreglo plano de coordenadas.
function polyPathF32(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }

// CRÍTICA · Actualiza la niebla de guerra y decide qué enemigos ve el jugador; si ve a alguno, dispara la emboscada (parte 2).
function updateRecon() {
  const ps = players();
  for (const p of ps) p.visPoly = computeVisPoly(p);
  for (const e of enemies()) {
    let vis = false;
    // Los emboscadores en altura están camuflados: solo se ven de cerca (o cuando disparan)
    // Un tanque escondido entre los árboles no se ve hasta que sale del bosque (o si alguien pasa casi pegado a él)
    if (e.hideIn) { for (const p of ps) if (dist(p.x, p.y, e.x, e.y) <= 62) { vis = true; break; } }
    else for (const p of ps) if (dist(p.x, p.y, e.x, e.y) <= p.spec.vision * (e.high ? 0.62 : 1) && !losBlocked(p.x, p.y, e.x, e.y)) { vis = true; break; }
    e.visNow = vis;
    const was = e.spotted;
    e.spotted = vis || G.time < e.spottedUntil;
    if (e.spotted) {
      e.lastKnown = { x: e.x, y: e.y, t: G.time };
      if (!was && G.time - e.announcedT > 6) { e.announcedT = G.time; toast(e.role === 'flag' && curPart().flagWins ? '¡TANQUE BANDERA AVISTADO!' : '¡ENEMIGO AVISTADO: ' + e.name + '!', 'alert'); }
    }
  }
  // EMBOSCADA (parte 2): se dispara en cuanto el jugador VE a alguno de los tanques enemigos
  if (!G.sprung && curPart().ambush && !G.cine) { const sp = enemies().find(e => e.visNow); if (sp) springAmbush(sp); }
  // Memoria de zona explorada + niebla actual
  const s = CONFIG.fogScale, ex = FOG.exCtx;
  ex.setTransform(s, 0, 0, s, 0, 0); ex.fillStyle = '#fff';
  for (const p of ps) { polyPathF32(ex, p.visPoly); ex.fill(); }
  const g = FOG.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, FOG.canvas.width, FOG.canvas.height);
  g.fillStyle = 'rgba(10,13,15,0.84)'; g.fillRect(0, 0, FOG.canvas.width, FOG.canvas.height);
  g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.5; g.drawImage(FOG.explored, 0, 0); g.globalAlpha = 1;
  g.setTransform(s, 0, 0, s, 0, 0); g.fillStyle = '#000';
  for (const p of ps) { polyPathF32(g, p.visPoly); g.fill(); }
  g.globalCompositeOperation = 'source-over';
}
// Lanza la emboscada: todos los enemigos salen de su espera (con un pequeño retraso cada uno) y atacan.
function springAmbush(spotter) {
  G.sprung = true;
  const ps = players();
  for (const e of enemies()) {
    if (!e.ai) continue;
    let t = ps[0]; for (const p of ps) if (dist(p.x, p.y, e.x, e.y) < dist(t.x, t.y, e.x, e.y)) t = p;
    e.ai.react = G.time + 0.25 + Math.random() * 0.9;
    e.ai.knows = true; e.ai.alertedAt = G.time;
    if (t) e.ai.lastSeen = { x: t.x, y: t.y, t: G.time };
  }
  for (const p of ps) p.stats.stress = clamp(p.stats.stress + 8, 0, 100);
  toast('¡EMBOSCADA!', 'alert');
}
// ¿Algún tanque del jugador ve ahora mismo este punto del mapa?
function visibleToPlayer(x, y) {
  for (const p of players()) if (dist(p.x, p.y, x, y) <= p.spec.vision && !losBlocked(p.x, p.y, x, y)) return true;
  return false;
}


// =====================================================================
// MOVIMIENTO
// Orden = lista de waypoints calculada con A* sobre la geometría real.
// Cada paso se valida contra los polígonos: nunca se atraviesa un obstáculo.
// =====================================================================
function issueMove(u, x, y, opts) {
  const path = findPath(u.x, u.y, x, y);
  if (!path || !path.length) return false;
  const last = path[path.length - 1];
  u.order = { path, i: 0, dest: { x: last.x, y: last.y }, delay: u.team === 'player' ? orderDelay(u) : 0, replans: 0, ai: !!(opts && opts.ai), face: opts && opts.face };
  u.faceTo = undefined; u.stuckT = 0; u.stuckRef = { x: u.x, y: u.y };
  return true;
}
// Cancela la orden actual de la unidad.
function cancelOrder(u) { u.order = null; }

// CRÍTICA · Mueve cada tanque siguiendo su ruta: gira el casco, acelera según el terreno/ánimo y evita atravesar obstáculos.
function updateMovement(u, dt) {
  const o = u.order;
  if (!o) {                                            // al llegar en formación, se orienta hacia el frente
    if (u.faceTo !== undefined) { const d = angDiff(u.faceTo, u.heading), t = u.spec.hull * dt; if (Math.abs(d) <= t) { u.heading = u.faceTo; u.faceTo = undefined; } else u.heading += Math.sign(d) * t; }
    return;
  }
  if (o.delay > 0) { o.delay -= dt; return; }
  const wp = o.path[o.i], dx = wp.x - u.x, dy = wp.y - u.y, d = Math.hypot(dx, dy);
  const last = o.i === o.path.length - 1;
  if (d < (last ? 6 : 12)) {
    o.i++;
    if (o.i >= o.path.length) { u.faceTo = o.face; u.order = null; if (u.team === 'player') onOrderDone(u); }
    return;
  }
  const desired = Math.atan2(dy, dx), diff = angDiff(desired, u.heading), turn = u.spec.hull * dt;
  u.heading += clamp(diff, -turn, turn);
  const nd = angDiff(desired, u.heading);
  let adv = u.spec.speed * speedMult(u) * dt * (Math.abs(nd) > 1.3 ? 0 : Math.max(0, Math.cos(nd)));
  adv = Math.min(adv, d);
  const nx = u.x + Math.cos(u.heading) * adv, ny = u.y + Math.sin(u.heading) * adv;
  const hz = u.hideIn || undefined;                                    // escondido en un bosque: ese bosque no le bloquea mientras siga dentro
  if (!blockedAt(nx, ny, u.r, hz)) { u.x = nx; u.y = ny; }
  else if (!blockedAt(nx, u.y, u.r, hz)) u.x = nx;
  else if (!blockedAt(u.x, ny, u.r, hz)) u.y = ny;
  if (u.hideIn && !blockedAt(u.x, u.y, u.r)) u.hideIn = null;           // ya salió del bosque: ahora sí se ve y colisiona normal
  // Atasco → recalcular ruta; si falla varias veces, cancelar
  u.stuckT += dt;
  if (u.stuckT > 0.7) {
    const moved = u.stuckRef ? dist(u.x, u.y, u.stuckRef.x, u.stuckRef.y) : 99;
    u.stuckT = 0; u.stuckRef = { x: u.x, y: u.y };
    if (moved < 4) {
      o.replans++;
      const np = o.replans < 4 ? findPath(u.x, u.y, o.dest.x, o.dest.y) : null;
      if (np && np.length) { o.path = np; o.i = 0; }
      else { u.order = null; if (u.team === 'player') toast('RUTA BLOQUEADA — ' + u.name, 'warn'); }
    }
  }
}

// Evita que los tanques se superpongan (sin empujar a nadie contra un obstáculo)
function separateUnits() {
  const L = G.units.filter(u => u.alive);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.95;
    if (d >= min || d < 0.01) continue;
    const push = (min - d) / 2, nx = dx / d, ny = dy / d;
    if (!blockedAt(a.x - nx * push, a.y - ny * push, a.r, a.high || a.hideIn || undefined)) { a.x -= nx * push; a.y -= ny * push; }
    if (!blockedAt(b.x + nx * push, b.y + ny * push, b.r, b.high || b.hideIn || undefined)) { b.x += nx * push; b.y += ny * push; }
  }
}


// =====================================================================
// COMBATE
// Cada tanque elige el enemigo más cercano que pueda ver y alcanzar,
// gira la torreta, y dispara cuando está alineado y recargado.
// La precisión depende de la distancia y de la estabilidad (ver stats).
// =====================================================================
const PROJECTILE_SPEED = 1150;

// ¿La unidad u puede atacar al objetivo t? (vivo, en alcance, visible y con línea de tiro libre).
function canEngage(u, t) {
  if (!t.alive) return false;
  const d = dist(u.x, u.y, t.x, t.y);
  if (d > u.spec.range) return false;
  if (u.team === 'player' && !t.spotted) return false;                         // el jugador solo dispara a lo que ve
  if (u.team === 'enemy' && d > u.spec.vision) return false;                  // el enemigo solo dispara a lo que ve
  return !losBlocked(u.x, u.y, t.x, t.y);
}
const holding = u => !!(u.ai && u.ai.hold && (!G.sprung || G.time < u.ai.react));     // emboscada: aún no ataca
// Elige el enemigo más cercano al que se pueda atacar (nada si está en emboscada).
function pickTarget(u) {
  if (holding(u)) return null;
  let best = null, bd = 1e9;
  const foes = u.team === 'player' ? enemies() : players();
  for (const t of foes) {
    const d = dist(u.x, u.y, t.x, t.y);
    if (d < bd && canEngage(u, t)) { best = t; bd = d; }
  }
  return best;
}

// ATAQUE DIRIGIDO: el tanque fija como objetivo al enemigo marcado; si no lo alcanza, se acerca
// (por el camino normal, respetando obstáculos) hasta quedar a ~70 % de su alcance y con línea de tiro.
function focusFire(u, dt) {
  const f = u.focus;
  if (!f.alive || !f.spotted) { u.focus = null; if (u.order && u.order.chase) u.order = null; return; }
  if (canEngage(u, f)) {
    u.target = f;
    if (u.order && u.order.chase && dist(u.x, u.y, f.x, f.y) <= u.spec.range * 0.9) u.order = null;
    return;
  }
  u.chaseT = (u.chaseT || 0) - dt;
  if (u.chaseT > 0) return;
  u.chaseT = 0.6;
  if (u.order && !u.order.chase) return;                                     // respeta una orden de movimiento posterior
  if (u.order && dist(u.order.dest.x, u.order.dest.y, f.x, f.y) < u.spec.range * 0.8) return;   // ya va hacia allí
  const d = dist(u.x, u.y, f.x, f.y) || 1, k = u.spec.range * 0.7;
  let ok = issueMove(u, f.x - (f.x - u.x) / d * k, f.y - (f.y - u.y) / d * k) || issueMove(u, f.x, f.y);
  if (ok) { u.order.chase = true; u.order.delay = 0; }
  else { u.focus = null; if (u.team === 'player') { toast('OBJETIVO INACCESIBLE', 'warn'); playUi('error'); } }
}
// Ordena a un grupo de unidades atacar a un enemigo concreto.
function commandAttack(units, foe) {
  units = units.filter(u => u && u.alive && u.team === 'player'); if (!units.length || !foe.alive || G.over) return;
  for (const u of units) { u.focus = foe; u.chaseT = 0; if (u.order && !u.order.chase) u.order = null; }
  toast('ATACAR: ' + foe.name.toUpperCase(), 'good');
}
// CRÍTICA · Cada fotograma: busca objetivo, gira la torreta (el StuG gira el casco), recarga y dispara.
function updateCombat(u, dt) {
  u.targetT -= dt;
  if (u.targetT <= 0) { u.targetT = 0.22; u.target = pickTarget(u); }
  else if (u.target && (!u.target.alive || dist(u.x, u.y, u.target.x, u.target.y) > u.spec.range * 1.05)) u.target = null;
  u.cooldown -= dt;

  if (u.focus) focusFire(u, dt);                         // ataque dirigido (clic derecho sobre un enemigo)
  const tgt = u.target;
  let want = u.heading;
  if (tgt) want = Math.atan2(tgt.y - u.y, tgt.x - u.x);
  else if (u.ai && u.ai.ambush) want = u.heading + Math.sin(G.time * 0.35 + u.id * 2) * 0.9;     // el emboscador barre el terreno con la torreta
  if (u.spec.fixedGun) {                                  // sin torreta (StuG III): para apuntar gira TODO el casco, y lo hace despacio
    if (tgt && !u.order) { const dh = angDiff(want, u.heading), th = u.spec.hull * dt; u.heading += clamp(dh, -th, th); }
    u.turret = u.heading;
  } else {
    const diff = angDiff(want, u.turret), turn = u.spec.turret * dt;
    u.turret += clamp(diff, -turn, turn);
  }
  if (!tgt) return;
  if (u.cooldown <= 0 && Math.abs(angDiff(want, u.turret)) < 0.07 && !losBlocked(u.x, u.y, tgt.x, tgt.y)) fireAt(u, tgt);
}

// CRÍTICA · Dispara: calcula dispersión según estabilidad, crea el proyectil y los efectos de sonido y humo.
function fireAt(u, t) {
  const s = u.spec, d = dist(u.x, u.y, t.x, t.y);
  u.cooldown = s.reload * reloadMult(u) * (0.92 + Math.random() * 0.16);
  u.lastFireT = G.time;
  let p = s.accuracy * accMult(u) * (1 - 0.35 * d / s.range);
  if (u.order) p *= 0.85;                                                         // disparar en marcha es menos preciso
  const hit = Math.random() < p;
  const err = hit ? (Math.random() - 0.5) * 0.012 : (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.09);
  const a = Math.atan2(t.y - u.y, t.x - u.x) + err, mz = u.r + 12;
  const mx = u.x + Math.cos(u.turret) * mz, my = u.y + Math.sin(u.turret) * mz;
  G.projectiles.push({ x: mx, y: my, px: mx, py: my, dx: Math.cos(a), dy: Math.sin(a), travelled: 0, max: s.range + 60, dmg: s.damage * (0.88 + Math.random() * 0.24), owner: u, team: u.team, near: new Set(), ign: ignAt(u.x, u.y, t.x, t.y) });
  const showFx = u.team === 'player' || visibleToPlayer(u.x, u.y);
  if (showFx) { muzzleFx(mx, my, u.turret); playFire(u); }
  else playFire(u, true);
  if (u.team === 'enemy') { u.spottedUntil = Math.max(u.spottedUntil, G.time + CONFIG.spotSeconds); if (u.ai) alertEnemies(u.x, u.y, 520, u); }
  // el disparo "hacia atrás" (retroceso visual)
  u.recoil = 1;
}

// CRÍTICA · Mueve los proyectiles y detecta impactos contra tanques y obstáculos; aplica daño y efectos.
function updateProjectiles(dt) {
  const L = G.projectiles;
  for (let i = L.length - 1; i >= 0; i--) {
    const p = L[i];
    let step = PROJECTILE_SPEED * dt, done = false, hx = 0, hy = 0, hitUnit = null, onWall = false;
    if (p.travelled + step > p.max) step = p.max - p.travelled, done = true;
    p.px = p.x; p.py = p.y;
    // ¿obstáculo opaco en este tramo?
    const rd = rayDist(p.x, p.y, p.dx, p.dy, step, p.ign);
    let len = step;
    if (rd < step) { len = rd; done = true; onWall = true; }
    const ex = p.x + p.dx * len, ey = p.y + p.dy * len;
    // ¿unidad enemiga en el tramo?
    let bestT = len + 1;
    for (const u of G.units) {
      if (!u.alive || u.team === p.team) continue;
      const vx = u.x - p.x, vy = u.y - p.y, tproj = vx * p.dx + vy * p.dy;
      if (tproj < -u.r || tproj > len + u.r) {
        continue;
      }
      const cx = p.x + p.dx * clamp(tproj, 0, len), cy = p.y + p.dy * clamp(tproj, 0, len);
      const dd = Math.hypot(u.x - cx, u.y - cy);
      if (dd <= u.r + 1) { if (tproj < bestT) { bestT = Math.max(0, tproj); hitUnit = u; } }
      else if (dd < 46 && !p.near.has(u.id)) { p.near.add(u.id); onNearMiss(u); }  // pasó cerca → susto
    }
    if (hitUnit) { len = Math.min(len, bestT); done = true; onWall = false; }
    hx = p.x + p.dx * len; hy = p.y + p.dy * len;
    p.x = hx; p.y = hy; p.travelled += len;
    if (hitUnit) {
      impactFx(hx, hy, 'tank', p.dx, p.dy);
      applyDamage(hitUnit, p.dmg, p.owner);
    } else if (done) {
      if (onWall) impactFx(hx, hy, 'wall', p.dx, p.dy); else impactFx(hx, hy, 'ground', p.dx, p.dy);
    }
    if (done) L.splice(i, 1);
  }
}

// CRÍTICA · Resta vida al tanque, avisa a los sistemas de ánimo/IA/voz y lo destruye si la vida llega a 0.
function applyDamage(t, dmg, attacker) {
  if (!t.alive || G.over) return;
  t.stats.hp = Math.max(0, t.stats.hp - dmg);
  onUnitDamaged(t, dmg);
  t.hitFlash = 1;
  if (attacker && attacker.alive) onUnitScoredHit(attacker);
  if (t.team === 'enemy') {
    t.spottedUntil = Math.max(t.spottedUntil, G.time + CONFIG.spotSeconds);
    if (t.ai) { t.ai.knows = true; alertEnemies(attacker ? attacker.x : t.x, attacker ? attacker.y : t.y, 600, t, true); }
  }
  if (t.commanderId && t.stats.hp > 0) playVoice(t.commanderId, 'hit');
  if (t.stats.hp <= 0) destroyUnit(t, attacker);
}

// CRÍTICA · Destruye un tanque: lo deja como restos, avisa a sus aliados y comprueba victoria/derrota.
function destroyUnit(u, killer) {
  u.alive = false; u.order = null; u.target = null;
  G.wrecks.push({ x: u.x, y: u.y, heading: u.heading, turret: u.turret + (Math.random() - 0.5) * 0.6, tankKey: u.tankKey, commander: !!u.commanderId, t: 0, smokeT: 0, role: u.role, team: u.team });
  explosionFx(u.x, u.y);
  playFire(u, false, 'boom');
  if (G.group.includes(u)) { G.group = G.group.filter(x => x !== u); G.selected = G.group[0] || null; }
  if (G.selected === u) G.selected = null;
  if (G.inspect === u) G.inspect = null;
  if (killer && killer.alive) { onUnitKill(killer); }
  onAllyLost(u);
  if (killer && killer.team === 'player' && commanderUnit() && commanderUnit().alive) playVoice(commanderUnit().commanderId, 'kill');
  if (u.team === 'enemy' && u.role === 'flag' && curPart().flagWins) { triggerVictory(); return; }
  if (u.team === 'player') {
    if (u.commanderId) { triggerDefeat('¡El comandante ha sido destruido!'); return; }
    toast('UNIDAD PERDIDA: ' + u.name, 'warn');
    if (!players().length) triggerDefeat('Todas las unidades fueron destruidas');
  } else { toast('ENEMIGO DESTRUIDO: ' + u.name, 'good'); }
}


// =====================================================================
// EFECTOS VISUALES (destello de boca, impactos, humo, explosiones)
// =====================================================================
function addFx(o) { if (G.fx.length >= CONFIG.maxFx) G.fx.shift(); G.fx.push(o); }
// Fogonazo y humo de la boca del cañón.
function muzzleFx(x, y, ang) {
  addFx({ k: 'flash', x, y, a: ang, t: 0, life: 0.09, size: 20 });
  for (let i = 0; i < 5; i++) { const a = ang + (Math.random() - 0.5) * 0.7, v = 60 + Math.random() * 110; addFx({ k: 'smoke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.5 + Math.random() * 0.4, size: 4 + Math.random() * 4, col: '230,230,225' }); }
}
// Chispas / tierra del impacto según contra qué choca.
function impactFx(x, y, kind, dx, dy) {
  const vis = visibleToPlayer(x, y); if (!vis) return;
  if (kind === 'tank') {
    addFx({ k: 'ring', x, y, t: 0, life: 0.35, size: 34, col: '255,200,90' });
    for (let i = 0; i < 9; i++) { const a = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 2.2, v = 80 + Math.random() * 200; addFx({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.25 + Math.random() * 0.25, size: 2 }); }
    for (let i = 0; i < 4; i++) addFx({ k: 'smoke', x, y, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, t: 0, life: 0.8 + Math.random() * 0.5, size: 6 + Math.random() * 6, col: '90,90,88' });
  } else {
    const col = kind === 'wall' ? '110,100,80' : '120,105,80';
    addFx({ k: 'ring', x, y, t: 0, life: 0.3, size: 20, col: '230,210,150' });
    for (let i = 0; i < 6; i++) addFx({ k: 'smoke', x, y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, t: 0, life: 0.6 + Math.random() * 0.5, size: 5 + Math.random() * 6, col });
  }
}
// Explosión de un tanque destruido.
function explosionFx(x, y) {
  if (!visibleToPlayer(x, y)) return;
  addFx({ k: 'ring', x, y, t: 0, life: 0.6, size: 70, col: '255,170,60' });
  addFx({ k: 'flash', x, y, a: 0, t: 0, life: 0.2, size: 46 });
  for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 220; addFx({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.4 + Math.random() * 0.5, size: 2.5 }); }
  for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, v = 20 + Math.random() * 60; addFx({ k: 'smoke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 1.4 + Math.random() * 1.2, size: 10 + Math.random() * 10, col: '50,50,48' }); }
}
// Avanza y elimina los efectos visuales.
function updateFx(dt) {
  const L = G.fx;
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i]; f.t += dt;
    if (f.t >= f.life) { L.splice(i, 1); continue; }
    if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94; }
  }
  for (const w of G.wrecks) {                                                        // los restos humean
    w.t += dt; w.smokeT -= dt;
    if (w.smokeT <= 0 && w.t < 40 && G.fx.length < CONFIG.maxFx * 0.8 && visibleToPlayer(w.x, w.y)) {
      w.smokeT = 0.35 + Math.random() * 0.3;
      addFx({ k: 'smoke', x: w.x + (Math.random() - 0.5) * 8, y: w.y + (Math.random() - 0.5) * 8, vx: 4 + Math.random() * 8, vy: -14 - Math.random() * 10, t: 0, life: 1.6 + Math.random(), size: 7 + Math.random() * 5, col: '40,40,38' });
    }
  }
}


// =====================================================================
// IA ENEMIGA
//  · Los tanques de Pravda vigilan su puesto.
//  · Si ven a un enemigo (o reciben fuego / aviso) se acercan hasta tenerlo
//    a tiro, y si lo pierden de vista van a su última posición conocida.
//  · El tanque bandera es más cauto: no se aleja demasiado de su puesto.
// =====================================================================
function alertEnemies(x, y, radius, source, strong) {
  for (const e of enemies()) {
    if (e === source || !e.ai) continue;
    if (dist(e.x, e.y, x, y) > radius && !(strong && dist(e.x, e.y, source.x, source.y) < radius)) continue;
    e.ai.lastSeen = { x, y, t: G.time }; e.ai.knows = true; e.ai.alertedAt = G.time;
  }
}

// CRÍTICA · IA enemiga: patrulla, persigue, se detiene a disparar o se queda quieta en la meseta/bosque según su tipo.
function updateEnemyAI(u, dt) {
  const ai = u.ai; if (!ai) return;
  if (holding(u)) return;                                  // emboscada de la parte 2: quietos hasta que el jugador vea a alguien
  // EMBOSCADA: los tanques en altura no patrullan ni bajan; esperan quietos y disparan al verte
  if (ai.ambush) { return; }
  ai.sense -= dt; ai.repath -= dt;
  const flag = u.role === 'flag', leash = flag ? 230 : 700;

  if (ai.sense <= 0) {
    ai.sense = 0.25;
    let seen = null, bd = 1e9;
    for (const p of players()) {
      const d = dist(u.x, u.y, p.x, p.y);
      if (d <= u.spec.vision && d < bd && !losBlocked(u.x, u.y, p.x, p.y)) { seen = p; bd = d; }
    }
    if (seen) { if (!ai.knows) alertEnemies(seen.x, seen.y, 560, u); ai.knows = true; ai.seen = seen; ai.lastSeen = { x: seen.x, y: seen.y, t: G.time }; }
    else ai.seen = null;
  }

  const tgt = u.target;
  if (tgt && tgt.alive) {
    // En combate: mantener la distancia de tiro; la bandera se queda cerca del puesto
    const d = dist(u.x, u.y, tgt.x, tgt.y), ideal = u.spec.range * 0.78;
    if (d > ideal && ai.repath <= 0 && (!flag || dist(u.x, u.y, ai.post.x, ai.post.y) < leash)) {
      ai.repath = 1.2;
      const k = (d - ideal * 0.9) / d;
      issueMove(u, u.x + (tgt.x - u.x) * k, u.y + (tgt.y - u.y) * k, { ai: true });
    } else if (d <= ideal && u.order && u.order.ai && !flag && Math.random() < dt * 1.5) { /* sigue avanzando un poco */ }
    else if (d <= ideal * 0.95) cancelOrder(u);
    // Estrés muy alto: retrocede hacia su puesto
    if (u.mood === 'PÁNICO' && ai.repath <= 0) { ai.repath = 2.5; issueMove(u, ai.post.x, ai.post.y, { ai: true }); }
    return;
  }
  if (ai.knows && ai.lastSeen) {
    // Sin blanco: ir a la última posición conocida del jugador y buscar allí unos segundos
    const ls = ai.lastSeen, age = G.time - ls.t;
    if (age > 14) { ai.knows = false; ai.lastSeen = null; issueMove(u, ai.post.x, ai.post.y, { ai: true }); return; }
    const far = dist(u.x, u.y, ls.x, ls.y) > 60;
    if (far && (!u.order || ai.repath <= 0) && dist(ls.x, ls.y, ai.post.x, ai.post.y) < leash + 200) {
      ai.repath = 2;
      if (!issueMove(u, ls.x, ls.y, { ai: true })) { ai.knows = false; ai.lastSeen = null; }
    }
    return;
  }
  // Vigilancia: pequeñas patrullas alrededor del puesto
  if (!u.order && ai.repath <= 0) {
    ai.repath = 4 + Math.random() * 5;
    if (flag) { u.heading += (Math.random() - 0.5) * 0.8; return; }
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * TAU, r = 60 + Math.random() * 110, x = ai.post.x + Math.cos(a) * r, y = ai.post.y + Math.sin(a) * r;
      if (!blockedAt(x, y, u.r + 4) && issueMove(u, x, y, { ai: true })) break;
    }
  }
}


// =====================================================================
// AUDIO
// Tres volúmenes independientes:
//   VOL.ui    → botones e interfaz (slider "Volumen de botones")
//   VOL.sfx   → disparos y explosiones (bajo por defecto, variable propia)
//   VOL.voice → voces del comandante
// =====================================================================
const VOL = Object.assign({}, VOLUME_DEFAULTS);
(function loadVolumes() {
  for (const k of Object.keys(VOL)) {
    try { const v = parseFloat(localStorage.getItem(VOLUME_STORAGE_PREFIX + k)); if (!isNaN(v)) VOL[k] = clamp(v, 0, 1); } catch (e) { /* sin almacenamiento */ }
  }
})();
// Cambia el volumen de una categoría (ui, sfx, voz, motor) y lo guarda.
function setVolume(kind, v) {
  VOL[kind] = clamp(v, 0, 1);
  try { localStorage.setItem(VOLUME_STORAGE_PREFIX + kind, String(VOL[kind])); } catch (e) { /* ignorar */ }
}

// Volúmenes GLOBALES compartidos con el menú principal (mismas claves de localStorage):
//   master = todo · music = música del menú · effects = botones, tanques, disparos, motores y voces
const GVOL = { master: 1, music: 0.6, effects: 1 };
const GVOL_KEYS = { master: 'pv_masterVol', music: 'pv_musicVol', effects: 'pv_sfxVol' };
(function loadGlobalVolumes() {
  for (const k of Object.keys(GVOL)) { try { const v = parseFloat(localStorage.getItem(GVOL_KEYS[k])); if (!isNaN(v)) GVOL[k] = clamp(v, 0, 1); } catch (e) { /* sin almacenamiento */ } }
})();
// Cambia el volumen general / música / efectos y lo guarda en el navegador.
function setGlobalVolume(kind, v) {
  GVOL[kind] = clamp(v, 0, 1);
  try { localStorage.setItem(GVOL_KEYS[kind], String(GVOL[kind])); } catch (e) { /* ignorar */ }
}
const fxGain = () => GVOL.master * GVOL.effects;                 // factor que se aplica a TODOS los efectos de sonido

const AUD = { cache: {}, bags: {}, voiceLast: {}, fireIdx: 0, engT: 0 };
// Reproduce un sonido (cacheado y clonado para poder solaparlos).
function playClip(url, vol) {
  if (vol <= 0.002) return;
  try {
    let a = AUD.cache[url];
    if (!a) { a = AUD.cache[url] = new Audio(encodeURI(ROOT + url)); a.preload = 'auto'; }
    const c = a.cloneNode(); c.volume = clamp(vol * fxGain(), 0, 1);       // volumen del efecto × maestro × efectos
    const p = c.play(); if (p && p.catch) p.catch(() => {});
  } catch (e) { /* audio no disponible */ }
}
// Averigua el número CH de la carpeta de voces de un comandante probando ACT_COM_CHnn_001.wav (nn = 01…99).
// Si c.ch ya está escrito no busca nada. El primer archivo que carga fija las voces (mkVoices) y las precarga.
function detectVoiceCh(c) {
  if (c.ch) { c.voices = mkVoices(c.ch); return Promise.resolve(c.ch); }
  return new Promise(resolve => {
    let left = 99, done = false;
    const finish = ch => {
      if (done) return; done = true;
      if (ch) {
        c.ch = ch; c.voices = mkVoices(ch);
        for (const list of Object.values(c.voices)) for (const f of list) { try { const a = new Audio(encodeURI(ROOT + c.voiceDir + f)); a.preload = 'auto'; AUD.cache[c.voiceDir + f] = a; } catch (e) { /* ignorar */ } }
      } else console.warn('[Kuromorimine 1] No se encontraron voces en ' + c.voiceDir + ' (se esperaba ACT_COM_CHnn_001.wav)');
      resolve(ch);
    };
    for (let n = 1; n <= 99; n++) {
      const ch = String(n).padStart(2, '0'), a = new Audio();
      a.preload = 'metadata';
      a.addEventListener('loadedmetadata', () => finish(ch), { once: true });
      a.addEventListener('error', () => { if (--left === 0) finish(null); }, { once: true });
      a.src = encodeURI(ROOT + c.voiceDir + 'ACT_COM_CH' + ch + '_001.wav');
    }
    setTimeout(() => finish(null), 8000);
  });
}
// Precarga los sonidos para que no haya retraso al sonar.
function preloadAudio() {
  const urls = [...Object.values(AUDIO_PATHS.ui), ...AUDIO_PATHS.fire, AUDIO_PATHS.engine];
  for (const c of Object.values(COMMANDERS)) for (const list of Object.values(c.voices)) for (const f of list) urls.push(c.voiceDir + f);
  for (const u of urls) { try { const a = new Audio(encodeURI(ROOT + u)); a.preload = 'auto'; AUD.cache[u] = a; } catch (e) { /* ignorar */ } }
}
// Bolsa mezclada: recorre todos los elementos sin repetir el mismo dos veces seguidas
function nextFromBag(id, list) {
  let b = AUD.bags[id];
  if (!b || !b.items.length) {
    const items = list.slice();
    for (let i = items.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [items[i], items[j]] = [items[j], items[i]]; }
    if (b && items.length > 1 && items[items.length - 1] === b.last) items.unshift(items.pop());
    b = AUD.bags[id] = { items, last: b ? b.last : null };
  }
  const v = b.items.pop(); b.last = v; return v;
}
// Motor de tanque: suena 2 s a volumen bajo y se desvanece suavemente (al seleccionar tanques genéricos)
function playEngine() {
  const now = performance.now(); if (now - AUD.engT < 350) return; AUD.engT = now;
  const url = AUDIO_PATHS.engine, v = clamp(VOL.engine * fxGain(), 0, 1); if (v <= 0.002) return;
  try {
    let a = AUD.cache[url]; if (!a) { a = AUD.cache[url] = new Audio(encodeURI(ROOT + url)); a.preload = 'auto'; }
    const c = a.cloneNode(); c.volume = clamp(v, 0, 1);
    const p = c.play(); if (p && p.catch) p.catch(() => {});
    const dur = 2000, fade = 800, t0 = performance.now();
    const iv = setInterval(() => {
      const e = performance.now() - t0;
      if (e >= dur) { clearInterval(iv); c.pause(); return; }
      c.volume = e < dur - fade ? clamp(v, 0, 1) : clamp(v * (1 - (e - (dur - fade)) / fade), 0, 1);
    }, 40);
  } catch (e) { /* audio no disponible */ }
}
// Sonido de interfaz (clic, decidir, error…).
function playUi(kind) { playClip(AUDIO_PATHS.ui[kind] || AUDIO_PATHS.ui.decide, VOL.ui); }

// Disparos S / M / L intercalados, atenuados con la distancia a la cámara
function playFire(u, far, boom) {
  const dCam = dist(u.x, u.y, G.cam.x, G.cam.y);
  let v = VOL.sfx * clamp(1.05 - dCam / 1500, 0.15, 1);
  if (far && dCam > 1100) return;
  if (far) v *= 0.5;
  const list = AUDIO_PATHS.fire;
  if (boom) { playClip(list[list.length - 1], v * 1.3); return; }
  playClip(nextFromBag('fire', list), v);
}
// Voces: cooldown por categoría + alternancia
function playVoice(cid, cat) {
  const c = COMMANDERS[cid]; if (!c || !c.voices[cat] || !c.voices[cat].length) return;   // sin voces (aún no detectadas) = silencio
  const now = performance.now() / 1000, key = cid + ':' + cat, cd = (c.voiceCooldown && c.voiceCooldown[cat]) || 1;
  if (now - (AUD.voiceLast[key] || -99) < cd) return;
  AUD.voiceLast[key] = now;
  playClip(c.voiceDir + nextFromBag(key, c.voices[cat]), VOL.voice);
}


// =====================================================================
// CÁMARA TÁCTICA
// =====================================================================
const cv = { el: null, g: null };
// Ajusta el canvas al tamaño de la ventana y a la densidad de píxeles.
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = window.innerWidth; view.h = window.innerHeight; view.dpr = dpr;
  const pw = Math.min(330, view.w * 0.34) + 24;                     // ancho que ocupa el panel derecho
  view.cx = (view.w - pw) / 2; view.cy = view.h / 2;
  cv.el.width = Math.round(view.w * dpr); cv.el.height = Math.round(view.h * dpr);
  cv.el.style.width = view.w + 'px'; cv.el.style.height = view.h + 'px';
}
// (view.cx, view.cy) = punto de pantalla donde cae el centro de la cámara (centrado en el área libre, a la izquierda del panel)
const worldToScreen = (x, y) => [(x - G.cam.x) * G.cam.zoom + view.cx, (y - G.cam.y) * G.cam.zoom + view.cy];
const screenToWorld = (sx, sy) => [(sx - view.cx) / G.cam.zoom + G.cam.x, (sy - view.cy) / G.cam.zoom + G.cam.y];

// Mantiene la cámara dentro de los límites del mapa.
function clampCamera() {
  const c = G.cam, z = c.zoom, m = 90;
  const x0 = view.cx / z - m, x1 = MAP.w + m - view.cx / z, y0 = view.cy / z - m, y1 = MAP.h + m - view.cy / z;
  c.x = x0 > x1 ? (x0 + x1) / 2 : clamp(c.x, x0, x1);
  c.y = y0 > y1 ? (y0 + y1) / 2 : clamp(c.y, y0, y1);
}
// Centra la cámara en un punto.
function centerOn(x, y) { G.cam.x = x; G.cam.y = y; clampCamera(); }
// Zoom centrado en la posición del ratón.
function zoomAt(sx, sy, factor) {
  const [wx, wy] = screenToWorld(sx, sy), c = G.cam;
  c.zoom = clamp(c.zoom * factor, CONFIG.zoom.min, CONFIG.zoom.max);
  c.x = wx - (sx - view.cx) / c.zoom; c.y = wy - (sy - view.cy) / c.zoom;
  clampCamera();
}
// Mueve la cámara con las teclas/bordes y suaviza el zoom.
function updateCamera(dt) {
  if (G.cine) return;                                  // durante las animaciones la cámara es automática
  const k = G.keys, sp = CONFIG.cameraKeySpeed / G.cam.zoom * dt;
  let dx = 0, dy = 0;
  if (k.a || k.arrowleft) dx -= 1; if (k.d || k.arrowright) dx += 1;
  if (k.w || k.arrowup) dy -= 1; if (k.s || k.arrowdown) dy += 1;
  if (dx || dy) { G.cam.x += dx * sp; G.cam.y += dy * sp; clampCamera(); }
}


// =====================================================================
// RENDER
//  pasada 1 (mundo): mapa → restos → niebla → unidades → proyectiles → efectos
//  pasada 2 (pantalla): nombres, barras de vida y mensajes sobre el mapa
// =====================================================================
function drawArrow(g, x1, y1, x2, y2, col, w, dash) {
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round';
  if (dash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 12 + w;
  g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - Math.cos(a - 0.45) * s, y2 - Math.sin(a - 0.45) * s); g.lineTo(x2 - Math.cos(a + 0.45) * s, y2 - Math.sin(a + 0.45) * s); g.closePath(); g.fill();
  g.restore();
}
const VIS_R = u => u.r * 1.3;                       // radio visual (el de colisión es u.r)

// Dibuja un tanque: casco, torreta y cañón rotados, con su imagen o forma de reemplazo.
function drawUnitBody(g, u, alpha, ghost) {
  const R = VIS_R(u), team = u.team === 'player' ? COLORS.player : COLORS.enemy;
  g.save(); g.translate(u.x, u.y); g.globalAlpha = alpha;
  // cañón (rumbo de la torreta)
  const rec = (u.recoil || 0) * 3;
  g.save(); g.rotate(u.turret);
  g.fillStyle = '#1c1f22'; g.fillRect(R * 0.2 - rec, -2.2, R + 9 - rec, 4.4);
  g.fillStyle = team; g.fillRect(R + 4 - rec, -3, 5, 6);
  g.restore();
  // base
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
  const im = unitImage(u);
  g.save(); g.beginPath(); g.arc(0, 0, R - 1.5, 0, TAU); g.clip();
  if (im && im.naturalWidth) {
    if (u.commanderId) { const s = Math.max((R * 2) / im.naturalWidth, (R * 2) / im.naturalHeight); g.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2 + R * 0.12, im.naturalWidth * s, im.naturalHeight * s); }
    else { const s = (R * 1.75) / im.naturalWidth; g.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
  } else {
    g.fillStyle = '#d8d6cc'; g.fillRect(-R, -R, R * 2, R * 2); g.fillStyle = team; g.font = 'bold ' + (R * 0.9) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(u.commanderId ? COMMANDERS[u.commanderId].name[0] : 'T', 0, 1);
  }
  g.restore();
  g.lineWidth = u.commanderId || u.role === 'flag' ? 3.2 : 2.4; g.strokeStyle = u.role === 'flag' ? COLORS.gold : team; g.setLineDash(ghost ? [4, 3] : []);
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.setLineDash([]);
  if (u.commanderId) { g.lineWidth = 1.4; g.strokeStyle = COLORS.gold; g.beginPath(); g.arc(0, 0, R + 3.2, 0, TAU); g.stroke(); }
  if (u.role === 'flag') {                                          // banderín del tanque bandera
    g.fillStyle = COLORS.gold; g.beginPath(); g.moveTo(-R * 0.7, -R - 3); g.lineTo(-R * 0.7, -R - 13); g.lineTo(-R * 0.7 + 10, -R - 9.5); g.lineTo(-R * 0.7, -R - 6); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-R * 0.7, -R - 2); g.lineTo(-R * 0.7, -R - 14); g.stroke();
  }
  if (u.hitFlash > 0) { g.globalAlpha = alpha * u.hitFlash * 0.7; g.fillStyle = '#ff3b2a'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); }
  g.restore();
}
// Dibuja los restos de un tanque destruido.
function drawWreck(g, w) {
  const R = CONFIG.unitRadius * 1.3;
  g.save(); g.translate(w.x, w.y); g.globalAlpha = 0.92;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(2, 3, R + 2, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = '#26282a'; g.fill();
  const im = IMGS['tank:' + w.tankKey];
  if (im && im.naturalWidth && !w.commander) { g.save(); g.beginPath(); g.arc(0, 0, R - 1, 0, TAU); g.clip(); g.globalAlpha = 0.45; g.filter = 'grayscale(1) brightness(.35)'; const s = (R * 1.75) / im.naturalWidth; g.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); g.restore(); }
  g.strokeStyle = '#7a2a1f'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.moveTo(-R * 0.5, -R * 0.5); g.lineTo(R * 0.5, R * 0.5); g.moveTo(R * 0.5, -R * 0.5); g.lineTo(-R * 0.5, R * 0.5); g.stroke();
  g.restore();
}

// Dibuja los efectos visuales (humo, fogonazos, chispas).
function drawFx(g) {
  for (const f of G.fx) {
    const k = f.t / f.life;
    if (f.k === 'flash') {
      g.save(); g.translate(f.x, f.y); g.rotate(f.a || 0); g.globalAlpha = 1 - k; const s = f.size * (0.6 + k * 0.6);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, s); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.4, 'rgba(255,190,70,.8)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.restore();
    } else if (f.k === 'ring') {
      g.strokeStyle = 'rgba(' + f.col + ',' + (1 - k) * 0.9 + ')'; g.lineWidth = 3 * (1 - k) + 0.5;
      g.beginPath(); g.arc(f.x, f.y, f.size * (0.2 + k * 0.8), 0, TAU); g.stroke();
    } else if (f.k === 'spark') {
      g.fillStyle = 'rgba(255,' + (200 - k * 120 | 0) + ',80,' + (1 - k) + ')'; g.fillRect(f.x - 1, f.y - 1, f.size, f.size);
    } else if (f.k === 'smoke') {
      g.fillStyle = 'rgba(' + f.col + ',' + (0.55 * (1 - k)) + ')'; g.beginPath(); g.arc(f.x, f.y, f.size * (0.6 + k * 0.9), 0, TAU); g.fill();
    }
  }
}
// Dibuja los proyectiles en vuelo.
function drawProjectiles(g) {
  g.lineCap = 'round';
  for (const p of G.projectiles) {
    if (p.team === 'enemy' && !visibleToPlayer(p.x, p.y)) continue;
    const tail = 46, x0 = p.x - p.dx * Math.min(tail, p.travelled), y0 = p.y - p.dy * Math.min(tail, p.travelled);
    const gr = g.createLinearGradient(x0, y0, p.x, p.y); gr.addColorStop(0, 'rgba(255,170,40,0)'); gr.addColorStop(1, 'rgba(255,245,190,1)');
    g.strokeStyle = gr; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(p.x, p.y); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 1.8, 0, TAU); g.fill();
  }
}

// Dirección de salida: el borde del mapa más cercano al punto de extracción
// CRÍTICA · Dibuja un fotograma completo: mapa, unidades, niebla, efectos y marcadores (pase del mundo + pase de pantalla).
function render() {
  const g = cv.g, c = G.cam, S = view.dpr * c.zoom;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#101416'; g.fillRect(0, 0, cv.el.width, cv.el.height);
  g.setTransform(S, 0, 0, S, view.dpr * (view.cx - c.x * c.zoom), view.dpr * (view.cy - c.y * c.zoom));
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (mapCanvas) g.drawImage(mapCanvas, 0, 0, MAP.w, MAP.h);

  // Restos: se ven si el jugador los vio alguna vez
  for (const w of G.wrecks) {
    if (!w.seen && (w.team === 'player' || visibleToPlayer(w.x, w.y))) w.seen = true;
    if (w.seen) drawWreck(g, w);
  }
  // Niebla (zona sin explorar oscura · explorada semitransparente · visión actual limpia)
  g.imageSmoothingEnabled = true; g.drawImage(FOG.canvas, 0, 0, MAP.w, MAP.h);


  // Pista de la zona del objetivo
  const flag = G.units.find(u => u.role === 'flag');
  if (CONFIG.objectiveHint && flag && flag.alive && !flag.spotted && !flag.lastKnown) {
    const hx = flag.x + 70, hy = flag.y + 55, pulse = 0.5 + 0.5 * Math.sin(G.time * 2);
    g.strokeStyle = 'rgba(196,64,47,' + (0.55 + pulse * 0.25) + ')'; g.lineWidth = 2.2 / c.zoom; g.setLineDash([10 / c.zoom, 8 / c.zoom]);
    g.beginPath(); g.arc(hx, hy, 230, 0, TAU); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(196,64,47,.07)'; g.fill();
  }

  // Última posición conocida de los enemigos que se perdieron de vista
  for (const e of enemies()) {
    if (e.spotted || !e.lastKnown) continue;
    const age = G.time - e.lastKnown.t; if (age > CONFIG.lastKnownSeconds) continue;
    const a = 0.65 * (1 - age / CONFIG.lastKnownSeconds), R = VIS_R(e);
    g.save(); g.globalAlpha = a; g.translate(e.lastKnown.x, e.lastKnown.y);
    g.strokeStyle = COLORS.enemy; g.lineWidth = 2.2; g.setLineDash([5, 4]); g.fillStyle = 'rgba(255,255,255,.45)';
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.stroke(); g.setLineDash([]);
    g.fillStyle = COLORS.enemy; g.font = 'bold ' + (R * 1.2) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 1);
    g.restore();
  }

  // Órdenes de movimiento
  const sel = G.selected, grp = G.group;
  for (const u of players()) {
    const o = u.order; if (!o) continue;
    const isSel = grp.includes(u), col = isSel ? 'rgba(255,224,110,.95)' : 'rgba(255,224,110,.35)';
    g.save(); g.strokeStyle = col; g.lineWidth = (isSel ? 2.2 : 1.4); g.setLineDash([7, 6]); g.beginPath(); g.moveTo(u.x, u.y);
    for (let i = o.i; i < o.path.length; i++) g.lineTo(o.path[i].x, o.path[i].y);
    g.stroke(); g.setLineDash([]);
    const d = o.dest; g.beginPath(); g.moveTo(d.x - 6, d.y - 6); g.lineTo(d.x + 6, d.y + 6); g.moveTo(d.x + 6, d.y - 6); g.lineTo(d.x - 6, d.y + 6); g.stroke(); g.restore();
  }
  // Selección
  for (const m of grp) if (m.alive) { g.strokeStyle = COLORS.gold; g.lineWidth = 2.4; g.beginPath(); g.arc(m.x, m.y, VIS_R(m) + 8, 0, TAU); g.stroke(); }
  if (sel && sel.alive) {
    if (sel.commanderId && sel.spec && passiveOf(sel) && passiveOf(sel).radius) { g.strokeStyle = 'rgba(240,207,106,.22)'; g.lineWidth = 1.2; g.setLineDash([6, 6]); g.beginPath(); g.arc(sel.x, sel.y, passiveOf(sel).radius, 0, TAU); g.stroke(); g.setLineDash([]); }
  }
  // Ataque dirigido: línea y mira roja sobre el enemigo marcado; anillo al pasar el cursor
  const marked = new Set();
  for (const u of players()) if (u.focus && u.focus.alive && u.focus.spotted) {
    marked.add(u.focus);
    if (grp.includes(u)) { g.save(); g.strokeStyle = 'rgba(220,70,55,.55)'; g.lineWidth = 1.6; g.setLineDash([3, 6]); g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(u.focus.x, u.focus.y); g.stroke(); g.restore(); }
  }
  if (G.hoverFoe && G.hoverFoe.alive) marked.add(G.hoverFoe);
  for (const m of marked) {
    const R = VIS_R(m) + 10, pulse = 1 + 0.08 * Math.sin(G.time * 6);
    g.save(); g.strokeStyle = 'rgba(230,70,55,.95)'; g.lineWidth = 2.4; g.beginPath(); g.arc(m.x, m.y, R * pulse, 0, TAU); g.stroke();
    g.beginPath(); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(m.x + ax * (R - 5), m.y + ay * (R - 5)); g.lineTo(m.x + ax * (R + 9), m.y + ay * (R + 9)); } g.stroke(); g.restore();
  }
  // Unidades
  for (const e of enemies()) if (e.spotted) drawUnitBody(g, e, 1);
  for (const u of players()) drawUnitBody(g, u, 1);
  drawProjectiles(g);
  drawFx(g);

  // Previsualización de arrastre: flecha + posiciones de la formación en el destino
  if (G.drag && G.drag.moved && G.drag.unit.alive) {
    const u = G.drag.unit, wx = G.mouse.wx, wy = G.mouse.wy, bad = blockedAt(wx, wy, u.r);
    const col = bad ? 'rgba(220,70,55,.95)' : 'rgba(255,235,120,.98)';
    drawArrow(g, u.x, u.y, wx, wy, col, 3, [9, 7]);
    const units = grp.includes(u) && grp.length > 1 ? grp.filter(m => m.alive) : [u];
    g.strokeStyle = col; g.lineWidth = 2;
    if (units.length > 1) for (const s of formationSlots(units, wx, wy)) {
      g.setLineDash([4, 4]); g.beginPath(); g.moveTo(s.unit.x, s.unit.y); g.lineTo(s.x, s.y); g.globalAlpha = 0.35; g.stroke(); g.globalAlpha = 1; g.setLineDash([]);
      g.beginPath(); g.arc(s.x, s.y, u.r + 3, 0, TAU); g.stroke();
    } else { g.beginPath(); g.arc(wx, wy, u.r + 4, 0, TAU); g.stroke(); }
  }

  // ---- pasada de pantalla ----
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round';
  const label = (txt, x, y, col) => { g.font = '700 12px Rajdhani, Bahnschrift, Arial Narrow, sans-serif'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(8,10,8,.9)'; g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y); };
  const labelUnit = (u, x, y, ghostTxt) => {
    const [sx, sy] = worldToScreen(x, y), off = VIS_R(u) * c.zoom + 5;
    if (sx < -80 || sy < -60 || sx > view.w + 80 || sy > view.h + 60) return;
    let yy = sy + off;
    if (!ghostTxt && c.zoom > 0.45) {
      const bw = 40, bh = 4, f = u.stats.hp / u.stats.maxHp;
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(sx - bw / 2 - 1, yy - 1, bw + 2, bh + 2);
      g.fillStyle = f > 0.5 ? '#6fbf5a' : f > 0.25 ? '#e0b43a' : '#d0432f'; g.fillRect(sx - bw / 2, yy, bw * f, bh);
      yy += bh + 3;
    }
    label(ghostTxt || u.name, sx, yy, u.team === 'player' ? '#e8f0fa' : '#ffd9d3');
  };
  for (const u of players()) labelUnit(u, u.x, u.y);
  for (const e of enemies()) {
    if (e.spotted) labelUnit(e, e.x, e.y);
    else if (e.lastKnown && G.time - e.lastKnown.t <= CONFIG.lastKnownSeconds) labelUnit(e, e.lastKnown.x, e.lastKnown.y, e.name + ' · últ. pos.');
  }
  if (CONFIG.objectiveHint && flag && flag.alive && !flag.spotted && !flag.lastKnown) {
    const [sx, sy] = worldToScreen(flag.x + 70, flag.y + 55 - 230);
    g.font = '700 12px Rajdhani, Arial Narrow, sans-serif'; label('ZONA PROBABLE · TANQUE BANDERA', sx, sy - 16, '#ffb8ac');
  }
  if (G.box && G.box.moved) {
    const b = G.box, x = Math.min(b.x0, b.x1), y = Math.min(b.y0, b.y1), w = Math.abs(b.x1 - b.x0), h = Math.abs(b.y1 - b.y0);
    g.fillStyle = 'rgba(240,207,106,.12)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(240,207,106,.95)'; g.lineWidth = 1.5; g.setLineDash([6, 4]); g.strokeRect(x + 0.5, y + 0.5, w, h); g.setLineDash([]);
  }
}


// =====================================================================
// INTERFAZ (panel de información, botones, avisos)
// =====================================================================
const $ = id => document.getElementById(id);
const UI = {};
const MOOD_COLOR = { 'TRANQUILO': '#8fd6a0', 'ESTABLE': '#d6c98a', 'ALERTA': '#f0cf6a', 'NERVIOSO': '#f0a24a', 'ESTRESADO': '#e8683c', 'PÁNICO': '#e03a2e' };
const barColor = (v, invert) => { const x = invert ? 100 - v : v; return x > 66 ? '#79c36a' : x > 33 ? '#e0b43a' : '#d0432f'; };

// Enlaza los elementos del HTML con la lógica del juego (botones, paneles, barras).
function bindUi() {
  pvLoader.init();
  for (const id of ['mission-title', 'mission-obj', 'panel', 'pn-img', 'pn-name', 'pn-role', 'pn-hp-fill', 'pn-hp-txt', 'pn-conf', 'pn-stress', 'pn-stab', 'pn-mood',
    'pn-passive', 'pn-allies', 'pn-stats', 'pn-empty', 'pn-body', 'pn-head', 'pick', 'btn-cmd', 'btn-idle', 'btn-pause', 'btn-menu', 'btn-mission', 'mission-pop', 'btn-form', 'form-fly', 'ui-tip', 'toasts', 'end', 'end-title', 'end-text',
    'end-stats', 'btn-continue', 'btn-retry', 'btn-menu2', 'loading', 'load-msg', 'btn-start', 'pause-ov', 'btn-resume', 'btn-opts', 'btn-opts-back', 'btn-quit', 'btn-quit-yes', 'btn-quit-no', 'load-obj', 'load-brief', 'mission-part', 'cine-bars', 'cine-fade', 'cine-cap', 'cine-cap-s', 'cine-cap-b']) UI[id] = $(id);
  UI.mission_title = UI['mission-title']; UI.mission_obj = UI['mission-obj'];
  applyPartUi();
  // Sonido en todos los botones
  document.querySelectorAll('button').forEach(b => {
    b.addEventListener('pointerenter', () => { if (!b.disabled) playUi('hover'); });
    b.addEventListener('click', () => playUi(b.dataset.snd || 'decide'));
  });
  initUiExtras();
  UI['btn-cmd'].addEventListener('click', goToCommander);
  UI['btn-idle'].addEventListener('click', goToIdleUnit);
  UI['btn-pause'].addEventListener('click', openPause);            // ❚❚ = abre el menú de pausa
  UI['btn-resume'].addEventListener('click', closePause);
  UI['btn-opts'].addEventListener('click', () => pmShow('opts'));
  UI['btn-opts-back'].addEventListener('click', () => pmShow('main'));
  UI['btn-quit'].addEventListener('click', () => pmShow('confirm')); // SALIR pide confirmación
  UI['btn-quit-no'].addEventListener('click', () => pmShow('main'));
  UI['btn-quit-yes'].addEventListener('click', goMenu);
  UI['btn-menu'].addEventListener('click', () => { openPause(); pmShow('confirm'); });   // botón MENÚ de arriba: también confirma
  UI['btn-menu2'].addEventListener('click', goMenu);               // desde la pantalla final no hay progreso que perder
  // Sliders de volumen global (opciones de la pausa)
  const gmap = { master: 'master', music: 'music', sfx: 'effects' };
  document.querySelectorAll('input[data-gvol]').forEach(r => {
    const k = gmap[r.dataset.gvol], sync = () => { r.style.setProperty('--p', r.value + '%'); r.parentElement.querySelector('b').textContent = r.value; };
    r.value = Math.round(GVOL[k] * 100); sync();
    r.addEventListener('input', () => { setGlobalVolume(k, r.value / 100); sync(); });
    r.addEventListener('change', () => { if (k !== 'music') playUi('decide'); });
  });
  UI['btn-continue'].addEventListener('click', () => { pvLoader.show(); setTimeout(() => { location.href = CONFIG.nextUrl || CONFIG.menuUrl; }, 1100); });
  UI['btn-retry'].addEventListener('click', resetMission);
  UI['btn-start'].addEventListener('click', startGame);
}
// Selector de comandante (pantalla de inicio): Maho / Erika / Koume. También por URL: ?comandante=erika
function setCommander(id) {
  if (!COMMANDERS[id]) return;
  MISSION.player.commander = id;
  UI.pick.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  if (FOG.exCtx) resetMission();
}
// Construye el selector de comandante del panel.
function buildPicker() {
  UI.pick.innerHTML = '';
  for (const c of Object.values(COMMANDERS)) {
    const b = document.createElement('button'); b.className = 'pickbtn'; b.dataset.id = c.id; b.textContent = c.name.toUpperCase();
    b.addEventListener('pointerenter', () => playUi('hover')); b.addEventListener('click', () => { playUi('decide'); setCommander(c.id); });
    UI.pick.appendChild(b);
  }
  UI.pick.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === MISSION.player.commander));
}
// Textos de la carpeta de misión y del briefing según la parte actual
function applyPartUi() {
  const P = curPart();
  UI['mission-title'].textContent = MISSION.title;
  UI['mission-part'].textContent = P.label;
  UI['mission-obj'].textContent = P.objective;
  UI['load-obj'].textContent = P.objective;
  UI['load-brief'].textContent = P.brief;
}
// Cambia el texto del objetivo actual.
function setObjective(t) { UI['mission-obj'].textContent = t; }
// Muestra el rótulo de las animaciones entre partes.
function cineCaption(small, big) { UI['cine-cap-s'].textContent = small; UI['cine-cap-b'].textContent = big; UI['cine-cap'].classList.add('on'); }
// Oculta las barras y el rótulo cinematográficos.
function cineEnd() { UI['cine-bars'].classList.remove('on'); UI['cine-cap'].classList.remove('on'); }
// Vuelve al menú principal con la pantalla de carga.
function goMenu() { pvLoader.show(); setTimeout(() => { location.href = CONFIG.menuUrl; }, 1100); }   // sale con la pantalla de carga

let lastToast = { msg: '', t: 0 };
// Muestra un aviso temporal en pantalla.
function toast(msg, kind) {
  const now = performance.now();
  if (msg === lastToast.msg && now - lastToast.t < 1200) return;
  lastToast = { msg, t: now };
  if (!UI.toasts) return;
  const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = msg;
  UI.toasts.appendChild(d);
  while (UI.toasts.children.length > 4) UI.toasts.removeChild(UI.toasts.firstChild);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 450); }, 2600);
}

// Pone el ancho de una barra de estadística.
function setBar(el, v) { el.firstElementChild.style.width = clamp(v, 0, 100) + '%'; el.firstElementChild.style.background = barColor(v); }
// Actualiza una fila de estadística (valor y color).
function setStatRow(id, v, invert) {
  const row = UI[id], f = row.querySelector('i'), n = row.querySelector('b');
  f.style.width = clamp(v, 0, 100) + '%'; f.style.background = barColor(v, invert); n.textContent = Math.round(v);
}
let panelKey = '';
// Actualiza el panel de la unidad seleccionada (vida, ánimo, estadísticas).
function updatePanel() {
  const u = G.selected && G.selected.alive ? G.selected : (G.inspect && G.inspect.alive && G.inspect.spotted ? G.inspect : null);
  const allies = G.units.filter(x => x.team === 'player'), alive = allies.filter(x => x.alive).length;
  UI['pn-head'].textContent = 'INFORMACIÓN DE UNIDAD' + (G.group.length > 1 ? ' · ' + G.group.length + ' SELECCIONADAS' : '');
  UI['pn-allies'].textContent = 'ALIADOS VIVOS: ' + alive + '/' + allies.length;
  UI['pn-empty'].style.display = u ? 'none' : ''; UI['pn-body'].style.display = u ? '' : 'none';
  if (!u) return;
  const enemy = u.team === 'enemy', s = u.stats, im = unitImage(u);
  const key = u.id + (im ? im.src : '');
  if (key !== panelKey) {
    panelKey = key;
    UI['pn-img'].className = u.commanderId ? 'cmd' : '';
    UI['pn-img'].innerHTML = im ? '<img alt="" src="' + im.src + '">' : '<span>' + (u.commanderId ? COMMANDERS[u.commanderId].name[0] : 'T') + '</span>';
  }
  UI['pn-name'].textContent = (u.commanderId ? COMMANDERS[u.commanderId].name + ' · ' : '') + u.name;
  const eS = MISSION.enemy.school.toUpperCase(), pS = MISSION.player.school.toUpperCase();
  UI['pn-role'].textContent = enemy ? (u.role === 'flag' ? (curPart().flagWins ? 'TANQUE BANDERA' : 'OBJETIVO') + ' · ' + eS : 'ENEMIGO · ' + eS + (u.high ? ' · EN ALTURA' : '')) : (u.commanderId ? 'COMANDANTE · ' + pS : 'ALIADO · ' + pS);
  UI['pn-role'].className = enemy ? 'enemy' : 'ally';
  const f = s.hp / s.maxHp;
  UI['pn-hp-fill'].style.width = (f * 100) + '%'; UI['pn-hp-fill'].style.background = f > 0.5 ? '#6fbf5a' : f > 0.25 ? '#e0b43a' : '#d0432f';
  UI['pn-hp-txt'].textContent = Math.ceil(s.hp) + ' / ' + s.maxHp;
  UI['pn-stats'].classList.toggle('unknown', enemy);
  if (enemy) {
    for (const id of ['pn-conf', 'pn-stress', 'pn-stab']) { const r = UI[id]; r.querySelector('i').style.width = '0%'; r.querySelector('b').textContent = '--'; }
    UI['pn-mood'].textContent = 'DESCONOCIDO'; UI['pn-mood'].style.color = '#9a9a90';
    UI['pn-passive'].style.display = 'none';
  } else {
    setStatRow('pn-conf', s.confidence); setStatRow('pn-stress', s.stress, true); setStatRow('pn-stab', s.stability);
    UI['pn-mood'].textContent = u.mood; UI['pn-mood'].style.color = MOOD_COLOR[u.mood] || '#fff';
    const P = UI['pn-passive'];
    if (u.commanderId) {
      const ps = COMMANDERS[u.commanderId].passive;
      P.style.display = ''; P.innerHTML = '<span class="k">PASIVA · ' + ps.name.toUpperCase() + '</span>' + ps.summary + (ps.radius ? ' <em>Radio ' + ps.radius + '</em>' : '');
    } else if (u.mods.leadership) {
      P.style.display = ''; P.innerHTML = '<span class="k">BAJO LIDERAZGO</span>Recibe el apoyo de su comandante.';
    } else P.style.display = 'none';
  }
}


// =====================================================================
// SELECCIÓN, BOTONES Y ATAJOS
// =====================================================================
// Selección: G.group = unidades seleccionadas · G.selected = la que muestra el panel (el comandante si está)
function selectUnits(list, voice) {
  list = list.filter(u => u && u.alive && u.team === 'player');
  G.group = list; G.selected = list.find(u => u.commanderId) || list[0] || null; G.inspect = null;
  if (voice && list.length) {
    const cmd = list.find(u => u.commanderId);
    if (cmd) playVoice(cmd.commanderId, 'select');          // voz del comandante
    if (list.some(u => !u.commanderId)) playEngine();       // motor de tanque genérico
  }
  updatePanel();
}
// Selecciona una sola unidad (o ninguna).
function selectUnit(u, voice) { selectUnits(u ? [u] : [], voice); }
// ---- Botones de imagen, carpeta de misión, formaciones y tooltips ----
function closePops() { UI['mission-pop'].classList.remove('on'); UI['btn-mission'].classList.remove('on'); UI['form-fly'].classList.remove('on'); }
// Pone una imagen (o una letra de reemplazo) en un botón.
function setBtnImage(btn, im, letter) {
  btn.innerHTML = im ? '<img alt="" src="' + im.src + '">' : '<span class="ph">' + letter + '</span>';
}
// Configura los botones de la barra inferior.
function setupBottomButtons() {
  const P = MISSION.player;
  setBtnImage(UI['btn-cmd'], IMGS['cmd:' + P.commander], COMMANDERS[P.commander].name[0]);   // retrato del comandante elegido
  setBtnImage(UI['btn-idle'], IMGS['tank:' + P.crewTank], 'T');                              // un tanque genérico
}
const formIcon = k => '<svg viewBox="0 0 24 24" aria-hidden="true">' + FORMATIONS[k].pts.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.4"/>').join('') + '</svg>';
// Cambia la formación en la que se mueven las unidades.
function setFormation(k, silent) {
  if (!FORMATIONS[k]) return;
  G.formation = k;
  UI['btn-form'].innerHTML = formIcon(k);
  UI['btn-form'].dataset.tip = FORMATIONS[k].name.replace('FORMACIÓN', 'Formación').toLowerCase().replace(/^./, c => c.toUpperCase()) + ' · cambiar (F)';
  document.querySelectorAll('.fopt').forEach(b => b.classList.toggle('cur', b.dataset.form === k));
  if (!silent) toast(FORMATIONS[k].name, 'good');
}
// Inicializa carpeta de misión, formaciones y los tooltips de todos los botones.
function initUiExtras() {
  // carpeta de misión
  UI['btn-mission'].addEventListener('click', e => { e.stopPropagation(); const on = !UI['mission-pop'].classList.contains('on'); closePops(); if (on) { UI['mission-pop'].classList.add('on'); UI['btn-mission'].classList.add('on'); } });
  // formaciones
  document.querySelectorAll('.fopt').forEach(b => { b.innerHTML = formIcon(b.dataset.form); b.addEventListener('click', e => { e.stopPropagation(); setFormation(b.dataset.form); closePops(); }); });
  UI['btn-form'].addEventListener('click', e => { e.stopPropagation(); const on = !UI['form-fly'].classList.contains('on'); closePops(); if (on) UI['form-fly'].classList.add('on'); });
  setFormation('wedge', true);
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#mission-pop,#form-fly,#btn-mission,#btn-form')) closePops(); });
  // tooltips: cualquier elemento con data-tip (botones y sliders) muestra un cartel breve al pasar el cursor.
  // Para añadir uno a un botón nuevo (en esta misión o en las siguientes) basta con ponerle data-tip="…".
  const tip = UI['ui-tip']; let cur = null;
  const hide = () => { cur = null; tip.classList.remove('on'); };
  const show = el => {
    tip.textContent = el.dataset.tip; tip.classList.add('on');
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = Math.min(Math.max(6, r.left + r.width / 2 - tw / 2), innerWidth - tw - 6), y = r.top - th - 10;
    if (y < 6) y = r.bottom + 10;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  document.addEventListener('pointerover', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el === cur) return; if (!el) { hide(); return; } cur = el; show(el); });
  document.addEventListener('pointerdown', hide);                                  // al hacer clic el cartel se oculta (no tapa lo que se abre)
  window.addEventListener('blur', hide);
}
// Centra la cámara en el comandante.
function goToCommander() {
  const c = commanderUnit();
  if (!c || !c.alive) { toast('EL COMANDANTE HA CAÍDO', 'warn'); return; }
  selectUnit(c, true); centerOn(c.x, c.y);
}
// Unidades sin orden y sin disparar hace unos segundos.
function idleUnits() { return players().filter(u => !u.commanderId && !u.order && G.time - u.lastFireT > 2.5); }
// Centra la cámara en la siguiente unidad inactiva.
function goToIdleUnit() {
  const L = idleUnits();
  if (!L.length) { toast('NO HAY UNIDADES INACTIVAS', 'warn'); playUi('error'); return; }
  G.idleIndex = (G.idleIndex + 1) % L.length;
  const u = L[G.idleIndex]; selectUnit(u, true); centerOn(u.x, u.y);
}
// ---- Menú de pausa (ESC) ----
function pmShow(view) { for (const v of ['main', 'opts', 'confirm']) $('pm-' + v).classList.toggle('on', v === view); }
// Devuelve qué vista del menú de pausa está abierta.
function pmView() { for (const v of ['opts', 'confirm']) if ($('pm-' + v).classList.contains('on')) return v; return 'main'; }
// Abre el menú de pausa y detiene el juego.
function openPause() { if (!G.started || G.over || G.paused) return; G.paused = true; G.keys = {}; pmShow('main'); UI['pause-ov'].classList.add('show'); }
// Cierra el menú de pausa y reanuda.
function closePause() { G.paused = false; UI['pause-ov'].classList.remove('show'); }
// Alterna la pausa.
function togglePause() { if (G.paused) closePause(); else openPause(); }
// ESC: abre la pausa; dentro de ella retrocede (confirmación/opciones → principal) y, desde la principal, reanuda
function escapeKey() {
  if (!G.started || G.over) return;
  if (UI['mission-pop'].classList.contains('on') || UI['form-fly'].classList.contains('on')) { closePops(); return; }
  if (!G.paused) openPause();
  else if (pmView() !== 'main') pmShow('main');
  else closePause();
}
// Intenta mover una unidad; avisa si el destino es inaccesible.
function tryMove(u, x, y) {
  if (!u || !u.alive || u.team !== 'player' || G.over) return;
  u.focus = null;
  if (!issueMove(u, x, y)) { toast('DESTINO INACCESIBLE', 'warn'); playUi('error'); }
}

// FORMACIONES (G.formation): 'wedge' = flecha/V · 'column' = convoy, uno detrás de otro · 'line' = todos uno al lado del otro.
// En las tres, el líder (el comandante, o el más cercano al destino) ocupa el punto de destino y todas
// miran en la dirección del movimiento.
const FORMATIONS = {
  wedge:  { name: 'FORMACIÓN EN FLECHA', pts: [[12, 4], [7.5, 10], [16.5, 10], [3, 16.5], [21, 16.5]] },
  column: { name: 'FORMACIÓN EN COLUMNA', pts: [[12, 3], [12, 8.5], [12, 14], [12, 19.5]] },
  line:   { name: 'FORMACIÓN EN LÍNEA', pts: [[3, 12], [8.5, 12], [14, 12], [19.5, 12]] }
};
// Calcula la posición de cada unidad en la formación elegida alrededor del destino.
function formationSlots(units, x, y) {
  let cx = 0, cy = 0; for (const u of units) { cx += u.x; cy += u.y; } cx /= units.length; cy /= units.length;
  let dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy);
  if (L < 20) { dx = Math.cos(units[0].heading); dy = Math.sin(units[0].heading); L = 1; }
  dx /= L; dy /= L; const px = -dy, py = dx, face = Math.atan2(dy, dx), sp = 46;
  const kind = G.formation || 'wedge';
  const leader = units.find(u => u.commanderId) || units.reduce((a, b) => (dist(a.x, a.y, x, y) < dist(b.x, b.y, x, y) ? a : b));
  const lat = u => (u.x - cx) * px + (u.y - cy) * py;          // posición lateral actual (para no cruzar tanques)
  const fwd = u => (u.x - cx) * dx + (u.y - cy) * dy;          // qué tan adelantado está
  const out = [];
  const place = (u, tx, ty) => {
    for (let t = 0; t < 6 && blockedAt(tx, ty, CONFIG.unitRadius); t++) { tx = lerp(tx, x, 0.3); ty = lerp(ty, y, 0.3); }
    out.push({ unit: u, x: tx, y: ty, face });
  };
  if (kind === 'column') {
    const rest = units.filter(u => u !== leader).sort((a, b) => fwd(b) - fwd(a));
    out.push({ unit: leader, x, y, face });
    rest.forEach((u, i) => place(u, x - dx * (i + 1) * sp * 1.15, y - dy * (i + 1) * sp * 1.15));
  } else if (kind === 'line') {
    const all = units.slice().sort((a, b) => lat(a) - lat(b)), n = all.length;
    all.forEach((u, i) => { const o = (i - (n - 1) / 2) * sp * 1.1; if (u === leader) out.push({ unit: u, x: x + px * o, y: y + py * o, face }); else place(u, x + px * o, y + py * o); });
  } else {
    const rest = units.filter(u => u !== leader).sort((a, b) => lat(a) - lat(b));
    const sl = []; for (let k = 1; k <= rest.length; k++) sl.push({ row: Math.ceil(k / 2), side: k % 2 ? -1 : 1 });
    sl.sort((a, b) => a.side * a.row - b.side * b.row);
    out.push({ unit: leader, x, y, face });
    rest.forEach((u, i) => place(u, x - dx * sl[i].row * sp + px * sl[i].side * sl[i].row * sp * 0.9, y - dy * sl[i].row * sp + py * sl[i].side * sl[i].row * sp * 0.9));
  }
  return out;
}
// CRÍTICA · Orden de movimiento del jugador a un grupo, respetando la formación.
function commandMove(units, x, y) {
  units = units.filter(u => u && u.alive && u.team === 'player'); if (!units.length || G.over) return;
  for (const u of units) u.focus = null;                                     // una orden de movimiento cancela el ataque dirigido
  if (units.length === 1) { tryMove(units[0], x, y); return; }
  let ok = 0; for (const s of formationSlots(units, x, y)) if (issueMove(s.unit, s.x, s.y, { face: s.face })) ok++;
  if (!ok) { toast('DESTINO INACCESIBLE', 'warn'); playUi('error'); } else toast(FORMATIONS[G.formation || 'wedge'].name, 'good');
}

// =====================================================================
// ENTRADA (ratón, rueda, teclado)
//  · clic en tanque aliado = seleccionar · arrastrar desde él = orden de movimiento
//  · clic derecho = mover la unidad seleccionada · arrastrar el mapa = desplazar
// =====================================================================
function unitAt(wx, wy, list) {
  let best = null, bd = 1e9;
  for (const u of list) { const d = dist(u.x, u.y, wx, wy); if (d < VIS_R(u) + 8 / G.cam.zoom && d < bd) { best = u; bd = d; } }
  return best;
}
// Guarda la posición del ratón en pantalla y en el mundo.
function updateMouse(e) {
  const r = cv.el.getBoundingClientRect();
  G.mouse.sx = e.clientX - r.left; G.mouse.sy = e.clientY - r.top;
  [G.mouse.wx, G.mouse.wy] = screenToWorld(G.mouse.sx, G.mouse.sy);
}
// CRÍTICA · Enlaza teclado y ratón: selección por caja, clic derecho para mover/atacar, zoom, formaciones y atajos.
function bindInput() {
  const el = cv.el;
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => {
    if (!G.started || G.paused || G.over || G.cine) return;
    updateMouse(e);
    try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignorar */ }
    if (e.button === 2) {
      const sel = G.group.length ? G.group : [G.selected];
      const foe = unitAt(G.mouse.wx, G.mouse.wy, enemies().filter(x => x.spotted));
      if (foe && sel.some(u => u && u.alive)) commandAttack(sel, foe); else commandMove(sel, G.mouse.wx, G.mouse.wy);
      return;
    }
    if (e.button === 1) { e.preventDefault(); G.pan = { sx: e.clientX, sy: e.clientY, cx: G.cam.x, cy: G.cam.y, moved: true }; return; }
    if (e.button !== 0) return;
    const mine = unitAt(G.mouse.wx, G.mouse.wy, players());
    if (mine) {
      if (e.shiftKey) { selectUnits(G.group.includes(mine) ? G.group.filter(u => u !== mine) : G.group.concat(mine), true); return; }
      if (!G.group.includes(mine)) selectUnit(mine, true);        // si ya está en el grupo, se arrastra todo el grupo
      G.drag = { unit: mine, sx: e.clientX, sy: e.clientY, moved: false };
      return;
    }
    const foe = unitAt(G.mouse.wx, G.mouse.wy, enemies().filter(x => x.spotted));
    if (foe) { selectUnits([], false); G.inspect = foe; updatePanel(); return; }
    // Mantener clic en el mapa y deslizar = recuadro de selección
    G.box = { x0: G.mouse.sx, y0: G.mouse.sy, x1: G.mouse.sx, y1: G.mouse.sy, moved: false, add: e.shiftKey };
  });
  el.addEventListener('pointermove', e => {
    updateMouse(e);
    if (G.drag && !G.drag.moved && Math.hypot(e.clientX - G.drag.sx, e.clientY - G.drag.sy) > 8) G.drag.moved = true;
    if (G.box) { G.box.x1 = G.mouse.sx; G.box.y1 = G.mouse.sy; if (!G.box.moved && Math.hypot(G.box.x1 - G.box.x0, G.box.y1 - G.box.y0) > 6) G.box.moved = true; }
    if (G.pan) { G.cam.x = G.pan.cx - (e.clientX - G.pan.sx) / G.cam.zoom; G.cam.y = G.pan.cy - (e.clientY - G.pan.sy) / G.cam.zoom; clampCamera(); }
    G.hoverFoe = (G.group.length || G.selected) && !G.drag && !G.box ? unitAt(G.mouse.wx, G.mouse.wy, enemies().filter(x => x.spotted)) : null;
    el.style.cursor = G.hoverFoe ? 'crosshair' : G.drag && G.drag.moved ? 'crosshair' : G.pan ? 'grabbing' : G.box && G.box.moved ? 'crosshair' : (unitAt(G.mouse.wx, G.mouse.wy, players()) ? 'pointer' : 'default');
  });
  const end = e => {
    if (G.drag) {
      if (G.drag.moved) { updateMouse(e); commandMove(G.group.includes(G.drag.unit) ? G.group : [G.drag.unit], G.mouse.wx, G.mouse.wy); }
      else if (G.group.length > 1) selectUnit(G.drag.unit, true);   // clic simple sobre un tanque del grupo = solo ese
      G.drag = null;
    }
    if (G.box) {
      const b = G.box;
      if (b.moved) {
        const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
        const inside = players().filter(u => { const [sx, sy] = worldToScreen(u.x, u.y); return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1; });
        selectUnits(b.add ? [...new Set(G.group.concat(inside))] : inside, true);
      } else if (!b.add) selectUnits([], false);
      G.box = null;
    }
    G.pan = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { G.drag = null; G.pan = null; G.box = null; });
  el.addEventListener('wheel', e => { e.preventDefault(); updateMouse(e); zoomAt(G.mouse.sx, G.mouse.sy, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (e.target && e.target.tagName === 'INPUT' && k !== 'escape') return;     // ESC funciona aunque un slider tenga el foco
    G.keys[k] = true;
    if (!G.started) return;
    if (k === 'escape') { escapeKey(); e.preventDefault(); }
    else if (k === 'p') { togglePause(); e.preventDefault(); }
    if (G.paused || G.over || G.cine) return;
    if (k === 'f') { const ks = Object.keys(FORMATIONS); setFormation(ks[(ks.indexOf(G.formation || 'wedge') + 1) % ks.length]); }
    else if (k === 'v') setFormation('wedge');
    else if (k === 'c') goToCommander();
    else if (k === 'i' || k === 'tab') { goToIdleUnit(); e.preventDefault(); }
    else if (k === 'q') selectUnits(players(), true);
    else if (k === ' ') { if (G.selected) centerOn(G.selected.x, G.selected.y); e.preventDefault(); }
    else if (k === '+' || k === '=') zoomAt(view.cx, view.cy, 1.15);
    else if (k === '-') zoomAt(view.cx, view.cy, 1 / 1.15);
    else if (/^[1-9]$/.test(k)) { const u = players()[+k - 1]; if (u) { selectUnit(u, true); centerOn(u.x, u.y); } }
  });
  window.addEventListener('keyup', e => { G.keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
  window.addEventListener('resize', () => { resize(); clampCamera(); });
}


// =====================================================================
// VICTORIA / DERROTA
// =====================================================================
function endStats() {
  const mine = G.units.filter(u => u.team === 'player'), foes = G.units.filter(u => u.team === 'enemy');
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  return '<div><span>TIEMPO</span><b>' + m + ':' + String(s).padStart(2, '0') + '</b></div>' +
    '<div><span>ALIADOS VIVOS</span><b>' + mine.filter(u => u.alive).length + '/' + mine.length + '</b></div>' +
    '<div><span>ENEMIGOS DESTRUIDOS</span><b>' + foes.filter(u => !u.alive).length + '/' + foes.length + '</b></div>';
}
// Termina la misión con victoria.
function triggerVictory() {
  if (G.over) return;
  G.over = 'victory'; G.overT = 0; G.drag = null; G.pan = null;
  toast('¡TANQUE BANDERA DESTRUIDO!', 'good');
  const f = G.units.find(u => u.role === 'flag'); if (f) { G.cam.tx = f.x; G.cam.ty = f.y; }
}
// Termina la misión con derrota (con el motivo).
function triggerDefeat(reason) {
  if (G.over) return;
  G.over = 'defeat'; G.overT = 0; G.drag = null; G.pan = null; G.defeatReason = reason;
}
// Muestra la pantalla de resultados.
function showEnd() {
  const win = G.over === 'victory';
  UI.end.className = 'show ' + G.over;
  UI['end-title'].textContent = win ? 'VICTORIA' : 'DERROTA';
  UI['end-text'].textContent = win ? MISSION.victoryText : (G.defeatReason || 'Misión fallida');
  UI['end-stats'].innerHTML = endStats();
  UI['btn-continue'].style.display = win ? '' : 'none';
  UI['btn-retry'].style.display = win ? 'none' : '';
  playUi(win ? 'decide' : 'error');
}



// =====================================================================
// ANIMACIÓN DE ENTRADA · CARGA DE LA MISIÓN
//  Al empezar (o al reintentar) los tanques de Kuromorimine llegan conduciendo desde el borde derecho
//  del mapa hasta sus posiciones (la carretera del JSON), frenan y giran hacia el frente. Mientras dura,
//  nadie combate ni recibe órdenes (G.cine = { type: 'enter' }); después se devuelve el control al jugador.
// =====================================================================
// Humo de escape durante la animación.
function cineSmoke(u, back) {
  const c = Math.cos(u.heading), s = Math.sin(u.heading);
  addFx({ k: 'smoke', x: u.x - c * 15 + (Math.random() - 0.5) * 8, y: u.y - s * 15 + (Math.random() - 0.5) * 8, vx: -c * 22 * back, vy: -s * 22 * back, t: 0, life: 0.8 + Math.random() * 0.5, size: 4 + Math.random() * 4, col: '160,150,130' });
}
// CRÍTICA · Anima la llegada: cada tanque va de fuera del mapa a su destino (u.dest), llega rápido y frena al final.
function updateCine(dt) {
  const C = G.cine; if (!C || C.type !== 'enter') return;
  C.t += dt; if (C.t < 0) return;
  C.puff -= dt; const puff = C.puff <= 0; if (puff) C.puff = 0.13;
  let done = true;
  for (const u of players()) {
    const dx = u.dest.x - u.x, dy = u.dest.y - u.y, d = Math.hypot(dx, dy);
    if (d > 2.5) {
      done = false;
      const sp = Math.min(u.spec.speed * 3.4, 38 + d * 1.15), adv = Math.min(d, sp * dt);
      u.x += dx / d * adv; u.y += dy / d * adv; u.heading = Math.atan2(dy, dx); u.turret = u.heading;
      if (puff) cineSmoke(u, -1);
    } else {
      u.x = u.dest.x; u.y = u.dest.y;
      const df = angDiff(u.dest.face, u.heading), tr = u.spec.hull * 1.5 * dt;                  // al llegar, giran hacia el frente
      if (Math.abs(df) > 0.02) { done = false; u.heading += clamp(df, -tr, tr); } else u.heading = u.dest.face;
      u.turret = u.heading;
    }
  }
  if (done && C.t > 0.8) endCine();
}
// Inicia la animación: manda a cada tanque fuera del borde derecho (en fila, 62 px entre uno y otro) para que entre conduciendo.
function beginEnter(delay) {
  const ps = players().sort((a, b) => a.y - b.y);
  ps.forEach((u, i) => { u.dest = { x: u.x, y: u.y, face: u.heading }; u.x = MAP.w + 150 + i * 62; u.heading = Math.PI; u.turret = Math.PI; u.order = null; });
  G.cine = { type: 'enter', t: -(delay || 1.6), puff: 0 };
  UI['cine-bars'].classList.add('on'); cineCaption(curPart().label, 'Llegada al frente');
  G.cam.zoom = CONFIG.zoom.start; const c = commanderUnit(); if (c) centerOn(c.dest.x, c.dest.y);
}
// Termina la animación y devuelve el control al jugador.
function endCine() {
  G.cine = null; cineEnd();
  for (const u of G.units) { delete u.dest; delete u.cineTo; }
  toast('OBJETIVO — ' + curPart().objective.toUpperCase(), 'good');
  const c = commanderUnit(); if (c && c.alive) selectUnit(c, true);
}
// (Re)carga la misión desde cero: unidades, niebla y estado. La entrada animada se repite en cada reintento.
function loadMission() {
  FOG.exCtx.setTransform(1, 0, 0, 1, 0, 0); FOG.exCtx.clearRect(0, 0, FOG.explored.width, FOG.explored.height);
  CONFIG.objectiveHint = curPart().hint;
  G.projectiles.length = 0; G.fx.length = 0; G.wrecks.length = 0;
  G.selected = null; G.group = []; G.inspect = null; G.hoverFoe = null; G.drag = null; G.box = null; G.pan = null; G.idleIndex = 0;
  G.sprung = false; G.phase = 'fight'; G.cine = null; G.defeatReason = null;
  spawnUnits();
  applyPartUi();
  beginEnter(1.2);
  updateRecon();
  setupBottomButtons();
}


// =====================================================================
// GAME LOOP
// =====================================================================
function resetMission() {
  pvLoader.show(); setTimeout(pvLoader.hide, 1000);                    // reiniciar también muestra la carga
  G.time = 0; G.over = null; G.overT = 0; G.paused = false;
  UI.end.className = ''; UI.toasts.innerHTML = ''; UI['pause-ov'].classList.remove('show'); pmShow('main');
  closePops(); cineEnd(); UI['cine-fade'].classList.remove('on');
  loadMission();
}

// CRÍTICA · Un paso de simulación: cámara, estadísticas, visión, IA, movimiento, combate, proyectiles y efectos.
function step(dt) {
  updateCamera(dt);
  if (!G.started || G.paused) return;
  G.time += dt;
  if (G.cam.tx !== undefined && G.over) { G.cam.x += (G.cam.tx - G.cam.x) * Math.min(1, dt * 2.2); G.cam.y += (G.cam.ty - G.cam.y) * Math.min(1, dt * 2.2); clampCamera(); }
  if (!G.over && G.cine) {
    updateCine(dt);                                      // animación de salida / llegada: nadie combate ni recibe órdenes
  } else if (!G.over) {
    for (const u of G.units) {
      if (!u.alive) continue;
      if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 6);
      if (u.hitFlash > 0) u.hitFlash = Math.max(0, u.hitFlash - dt * 3);
      if (u.team === 'enemy') updateEnemyAI(u, dt);
      updateMovement(u, dt);
      updateCombat(u, dt);
    }
    separateUnits();
    updateStats(dt);
  } else {
    G.overT += dt;
    if (G.overT > (G.over === 'victory' ? 2.2 : 1.4) && !UI.end.classList.contains('show')) showEnd();
  }
  updateProjectiles(dt); updateFx(dt);
  G.reconTimer -= dt; if (G.reconTimer <= 0) { G.reconTimer = CONFIG.visionTick; updateRecon(); }
  G.uiTimer -= dt; if (G.uiTimer <= 0) { G.uiTimer = 0.1; updatePanel(); }
}

let lastT = 0;
// Bucle principal (requestAnimationFrame): calcula dt, llama a step y render.
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
  try { step(dt * CONFIG.gameSpeed); render(); } catch (e) { console.error(e); }
}

// Empieza la partida al pulsar el botón de inicio.
function startGame() {
  UI.loading.classList.add('hide');
  G.started = true; G.paused = false;
  setupBottomButtons();
  playVoice(MISSION.player.commander, 'select');
}

// CRÍTICA · Arranque: carga imágenes y audio, prepara el mapa, la interfaz y el teclado/ratón.
async function init() {
  cv.el = $('game'); cv.g = cv.el.getContext('2d', { alpha: false });
  bindUi(); resize(); bindInput();
  const msg = t => new Promise(r => { UI['load-msg'].textContent = t; setTimeout(r, 30); });
  // Lo elegido en el menú llega por la URL:  kuromorimine-mision1.html?comandante=erika&tanque=panther
  const qs = new URLSearchParams(location.search);
  const want = String(qs.get('comandante') || '').toLowerCase(), wantTank = String(qs.get('tanque') || '').toLowerCase();
  if (COMMANDERS[want]) MISSION.player.commander = want;
  // Tanque del comandante: el menú manda ?tanque=panther o tiger1 (si no manda ninguno, se usa el de su ficha)
  const TK = { panther: 'panther', tiger1: 'tiger', tiger: 'tiger' };
  MISSION.player.tankChoice = TK[wantTank] || null;
  buildPicker();
  if (COMMANDERS[want]) UI.pick.parentElement.style.display = 'none';      // viene del menú: no se vuelve a elegir
  await msg('Leyendo mapa…');
  G.part = 1; prepareMap(PARTS[0].map()); CONFIG.navCell && (NAV.cs = CONFIG.navCell);
  await msg('Calculando rutas y colisiones…'); buildNav();
  await msg('Cargando imágenes…'); await loadAssets();
  await msg('Dibujando mapa…'); paintMap(); initFog(); G.mapPart = 1; CONFIG.objectiveHint = PARTS[0].hint;
  preloadAudio();
  Object.values(COMMANDERS).forEach(detectVoiceCh);                  // busca el CH de las voces de cada comandante (en segundo plano)
  spawnUnits();
  applyPartUi(); beginEnter(1.2);                                      // los tanques entran conduciendo al empezar
  updateRecon(); updatePanel();
  UI['load-msg'].textContent = 'Listo';
  UI['btn-start'].disabled = false; UI['btn-start'].classList.add('ready');
  requestAnimationFrame(frame);
  // Depuración: window.__kuro
  window.__kuro = { step, loadMission, beginEnter, selectUnits, commandMove, setCommander, playEngine, G, MAP, NAV, CONFIG, TANKS, VOL, issueMove, findPath, blockedAt, applyDamage, destroyUnit, resetMission, startGame,  updateRecon, players, enemies, commanderUnit, PARTS, FOG, COMMANDERS, MISSION };
}
document.addEventListener('DOMContentLoaded', init);


// =====================================================================
// MAPAS EMBEBIDOS — JSON exportados de tu editor
//   MAPA_KUROMORIMINE = panzer_vor_kuromorimine.json
// Para cambiar un mapa, reemplaza el objeto por el nuevo JSON.
// =====================================================================
const MAPA_KUROMORIMINE = {"version":1,"nombre":"kuromorimine","ancho":1920,"alto":1080,"bosques":[],"carreteras":[{"id":26,"puntos":[{"x":824,"y":252},{"x":822,"y":567},{"x":1323,"y":568},{"x":1805,"y":569},{"x":1930,"y":569}],"ancho":18},{"id":27,"puntos":[{"x":1800,"y":573},{"x":1802,"y":837}],"ancho":18},{"id":28,"puntos":[{"x":824,"y":567},{"x":567,"y":565},{"x":-17,"y":559}],"ancho":18},{"id":32,"puntos":[{"x":1323,"y":568},{"x":1321,"y":491}],"ancho":18},{"id":33,"puntos":[{"x":567,"y":565},{"x":566,"y":637}],"ancho":18},{"id":34,"puntos":[{"x":567,"y":565},{"x":569,"y":502}],"ancho":18}],"rios":[],"edificios":[{"id":25,"x":730,"y":226,"ancho":56,"alto":51}],"zonasUrbanas":[{"id":13,"x":1709,"y":841,"ancho":208,"alto":121},{"id":29,"x":505,"y":624,"ancho":221,"alto":123},{"id":30,"x":1145,"y":288,"ancho":344,"alto":210},{"id":31,"x":498,"y":399,"ancho":167,"alto":116}],"colinas":[],"objetivos":[{"id":3,"x":236,"y":560,"nombre":"Objetivo Alfa","tipo":"Tanque bandera"}],"spawns":[{"id":35,"x":319,"y":504,"tipo":"enemigo","nombre":"ENEMIGO 01"},{"id":36,"x":313,"y":620,"tipo":"enemigo","nombre":"ENEMIGO 02"},{"id":37,"x":665,"y":774,"tipo":"enemigo","nombre":"ENEMIGO 03"},{"id":38,"x":737,"y":355,"tipo":"enemigo","nombre":"ENEMIGO 04"},{"id":39,"x":806,"y":829,"tipo":"enemigo","nombre":"ENEMIGO 05"},{"id":40,"x":1702,"y":572,"tipo":"jugador","nombre":"COMANDANTE"},{"id":41,"x":1732,"y":529,"tipo":"aliado","nombre":"UNIDAD 01"},{"id":42,"x":1729,"y":619,"tipo":"aliado","nombre":"UNIDAD 02"},{"id":43,"x":1776,"y":504,"tipo":"aliado","nombre":"UNIDAD 03"},{"id":44,"x":1771,"y":654,"tipo":"aliado","nombre":"UNIDAD 04"},{"id":45,"x":1827,"y":496,"tipo":"aliado","nombre":"UNIDAD 05"},{"id":46,"x":1825,"y":672,"tipo":"aliado","nombre":"UNIDAD 06"},{"id":48,"x":659,"y":384,"tipo":"enemigo","nombre":"ENEMIGO 06"}],"unidades":[],"terrenos":[],"poligonos":[{"id":1,"puntos":[{"x":472,"y":3},{"x":473.5,"y":28.7},{"x":487.8,"y":63.900000000000006},{"x":503.5,"y":84.7},{"x":554.3,"y":134.3},{"x":585.7,"y":195.6},{"x":603.9,"y":268.7},{"x":603.9,"y":285.6},{"x":593.5,"y":327.3},{"x":571.3,"y":348.2},{"x":529.6,"y":371.7},{"x":499.6,"y":384.7},{"x":417.4,"y":408.2},{"x":377,"y":433},{"x":306.5,"y":463},{"x":280.4,"y":469.5},{"x":242.6,"y":473.4},{"x":88.7,"y":474.7},{"x":44.3,"y":466.9},{"x":1,"y":474},{"x":1,"y":458},{"x":1,"y":426},{"x":3,"y":398},{"x":1,"y":358},{"x":0,"y":308},{"x":2,"y":207},{"x":2,"y":155},{"x":1,"y":80},{"x":5,"y":2}],"uso":"bosque","tono":0},{"id":2,"puntos":[{"x":1,"y":644},{"x":41.1,"y":627.4},{"x":81.3,"y":617.4},{"x":110,"y":617.4},{"x":141.6,"y":621.7},{"x":166,"y":628.9},{"x":199,"y":646.1},{"x":232,"y":679.1},{"x":256.4,"y":716.4},{"x":296.5,"y":737.9},{"x":359.7,"y":755.1},{"x":381.2,"y":758},{"x":440,"y":758},{"x":465.8,"y":755.1},{"x":485.9,"y":760.9},{"x":521.8,"y":792.4},{"x":549.1,"y":832.6},{"x":569.1,"y":849.8},{"x":597.8,"y":868.5},{"x":666.7,"y":904.3},{"x":676.8,"y":918.7},{"x":689.7,"y":953.1},{"x":718.4,"y":1050.7},{"x":739.9,"y":1076.5},{"x":743,"y":1078},{"x":727,"y":1079},{"x":712,"y":1079},{"x":690,"y":1076},{"x":644,"y":1078},{"x":568,"y":1077},{"x":471,"y":1079},{"x":320,"y":1078},{"x":128,"y":1077},{"x":22,"y":1078},{"x":2,"y":1076}],"uso":"bosque","tono":0},{"id":8,"puntos":[{"x":690,"y":902},{"x":725,"y":840},{"x":807,"y":803},{"x":851,"y":831},{"x":979,"y":820},{"x":983,"y":856},{"x":1032,"y":841},{"x":1076,"y":894},{"x":1081,"y":928},{"x":1081,"y":928},{"x":995,"y":922},{"x":748,"y":919}],"uso":"terreno","tono":1},{"id":9,"puntos":[{"x":1141,"y":917},{"x":1171,"y":831},{"x":1223,"y":842},{"x":1272,"y":813},{"x":1333,"y":803},{"x":1399,"y":787},{"x":1468,"y":828},{"x":1520,"y":901},{"x":1452,"y":901},{"x":1385,"y":932},{"x":1207,"y":930}],"uso":"terreno","tono":1},{"id":10,"puntos":[{"x":1591.7,"y":823},{"x":1568.8,"y":837.4},{"x":1553,"y":858.9},{"x":1537.2,"y":891.9},{"x":1538.7,"y":901.9},{"x":1554.4,"y":919.2},{"x":1571.7,"y":927.8},{"x":1610.4,"y":927.8},{"x":1663.5,"y":920.6},{"x":1686.4,"y":912},{"x":1697.9,"y":901.9},{"x":1700.8,"y":879},{"x":1689.3,"y":848.9},{"x":1670.7,"y":828.8},{"x":1649.1,"y":824.5}],"uso":"bosque","tono":1},{"id":17,"puntos":[{"x":737,"y":1080},{"x":757.4,"y":1056.6},{"x":773.2,"y":1046.6},{"x":791.8,"y":1040.8},{"x":875.1,"y":1038},{"x":1111.8,"y":994.9},{"x":1133.3,"y":996.4},{"x":1140.5,"y":1007.8},{"x":1172.1,"y":1020.8},{"x":1177.8,"y":1027.9},{"x":1205.1,"y":1030.8},{"x":1220.8,"y":1030.8},{"x":1273.9,"y":1020.8},{"x":1345.7,"y":1015},{"x":1385.8,"y":1015},{"x":1428.9,"y":1023.6},{"x":1466.2,"y":1025.1},{"x":1565.2,"y":1007.8},{"x":1618.3,"y":1010.7},{"x":1738.8,"y":1029.4},{"x":1784.7,"y":1029.4},{"x":1845,"y":1017.9},{"x":1880.8,"y":1016.5},{"x":1925.3,"y":1033.7},{"x":1922,"y":1041},{"x":1925,"y":1045},{"x":1921,"y":1051},{"x":1924,"y":1068},{"x":1921,"y":1081},{"x":1888,"y":1081},{"x":1835,"y":1080}],"uso":"bosque","tono":1},{"id":20,"puntos":[{"x":1382.1,"y":-0.20000000000000018},{"x":1364.9,"y":31.3},{"x":1356.3,"y":75.8},{"x":1356.3,"y":108.8},{"x":1363.4,"y":167.6},{"x":1374.9,"y":196.3},{"x":1380.7,"y":203.5},{"x":1445.2,"y":239.4},{"x":1468.2,"y":246.5},{"x":1538.5,"y":258},{"x":1564.3,"y":266.6},{"x":1595.9,"y":291},{"x":1618.8,"y":315.4},{"x":1640.4,"y":361.3},{"x":1654.7,"y":374.2},{"x":1673.4,"y":384.3},{"x":1746.5,"y":408.7},{"x":1806.8,"y":424.5},{"x":1852.7,"y":431.6},{"x":1905.8,"y":431.6},{"x":1920,"y":419},{"x":1922,"y":394},{"x":1921,"y":382},{"x":1920,"y":352},{"x":1920,"y":317},{"x":1920,"y":243},{"x":1920,"y":173},{"x":1920,"y":109},{"x":1919,"y":61},{"x":1921,"y":21},{"x":1922,"y":6}],"uso":"bosque","tono":1},{"id":23,"puntos":[{"x":554,"y":1},{"x":549.7,"y":0.6},{"x":549.7,"y":30.6},{"x":565.5,"y":85.8},{"x":581.3,"y":109.5},{"x":612.9,"y":142.6},{"x":627.1,"y":167.9},{"x":642.8,"y":208.9},{"x":658.6,"y":227.8},{"x":674.4,"y":234.2},{"x":728.1,"y":240.5},{"x":764.4,"y":240.5},{"x":799.1,"y":235.7},{"x":857.5,"y":235.7},{"x":949,"y":248.4},{"x":1018.5,"y":248.4},{"x":1121.1,"y":227.8},{"x":1214.2,"y":226.3},{"x":1231.5,"y":220},{"x":1269.4,"y":194.7},{"x":1335.7,"y":128.4},{"x":1343.6,"y":115.8},{"x":1349.9,"y":93.7},{"x":1349.9,"y":59},{"x":1364.1,"y":5.3},{"x":1358,"y":1}],"uso":"lago","tono":0}],"lapices":[],"capas":{"terreno":{"visible":true,"bloqueada":false},"agua":{"visible":true,"bloqueada":false},"vegetacion":{"visible":true,"bloqueada":false},"carreteras":{"visible":true,"bloqueada":false},"edificios":{"visible":true,"bloqueada":false},"elevacion":{"visible":true,"bloqueada":false},"objetivos":{"visible":true,"bloqueada":false},"spawns":{"visible":true,"bloqueada":false},"unidades":{"visible":true,"bloqueada":false}}};
