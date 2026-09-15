/**
 * CANDADO — POSTULA nunca envía el formulario.
 *
 * El usuario revisa y envía. Esta decisión no se revisa: es lo que separa a
 * POSTULA de un bot que hace que le bloqueen la cuenta a la persona y lo que
 * mantiene el producto dentro de los términos de los portales de empleo.
 */
import { leer, archivosDe, contrato } from './ayuda.mjs';

const c = contrato('envio-contract');

const PROHIBIDO = [
  ['.submit(', 'enviaría el formulario'],
  ['requestSubmit', 'enviaría el formulario'],
  ['.click(', 'haría clic por el usuario'],
  ["new event('submit'", 'dispararía el evento de envío'],
  ['new event("submit"', 'dispararía el evento de envío'],
  ['submitevent', 'dispararía el evento de envío'],
  ['[type="submit"]', 'buscaría el botón de enviar'],
  ['postular', 'buscaría el botón de postular'],
  ['aplicar ahora', 'buscaría el botón de aplicar']
];

// Solo se revisa el código que se inyecta en la página del portal.
const inyectados = archivosDe('extension/content', ['.js'])
  .concat(['extension/lib/normalizar.js', 'extension/lib/perfil.js']);

inyectados.forEach((archivo) => {
  const codigo = leer(archivo).toLowerCase();
  PROHIBIDO.forEach(([aguja, razon]) => {
    c.exigir(!codigo.includes(aguja.toLowerCase()),
      `${archivo} contiene «${aguja}»: ${razon}`);
  });
});

const autofill = leer('extension/content/autofill.js');
c.exigir(autofill.includes('nunca envía el formulario'),
  'autofill.js debe declarar la garantía de no envío en su encabezado');
c.exigir(autofill.includes('esFormularioDeAcceso'),
  'autofill.js debe saltarse los formularios de inicio de sesión');

c.cerrar();
