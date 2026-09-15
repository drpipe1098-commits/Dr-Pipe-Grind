# POSTULA — Última entrega

Este README es una **foto operativa de la entrega actual únicamente**. El contexto durable vive en `AGENTS.md` y `docs/`.

## Qué se hizo

**Entrega 2 — Validación del autorrelleno en un navegador real.**

La Entrega 1 dejó el motor probado sin DOM: se sabía que el reconocimiento de campos acertaba, pero no que el relleno funcionara sobre una página de verdad. Esta entrega cierra ese hueco.

- Cliente mínimo del protocolo de Chrome (CDP) construido sobre el `WebSocket` nativo de Node 22: las pruebas de navegador **no agregan ninguna dependencia** al proyecto, ni Playwright ni Puppeteer.
- Cuatro formularios que reproducen las tres formas reales de construir una postulación en los portales colombianos: con `<label for>` explícito, con el rótulo en un `div` hermano, con `autocomplete` estándar, y uno embebido en `iframe`.
- Cada formulario lleva trampas —contraseña, usuario, tarjeta de crédito, CVV, buscador de vacantes, nombre de la empresa, contacto de emergencia y salario ofrecido— y la prueba exige que todas queden vacías.
- Compuerta `navegador` en POSTULA CI. Con `POSTULA_EXIGIR_NAVEGADOR=1` la ausencia de navegador es falla, no omisión: la compuerta no se puede saltar en silencio.

**Fallo real que encontró esta entrega en su primera corrida:** la palabra «donde», excluida por pertenecer al buscador de vacantes, estaba descartando rótulos legítimos como «Ciudad donde resides». Ahora solo excluye cuando es el rótulo completo, y quedó blindado con casos nuevos.

## Archivos modificados en esta entrega

- `.github/workflows/ci.yml` — compuerta `navegador` y su agregación en `validate`.
- `AGENTS.md` — estado de la Entrega 2, topología de compuertas y mapa del repositorio.
- `README.md` — esta foto de entrega.
- `docs/TESTING.md` — cómo funcionan las pruebas de navegador y qué reproduce cada formulario.
- `extension/content/matcher.js` — «donde» pasa de exclusión amplia a exclusión exacta.
- `tests/matcher-contract.mjs` — tres casos nuevos que blindan la corrección anterior.
- `tests/navegador-contract.mjs` — candado de comportamiento sobre el DOM en un Chromium real.
- `tests/navegador/cdp.mjs` — cliente del protocolo de Chrome sin dependencias.
- `tests/navegador/portal-clasico.html` — formulario con `<label for>`, selects y trampas de acceso.
- `tests/navegador/portal-marco.html` — contenido del `iframe`.
- `tests/navegador/portal-moderno.html` — `autocomplete`, campos ocultos, deshabilitados y de solo lectura.
- `tests/navegador/portal-sin-labels.html` — rótulos en `div` hermano y datos de terceros como trampa.
- `tests/proyecto-contract.mjs` — el número de ejemplo de las pruebas de navegador entra en la lista permitida.

## Validación

- **VALIDADO EN CÓDIGO** localmente: los **7 candados** pasan (`npm test`), con 77 casos de reconocimiento y 3 formularios ejecutados en un Chromium real.
- Las tres rutas de la compuerta de navegador quedaron comprobadas a mano: pasa con navegador, se omite sin navegador, y falla sin navegador cuando `POSTULA_EXIGIR_NAVEGADOR=1`.
- Pendiente de las compuertas del PR: **POSTULA CI / validate**.
- **NO está validado en uso real.** Los formularios de prueba imitan a los portales colombianos, pero no son ellos. Computrabajo, elempleo y Magneto365 no son alcanzables desde el entorno de desarrollo, así que la primera postulación verdadera sigue siendo la prueba que falta.

## Qué sigue

1. **Instalar la extensión y postularse de verdad** siguiendo `docs/INSTALACION.md`. Cada campo que falle en un portal real se convierte en un caso de `tests/matcher-contract.mjs`, o en un formulario nuevo bajo `tests/navegador/` si depende del DOM.
2. **Tablero de postulaciones** — registro local de a qué se postuló, fecha, estado y próximo seguimiento. Sin servidor.
3. **Radar de vacantes** — lectura de las alertas de empleo que los portales mandan al correo, para armar la lista diaria ya filtrada.
