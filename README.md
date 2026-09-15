# POSTULA — Última entrega

Este README es una **foto operativa de la entrega actual únicamente**. El contexto durable vive en `AGENTS.md` y `docs/`.

## Qué se hizo

**Entrega 3 — De la hoja de vida al perfil, y de la vacante al puntaje.**

Hasta ahora POSTULA rellenaba formularios, pero la persona tenía que escribir su perfil a mano campo por campo, y decidía a qué postularse leyendo avisos uno por uno. Esta entrega cierra los dos extremos con dos herramientas de terminal que corren con `node`, sin instalar nada.

- **Extractor de texto de PDF sin dependencias.** Node ya trae `zlib`, que es lo único necesario. Entiende las fuentes simples de un byte (Word, LibreOffice, imprimir desde el navegador) y las fuentes compuestas subsetadas con `/ToUnicode` (WeasyPrint, Canva, Chrome), donde los bytes del contenido son identificadores de glifo y sin el mapa de la fuente el texto es ilegible. Cuando el PDF no tiene capa de texto, lo dice y se detiene.
- **Hoja de vida → Perfil Único.** Reconoce identidad, contacto, ubicación, titular, resumen, la experiencia laboral completa, educación, idiomas, habilidades y certificaciones, y **calcula** los años de experiencia sin contar dos veces los periodos solapados. Escribe el JSON que se importa desde la página de Perfil.
- **Filtros y puntaje de vacantes.** Descarta por salario, modalidad, inglés hablado y trabajo en terreno; puntúa de 0 a 100 contra la hoja de vida, en el equipo y sin red, mostrando las palabras concretas que produjeron cada puntaje. Revisión interactiva en la terminal, ordenada por compatibilidad.
- **Dos campos nuevos en el perfil**, `habilidades` y `certificaciones`, con sus patrones en el matcher: las secciones de la hoja de vida que antes no tenían dónde caer.

**Lo que esta entrega NO hace, a propósito:** no entra a los portales, no inicia sesión, no rastrea vacantes y no envía postulaciones. Cuando la persona marca una vacante, la herramienta le entrega el enlace; ella abre, rellena con el botón de POSTULA, revisa y envía. `tests/envio-contract.mjs` ahora prohíbe en `herramientas/` las llamadas de red, los controladores de navegador, la lectura de contraseñas y la navegación a un portal, para que esto no se pueda deshacer por descuido.

**Cuatro fallos reales que encontró esta entrega:**

1. El tramo WinAnsi `0x80–0x9F` se leía como latin1, así que las comillas tipográficas y las rayas de cualquier hoja de vida salían como caracteres de control.
2. Las funciones de un cargo arrastraban la cabecera del cargo siguiente.
3. Un título «en curso» le ganaba al título terminado, y el perfil declaraba un estudio sin terminar como si fuera un título obtenido.
4. El reconocimiento del nivel educativo solo entendía la forma masculina: «Tecnóloga» o «Ingeniera» se quedaban sin título.

Y uno más, en el repositorio y no en el código: los patrones `hv-*` y `hoja-de-vida*` de `.gitignore`, pensados para que nadie suba su hoja de vida, estaban dejando fuera del repositorio tres archivos fuente de esta misma entrega. Quedó anclado y con su propio candado.

## Archivos modificados en esta entrega

- `.github/workflows/ci.yml` — sintaxis de los `.mjs` de `herramientas/` y `tests/`, arranque de las dos herramientas, y disparadores que sí coinciden con las ramas que existen en el remoto.
- `.github/workflows/readme-deploy-snapshot.yml` — mismo arreglo de disparadores.
- `.gitignore` — los archivos de vacantes de la persona no entran al repositorio; y los patrones de hoja de vida quedan anclados a la raíz, porque sin anclar también tapaban el código fuente que se llama igual.
- `AGENTS.md` — estado de la Entrega 3, candados nuevos, prioridades al día y mapa del repositorio.
- `README.md` — esta foto de entrega.
- `docs/HERRAMIENTAS.md` — las dos herramientas, sus opciones y sus límites.
- `extension/lib/perfil.js` — grupo «Conocimientos» con `habilidades` y `certificaciones`.
- `extension/content/matcher.js` — patrones de reconocimiento para los dos campos nuevos.
- `herramientas/hv-a-perfil.mjs` — CLI: hoja de vida en PDF → perfil importable, con informe de lo que quedó vacío.
- `herramientas/vacantes.mjs` — CLI: filtra, puntúa, ordena y pregunta; entrega enlaces, no postulaciones.
- `herramientas/ejemplo-vacantes.txt` — formato del archivo de vacantes, con datos ficticios.
- `herramientas/lib/pdf-texto.mjs` — extractor de texto de PDF sin dependencias.
- `herramientas/lib/hoja-de-vida.mjs` — texto de hoja de vida → perfil, sin inventar campos.
- `herramientas/lib/esquema.mjs` — puente al esquema de `extension/lib/perfil.js`, para que exista una sola definición del perfil.
- `herramientas/lib/criterios.mjs` — salario colombiano, modalidad, inglés hablado y trabajo en terreno.
- `herramientas/lib/puntaje.mjs` — compatibilidad de 0 a 100, explicable y sin red.
- `herramientas/lib/vacantes.mjs` — lectura de la lista en texto o en JSON.
- `tests/envio-contract.mjs` — el candado de no envío ahora cubre las herramientas de terminal.
- `tests/pdf-contract.mjs` — candado del extractor sobre las cuatro formas reales de escribir un PDF.
- `tests/hoja-de-vida-contract.mjs` — candado de «nunca inventar», con los cuatro fallos de arriba como casos.
- `tests/vacantes-contract.mjs` — candado de filtros y puntaje.
- `tests/proyecto-contract.mjs` — candado nuevo: ningún archivo de código puede quedar tapado por `.gitignore`.
- `tests/pdf/constructor.mjs` — constructor de PDF de prueba en memoria; el repositorio no admite archivos PDF.

## Validación

- **VALIDADO EN CÓDIGO** localmente: los **10 candados** pasan (`npm test`), con los 3 nuevos sumando la extracción de PDF en sus cuatro formas, el reconocimiento de hoja de vida y los filtros de vacantes.
- El extractor y el reconocedor se probaron además contra **una hoja de vida real en PDF** generada por WeasyPrint, fuera del repositorio: 2 páginas, 16 campos reconocidos, 4 cargos con sus fechas y funciones correctas, y 14 campos correctamente vacíos por no estar en el documento. Los cuatro fallos listados arriba salieron de esa corrida.
- Los filtros se probaron contra un archivo de vacantes ficticias: de 5 avisos, descartó el que exige inglés B2 conversacional y el presencial de bajo salario con trabajo en terreno, y dejó pasar el que solo pide inglés técnico de lectura.
- Pendiente de las compuertas del PR: **POSTULA CI / validate**.
- **NO está validado en uso real.** El perfil generado todavía no se ha importado en un navegador ni se ha usado para postularse en un portal real.

## Qué sigue

1. **Importar el perfil generado** en POSTULA y postularse de verdad siguiendo `docs/INSTALACION.md`. Cada campo que falle en un portal real se convierte en un caso de `tests/matcher-contract.mjs`.
2. **Tablero de postulaciones** — registro local de a qué se postuló, fecha, estado y próximo seguimiento. Sin servidor. La lista que hoy imprime `vacantes.mjs` al final es su punto de partida natural.
3. **Radar de vacantes** — leer las alertas de empleo que los portales mandan al correo para armar solo el archivo que hoy se escribe a mano.
