/**
 * CANDADO — Estructura del proyecto y ausencia de datos personales.
 *
 * Garantiza que el repositorio siga sirviendo para el mensaje
 * «Lee AGENTS.md y continúa el proyecto de forma autónoma», y que nunca se
 * suba la hoja de vida, el correo ni el teléfono de una persona real.
 */
import { leer, archivosDe, cargar, contrato, RAIZ } from './ayuda.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const c = contrato('proyecto-contract');

// --- 1. AGENTS.md conserva sus secciones obligatorias ---
const agents = leer('AGENTS.md');
[
  '## 0. Protocolo de arranque',
  '## 1. Identidad del producto',
  '## 2. Arquitectura no negociable',
  '## 3. Estado implementado',
  '## 4. Decisiones que no se pueden perder',
  '## 5. Reglas de datos y privacidad',
  '## 6. Contrato de pruebas, CI y entrega',
  '## 7. Fronteras protegidas',
  '## 8. Deliberadamente aplazado',
  '## 9. Prioridades actuales',
  '## 11. Mapa del repositorio',
  '## 12. Contrato de mantenimiento de estado'
].forEach((seccion) => {
  c.exigir(agents.includes(seccion), `AGENTS.md perdió la sección «${seccion}»`);
});

// --- 2. README es la foto de la última entrega, no un manual ---
const readme = leer('README.md');
[
  '## Qué se hizo',
  '## Archivos modificados en esta entrega',
  '## Validación',
  '## Qué sigue'
].forEach((seccion) => {
  c.exigir(readme.includes(seccion), `README.md perdió la sección «${seccion}»`);
});
c.exigir(Buffer.byteLength(readme, 'utf8') < 8000,
  'README.md creció más de 8 KB: es una foto de la entrega, no un manual');

// --- 3. El manifiesto describe el producto correctamente ---
const manifiesto = JSON.parse(leer('extension/manifest.json'));
c.igual(manifiesto.manifest_version, 3, 'la extensión debe usar Manifest V3');
c.exigir(/^\d+\.\d+\.\d+$/.test(manifiesto.version), 'la versión debe ser x.y.z');
c.exigir((manifiesto.description || '').length > 20, 'el manifiesto necesita descripción en español');
['16', '32', '48', '128'].forEach((tamano) => {
  c.exigir(!!(manifiesto.icons || {})[tamano], `falta el icono de ${tamano} px`);
});

// --- 4. La extensión se carga sin compilar nada ---
archivosDe('extension', ['.js']).forEach((archivo) => {
  const codigo = leer(archivo);
  c.exigir(!/^\s*import\s/m.test(codigo), `${archivo} usa import: la extensión no puede necesitar compilación`);
  c.exigir(!/\brequire\s*\(/.test(codigo), `${archivo} usa require: la extensión no puede necesitar compilación`);
});
const paquete = JSON.parse(leer('package.json'));
c.exigir(!paquete.dependencies, 'el proyecto no debe tener dependencias de producción');
c.exigir(!paquete.devDependencies, 'las pruebas corren con Node puro, sin npm install');

// --- 5. El matcher y el esquema del perfil no se pueden desincronizar ---
const ambito = cargar([
  'extension/lib/normalizar.js',
  'extension/lib/perfil.js',
  'extension/content/matcher.js'
]);
const idsPerfil = ambito.POSTULA_Perfil.idsDeCampos().concat(['nombreCompleto']);
Object.keys(ambito.POSTULA_Matcher.PATRONES).forEach((campo) => {
  c.exigir(idsPerfil.includes(campo),
    `el matcher reconoce «${campo}» pero ese campo no existe en el perfil`);
});
Object.values(ambito.POSTULA_Matcher.AUTOCOMPLETE).forEach((campo) => {
  c.exigir(idsPerfil.includes(campo),
    `el mapa de autocomplete apunta a «${campo}», que no existe en el perfil`);
});

// --- 6. Ningún dato personal real en el repositorio ---
const ESTE_ARCHIVO = 'tests/proyecto-contract.mjs';
const EXTENSIONES_TEXTO = ['.js', '.mjs', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.py'];

function tracked(directorio) {
  const salida = [];
  const recorrer = (actual) => {
    readdirSync(actual).forEach((nombre) => {
      if (nombre === '.git' || nombre === 'node_modules') return;
      const ruta = join(actual, nombre);
      if (statSync(ruta).isDirectory()) return recorrer(ruta);
      salida.push(relative(RAIZ, ruta));
    });
  };
  recorrer(directorio);
  return salida;
}

const todos = tracked(RAIZ);

c.exigir(!todos.some((a) => a.toLowerCase().endsWith('.pdf')),
  'no se suben hojas de vida ni documentos personales al repositorio');
c.exigir(!todos.some((a) => /perfil.*\.json$/i.test(a) && !a.startsWith('tests/')),
  'no se sube el perfil exportado de nadie');

todos
  .filter((a) => EXTENSIONES_TEXTO.some((ext) => a.endsWith(ext)) && a !== ESTE_ARCHIVO)
  .forEach((archivo) => {
    const texto = leer(archivo);
    const correos = texto.match(/[\w.+-]+@(gmail|hotmail|outlook|yahoo|icloud)\.[a-z.]+/gi) || [];
    c.exigir(correos.length === 0,
      `${archivo} contiene un correo personal real: usa @ejemplo.com en los ejemplos`);
    // Cédulas y celulares colombianos: rachas de 8 a 10 dígitos.
    // Solo se permite el número de ejemplo que usan las pruebas.
    // Números de ejemplo evidentemente ficticios, usados por las pruebas.
    const EJEMPLOS = ['3001234567', '1234567890'];
    const numeros = (texto.match(/\d{8,10}/g) || []).filter((n) => !EJEMPLOS.includes(n));
    c.exigir(numeros.length === 0,
      `${archivo} contiene lo que parece una cédula o un celular real (${numeros[0]}): `
      + 'usa 3001234567 en los ejemplos');
  });

c.cerrar();
