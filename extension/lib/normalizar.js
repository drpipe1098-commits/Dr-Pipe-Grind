/**
 * POSTULA — Normalización de texto.
 *
 * Los portales colombianos mezclan español con y sin tildes, mayúsculas,
 * dos puntos, asteriscos de campo obligatorio e inglés. Todo el
 * reconocimiento de campos compara sobre texto normalizado.
 */
(function (raiz) {
  'use strict';

  /** Quita tildes, pasa a minúsculas y deja solo letras, números y espacios. */
  function normalizar(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /** Une varios textos ya normalizados en una sola cadena comparable. */
  function unir(partes) {
    return (partes || [])
      .map(normalizar)
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Cuenta cuántas de las frases aparecen en el texto normalizado.
   * Una frase de varias palabras solo cuenta si aparece completa y seguida.
   */
  function contiene(textoNormalizado, frase) {
    const objetivo = normalizar(frase);
    if (!objetivo) return false;
    return (' ' + textoNormalizado + ' ').includes(' ' + objetivo + ' ')
      || textoNormalizado.includes(objetivo);
  }

  raiz.POSTULA_Normalizar = { normalizar, unir, contiene };
})(typeof globalThis !== 'undefined' ? globalThis : this);
