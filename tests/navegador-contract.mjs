/**
 * CANDADO — Comportamiento del autorrelleno en un navegador real.
 *
 * Los demás candados prueban la lógica sin DOM. Este abre un Chromium de
 * verdad sobre formularios que reproducen cómo están construidos los
 * portales de empleo colombianos, y comprueba qué quedó escrito en cada
 * campo.
 *
 * Cubre las tres formas reales de construir un formulario:
 *  - `portal-clasico.html`     · <label for> explícito y selects
 *  - `portal-sin-labels.html`  · el rótulo vive en un div hermano
 *  - `portal-moderno.html`     · autocomplete estándar, iframe y trampas
 *
 * Si no hay navegador disponible, la prueba se salta sin fallar: el resto
 * de los candados sigue corriendo con Node puro.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrato, RAIZ } from './ayuda.mjs';
import { abrirNavegador } from './navegador/cdp.mjs';

const c = contrato('navegador-contract');

const ARCHIVOS = [
  'extension/lib/normalizar.js',
  'extension/lib/perfil.js',
  'extension/content/matcher.js',
  'extension/content/autofill.js'
];
const FUENTES = ARCHIVOS.map((a) => readFileSync(join(RAIZ, a), 'utf8'));

// Datos ficticios: el repositorio nunca contiene datos personales reales.
const PERFIL = {
  nombres: 'Ana María', apellidos: 'Gómez Ruiz',
  tipoDocumento: 'Cédula de ciudadanía', numeroDocumento: '1234567890',
  fechaNacimiento: '', genero: '', nacionalidad: 'Colombiana',
  email: 'ana@ejemplo.com', celular: '3001234567', telefono: '',
  direccion: 'Calle 10 # 5-25', ciudad: 'Pereira', departamento: 'Risaralda',
  pais: 'Colombia', codigoPostal: '660001',
  linkedin: 'https://www.linkedin.com/in/ejemplo/', portafolio: '', github: '',
  titularProfesional: 'Analista de Soporte TI',
  resumenProfesional: 'Analista de soporte con experiencia en mesa de ayuda.',
  anosExperiencia: '6', pretensionSalarial: 'Desde el mínimo, negociable',
  disponibilidad: 'Inmediata', modalidad: 'Remoto',
  disponibilidadViajar: '', licenciaConduccion: '', tieneVehiculo: '',
  nivelEducativo: 'Tecnólogo', titulo: 'Tecnólogo en ADSI',
  institucion: 'SENA', anoGrado: '2021',
  experiencia: [], idiomas: []
};

const LEER_CAMPOS = `JSON.stringify(
  Array.from(document.querySelectorAll('input, textarea, select'))
    .map((e) => [e.name || e.id, e.value])
)`;

async function contextosDe(navegador) {
  const vistos = [];
  navegador.alRecibir((mensaje) => {
    if (mensaje.method === 'Runtime.executionContextCreated') {
      vistos.push(mensaje.params.context.id);
    }
  });
  return vistos;
}

async function correrFormulario(navegador, contextos, archivo) {
  await navegador.enviar('Page.navigate', { url: `file://${join(RAIZ, 'tests/navegador', archivo)}` });
  await navegador.esperarEvento('Page.loadEventFired');
  await new Promise((listo) => setTimeout(listo, 400)); // que asienten los iframes

  const campos = {};
  let informe = { llenados: [], omitidos: [], sinCoincidencia: 0 };

  for (const contextId of [...contextos]) {
    try {
      for (const fuente of FUENTES) {
        await navegador.enviar('Runtime.evaluate', { expression: fuente, contextId });
      }
      const ejecucion = await navegador.enviar('Runtime.evaluate', {
        expression: `JSON.stringify(globalThis.POSTULA_Autofill.rellenar(${JSON.stringify(PERFIL)}))`,
        contextId, returnByValue: true
      });
      if (ejecucion.result && ejecucion.result.value) {
        const parcial = JSON.parse(ejecucion.result.value);
        informe.llenados.push(...parcial.llenados);
        informe.omitidos.push(...parcial.omitidos);
        informe.sinCoincidencia += parcial.sinCoincidencia;
      }
      const lectura = await navegador.enviar('Runtime.evaluate', {
        expression: LEER_CAMPOS, contextId, returnByValue: true
      });
      if (lectura.result && lectura.result.value) {
        JSON.parse(lectura.result.value).forEach(([nombre, valor]) => { campos[nombre] = valor; });
      }
    } catch {
      // Contexto ya destruido (navegación anterior): se ignora.
    }
  }
  return { campos, informe };
}

const navegador = await abrirNavegador();

if (!navegador) {
  // En CI la ausencia de navegador es una falla: la compuerta existe para correr.
  if (process.env.POSTULA_EXIGIR_NAVEGADOR === '1') {
    c.exigir(false, 'no se encontró ningún navegador y POSTULA_EXIGIR_NAVEGADOR=1');
  } else {
    console.log('… navegador-contract omitido: no hay Chromium disponible en este equipo.');
  }
} else {
  try {
    await navegador.enviar('Page.enable');
    await navegador.enviar('Runtime.enable');
    const contextos = await contextosDe(navegador);

    // ---------- 1. Portal clásico ----------
    let r = await correrFormulario(navegador, contextos, 'portal-clasico.html');
    const esperadoClasico = {
      nombres: 'Ana María',
      apellidos: 'Gómez Ruiz',
      tipoDocumento: 'CC',
      numeroDocumento: '1234567890',
      email: 'ana@ejemplo.com',
      celular: '3001234567',
      direccion: 'Calle 10 # 5-25',
      ciudad: 'Pereira',
      departamento: 'Risaralda',
      nivelEducativo: 'Tecnólogo',
      aspiracionSalarial: 'Desde el mínimo, negociable',
      presentacion: 'Analista de soporte con experiencia en mesa de ayuda.'
    };
    Object.entries(esperadoClasico).forEach(([campo, valor]) => {
      c.igual(r.campos[campo], valor, `portal clásico · campo «${campo}»`);
    });
    c.igual(r.campos.palabraClave, '', 'portal clásico · el buscador de empleo NO se toca');
    c.igual(r.campos.usuario, '', 'portal clásico · el usuario de acceso NO se toca');
    c.igual(r.campos.clave, '', 'portal clásico · la contraseña NO se toca');

    // ---------- 2. Portal sin etiquetas ----------
    r = await correrFormulario(navegador, contextos, 'portal-sin-labels.html');
    const esperadoSinLabels = {
      fullName: 'Ana María Gómez Ruiz',
      mail01: 'ana@ejemplo.com',
      mobile01: '3001234567',
      loc01: 'Pereira',
      social01: 'https://www.linkedin.com/in/ejemplo/',
      exp01: '6',
      avail01: 'Inmediata',
      mod01: 'Remoto',
      cover01: 'Analista de soporte con experiencia en mesa de ayuda.'
    };
    Object.entries(esperadoSinLabels).forEach(([campo, valor]) => {
      c.igual(r.campos[campo], valor, `portal sin etiquetas · campo «${campo}»`);
    });
    c.igual(r.campos.currentCompany, '', 'sin etiquetas · el nombre de la EMPRESA NO se llena con el del candidato');
    c.igual(r.campos.emergencyName, '', 'sin etiquetas · el contacto de emergencia NO se toca');
    c.igual(r.campos.emergencyPhone, '', 'sin etiquetas · el teléfono de emergencia NO se toca');
    c.igual(r.campos.offeredSalary, '', 'sin etiquetas · el salario OFRECIDO no es la aspiración del candidato');

    // ---------- 3. Portal moderno, con iframe y trampas ----------
    r = await correrFormulario(navegador, contextos, 'portal-moderno.html');
    const esperadoModerno = {
      givenName: 'Ana María',
      familyName: 'Gómez Ruiz',
      mail: 'ana@ejemplo.com',
      phone: '3001234567',
      city: 'Pereira',
      country: 'Colombia',
      paisLista: 'CO',
      frameNombres: 'Ana María',
      frameApellidos: 'Gómez Ruiz',
      frameEmail: 'ana@ejemplo.com'
    };
    Object.entries(esperadoModerno).forEach(([campo, valor]) => {
      c.igual(r.campos[campo], valor, `portal moderno · campo «${campo}»`);
    });
    c.igual(r.campos.csrfToken, 'abc123', 'moderno · un campo oculto queda intacto');
    c.igual(r.campos.ciudadBloqueada, '', 'moderno · un campo deshabilitado no se toca');
    c.igual(r.campos.correoBloqueado, 'no-tocar@ejemplo.com', 'moderno · un campo de solo lectura no se toca');
    c.igual(r.campos.tarjeta, '', 'moderno · la tarjeta de crédito NUNCA se toca');
    c.igual(r.campos.cvv, '', 'moderno · el CVV NUNCA se toca');
    c.igual(r.campos.invisible, '', 'moderno · un campo invisible no se toca');
  } catch (error) {
    c.exigir(false, 'la prueba de navegador reventó: ' + (error.message || error));
  } finally {
    await navegador.cerrar();
  }
}

c.cerrar();
