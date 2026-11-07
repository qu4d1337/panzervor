'use strict';
/* =====================================================================
   ¡PANZER VOR!  —  main.js
   Secciones: 1) DATOS EDITABLES  2) AUDIO  3) UTILIDADES  4) ESCENAS
              5) SELECCIÓN  6) MISIONES  7) INICIO
   ===================================================================== */

/* ======================= 1) DATOS EDITABLES ======================= */

// --- Mensajes del pop-up de bienvenida (agrega los que quieras) ---
const welcomeMessages = [
  { title: "¡BIENVENIDO!", text: "Tu tripulación está esperando órdenes." },
  { title: "¡PANZER VOR!", text: "La batalla está a punto de comenzar." },
  { title: "DATO DEL DÍA", text: "Un buen comandante conoce las fortalezas y debilidades de su tanque." },
  { title: "¡ATENCIÓN, COMANDANTE!", text: "Tu próxima decisión podría cambiar el resultado de la batalla." }
];

// --- Créditos: EDITA nombres, responsabilidades y fotos ---
const credits = [
  { name: "Ibuypower", role: "Código/imagenes", image: "assets/creditos/creador1.gif" }, // TODO: datos reales
  { name: "YOSOYMUYPRO7786", role: "Código", image: "assets/creditos/creador2.jfif" }  // TODO: datos reales
];

// --- Música ---
const MENU_MUSIC = "assets/audio/Yuki no Shingun.mp3"; // música del menú (misma carpeta; ajustá la extensión si no es .mp3)
// Lista de reproducción del MENÚ: suenan en orden aleatorio, sin repetir hasta que hayan sonado todas; luego se vuelven a mezclar y sigue en bucle.
// Para añadir o quitar canciones del menú, edita esta lista (la ruta debe coincidir EXACTO con el nombre del archivo).
const MENU_PLAYLIST = [
  MENU_MUSIC,
  "assets/audio/naciones/Polyushko-polye.mp3",
  "assets/audio/naciones/Saishuushou • Senshadou Koushinkyoku! Panzer Vor!.mp3",
  "assets/audio/naciones/Säkkijärven polkka.mp3",
  "assets/audio/naciones/U.S Field Artillery March.mp3",
  "assets/audio/naciones/Gakuen toiro desu!.mp3",
  "assets/audio/naciones/Mugen Kidou Hai Ikkaisen desu!.mp3",
  "assets/audio/naciones/Battle Hymm of the Republic.mp3",
  "assets/audio/naciones/Panzerlied v2.mp3"
];
const ALBUM_DIR = "assets/imagenes/album/";                // carpeta con las portadas
// Portada de cada pista (la clave es la ruta de la pista)
const TRACK_ALBUM = {
  [MENU_MUSIC]: "disco.jpg",
  "assets/audio/naciones/When Johnny Comes Marching Home.mp3": "disco.jpg",
  "assets/audio/naciones/British Grenadiers.mp3": "disco2.jpg",
  "assets/audio/naciones/Katyusha.mp3": "disco2.jpg",
  "assets/audio/naciones/Erika.mp3": "disco2.jpg",
  "assets/audio/naciones/La Chanson de l'oignon.mp3": "disco3.jpg",
  "assets/audio/naciones/Funiculi Funicula.mp3": "disco4.jpg",
  "assets/audio/naciones/Polyushko-polye.mp3": "disco2.jpg",
  "assets/audio/naciones/Saishuushou • Senshadou Koushinkyoku! Panzer Vor!.mp3": "disco.jpg",
  "assets/audio/naciones/Säkkijärven polkka.mp3": "disco3.jpg",
  "assets/audio/naciones/U.S Field Artillery March.mp3": "disco.jpg",
  "assets/audio/naciones/Gakuen toiro desu!.mp3": "disco4.jpg",
  "assets/audio/naciones/Mugen Kidou Hai Ikkaisen desu!.mp3": "disco3.jpg",
  "assets/audio/naciones/Battle Hymm of the Republic.mp3": "disco.jpg",
  "assets/audio/naciones/Panzerlied v2.mp3": "disco2.jpg"
};
const nationMusic = {                         // TODO: colocar archivos
  usa: "assets/audio/naciones/When Johnny Comes Marching Home.mp3",
  germany: "assets/audio/naciones/Erika.mp3",
  uk: "assets/audio/naciones/British Grenadiers.mp3",
  italy: "assets/audio/naciones/Funiculi Funicula.mp3",
  france: "assets/audio/naciones/La Chanson de l'oignon.mp3",
  ussr: "assets/audio/naciones/Katyusha.mp3"
};
// Nombre que muestra el tocadiscos para cada pista
const TRACK_TITLES = {
  [MENU_MUSIC]: "Yuki no Shingun",
  "assets/audio/naciones/When Johnny Comes Marching Home.mp3": "When Johnny Comes Marching Home",
  "assets/audio/naciones/Erika.mp3": "Erika",
  "assets/audio/naciones/British Grenadiers.mp3": "British Grenadiers",
  "assets/audio/naciones/Funiculi Funicula.mp3": "Funiculì, Funiculà",
  "assets/audio/naciones/La Chanson de l'oignon.mp3": "La Chanson de l'oignon",
  "assets/audio/naciones/Katyusha.mp3": "Katyusha",
  "assets/audio/naciones/Polyushko-polye.mp3": "Polyushko-polye",
  "assets/audio/naciones/Saishuushou • Senshadou Koushinkyoku! Panzer Vor!.mp3": "Senshadou Koushinkyoku! Panzer Vor!",
  "assets/audio/naciones/Säkkijärven polkka.mp3": "Säkkijärven polkka",
  "assets/audio/naciones/U.S Field Artillery March.mp3": "U.S. Field Artillery March",
  "assets/audio/naciones/Gakuen toiro desu!.mp3": "Gakuen toiro desu!",
  "assets/audio/naciones/Mugen Kidou Hai Ikkaisen desu!.mp3": "Mugen Kidou Hai Ikkaisen desu!",
  "assets/audio/naciones/Battle Hymm of the Republic.mp3": "Battle Hymn of the Republic",
  "assets/audio/naciones/Panzerlied v2.mp3": "Panzerlied"
};
let musicVolume = 0.6;           // volumen de música (lo controla el slider, se guarda en el navegador)
try { const v = parseFloat(localStorage.getItem("pv_musicVol")); if (!isNaN(v)) musicVolume = Math.min(1, Math.max(0, v)); } catch (e) {}
// Volúmenes del juego (0–1). El maestro multiplica a todo; "efectos" = botones, tanques, disparos, voces.
// Se guardan en el navegador y la misión usa los mismos valores.
let masterVolume = 1, sfxVolume = 1;
try {
  const m = parseFloat(localStorage.getItem("pv_masterVol")); if (!isNaN(m)) masterVolume = Math.min(1, Math.max(0, m));
  const f = parseFloat(localStorage.getItem("pv_sfxVol"));    if (!isNaN(f)) sfxVolume = Math.min(1, Math.max(0, f));
} catch (e) {}
const effMusic = () => musicVolume * masterVolume;            // volumen real de la música
const SFX_VOLUME = 0.7;
const SFX_FILES = {              // TODO: colocar los .wav en assets/audio/SFX/
  hover:  "assets/audio/SFX/SE_MENU_SELECT_01.wav",
  decide: "assets/audio/SFX/SE_MENU_DECIDE_01.wav",
  cancel: "assets/audio/SFX/SE_MENU_CANCEL_01.wav",
  error:  "assets/audio/SFX/SE_MENU_ERROR_01.wav"
};
const FADE_MS = 1200;

// --- Personajes ---
const NA = "Información no disponible";
const IMG = "assets/imagenes/";
// ch(id, nombre, archivo pfp, archivo imagen completa, descripción, fecha, altura)
function ch(id, name, pfp, full, desc, birth, height, passive) {
  return { id, name, pfp: IMG + "pfp/" + pfp, fullImage: IMG + "ch_full/" + full,
           desc: desc || NA, birth: birth || NA, height: height || NA,
           passive: passive || null };  // passive: { name, desc } (vista previa; se aplica en la partida)
}
const characters = {
  kay:        ch("kay", "Kay", "kaypfp.png", "kay.png", "Comandante de la Academia Saunders.", "17 de enero", "158 cm", { name: "Liderazgo", desc: "Inspira a las unidades aliadas cercanas, aumentando gradualmente su confianza y reduciendo su estrés." }),
  naomi:      ch("naomi", "Naomi", "naomipfp.png", "naomi.png", "Integrante de la Academia Saunders.", "20 de mayo", "165 cm", { name: "Tiradora de élite", desc: "Su precisión excepcional mejora la efectividad de sus disparos y su alcance de combate." }),
  alisa:      ch("alisa", "Alisa", "alisapfp.png", "alisa.png", "Integrante de la Academia Saunders.", "18 de julio", "148 cm", { name: "Reconocimiento avanzado", desc: "Detecta enemigos desde una distancia mayor, proporcionando una ventaja de reconocimiento." }),
  maho:       ch("maho", "Maho", "mahopfp.png", "maho.png", "Comandante de la Academia Kuromorimine.", "1 de julio", "163 cm", { name: "Doctrina de combate", desc: "Su disciplina táctica ayuda a las unidades cercanas a mantener la estabilidad y combatir bajo presión." }),
  erika:      ch("erika", "Erika", "erikapfp.png", "erika.png", "Integrante de la Academia Kuromorimine.", "6 de marzo", "159 cm", { name: "Ataque decidido", desc: "Cuando entra en contacto con el enemigo, su unidad puede recargar más rápidamente." }),
  darjeeling: ch("darjeeling", "Darjeeling", "darjeelingpfp.png", "darjeeling.png", "Comandante de la Academia St. Gloriana.", "17 de septiembre", "158 cm", { name: "Serenidad", desc: "Su sangre fría le permite resistir mejor la presión y recuperar la estabilidad fuera del combate." }),
  // TODO: confirma los archivos pfp de estas dos (si se llaman distinto, cámbialos aquí)
  rosehip:    ch("rosehip", "Rosehip", "rosehippfp.png", "rosehip.png", "Integrante de la Academia St. Gloriana.", "25 de noviembre", "154 cm", { name: "Avance relámpago", desc: "Aumenta la velocidad de su unidad al avanzar hacia una posición enemiga." }),
  rukurini:   ch("rukurini", "Rukurini", "rukurinipfp.png", "rukurini.png", "Integrante de la Academia St. Gloriana.", "11 de junio", "165 cm", { name: "Defensa organizada", desc: "Una defensa bien organizada ayuda a las unidades cercanas a mantener la estabilidad bajo fuego enemigo." }),
  anchovy:    ch("anchovy", "Anchovy", "anchovypfp.png", "anchovy.png", "Comandante de la Academia Anzio.", "23 de septiembre", "156 cm", { name: "Espíritu de equipo", desc: "Las victorias y los objetivos cumplidos refuerzan la confianza de las unidades aliadas cercanas." }),
  carpaccio:  ch("carpaccio", "Carpaccio", "carpacciopfp.png", "carpaccio.png", "Integrante de la Academia Anzio.", "19 de diciembre", "162 cm", { name: "Maniobra evasiva", desc: "Facilita las retiradas y los reposicionamientos mediante una mayor movilidad." }),
  marie:      ch("marie", "Marie", "mariepfp.png", "marie.png", "Comandante de la Academia BC Freedom.", "20 de abril", "150 cm", { name: "Sangre fría", desc: "Mantiene la precisión incluso cuando el estrés de combate aumenta." }),
  katyusha:   ch("katyusha", "Katyusha", "katyushapfp.png", "katyusha.png", "Comandante de la Academia Pravda.", "31 de enero", "127 cm", { name: "¡Ni un paso atrás!", desc: "Refuerza la moral de las unidades cercanas para que resistan mejor las pérdidas y el fuego enemigo." }),
  nonna:      ch("nonna", "Nonna", "nonnapfp.png", "nonna.png", "Integrante de la Academia Pravda.", "21 de noviembre", "176 cm", { name: "Precisión disciplinada", desc: "Al permanecer quieta y apuntar, mejora progresivamente la precisión de sus disparos." }),
  klara:      ch("klara", "Klara", "klarapfp.png", "klara.png", "Integrante de la Academia Pravda.", "17 de mayo", "174 cm", { name: "Veterana de combate", desc: "Su experiencia le permite soportar mejor el estrés y recuperarse con mayor rapidez después del combate." }),
  koume:      ch("koume", "Koume", "koumepfp.png", "koume.png", "", "22 de marzo", "142 cm", { name: "Espíritu de equipo", desc: "Mantiene la moral de las unidades cercanas cuando sus compañeras reciben daño o caen en combate." }),
  rena:       ch("rena", "Rena", "renapfp.png", "rena.png", "", "23 de abril", "161 cm", { name: "Maniobra agresiva", desc: "Sus maniobras agresivas permiten cambiar de dirección y orientar el tanque con mayor rapidez." }),
  ruka:       ch("ruka", "Ruka", "rukapfp.png", "ruka.png", "", "8 de agosto", "161 cm", { name: "Apoyo de flanqueo", desc: "Aprovecha los ataques por los flancos y la retaguardia para mejorar la precisión de sus disparos." })
};

// --- Tanques: 2 por nación. TODO: reemplaza los placeholders con datos reales ---
const germanyTanks = [
  { id: "panther", name: "PANZERKAMPFWAGEN V PANTHER", image: IMG + "tanques/img/phanterimg.webp", type: "Tanque medio", speed: "Rápida", weapon: "Cañón KwK 42 de 75 mm", description: "Equilibrio ideal entre blindaje inclinado, movilidad y un cañón largo muy preciso." },
  { id: "tiger1", name: "PANZERKAMPFWAGEN VI TIGER I", image: IMG + "tanques/img/tigerimg.webp", type: "Tanque pesado", speed: "Lenta", weapon: "Cañón KwK 36 de 88 mm", description: "Blindaje grueso y cañón devastador, a costa de moverse con pesadez." }
];
const ukTanks = [
  { id: "churchill", name: "CHURCHILL MK. VII", image: IMG + "tanques/img/churchillimg.webp", type: "Tanque de infantería pesado", speed: "Lenta", weapon: "Cañón de 75 mm", description: "Muy resistente y estable bajo fuego; avanza despacio pero aguanta mucho castigo." },
  { id: "matilda", name: "MATILDA II", image: IMG + "tanques/img/matildaimg.webp", type: "Tanque de infantería", speed: "Muy lenta", weapon: "Cañón QF de 2 libras (40 mm)", description: "Blindaje excelente para su época, pero poca movilidad y poder de fuego limitado." }
];
const ussrTanks = [
  { id: "kv2", name: "KV-2", image: IMG + "tanques/img/kv2img.webp", type: "Tanque pesado de asalto", speed: "Muy lenta", weapon: "Obús M-10T de 152 mm", description: "Torreta enorme y obús de daño brutal; recarga muy lenta y difícil de maniobrar." },
  { id: "t34", name: "T-34/76", image: IMG + "tanques/img/t34img.webp", type: "Tanque medio", speed: "Rápida", weapon: "Cañón F-34 de 76,2 mm", description: "Blindaje inclinado, buena movilidad y producción en masa; un todoterreno fiable." }
];
const italyTanks = [
  { id: "p26", name: "CARRO ARMATO P26/40", image: IMG + "tanques/img/p26img.webp", type: "Tanque pesado", speed: "Media", weapon: "Cañón de 75/34 mm", description: "El tanque más poderoso de Italia: sólido y con buen cañón, aunque escaso." },
  { id: "cv33", name: "CARRO VELOCE CV33", image: IMG + "tanques/img/cv33img.webp", type: "Tanqueta ligera", speed: "Muy rápida", weapon: "Ametralladoras de 8 mm", description: "Diminuta y veloz, pensada para explorar y hostigar; casi sin blindaje." }
];
const franceTanks = [
  { id: "ft17", name: "RENAULT FT-17", image: IMG + "tanques/img/ft17img.webp", type: "Tanque ligero", speed: "Lenta", weapon: "Cañón de 37 mm", description: "Pionero de los tanques con torreta giratoria; pequeño, barato y fácil de manejar." },
  { id: "arl44", name: "ARL-44", image: IMG + "tanques/img/arl44img.webp", type: "Tanque pesado", speed: "Media", weapon: "Cañón de 90 mm", description: "Pesado de posguerra con cañón potente y buen blindaje frontal." }
];
// Define las dos casillas de tanque (ids prefijo-tank1/2) de una nación en la pantalla de selección.
function tankSlots(prefix) {
  return [1, 2].map(n => ({
    id: prefix + "-tank" + n,
    name: "TANQUE " + n + " (POR DEFINIR)",
    image: "",            // TODO: colocar imagen, ej. "assets/imagenes/tanques/" + prefix + n + ".png"
    type: "Por definir",
    speed: "Por definir",
    weapon: "Por definir",
    description: "TODO: descripción breve del tanque."
  }));
}

// --- Tanques de EEUU / Saunders (los ids deben coincidir con las claves de TANKS en saunders-mision1.js) ---
const usaTanks = [
  { id: "firefly", name: "SHERMAN FIREFLY", image: IMG + "tanques/img/fireflyimg.webp", type: "Tanque medio",
    speed: "Media", weapon: "Cañón de 17 libras (76,2 mm)",
    description: "Sherman con cañón antitanque de gran potencia: dispara fuerte pero recarga despacio." },
  { id: "m4sherman", name: "M4 SHERMAN", image: IMG + "tanques/img/shermanimg.webp", type: "Tanque medio",
    speed: "Rápida", weapon: "Cañón de 75 mm",
    description: "Tanque ágil y de recarga rápida, ideal para hostigar y maniobrar." }
];

// --- Naciones (objeto central) ---
const nations = {
  usa:     { name: "EEUU", faction: "SAUNDERS", flag: IMG + "banderas/eeuu.png", emblem: IMG + "escudos/Saunders.webp",
             music: nationMusic.usa, characters: ["kay", "naomi", "alisa"], tanks: usaTanks, missionMap: "usa" },
  germany: { name: "ALEMANIA", faction: "KUROMORIMINE", flag: IMG + "banderas/alemania.png", emblem: IMG + "escudos/Kuromorimine.webp",
             music: nationMusic.germany, characters: ["maho", "erika", "koume"], tanks: germanyTanks, missionMap: "germany" },
  uk:      { name: "REINO UNIDO", faction: "ST. GLORIANA", flag: IMG + "banderas/uk.webp", emblem: IMG + "escudos/Gloriana.webp",
             music: nationMusic.uk, characters: ["darjeeling", "rosehip", "rukurini"], tanks: ukTanks, missionMap: "uk" },
  italy:   { name: "ITALIA", faction: "ANZIO", flag: IMG + "banderas/italia.png", emblem: IMG + "escudos/Anzio.webp",
             music: nationMusic.italy, characters: ["anchovy", "carpaccio"], tanks: italyTanks, missionMap: "italy" },
  france:  { name: "FRANCIA", faction: "BC FREEDOM", flag: IMG + "banderas/francia.png", emblem: IMG + "escudos/BCfreedom.webp",
             music: nationMusic.france, characters: ["marie", "ruka", "rena"], tanks: franceTanks, missionMap: "france" },
  ussr:    { name: "URSS", faction: "PRAVDA", flag: IMG + "banderas/urss.png", emblem: IMG + "escudos/pravda.png",
             music: nationMusic.ussr, characters: ["katyusha", "nonna", "klara"], tanks: ussrTanks, missionMap: "ussr" }
};

// --- Mapas de misiones (uno por nación). x,y en % del mapa. links = ids conectados.
// background: si el archivo no existe se usa un mapa táctico generado. TODO: colocar imágenes.
function missionSet(names, layout) {
  return names.map((n, i) => ({ id: i + 1, name: n, x: layout[i][0], y: layout[i][1],
    locked: i > 0, links: i < names.length - 1 ? [i + 2] : [], coord: layout[i][2] }));
}
const missionMaps = {
  usa:     { background: "assets/imagenes/mapas/usa.jpg",     hue: 95,  seed: 11,
             missions: missionSet(["Misión 1", "Misión 2", "Misión 3", "Misión 4"], [[22,68,"A-3"],[40,35,"B-5"],[62,58,"D-4"],[80,26,"F-2"]]) },
  germany: { background: "assets/imagenes/mapas/germany.jpg", hue: 70,  seed: 23,
             missions: missionSet(["Misión 1", "Misión 2", "Misión 3", "Misión 4"], [[18,30,"A-2"],[38,62,"C-5"],[60,40,"E-3"],[82,66,"G-5"]]) },
  uk:      { background: "assets/imagenes/mapas/uk.jpg",      hue: 130, seed: 37,
             missions: missionSet(["Misión 1", "Misión 2", "Misión 3", "Misión 4"], [[15,55,"A-4"],[35,28,"B-2"],[58,64,"D-5"],[84,40,"G-3"]]) },
  italy:   { background: "assets/imagenes/mapas/italy.jpg",   hue: 55,  seed: 41,
             missions: missionSet(["Misión 1", "Misión 2", "Misión 3", "Misión 4"], [[25,25,"B-2"],[30,70,"B-5"],[58,50,"D-4"],[85,30,"G-2"]]) },
  france:  { background: "assets/imagenes/mapas/france.jpg",  hue: 105, seed: 53,
             missions: missionSet(["Misión 1", "Misión 2", "Misión 3", "Misión 4"], [[20,48,"A-3"],[44,72,"C-5"],[66,32,"E-2"],[86,58,"G-4"]]) },
  ussr:    { background: "assets/imagenes/mapas/ussr.jpg",    hue: 160, seed: 67,
             missions: missionSet(["Misión 1", "Misión 2", "Misión 3", "Misión 4"], [[14,36,"A-2"],[34,66,"C-5"],[64,62,"E-4"],[78,24,"F-2"]]) }
};

// Misiones jugables: "url" = página de la misión. Se le pasan por la URL el comandante y el tanque elegidos.
missionMaps.usa.missions[0].url = "html/saunders-mision1.html";
missionMaps.uk.missions[0].url = "html/stgloriana-mision1.html";   // St. Gloriana · Misión 1 (2 partes)
missionMaps.ussr.missions[0].url = "html/pravda-mision1.html";        // Pravda · Misión 1 (defensa por oleadas)
missionMaps.germany.missions[0].url = "html/kuromorimine-mision1.html";  // Kuromorimine · Misión 1 (eliminar al tanque bandera)

// Contenedor central opcional (por orden)
const gameData = { nations, characters, tanks: Object.fromEntries(Object.entries(nations).map(([k, v]) => [k, v.tanks])),
                   missions: missionMaps, music: { menu: MENU_MUSIC, nations: nationMusic } };


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

/* ======================= ESTADO ======================= */
const state = { selectedNation: null, selectedCommander: null, selectedTank: null, previewChar: null, view: "chars", busy: false };

/* ======================= 2) AUDIO ======================= */
const tracks = {};
let currentTrack = null;
let audioUnlocked = false;
let userPaused = false;                   // el jugador pausó la música desde el tocadiscos

// Obtiene (o crea y guarda en caché) el elemento de audio de una pista de música.
function getTrack(src) {
  if (tracks[src]) return tracks[src];
  const a = new Audio();
  a.loop = !isMenuTrack(src); a.preload = "auto"; a.volume = 0;      // las pistas del menú NO se repiten solas: al terminar pasa a la siguiente de la lista
  const t = { el: a, ok: true, raf: 0, src, title: TRACK_TITLES[src] || src.split("/").pop().replace(/\.[^.]+$/, "") };
  a.addEventListener("error", () => { t.ok = false; if (t === currentTrack && isMenuTrack(src)) switchMusic(pickMenuTrack()); });   // archivo ausente: se ignora (y en el menú salta a otra canción)
  a.addEventListener("ended", () => { if (t === currentTrack && isMenuTrack(src)) switchMusic(pickMenuTrack()); });                // terminó una canción del menú → siguiente al azar
  a.src = encodeURI(src);
  tracks[src] = t;
  return t;
}
// Fundido del volumen de una pista hasta un valor objetivo en ms.
function fadeTrack(t, target, ms) {
  cancelAnimationFrame(t.raf);
  const from = t.el.volume, t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / ms);
    t.el.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if (k < 1) t.raf = requestAnimationFrame(step);
    else if (target === 0) t.el.pause();
  };
  t.raf = requestAnimationFrame(step);
}
// ¿Esta ruta es una canción de la lista del menú?
const isMenuTrack = src => MENU_PLAYLIST.includes(src);
// Bolsa de canciones pendientes (mezcladas con Fisher-Yates). Cuando se vacía se vuelve a llenar → bucle infinito sin repetir hasta agotarlas.
let menuBag = [], lastMenuSrc = null;
function pickMenuTrack() {
  const usable = MENU_PLAYLIST.filter(s => !(tracks[s] && !tracks[s].ok));   // se descartan las que no cargaron (archivo ausente)
  if (!usable.length) return null;
  menuBag = menuBag.filter(s => usable.includes(s));
  if (!menuBag.length) {
    menuBag = usable.slice();
    for (let i = menuBag.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [menuBag[i], menuBag[k]] = [menuBag[k], menuBag[i]]; }
    if (menuBag.length > 1 && menuBag[menuBag.length - 1] === lastMenuSrc) menuBag.unshift(menuBag.pop());   // que no empiece repitiendo la última que sonó
  }
  lastMenuSrc = menuBag.pop();
  return lastMenuSrc;
}
// Qué canción debe sonar en el menú: si ya suena una de la lista se mantiene; si no, se elige una al azar.
function menuTrackSrc() { return currentTrack && currentTrack.ok && isMenuTrack(currentTrack.src) ? currentTrack.src : pickMenuTrack(); }
function switchMusic(src) {               // crossfade genérico
  if (!audioUnlocked) return;
  const next = src ? getTrack(src) : null;
  if (next === currentTrack) return;
  if (currentTrack) fadeTrack(currentTrack, 0, FADE_MS);
  if (next && next.ok) {
    if (isMenuTrack(src)) { try { next.el.currentTime = 0; } catch (e) {} }   // una canción del menú que ya sonó vuelve a empezar desde el principio
    if (!userPaused) {                                // si el jugador pausó el tocadiscos, la nueva pista queda en pausa
      const p = next.el.play();
      if (p && p.catch) p.catch(() => { next.ok = false; updatePlayer(); if (isMenuTrack(src) && currentTrack === next) switchMusic(pickMenuTrack()); });
      fadeTrack(next, effMusic(), FADE_MS);
    }
    currentTrack = next;
  } else currentTrack = null;
  updatePlayer();
}
function changeNationMusic(nation) {      // nation = clave o null (vuelve al menú)
  switchMusic(nation && nations[nation] ? nations[nation].music : menuTrackSrc());
}

/* ---- Efectos de sonido (SFX) ---- */
const sfxBase = {};
Object.entries(SFX_FILES).forEach(([k, src]) => {
  const a = new Audio(); a.preload = "auto"; a.addEventListener("error", () => { a.broken = true; });
  a.src = encodeURI(src); sfxBase[k] = a;
});
// Reproduce un efecto del menú; no suena hasta que el navegador desbloquea el audio (primer clic).
function sfx(name) {
  if (!audioUnlocked) return;
  const b = sfxBase[name]; if (!b || b.broken) return;
  const a = b.cloneNode(true); a.volume = Math.min(1, SFX_VOLUME * masterVolume * sfxVolume);
  const p = a.play(); if (p && p.catch) p.catch(() => {});
}
let errTick = false;
// Sonido de error.
function playError() { errTick = true; sfx("error"); setTimeout(() => { errTick = false; }, 0); }

/* ---- Control de volumen de la música ---- */
function setMusicVolume(v) {
  musicVolume = Math.min(1, Math.max(0, v));
  if (currentTrack) { cancelAnimationFrame(currentTrack.raf); currentTrack.el.volume = effMusic(); }
  try { localStorage.setItem("pv_musicVol", musicVolume); } catch (e) {}
  syncOptionSliders();                                      // mantiene sincronizado el slider del menú de opciones
}
// Volumen general del menú.
function setMasterVolume(v) {
  masterVolume = Math.min(1, Math.max(0, v));
  if (currentTrack) { cancelAnimationFrame(currentTrack.raf); currentTrack.el.volume = effMusic(); }   // la música se ajusta al instante
  try { localStorage.setItem("pv_masterVol", masterVolume); } catch (e) {}
  syncOptionSliders();
}
// Volumen de efectos del menú.
function setSfxVolume(v) {
  sfxVolume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem("pv_sfxVol", sfxVolume); } catch (e) {}
  syncOptionSliders();
}
// Menú OPCIONES: tres sliders (maestro, música, efectos)
function syncOptionSliders() {
  const vals = { master: masterVolume, music: musicVolume, sfx: sfxVolume };
  document.querySelectorAll("input[data-vol]").forEach(r => {
    const v = Math.round(vals[r.dataset.vol] * 100);
    r.value = v; r.style.setProperty("--p", v + "%");
    const out = r.parentElement.querySelector("b"); if (out) out.textContent = v;
  });
}
// Inicializa el panel de opciones (volúmenes).
function initOptions() {
  const setters = { master: setMasterVolume, music: setMusicVolume, sfx: setSfxVolume };
  document.querySelectorAll("input[data-vol]").forEach(r => {
    r.addEventListener("input", () => setters[r.dataset.vol](r.value / 100));
    r.addEventListener("change", () => { if (r.dataset.vol !== "music") sfx("decide"); });   // sonido de prueba al soltar
  });
  syncOptionSliders();
}
/* ---- Tocadiscos (disco giratorio abajo a la derecha) ---- */
const fmtTime = x => (isFinite(x) && x >= 0) ? Math.floor(x / 60) + ":" + String(Math.floor(x % 60)).padStart(2, "0") : "--:--";
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>', ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
let albumShown = null;
// Cambia la portada del disco: la anterior sale girando y la nueva entra girando desde el centro.
function setAlbum(file) {
  if (file === albumShown) return;
  const first = albumShown === null; albumShown = file;
  const img = document.querySelector(".disc-img");
  img.querySelectorAll(".alb:not(.out)").forEach(o => { o.classList.add("out"); setTimeout(() => o.remove(), 750); });
  const n = document.createElement("div"); n.className = "alb" + (first ? "" : " in");
  n.style.backgroundImage = 'url("' + new URL(encodeURI(ALBUM_DIR + file), document.baseURI).href + '")';   // ruta absoluta (el CSS está en otra carpeta)
  img.appendChild(n);
  if (!first) { const d = $("disc"); d.classList.remove("swap"); void d.offsetWidth; d.classList.add("swap"); }
}
// Actualiza el reproductor de música (título, progreso).
function updatePlayer() {
  const d = $("disc"); if (!d) return;
  const playing = !!(currentTrack && currentTrack.ok) && !userPaused;
  d.classList.toggle("paused", !playing);
  const title = currentTrack ? currentTrack.title : "Sin música";
  if ($("pl-title").textContent !== title) {                         // cambio de canción: el título entra con animación
    $("pl-title").textContent = title;
    const h = $("pl-title"); h.classList.remove("chg"); void h.offsetWidth; h.classList.add("chg");
  }
  if (currentTrack) setAlbum(TRACK_ALBUM[currentTrack.src] || "disco.jpg");
  $("pl-toggle").innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  $("pl-toggle").dataset.state = playing ? "playing" : "paused";
}
// Abre el reproductor.
function openPlayer()  { $("disc").classList.add("open"); $("player-ov").classList.add("on"); $("player-card").classList.add("on"); }
// Cierra el reproductor.
function closePlayer() { $("disc").classList.remove("open"); $("player-ov").classList.remove("on"); $("player-card").classList.remove("on"); }
// Pausa o reanuda la música.
function togglePlayback() {
  if (!currentTrack || !currentTrack.ok) return;
  userPaused = !userPaused;
  if (userPaused) fadeTrack(currentTrack, 0, 300);
  else { const p = currentTrack.el.play(); if (p && p.catch) p.catch(() => {}); fadeTrack(currentTrack, effMusic(), 400); }
  updatePlayer();
}
// Inicializa el reproductor de música.
function initPlayer() {
  $("disc").addEventListener("click", e => { e.stopPropagation(); if ($("disc").classList.contains("open")) closePlayer(); else openPlayer(); });
  $("player-ov").addEventListener("click", closePlayer);              // clic en cualquier otro lugar: vuelve el enfoque y el disco se esconde
  $("pl-toggle").addEventListener("click", e => { e.stopPropagation(); togglePlayback(); });
  $("pl-bar").addEventListener("click", e => {                        // clic en la barra = saltar a ese punto
    const t = currentTrack; if (!t || !isFinite(t.el.duration)) return;
    const r = $("pl-bar").getBoundingClientRect(); t.el.currentTime = t.el.duration * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePlayer(); });
  // barra de progreso y tiempos (solo mientras el panel está abierto)
  setInterval(() => {
    if (!$("player-card").classList.contains("on")) return;
    const t = currentTrack, cur = t ? t.el.currentTime : 0, dur = t ? t.el.duration : NaN;
    $("pl-cur").textContent = fmtTime(cur); $("pl-dur").textContent = fmtTime(dur);
    $("pl-fill").style.width = (isFinite(dur) && dur > 0 ? Math.min(100, cur / dur * 100) : 0) + "%";
  }, 250);
  // notas musicales que salen del disco (solo si suena y el disco está visible)
  setInterval(() => {
    const d = $("disc"), r = d.getBoundingClientRect();
    if (d.classList.contains("paused") || document.hidden || body.classList.contains("locked") || body.dataset.scene === "missions") return;
    if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return;
    const n = document.createElement("span"); n.className = "note"; n.textContent = Math.random() < 0.5 ? "♪" : "♫";
    const cx = Math.min(innerWidth, r.left + r.width / 2), cy = Math.min(innerHeight, r.top + r.height / 2), ang = Math.random() * Math.PI * 2;
    n.style.cssText = "left:" + (cx - innerWidth + Math.cos(ang) * r.width * 0.45) + "px;top:" + (cy - innerHeight + Math.sin(ang) * r.height * 0.45) + "px;" +
      "--dx:" + (-30 - Math.random() * 70) + "px;--dy:" + (-60 - Math.random() * 70) + "px;--rot:" + ((Math.random() - 0.5) * 50) + "deg;font-size:" + (16 + Math.random() * 12) + "px";
    $("disc-notes").appendChild(n); n.addEventListener("animationend", () => n.remove());
  }, 650);
  setAlbum("disco.jpg");                                              // portada inicial (la del menú)
  updatePlayer();
}

/* ---- Sonidos de interfaz (delegados: hover / decidir / cancelar) ---- */
const SFX_TARGETS = "button:not(:disabled), .npanel";
const CANCEL_IDS = ["btn-back-menu", "btn-back-select", "btn-back-gallery", "arrow-left"];
// Enlaza sonidos a los botones del menú.
function initSfx() {
  document.addEventListener("mouseover", e => {
    const t = e.target.closest(SFX_TARGETS);
    if (!t || t.classList.contains("locked") ) return;
    if (t.contains(e.relatedTarget)) return;            // ya estaba dentro del mismo elemento
    sfx("hover");
  });
  document.addEventListener("click", e => {
    const t = e.target.closest(SFX_TARGETS);
    if (!t || errTick) return;                           // si hubo error, ya sonó el de error
    if (t.classList.contains("locked")) { sfx("error"); return; }
    if (CANCEL_IDS.includes(t.id) || t.hasAttribute("data-close")) sfx("cancel"); else sfx("decide");
  });
}

/* ======================= 3) UTILIDADES ======================= */
const $ = id => document.getElementById(id);
const body = document.body;

// Pone una imagen; si no carga, marca el contenedor con «noimg» y una etiqueta TODO para reponerla.
function setImg(img, src, todoLabel) {
  const parent = img.parentElement;
  const mark = () => { const p = img.parentElement; if (p) { p.classList.add("noimg"); p.dataset.todo = "TODO: " + todoLabel; } };
  img.onload = () => { const p = img.parentElement; if (p) p.classList.remove("noimg"); };
  img.onerror = mark;
  if (!src) { img.removeAttribute("src"); if (parent) mark(); else queueMicrotask(mark); return; }
  img.src = src;
}
// Atajo para crear un elemento del DOM con clase y contenido.
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
// Escapa caracteres HTML peligrosos antes de insertar texto.
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// Abre una ventana modal.
function openModal(m) { m.classList.add("open"); }
// Cierra la ventana modal.
function closeModal(m) { m.classList.remove("open"); }

let toastTimer;
// Muestra un aviso temporal en pantalla.
function toast(node, msg) {
  node.textContent = msg; node.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
}

/* ======================= 4) ESCENAS ======================= */
const scenes = { menu: $("scene-menu"), select: $("scene-select"), missions: $("scene-missions"), gallery: $("scene-gallery") };
let currentScene = "menu";

// CRÍTICA · Cambia de escena (inicio, selección, misiones…) con transición.
function goTo(id, onMid) {
  if (state.busy || id === currentScene) return;
  state.busy = true;
  pvLoader.show();                                       // aparece el logo con la espiral de carga
  setTimeout(() => {
    scenes[currentScene].classList.remove("active", "enter");
    currentScene = id; body.dataset.scene = id;
    if (onMid) onMid();
    scenes[id].classList.add("active");
    if (id === "menu") scenes.menu.classList.add("enter");
    setTimeout(() => { pvLoader.hide(); setTimeout(() => { state.busy = false; }, 450); }, 650);   // se deja ver el logo un momento
  }, 900);
}

/* ======================= 5) SELECCIÓN ======================= */
function renderNations() {
  const strip = $("nation-strip"); strip.innerHTML = "";
  Object.keys(nations).forEach((key, i) => {
    const n = nations[key];
    const p = el("div", "npanel");
    p.style.setProperty("--i", i); p.dataset.key = key; p.tabIndex = 0;
    p.innerHTML = `<div class="flag" style="background-image:url('${n.flag}')"></div>
      <div class="ndetail"><img alt=""><span>${esc(n.faction)}</span></div>
      <div class="nname">${esc(n.name)}</div>`;
    const emb = p.querySelector("img"); setImg(emb, n.emblem, "escudo de " + n.faction);
    p.addEventListener("click", () => selectNation(key));
    p.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectNation(key); } });
    strip.appendChild(p);
  });
}

// Marca como completados los pasos nación / comandante / tanque.
function updateProgress() {
  const s = state;
  const done = { nation: !!s.selectedNation, commander: !!s.selectedCommander, tank: !!s.selectedTank };
  let cur = !done.nation ? "nation" : !done.commander ? "commander" : !done.tank ? "tank" : null;
  document.querySelectorAll("#progress li[data-step]").forEach(li => {
    li.classList.toggle("done", done[li.dataset.step]);
    li.classList.toggle("cur", li.dataset.step === cur);
  });
  $("btn-next").classList.toggle("dim", !(done.nation && done.commander && done.tank));
}

// Selecciona una nación y carga sus personajes.
function selectNation(key) {
  if (state.selectedNation === key || state.busy) return;
  const n = nations[key];
  const first = !state.selectedNation;
  state.selectedNation = key; state.selectedCommander = null; state.selectedTank = null; state.previewChar = null;
  document.querySelectorAll(".npanel").forEach(p => p.classList.toggle("sel", p.dataset.key === key));
  changeNationMusic(key);                                  // crossfade de música

  const head = $("faction-head");
  head.classList.remove("show");
  setTimeout(() => {
    setImg($("fh-emblem"), n.emblem, "escudo de " + n.faction);
    setImg($("fh-flag"), n.flag, "bandera");
    $("fh-name").textContent = n.faction;
    head.classList.add("show");
  }, first ? 50 : 300);

  showView("chars");
  const card = $("char-card"), grid = $("char-grid");
  grid.style.opacity = 0; card.classList.add("out");
  setTimeout(() => {
    renderChars(); renderTanks();
    grid.style.transition = "opacity .4s"; grid.style.opacity = 1;
    previewCharacter(n.characters[0], true);
  }, first ? 50 : 250);
  updateProgress();
}

// Dibuja la lista de comandantes de la nación.
function renderChars() {
  const grid = $("char-grid"); grid.innerHTML = "";
  nations[state.selectedNation].characters.forEach(id => {
    const c = characters[id];
    const b = el("button", "pfp"); b.dataset.id = id; b.title = c.name;
    b.innerHTML = `<span class="star">✦</span><img alt="${esc(c.name)}">`;
    setImg(b.querySelector("img"), c.pfp, "pfp de " + c.name);
    b.addEventListener("click", () => previewCharacter(id));
    b.addEventListener("dblclick", () => selectCommander(id));
    b.addEventListener("keydown", e => { if (e.key === "Enter") selectCommander(id); });
    grid.appendChild(b);
  });
  syncCharStates();
}
// Marca visualmente qué comandante está en vista previa y cuál elegido.
function syncCharStates() {
  document.querySelectorAll(".pfp").forEach(b => {
    b.classList.toggle("view-sel", b.dataset.id === state.previewChar);
    b.classList.toggle("cmd", b.dataset.id === state.selectedCommander);
  });
}

// Muestra la vista previa del comandante.
function previewCharacter(id, instant) {
  if (!id) return;
  const list = nations[state.selectedNation].characters;
  const dir = list.indexOf(id) >= list.indexOf(state.previewChar) ? 1 : -1;
  state.previewChar = id; syncCharStates();
  const card = $("char-card"), c = characters[id];
  card.style.setProperty("--dx", (-30 * dir) + "px");
  const apply = () => {
    setImg($("cc-img"), c.fullImage, "imagen de " + c.name);
    $("cc-name").textContent = c.name;
    const ps = c.passive;
    $("cc-pname").textContent = ps ? ps.name : "—"; $("cc-pdesc").textContent = ps ? ps.desc : "Esta tripulación no tiene habilidad pasiva.";
    $("cc-birth").textContent = c.birth; $("cc-height").textContent = c.height; $("cc-desc").textContent = c.desc;
    $("cc-tag").textContent = state.selectedCommander === id ? "COMANDANTE SELECCIONADO ✦" : nations[state.selectedNation].faction;
    card.classList.remove("out"); card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
  };
  if (instant) apply(); else { card.classList.remove("in"); card.classList.add("out"); setTimeout(apply, 200); }
}

// Elige un comandante.
function selectCommander(id) {
  state.selectedCommander = id;
  state.previewChar = id; syncCharStates();
  $("cc-tag").textContent = "COMANDANTE SELECCIONADO ✦";
  if (characters[id]) { $("cc-name").textContent = characters[id].name; }
  previewCharacter(id, false);
  updateProgress();
  toast($("toast"), "COMANDANTE SELECCIONADO: " + characters[id].name.toUpperCase());
  $("toast").style.background = "rgba(74,90,52,.95)"; $("toast").style.borderColor = "var(--brass)";
}

// Dibuja los tanques disponibles.
function renderTanks() {
  const list = $("tank-list"); list.innerHTML = "";
  nations[state.selectedNation].tanks.forEach(t => {
    const b = el("button", "tank"); b.dataset.id = t.id;
    b.innerHTML = `<span class="badge">SELECCIONADO</span><div class="timg"><img alt="${esc(t.name)}"></div>
      <h4>${esc(t.name)}</h4>
      <dl><dt>TIPO</dt><dd>${esc(t.type)}</dd><dt>VELOCIDAD</dt><dd>${esc(t.speed)}</dd><dt>ARMAMENTO</dt><dd>${esc(t.weapon)}</dd></dl>
      <p>${esc(t.description)}</p>`;
    setImg(b.querySelector("img"), t.image, "imagen del tanque");
    b.addEventListener("click", () => selectTank(t.id));
    list.appendChild(b);
  });
}
// Elige un tanque.
function selectTank(id) {
  if (!state.selectedCommander) { warn("SELECCIONE UN COMANDANTE PRIMERO"); showView("chars"); return; }
  state.selectedTank = id;
  document.querySelectorAll(".tank").forEach(b => b.classList.toggle("sel", b.dataset.id === id));
  updateProgress();
}

// Cambia la vista de la escena de selección.
function showView(v) {
  state.view = v;
  $("view-chars").classList.toggle("active", v === "chars");
  $("view-tanks").classList.toggle("active", v === "tanks");
}
// Muestra un aviso en el menú y suena el error.
function warn(msg) {
  playError();
  const t = $("toast"); t.style.background = ""; t.style.borderColor = "";
  toast(t, msg);
}

// Valida que la selección esté completa y avanza al siguiente paso.
function nextStep() {
  if (!state.selectedNation) return warn("SELECCIONE UNA NACIÓN");
  if (!state.selectedCommander) { showView("chars"); return warn("SELECCIONE UN COMANDANTE (DOBLE CLIC)"); }
  if (!state.selectedTank) { showView("tanks"); return warn("SELECCIONE UN TANQUE"); }
  goTo("missions", renderMissions);
}

/* ======================= 6) MISIONES ======================= */
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function buildTerrain(map) {         // mapa táctico procedural (se ve si no hay imagen de mapa)
  const r = mulberry(map.seed), h = map.hue, W = 1600, H = 900;
  let s = `<defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},22%,17%)"/><stop offset="1" stop-color="hsl(${h},28%,10%)"/></linearGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#tg)"/>`;
  for (let i = 0; i < 6; i++) s += `<ellipse cx="${r()*W}" cy="${r()*H}" rx="${120+r()*260}" ry="${70+r()*160}" fill="none" stroke="hsla(${h},30%,50%,.14)" stroke-width="1.5"/>`;
  for (let x = 0; x <= W; x += 100) s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(214,201,138,.12)"/>`;
  for (let y = 0; y <= H; y += 100) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(214,201,138,.12)"/>`;
  for (let i = 0; i < 16; i++) s += `<text x="${i*100+6}" y="16" fill="#d6c98a" opacity=".5" font-size="12">${String.fromCharCode(65+i)}</text>`;
  for (let i = 1; i < 9; i++) s += `<text x="6" y="${i*100-6}" fill="#d6c98a" opacity=".5" font-size="12">${i}</text>`;
  const y0 = 150 + r() * 600;                                       // río
  s += `<path d="M-20 ${y0} C ${400} ${y0-200}, ${800} ${y0+240}, ${W+20} ${y0-60}" fill="none" stroke="hsl(205,45%,32%)" stroke-width="22" opacity=".8" stroke-linecap="round"/>`;
  for (let k = 0; k < 2; k++) {                                     // caminos
    const a = r() * H, b = r() * H;
    s += `<path d="M-20 ${a} C ${500} ${a+160*(r()-.5)*2}, ${1000} ${b+160*(r()-.5)*2}, ${W+20} ${b}" fill="none" stroke="#b9a977" stroke-width="5" stroke-dasharray="${k?'14 8':'0'}" opacity=".7"/>`;
  }
  for (let c = 0; c < 5; c++) {                                     // bosques
    const cx = r() * W, cy = r() * H;
    for (let i = 0; i < 12; i++) s += `<circle cx="${cx+(r()-.5)*180}" cy="${cy+(r()-.5)*130}" r="${10+r()*16}" fill="hsl(${h},45%,24%)" opacity=".8"/>`;
  }
  for (let c = 0; c < 4; c++) {                                     // edificios
    const cx = r() * (W - 100), cy = r() * (H - 100);
    for (let i = 0; i < 7; i++) s += `<rect x="${cx+r()*80}" y="${cy+r()*60}" width="${10+r()*16}" height="${8+r()*14}" fill="#8a8670" opacity=".75"/>`;
  }
  return s;
}

// Abre la misión con el comandante y el tanque que eligió el jugador (parámetros de la URL)
function launchMission(m) {
  if (state.busy) return;
  state.busy = true;
  const q = new URLSearchParams({ nacion: state.selectedNation, comandante: state.selectedCommander, tanque: state.selectedTank });
  pvLoader.show();
  if (currentTrack) fadeTrack(currentTrack, 0, 700);
  setTimeout(() => { location.href = m.url + "?" + q.toString(); }, 1300);
}

// Dibuja las misiones de la nación; al elegir una abre html/<misión>.html con comandante y tanque en la URL.
function renderMissions() {
  const nat = nations[state.selectedNation], map = missionMaps[nat.missionMap];
  $("map-title").textContent = "MAPA DE MISIONES — " + nat.name;
  $("map-terrain").innerHTML = buildTerrain(map);
  const bg = $("map-bg"); bg.style.backgroundImage = "";
  const probe = new Image();                                     // usa la imagen solo si existe
  probe.onload = () => { bg.style.backgroundImage = `url('${map.background}')`; };
  probe.src = map.background;

  const links = $("map-links"), nodes = $("map-nodes"); links.innerHTML = ""; nodes.innerHTML = "";
  const byId = Object.fromEntries(map.missions.map(m => [m.id, m]));
  map.missions.forEach(m => m.links.forEach(to => {
    const t = byId[to]; if (!t) return;
    links.insertAdjacentHTML("beforeend", `<line x1="${m.x}" y1="${m.y}" x2="${t.x}" y2="${t.y}" class="${t.locked ? "locked" : ""}"/>`);
  }));
  map.missions.forEach((m, i) => {
    const n = el("button", "node" + (m.locked ? " locked" : ""));
    n.style.left = m.x + "%"; n.style.top = m.y + "%"; n.style.setProperty("--i", i);
    n.innerHTML = `<div class="dot">${m.locked ? "🔒" : "★"}</div><div class="nlabel">${esc(m.name)}</div><div class="ncoord">${esc(m.coord || "")}</div>`;
    n.addEventListener("click", () => {
      if (m.locked) { playError(); toast($("toast2"), "MISIÓN BLOQUEADA"); return; }
      if (m.url) { launchMission(m); return; }
      toast($("toast2"), "TODO: iniciar " + m.name);
    });
    nodes.appendChild(n);
  });

  const c = characters[state.selectedCommander], t = nat.tanks.find(x => x.id === state.selectedTank);
  $("loadout").innerHTML = `<div class="pfp cmd"><img alt=""></div>
    <div><small>NACIÓN</small><b>${esc(nat.name)}</b></div>
    <div><small>COMANDANTE</small><b>${esc(c.name)}</b></div>
    <div><small>TANQUE</small><b>${esc(t.name)}</b></div>`;
  setImg($("loadout").querySelector("img"), c.pfp, "pfp");
}

/* ======================= 7) INICIO ======================= */
function initWelcome() {
  let idx = Math.floor(Math.random() * welcomeMessages.length), last = -1;
  try { last = parseInt(localStorage.getItem("pv_lastMsg"), 10); } catch (e) {}
  if (welcomeMessages.length > 1) while (idx === last) idx = Math.floor(Math.random() * welcomeMessages.length);
  try { localStorage.setItem("pv_lastMsg", idx); } catch (e) {}
  $("w-title").textContent = welcomeMessages[idx].title;
  $("w-text").textContent = welcomeMessages[idx].text;

  $("w-btn").addEventListener("click", () => {
    closeModal($("welcome"));
    audioUnlocked = true;                       // el clic del usuario habilita el audio
    switchMusic(menuTrackSrc());                  // primera canción del menú (al azar)
    body.classList.remove("locked");
    scenes.menu.classList.remove("enter"); void scenes.menu.offsetWidth; scenes.menu.classList.add("enter");
  });
}

// Inicializa la pantalla de créditos.
function initCredits() {
  const list = $("credits-list");
  credits.forEach(c => {
    const d = el("div", "credit", `<div class="photo"><img alt="${esc(c.name)}"></div><h3>${esc(c.name)}</h3><p>Se encargó de:<br>${esc(c.role)}</p>`);
    setImg(d.querySelector("img"), c.image, "foto de créditos");
    list.appendChild(d);
  });
}


/* ======================= GALERÍA ======================= */
/* ---- DATOS EDITABLES DE LA GALERÍA ----
   Todo lo que no completes aquí se muestra con un texto de ejemplo. Para cada personaje / tanque (usa el mismo id que en
   `characters` y en las listas de tanques) puedes definir:
     personajes:  { role, quote, bio, trivia, extra: {"ETIQUETA": "valor"}, images: [rutas...] }
     tanques:     { origin, year, weight, speedMax, quote, history, series,
                    extra: {"ETIQUETA": "valor"}, images: [rutas...] }
   Ejemplos (descomenta y edita):
     kay: { role: "Comandante", quote: "“¡Hay que divertirse!”", bio: "…", trivia: "…", images: [IMG + "ch_full/kay.png", IMG + "galeria/kay-2.png"] }
*/
const GALLERY_CHARS = {
  kay: { role: "Comandante",
    bio: "Es la comandante del equipo de Saunders. Tiene una personalidad alegre, amigable y optimista. Cree en el juego limpio y valora mucho a sus compañeras.",
    trivia: "Es muy aficionada a la cultura estadounidense y suele utilizar expresiones típicas de ese país. Comanda un M4 Sherman." },
  alisa: { role: "Segunda al mando y operadora de comunicaciones",
    bio: "Es la segunda al mando de Saunders y la operadora de comunicaciones de su equipo. Es competitiva, ambiciosa y bastante orgullosa.",
    trivia: "Durante el enfrentamiento contra Ōarai utiliza un globo aerostático para obtener información sobre la posición enemiga." },
  naomi: { role: "Artillera",
    bio: "Es una de las mejores artilleras de Saunders. Tiene una personalidad tranquila, seria y reservada. Su precisión con el cañón la convierte en una de las integrantes más peligrosas del equipo.",
    trivia: "Es capaz de realizar disparos extremadamente precisos con el Sherman Firefly." },
  erika: { role: "Segunda al mando",
    bio: "Es la segunda al mando de Kuromorimine y una de las principales subordinadas de Maho Nishizumi. Es estricta, orgullosa y muy competitiva. Inicialmente desconfía de las tácticas de Miho.",
    trivia: "Después de la partida de Maho, Erika termina convirtiéndose en la comandante de Kuromorimine." },
  koume: { role: "Estudiante",
    bio: "Es una estudiante de Kuromorimine que aparece durante los acontecimientos de la película. Tiene una personalidad amable y es una de las personajes relacionadas con el pasado de Miho.",
    trivia: "Miho la rescató durante una competición anterior, cuando su tanque quedó atrapado en el agua. Este acontecimiento fue importante para la decisión de Miho de abandonar Kuromorimine." },
  maho: { role: "Comandante",
    bio: "Es la hermana mayor de Miho y comandante de Kuromorimine. Proviene de la prestigiosa familia Nishizumi, conocida por su estilo tradicional de Sensha-dō. Es seria, disciplinada y una excelente estratega.",
    trivia: "Su tanque principal es el Tiger I, uno de los vehículos más representativos de la escuela." },
  darjeeling: { role: "Comandante",
    bio: "Es la comandante de St. Gloriana. Se caracteriza por su elegancia, inteligencia y comportamiento refinado. Tiene una gran capacidad estratégica y respeta a sus rivales.",
    trivia: "Tiene la costumbre de beber té y citar proverbios y frases filosóficas, incluso durante las batallas." },
  rosehip: { role: "Integrante",
    bio: "Es una integrante de St. Gloriana conocida por su personalidad extremadamente enérgica e impaciente. Se diferencia bastante del comportamiento elegante y tranquilo de sus compañeras.",
    trivia: "Es una gran entusiasta de la velocidad y conduce un Crusader Mk. III." },
  rukurini: { role: "Comandante de un Matilda II",
    bio: "Es una estudiante de St. Gloriana y comandante de un tanque Matilda II. Tiene una personalidad confiada y competitiva, y participa en los enfrentamientos de su escuela.",
    trivia: "Su nombre está inspirado en un tipo de té africano llamado Rukuriri." },
  anchovy: { role: "Comandante",
    bio: "Es la comandante de Anzio. Su verdadero nombre es Chiyomi Anzai. Es enérgica, carismática y muy orgullosa de su escuela. Se preocupa mucho por sus compañeras y busca mantener unido a su equipo.",
    trivia: "Su tanque principal es el Carro Armato P40 y tiene una gran afición por la comida italiana." },
  carpaccio: { role: "Integrante destacada",
    bio: "Su verdadero nombre es Hina. Es una de las integrantes más destacadas de Anzio y una amiga de infancia de Caesar, de Ōarai. Es tranquila, amable y tiene buenas habilidades de combate.",
    trivia: "Ambas se conocen desde pequeñas y tienen una relación especial que se desarrolla en el anime y en el material complementario." },
  marie: { role: "Comandante",
    bio: "Es la comandante de BC Freedom. Tiene una personalidad tranquila, elegante y algo despreocupada. Le gusta mantener una actitud relajada incluso en situaciones complicadas.",
    trivia: "Tiene una gran afición por los dulces, especialmente los pasteles franceses, y suele comerlos durante las reuniones." },
  rena: { role: "Subcomandante",
    bio: "Es una de las subcomandantes de BC Freedom y representa a la facción de los estudiantes de examen. Tiene una personalidad rebelde, temperamental y competitiva.",
    trivia: "Su rivalidad con Oshida representa el conflicto entre las dos facciones de BC Freedom." },
  ruka: { role: "Subcomandante",
    bio: "Es la otra subcomandante de BC Freedom y representa a los estudiantes de ingreso directo, conocidos como Escalators. Es orgullosa, competitiva y suele discutir con Andou.",
    trivia: "A pesar de su rivalidad, ambas son capaces de cooperar cuando la situación lo requiere. Comanda un ARL 44." },
  katyusha: { role: "Comandante",
    bio: "Es la comandante de Pravda. Tiene una personalidad autoritaria, orgullosa y bastante infantil. A pesar de su apariencia, es una estratega muy inteligente y una líder respetada por sus compañeras.",
    trivia: "Debido a su baja estatura, suele subirse a los hombros de Nonna para parecer más alta que los demás." },
  nonna: { role: "Segunda al mando",
    bio: "Es la segunda al mando de Pravda y una de las integrantes más experimentadas del equipo. Es tranquila, inteligente y extremadamente leal a Katyusha.",
    trivia: "Es muy alta, mide 176 cm, y suele llevar a Katyusha sobre sus hombros. También tiene una gran habilidad musical y toca el piano." },
  klara: { role: "Oficial de confianza",
    bio: "Es una estudiante transferida desde Novosibirsk, Rusia. Se incorpora a Pravda y se convierte en una de las oficiales de confianza de Katyusha. Es disciplinada, reservada y muy protectora con ella.",
    trivia: "Habla ruso con frecuencia y su tanque principal es un T-34/85." },
};
const GALLERY_TANKS = {
  firefly: { description: "Tanque medio desarrollado a partir del estadounidense M4 Sherman. Su principal característica era su potente cañón británico de 17 libras (76,2 mm), capaz de enfrentarse a los tanques alemanes más pesados.",
    history: "Fue desarrollado por los británicos durante la Segunda Guerra Mundial para mejorar la capacidad antitanque de los Sherman. Entró en combate en 1944, especialmente durante la campaña de Normandía.",
    series: "Pertenece a Saunders. Es utilizado por Naomi, una de las mejores artilleras de la escuela. Su largo cañón lo diferencia de los Sherman convencionales.",
    origin: "Reino Unido (modificación británica)", year: "1944–década de 1950", weight: "35,3 toneladas", speedMax: "40 km/h" },
  m4sherman: { description: "Tanque medio estadounidense caracterizado por su confiabilidad, facilidad de mantenimiento y producción masiva. Generalmente estaba equipado con un cañón de 75 mm.",
    history: "Fue desarrollado durante la Segunda Guerra Mundial y entró en servicio en 1942. Se convirtió en uno de los tanques aliados más importantes del conflicto, participando en campañas de África, Europa y el Pacífico.",
    series: "Es uno de los principales tanques de Saunders. Kay y Alisa utilizan variantes Sherman. La escuela aprovecha su movilidad y superioridad numérica.",
    origin: "Estados Unidos", year: "Desde 1942", weight: "30,3 toneladas", speedMax: "40–48 km/h" },
  panther: { description: "Tanque medio alemán con blindaje inclinado, gran movilidad y un potente cañón KwK 42 de 75 mm. Fue diseñado para combinar protección, potencia de fuego y velocidad.",
    history: "Su desarrollo comenzó después de que Alemania encontrara dificultades para enfrentar a los T-34 soviéticos durante la invasión de la Unión Soviética en 1941. Entró en combate en 1943, durante la batalla de Kursk.",
    series: "Es utilizado por Kuromorimine. Forma parte de las fuerzas comandadas por Maho y posteriormente por Erika. Representa el estilo de combate alemán basado en potencia y precisión.",
    origin: "Alemania", year: "1943–1945", weight: "44,8 toneladas", speedMax: "46–55 km/h" },
  tiger1: { description: "Tanque pesado alemán famoso por su grueso blindaje y su cañón de 88 mm. Era capaz de destruir vehículos enemigos a grandes distancias.",
    history: "Fue desarrollado como respuesta a los tanques soviéticos KV y T-34. Entró en servicio en 1942 y participó en los principales frentes de la Segunda Guerra Mundial. Su principal desventaja era su elevado costo, mantenimiento complicado y problemas mecánicos.",
    series: "Es el tanque principal de Maho Nishizumi, comandante de Kuromorimine. Representa la fuerza y tradición de la escuela.",
    origin: "Alemania", year: "1942–1945", weight: "56,9–57 toneladas", speedMax: "38–40 km/h" },
  matilda: { description: "Tanque de infantería británico caracterizado por su excelente blindaje para la época. Estaba equipado con un cañón de 2 libras (40 mm) y diseñado para avanzar junto a la infantería, resistiendo los ataques enemigos. Su principal desventaja era su velocidad reducida.",
    history: "Fue desarrollado por el Reino Unido durante la década de 1930 y entró en servicio en 1939. Tuvo una participación destacada durante la campaña del norte de África, especialmente en los primeros enfrentamientos contra las fuerzas italianas. Posteriormente fue reemplazado por vehículos más modernos.",
    series: "Es utilizado por St. Gloriana Girls College. Rukuriri comanda uno de estos tanques durante los enfrentamientos. Se caracteriza por su resistencia y su capacidad para soportar impactos gracias a su grueso blindaje.",
    origin: "Reino Unido", year: "1939–1945", weight: "25,4 toneladas", speedMax: "24 km/h" },
  churchill: { description: "Tanque pesado de infantería británico. Se caracterizaba por su blindaje extremadamente grueso, su capacidad para superar obstáculos y su cañón de 75 mm.",
    history: "El Churchill fue desarrollado durante la Segunda Guerra Mundial para acompañar y apoyar a la infantería. La versión Mk. VII apareció en 1944, incorporando un blindaje considerablemente mejorado respecto de sus predecesores.",
    series: "Es el tanque insignia de St. Gloriana y está comandado por Darjeeling. Su resistencia refleja el estilo defensivo y disciplinado de la escuela.",
    origin: "Reino Unido", year: "Desde 1944", weight: "40–40,6 toneladas", speedMax: "20 km/h" },
  p26: { description: "Tanque italiano de categoría pesada, equipado con un cañón de 75 mm y blindaje inclinado. Fue uno de los proyectos más avanzados de la industria acorazada italiana durante la guerra.",
    history: "Su desarrollo comenzó en 1940, pero diversos problemas técnicos retrasaron su producción. Entró en servicio en 1943, cuando Italia ya había firmado el armisticio. Posteriormente, Alemania utilizó varios ejemplares bajo la denominación Pz.Kpfw. P40 737(i).",
    series: "Es utilizado por Anzio. Es uno de los vehículos más importantes de su arsenal y representa su capacidad de combate frente a escuelas con tanques más modernos.",
    origin: "Italia", year: "1943–1945", weight: "26 toneladas", speedMax: "42 km/h" },
  cv33: { description: "Pequeña tanqueta italiana diseñada principalmente para reconocimiento y apoyo a la infantería. Estaba equipada con ametralladoras y tenía un blindaje muy ligero.",
    history: "Fue desarrollada durante la década de 1930 por Italia. Participó en conflictos como la Guerra Civil Española y la Segunda Guerra Mundial. Su pequeño tamaño y bajo costo permitieron fabricar numerosos ejemplares, aunque su armamento y protección quedaron rápidamente anticuados.",
    series: "Es utilizado por Anzio. El equipo de Carpaccio y otros integrantes de la escuela emplea estas pequeñas tanquetas, aprovechando su tamaño y movilidad.",
    origin: "Italia", year: "1935–1945", weight: "2,7 toneladas", speedMax: "40 km/h" },
  ft17: { description: "Tanque ligero francés considerado uno de los primeros diseños modernos de carros de combate. Poseía una torreta giratoria de 360 grados, con el motor en la parte trasera y el conductor en la delantera.",
    history: "Fue desarrollado durante la Primera Guerra Mundial y entró en combate en 1918. Su diseño revolucionó la construcción de tanques y sirvió como inspiración para numerosos vehículos posteriores.",
    series: "Aparece en BC Freedom Academy. Es uno de los vehículos más antiguos de la escuela y contrasta con tanques mucho más modernos como el ARL-44.",
    origin: "Francia", year: "Desde 1918 (utilizado hasta la década de 1940 en algunos ejércitos)", weight: "6,5–6,7 toneladas", speedMax: "7,8 km/h" },
  arl44: { description: "Tanque pesado francés de posguerra, equipado con un cañón de 90 mm y un blindaje frontal de hasta 120 mm. Su diseño combinaba características de tanques antiguos con tecnologías más modernas.",
    history: "Fue desarrollado después de la liberación de Francia, cuando el país buscaba recuperar su industria militar. Su producción comenzó en 1947 y los primeros ejemplares fueron entregados en 1951. Tuvo una carrera corta debido a problemas técnicos y a la llegada de vehículos más modernos.",
    series: "Es utilizado por BC Freedom Academy y está asociado a Ruka Oshida. Es uno de los tanques más poderosos de la escuela.",
    origin: "Francia", year: "1951–1954", weight: "50 toneladas", speedMax: "37 km/h" },
  kv2: { description: "Tanque pesado soviético fácilmente reconocible por su enorme torreta rectangular. Estaba equipado con un obús de 152 mm, diseñado para destruir fortificaciones y posiciones defensivas.",
    history: "Fue desarrollado antes de la Segunda Guerra Mundial y entró en combate durante la invasión alemana de la Unión Soviética en 1941. Su potente armamento y blindaje lo hacían formidable, pero su gran peso y problemas mecánicos dificultaban su movilidad.",
    series: "Es utilizado por Pravda. Es uno de los tanques más reconocibles de la escuela y destaca por su enorme torreta y poder destructivo.",
    origin: "Unión Soviética", year: "1940–1941", weight: "52 toneladas", speedMax: "26 km/h" },
  t34: { description: "Tanque medio soviético equipado con un cañón de 76,2 mm. Se caracterizaba por su blindaje inclinado, buena movilidad y diseño relativamente sencillo de fabricar y mantener.",
    history: "Entró en servicio en 1940 y se convirtió en uno de los tanques más importantes de la Unión Soviética durante la Segunda Guerra Mundial. Su aparición sorprendió a las fuerzas alemanas durante la Operación Barbarroja. Fue posteriormente reemplazado progresivamente por el T-34/85, que incorporaba un cañón de mayor calibre y una torreta mejorada.",
    series: "Es utilizado por Pravda High School. Forma parte de las fuerzas de Katyusha y Nonna, siendo uno de los vehículos fundamentales de su ejército.",
    origin: "Unión Soviética", year: "Desde 1940 (década de 1950 en la URSS)", weight: "26,5–30,9 toneladas", speedMax: "53 km/h" },
};
const SAMPLE_TEXT = "Texto de ejemplo: aquí irá la información detallada. Puedes escribir varias líneas con la historia, el rol y los detalles que quieras mostrar.";
const gal = { nation: null, tab: "chars", item: null, img: 0, busy: false };

// Lista de personajes o tanques que muestra la galería según la pestaña.
function galItems() {
  const n = nations[gal.nation];
  return gal.tab === "chars"
    ? n.characters.map(id => characters[id])
    : n.tanks;
}
function galData(item) {                 // junta datos reales + editables + ejemplos
  const n = nations[gal.nation];
  if (gal.tab === "chars") {
    const e = GALLERY_CHARS[item.id] || {};
    return {
      kind: "chars", id: item.id, name: item.name, tag: n.faction,
      images: e.images || [item.fullImage, item.pfp],
      quote: e.quote || "",                                   // sin cita por defecto (si defines `quote` en GALLERY_CHARS, se muestra)
      fields: Object.entries(Object.assign({
        "ESCUELA": n.faction, "FECHA DE NACIMIENTO": item.birth, "ALTURA": item.height,
        "ROL": e.role || "Por definir"
      }, e.extra || {})),
      stats: null,
      sections: [["BIOGRAFÍA", e.bio || SAMPLE_TEXT], ["DATO CURIOSO", e.trivia || "Dato curioso de ejemplo sobre el personaje."]],
      passive: item.passive
    };
  }
  const e = GALLERY_TANKS[item.id] || {};
  return {
    kind: "tanks", id: item.id, name: item.name, tag: n.faction + " · " + n.name,
    images: e.images || [item.image, IMG + "tanques/galeria/" + item.id + "-2.webp", IMG + "tanques/galeria/" + item.id + "-3.webp"],
    quote: e.quote || "",                                   // sin cita por defecto (si defines `quote` en GALLERY_TANKS, se muestra)
    fields: Object.entries(Object.assign({
      "TIPO": item.type, "VELOCIDAD": item.speed, "ARMAMENTO": item.weapon,
      "ORIGEN": e.origin || "Por definir", "AÑO DE SERVICIO": e.year || "Por definir", 
      "PESO": e.weight || "Por definir", "VELOCIDAD MÁX.": e.speedMax || "Por definir"
    }, e.extra || {})),
    stats: null,                                  // sin barras de potencia / blindaje / movilidad (si algún día las quieres, vuelve a poner aquí la lista de stats)
    sections: [["DESCRIPCIÓN", e.description || item.description], ["HISTORIA", e.history || SAMPLE_TEXT], ["EN LA SERIE", e.series || "Texto de ejemplo: su aparición en la serie."]],
    passive: null
  };
}

// Dibuja la tira de miniaturas de la galería.
function renderGalleryStrip() {
  const strip = $("gal-strip"); strip.innerHTML = "";
  Object.keys(nations).forEach((key, i) => {
    const n = nations[key];
    const p = el("div", "npanel");
    p.style.setProperty("--i", i); p.dataset.key = key; p.tabIndex = 0;
    p.innerHTML = `<div class="flag" style="background-image:url('${n.flag}')"></div>
      <div class="ndetail"><img alt=""><span>${esc(n.faction)}</span></div>
      <div class="nname">${esc(n.name)}</div>`;
    setImg(p.querySelector("img"), n.emblem, "escudo de " + n.faction);
    p.addEventListener("click", () => galSelectNation(key));
    p.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); galSelectNation(key); } });
    strip.appendChild(p);
  });
}
// Cambia la nación en la galería.
function galSelectNation(key, first) {
  if (!first && (gal.nation === key || gal.busy)) return;
  gal.nation = key;
  document.querySelectorAll("#gal-strip .npanel").forEach(p => p.classList.toggle("sel", p.dataset.key === key));
  galRenderList(); galShow(galItems()[0].id, 1, first);
}
// Cambia la pestaña de la galería.
function galSetTab(tab) {
  if (gal.tab === tab || gal.busy) return;
  gal.tab = tab;
  const t = $("gal-tabs"); t.dataset.tab = tab;
  t.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  galRenderList(); galShow(galItems()[0].id, tab === "tanks" ? 1 : -1);
}
// Dibuja la lista de la galería como una TABLA real: <thead> con los encabezados y una fila <tr> por personaje o tanque.
function galRenderList() {
  $("gal-list-label").textContent = gal.tab === "chars" ? "PERSONAJES" : "TANQUES";
  const isChars = gal.tab === "chars";
  const table = $("gal-table");
  // Encabezados (<thead>): cambian según la pestaña
  const cols = isChars ? ["FOTO", "NOMBRE", "NACIMIENTO", "ALTURA"] : ["IMAGEN", "NOMBRE", "TIPO"];
  table.tHead.innerHTML = "<tr>" + cols.map(c => `<th scope="col">${c}</th>`).join("") + "</tr>";
  // Cuerpo (<tbody>): una fila <tr> por elemento
  const body = table.tBodies[0]; body.innerHTML = "";
  galItems().forEach((it, i) => {
    const tr = el("tr", "g-item" + (isChars ? "" : " is-tank")); tr.dataset.id = it.id; tr.style.setProperty("--i", i); tr.tabIndex = 0;
    const extra = isChars ? [it.birth, it.height] : [it.type];            // columnas de datos (personajes: 2 · tanques: 1)
    tr.innerHTML = `<td><div class="gi-img"><img alt=""></div></td><th scope="row" class="gi-name">${esc(it.name)}</th>` +
      extra.map(v => `<td>${esc(v)}</td>`).join("");
    setImg(tr.querySelector("img"), isChars ? it.pfp : it.image, isChars ? "pfp" : "tanque");
    const pick = () => { if (gal.item !== it.id) galShow(it.id, galItems().findIndex(x => x.id === it.id) >= galItems().findIndex(x => x.id === gal.item) ? 1 : -1); };
    tr.addEventListener("click", pick);
    tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    body.appendChild(tr);
  });
}
// Muestra la ficha de un elemento: la anterior se desliza afuera y la nueva entra con animación escalonada.
function galShow(id, dir, instant) {
  const item = galItems().find(x => x.id === id); if (!item) return;
  gal.item = id; gal.img = 0;
  document.querySelectorAll(".g-item").forEach(b => b.classList.toggle("sel", b.dataset.id === id));
  const card = $("gal-detail"); card.style.setProperty("--dx", (-26 * dir) + "px");
  const apply = () => {
    const d = galData(item);
    card.classList.toggle("is-tank", d.kind === "tanks");          // los tanques usan un marco ancho (ver CSS #gal-detail.is-tank)
    $("g-frame").className = "g-frame" + (d.kind === "tanks" ? " is-tank" : ""); $("g-frame").innerHTML = "";
    const th = $("g-thumbs"); th.innerHTML = "";
    d.images.forEach((src, i) => {
      const b = el("button", "g-th" + (d.kind === "tanks" ? " is-tank" : "") + (i === 0 ? " sel" : "")); b.innerHTML = "<img alt=''>";
      setImg(b.querySelector("img"), src, "imagen " + (i + 1)); b.addEventListener("click", () => galSetImage(i, d));
      th.appendChild(b);
    });
    galSetImage(0, d, true);
    const rows = d.fields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
    const stats = d.stats ? `<div class="g-stats">${d.stats.map(([k, v]) => `<div class="g-stat"><span>${esc(k.toUpperCase())}</span><div class="bar"><i data-v="${v * 10}"></i></div><b>${v}</b></div>`).join("")}</div>` : "";
    const secs = d.sections.map(([h, t]) => `<div class="g-sec"><h5>${esc(h)}</h5><p>${esc(t)}</p></div>`).join("");
    const pas = d.passive ? `<div class="g-sec"><h5>PASIVA</h5><p class="g-passive"><b>${esc(d.passive.name)}</b>${esc(d.passive.desc)}</p></div>` : "";
    $("g-info").innerHTML = `<div class="tag">${esc(d.tag)}</div><h3>${esc(d.name)}</h3>${d.quote ? `<div class="g-quote">${esc(d.quote)}</div>` : ""}<dl class="g-grid">${rows}</dl>${stats}${pas}${secs}`;
    [...$("g-info").children].forEach((c, i) => c.style.setProperty("--i", i));
    $("g-info").scrollTop = 0;
    card.classList.remove("out", "in"); void card.offsetWidth; card.classList.add("in");
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".g-stat .bar i").forEach(b => { b.style.width = b.dataset.v + "%"; })));   // las barras se llenan
  };
  if (instant) apply(); else { gal.busy = true; card.classList.remove("in"); card.classList.add("out"); setTimeout(() => { apply(); gal.busy = false; }, 230); }
}
// Cambia la imagen grande (fundido + deslizamiento entre capas)
function galSetImage(i, d, first) {
  gal.img = i;
  document.querySelectorAll(".g-th").forEach((b, k) => b.classList.toggle("sel", k === i));
  const fr = $("g-frame");
  fr.querySelectorAll(".g-layer:not(.out)").forEach(o => { o.classList.add("out"); setTimeout(() => o.remove(), 650); });
  const L = el("div", "g-layer" + (first ? "" : " in")); L.innerHTML = "<img alt=''>";
  setImg(L.querySelector("img"), d.images[i], "imagen " + (i + 1));
  fr.appendChild(L);
}
// Abre la galería.
function openGallery() {
  goTo("gallery", () => {
    if (!gal.nation) { gal.nation = state.selectedNation || "usa"; }
    galSelectNation(gal.nation, true);
  });
}
// Inicializa la galería.
function initGallery() {
  renderGalleryStrip();
  $("gal-tabs").querySelectorAll("button").forEach(b => b.addEventListener("click", () => galSetTab(b.dataset.tab)));
  // pequeño efecto de profundidad: la imagen se inclina siguiendo el cursor
  const fr = $("g-frame");
  fr.addEventListener("pointermove", e => {
    const r = fr.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    fr.querySelectorAll(".g-layer:not(.out)").forEach(l => { l.style.transform = "translate(" + (x * -10) + "px," + (y * -10) + "px)"; });
  });
  fr.addEventListener("pointerleave", () => fr.querySelectorAll(".g-layer").forEach(l => { l.style.transform = ""; }));
  // Visor de imagen completa: clic en la imagen → se abre a pantalla casi completa; clic o ESC → se cierra
  const lb = el("div"); lb.id = "lightbox"; lb.innerHTML = '<img alt=""><div class="lb-hint">CLIC O ESC PARA CERRAR</div>'; document.body.appendChild(lb);
  const closeLb = () => lb.classList.remove("on");
  lb.addEventListener("click", closeLb);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && lb.classList.contains("on")) { closeLb(); e.stopImmediatePropagation(); } }, true);   // ESC cierra el visor antes que cualquier otra cosa
  fr.addEventListener("click", () => {
    const im = fr.querySelector(".g-layer:not(.out) img");
    if (!im || !im.naturalWidth) return;                               // si la imagen no cargó, no hay nada que ampliar
    lb.querySelector("img").src = im.src; lb.classList.add("on");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initWelcome(); initCredits(); pvLoader.init(); initPlayer(); initOptions(); initSfx(); renderNations(); updateProgress();

  $("btn-start").addEventListener("click", () => goTo("select", () => { switchMusic(menuTrackSrc()); }));
  $("btn-credits").addEventListener("click", () => openModal($("credits")));
  $("btn-options").addEventListener("click", () => openModal($("options")));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal($(b.dataset.close))));

  $("btn-back-menu").addEventListener("click", () => goTo("menu", () => changeNationMusic(null)));
  $("btn-back-select").addEventListener("click", () => goTo("select"));
  $("btn-gallery").addEventListener("click", openGallery);
  $("btn-back-gallery").addEventListener("click", () => goTo("menu"));
  initGallery();
  $("btn-next").addEventListener("click", nextStep);

  $("arrow-right").addEventListener("click", () => {
    if (!state.selectedNation) return warn("SELECCIONE UNA NACIÓN");
    if (!state.selectedCommander) return warn("SELECCIONE UN COMANDANTE (DOBLE CLIC)");
    showView("tanks");
  });
  $("arrow-left").addEventListener("click", () => showView("chars"));   // no reinicia la selección

  scenes.menu.classList.add("enter");
});

// Pausa las animaciones del fondo cuando la ventana pierde el foco (evita saltos/deformaciones al volver)
function syncBgPlayState() {
  const paused = document.hidden || !document.hasFocus();
  document.getElementById("bg").classList.toggle("paused", paused);
}
window.addEventListener("blur", syncBgPlayState);
window.addEventListener("focus", syncBgPlayState);
document.addEventListener("visibilitychange", syncBgPlayState);
