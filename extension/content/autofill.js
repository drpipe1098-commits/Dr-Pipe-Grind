/**
 * POSTULA — Motor de autorrelleno.
 *
 * Se inyecta en la pestaña activa SOLO cuando el usuario hace clic en el
 * botón de la extensión. Recorre el formulario, pregunta al matcher qué es
 * cada campo y escribe el dato correspondiente del perfil.
 *
 * GARANTÍA DE PRODUCTO: este archivo nunca envía el formulario.
 * No hace clic en botones, no llama submit() y no dispara eventos de envío.
 * El usuario revisa y envía.
 */
(function (raiz) {
  'use strict';

  const N = raiz.POSTULA_Normalizar;
  const M = raiz.POSTULA_Matcher;
  const P = raiz.POSTULA_Perfil;

  const TIPOS_RELLENABLES = ['text', 'email', 'tel', 'url', 'number', 'date', 'month', 'textarea'];

  /** ¿El elemento está visible para la persona? */
  function esVisible(el) {
    if (!el || !el.getClientRects) return false;
    if (el.getClientRects().length === 0) return false;
    const estilo = el.ownerDocument.defaultView.getComputedStyle(el);
    return estilo.visibility !== 'hidden' && estilo.display !== 'none' && estilo.opacity !== '0';
  }

  /** Texto de la etiqueta visible asociada al campo. */
  function etiquetaDe(el) {
    const doc = el.ownerDocument;
    const partes = [];

    if (el.id) {
      const porFor = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (porFor) partes.push(porFor.textContent);
    }
    const envolvente = el.closest('label');
    if (envolvente) partes.push(envolvente.textContent);

    const etiquetada = el.getAttribute('aria-labelledby');
    if (etiquetada) {
      etiquetada.split(/\s+/).forEach((id) => {
        const ref = doc.getElementById(id);
        if (ref) partes.push(ref.textContent);
      });
    }
    return partes.join(' ').slice(0, 300);
  }

  /** Texto cercano: muchos portales ponen el rótulo en un div hermano. */
  function textoCercano(el) {
    const contenedor = el.closest('div, li, td, fieldset, section');
    if (!contenedor) return '';
    const clon = contenedor.cloneNode(true);
    clon.querySelectorAll('input, textarea, select, script, style, button').forEach((n) => n.remove());
    return (clon.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  function descriptorDe(el) {
    const esTextarea = el.tagName === 'TEXTAREA';
    const esSelect = el.tagName === 'SELECT';
    return {
      etiqueta: etiquetaDe(el),
      ariaLabel: el.getAttribute('aria-label') || '',
      placeholder: el.getAttribute('placeholder') || '',
      nombre: el.getAttribute('name') || '',
      id: el.id || '',
      nombreClase: el.className && typeof el.className === 'string' ? el.className : '',
      textoCercano: textoCercano(el),
      autocomplete: el.getAttribute('autocomplete') || '',
      tipo: esTextarea ? 'textarea' : (esSelect ? 'text' : String(el.type || 'text').toLowerCase()),
      deshabilitado: !!el.disabled,
      soloLectura: !!el.readOnly
    };
  }

  /**
   * Valor del perfil para un campo detectado, con respaldos sensatos.
   * Si el perfil no trae teléfono fijo, se usa el celular; es lo que la
   * persona haría a mano.
   */
  function valorPara(campo, perfil) {
    if (campo === 'nombreCompleto') return P.nombreCompleto(perfil);
    const valor = String(perfil[campo] || '').trim();
    if (valor) return valor;
    if (campo === 'telefono') return String(perfil.celular || '').trim();
    if (campo === 'celular') return String(perfil.telefono || '').trim();
    return '';
  }

  /** Escribe en el elemento de forma que React, Vue y Angular se enteren. */
  function escribir(el, valor) {
    const prototipo = el.tagName === 'TEXTAREA'
      ? raiz.HTMLTextAreaElement.prototype
      : raiz.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototipo, 'value');
    if (setter && setter.set) {
      setter.set.call(el, valor);
    } else {
      el.value = valor;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Elige la opción de un <select> que más se parezca al valor del perfil. */
  function elegirOpcion(el, valor) {
    const objetivo = N.normalizar(valor);
    if (!objetivo) return false;
    let mejor = null;
    Array.from(el.options).forEach((opcion) => {
      const texto = N.normalizar(opcion.textContent);
      const propio = N.normalizar(opcion.value);
      if (!texto && !propio) return;
      let puntaje = 0;
      if (texto === objetivo || propio === objetivo) puntaje = 100;
      else if (texto.includes(objetivo) || objetivo.includes(texto)) puntaje = 60;
      else if (propio.includes(objetivo) || objetivo.includes(propio)) puntaje = 50;
      if (puntaje && (!mejor || puntaje > mejor.puntaje)) mejor = { opcion, puntaje };
    });
    if (!mejor) return false;
    el.value = mejor.opcion.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /** Un formulario con campo de contraseña es un login: no se toca. */
  function esFormularioDeAcceso(el) {
    const form = el.closest('form');
    if (!form) return false;
    return !!form.querySelector('input[type="password"]');
  }

  function marcar(el, exito) {
    const previo = el.style.outline;
    el.style.outline = exito ? '2px solid #16a34a' : '2px solid #f59e0b';
    el.style.outlineOffset = '1px';
    raiz.setTimeout(() => { el.style.outline = previo; }, 2600);
  }

  /**
   * Rellena el formulario visible de la página.
   * @param {object} perfil
   * @param {{sobrescribir?: boolean}} [opciones]
   * @returns {{llenados: Array, omitidos: Array, sinCoincidencia: number}}
   */
  function rellenar(perfil, opciones) {
    const config = opciones || {};
    const doc = raiz.document;
    const informe = { llenados: [], omitidos: [], sinCoincidencia: 0 };

    const elementos = Array.from(doc.querySelectorAll('input, textarea, select'));
    elementos.forEach((el) => {
      const esSelect = el.tagName === 'SELECT';
      const esTextarea = el.tagName === 'TEXTAREA';
      const tipo = esTextarea ? 'textarea' : (esSelect ? 'text' : String(el.type || 'text').toLowerCase());

      if (!esSelect && !TIPOS_RELLENABLES.includes(tipo)) return;
      if (el.disabled || el.readOnly) return;
      if (!esVisible(el)) return;
      if (esFormularioDeAcceso(el)) return;

      const deteccion = M.detectar(descriptorDe(el));
      if (!deteccion) { informe.sinCoincidencia += 1; return; }

      const valor = valorPara(deteccion.campo, perfil);
      if (!valor) {
        informe.omitidos.push({ campo: deteccion.campo, razon: 'sin dato en el perfil' });
        return;
      }

      const yaTiene = String(el.value || '').trim();
      if (yaTiene && !config.sobrescribir) {
        informe.omitidos.push({ campo: deteccion.campo, razon: 'ya tenía un valor escrito' });
        marcar(el, false);
        return;
      }

      let exito;
      if (esSelect) {
        exito = elegirOpcion(el, valor);
        if (!exito) {
          informe.omitidos.push({ campo: deteccion.campo, razon: 'la lista no tiene una opción parecida' });
          marcar(el, false);
          return;
        }
      } else {
        escribir(el, valor);
        exito = true;
      }

      marcar(el, true);
      informe.llenados.push({ campo: deteccion.campo, puntaje: Math.round(deteccion.puntaje), via: deteccion.via });
    });

    return informe;
  }

  raiz.POSTULA_Autofill = { rellenar, descriptorDe, valorPara, elegirOpcion, esFormularioDeAcceso };
})(typeof globalThis !== 'undefined' ? globalThis : this);
