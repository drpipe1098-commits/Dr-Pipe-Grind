# POSTULA — Última entrega

Este README es una **foto operativa de la entrega actual únicamente**. El contexto durable vive en `AGENTS.md` y `docs/`.

## Qué se hizo

**Entrega 1 — Perfil Único y Autorrelleno Universal.** Arranque del proyecto: extensión de navegador (Chrome, Edge, Brave, Opera) que llena el formulario de cualquier portal de empleo con los datos que la persona escribió una sola vez.

- Esquema de perfil con 31 campos en 5 grupos más experiencia laboral e idiomas como listas repetibles.
- Motor de reconocimiento que puntúa etiqueta, `placeholder`, `name`, `id`, `autocomplete`, `type` y el texto cercano; las frases largas ganan sobre las cortas, y cada campo tiene lista de veta para no escribir los datos del usuario donde van los de otro.
- Descarte duro y prioritario de contraseñas, medios de pago, captcha, buscadores y formularios de acceso.
- Relleno de `input`, `textarea` y `select` disparando `input` y `change`, para que los portales hechos en React, Vue o Angular registren el valor.
- Página de Perfil que se dibuja sola desde el esquema, con guardado local, copia descargable e importación.
- Popup con un botón, informe de campos llenados y omitidos, y marcado en color sobre la página.
- 6 candados de contrato en Node puro, sin dependencias ni compilación.

Decisiones que quedan blindadas por pruebas: **POSTULA nunca envía el formulario** y **los datos nunca salen del computador de la persona**.

## Archivos modificados en esta entrega

- `.github/workflows/ci.yml` — POSTULA CI: sintaxis, manifiesto, candados y compuerta `validate`.
- `.github/workflows/readme-deploy-snapshot.yml` — rechaza el PR si este README no coincide con el diff.
- `.gitignore` — impide subir hojas de vida, perfiles exportados y documentos personales.
- `AGENTS.md` — arranque canónico del proyecto; contexto durable completo.
- `README.md` — esta foto de entrega.
- `docs/INSTALACION.md` — instalación y uso para alguien sin conocimientos técnicos.
- `docs/MATCHER.md` — cómo funciona el reconocimiento y cómo agregar patrones.
- `docs/PERFIL.md` — esquema de datos del perfil y cómo extenderlo.
- `docs/TESTING.md` — filosofía de candados, comandos y lenguaje de estado.
- `extension/_locales/es/messages.json` — textos localizados de la extensión.
- `extension/content/autofill.js` — motor de autorrelleno; garantiza no enviar el formulario.
- `extension/content/matcher.js` — reconocimiento de campos por puntaje, con exclusiones y vetas.
- `extension/estilos.css` — estilos compartidos del popup y la página de Perfil.
- `extension/iconos/icono-128.png` — icono 128 px.
- `extension/iconos/icono-16.png` — icono 16 px.
- `extension/iconos/icono-32.png` — icono 32 px.
- `extension/iconos/icono-48.png` — icono 48 px.
- `extension/lib/normalizar.js` — normalización de texto sin tildes para comparar rótulos.
- `extension/lib/perfil.js` — esquema, saneado y validación del Perfil Único.
- `extension/manifest.json` — Manifest V3 con solo `storage`, `activeTab` y `scripting`.
- `extension/opciones.html` — página de Perfil.
- `extension/opciones.js` — dibujado, guardado, copia e importación del perfil.
- `extension/popup.html` — popup de la extensión.
- `extension/popup.js` — inyección bajo demanda e informe del resultado.
- `package.json` — `npm test` sin dependencias.
- `scripts/generar-iconos.py` — genera los PNG del icono sin librerías externas.
- `tests/autofill-contract.mjs` — valores, respaldos y elección en listas desplegables.
- `tests/ayuda.mjs` — carga los archivos de la extensión en un sandbox de `vm`.
- `tests/envio-contract.mjs` — candado: nunca enviar el formulario.
- `tests/matcher-contract.mjs` — 74 casos, incluidos los que nunca se deben tocar.
- `tests/perfil-contract.mjs` — esquema estable y copia reversible.
- `tests/privacidad-contract.mjs` — candado: sin red, sin nube, sin permisos de más.
- `tests/proyecto-contract.mjs` — estructura del repositorio y cero datos personales.
- `tests/run.mjs` — corredor de candados.

## Validación

- **VALIDADO EN CÓDIGO** localmente: los 6 candados pasan (`npm test`), 74 casos de reconocimiento incluidos.
- Pendiente de las compuertas del PR: **POSTULA CI / validate** y **README Deploy Snapshot / verificar**.
- **NO está validado en uso real.** Nadie ha instalado la extensión ni ha rellenado un formulario de un portal verdadero. CI verde significa *validado en código*, no que Computrabajo aceptó una postulación.
- El comportamiento sobre el DOM real (recorrer formularios, leer etiquetas, escribir valores) solo se puede comprobar instalando la extensión.

## Qué sigue

1. **Instalar y probar en portales reales** siguiendo `docs/INSTALACION.md`: Computrabajo, elempleo, Magneto365 y LinkedIn. Cada campo que falle se convierte en un caso de `tests/matcher-contract.mjs`.
2. **Tablero de postulaciones** — registro local de a qué se postuló, fecha, estado y próximo seguimiento. Sin servidor.
3. **Radar de vacantes** — lectura de las alertas de empleo que los portales mandan al correo, para armar la lista diaria ya filtrada.
