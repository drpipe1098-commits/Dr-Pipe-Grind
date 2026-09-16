# POSTULA — Última entrega

Este README es una **foto operativa de la entrega actual únicamente**. El contexto durable vive en `AGENTS.md` y `docs/`.

## Qué se hizo

**Entrega 4 — Tablero de postulaciones.**

La Entrega 3 dejó resuelto el principio (la hoja de vida se vuelve perfil) y el filtro (qué vacante vale la pena). Faltaba el medio: buscar empleo en serio significa tener veinte procesos abiertos a la vez, y a las tres semanas nadie recuerda a cuál portal aplicó, cuándo, ni a quién le prometió enviar algo.

```bash
node herramientas/tablero.mjs                        # qué toca hoy
node herramientas/tablero.mjs estado <id> postulado
```

- **Ocho estados**, de «por postular» a «sin respuesta», cada uno con su plazo de seguimiento. `sinRespuesta` no es un fracaso: es reconocer que la mayoría de las postulaciones no reciben respuesta nunca, y que seguir esperándolas consume atención.
- **La pregunta que responde es «qué toca hoy»**: seguimientos vencidos, los más atrasados primero, y las postuladas hace más de tres semanas señaladas como candidatas a cerrar.
- **Se llena solo.** Marcar una vacante con `s` en `vacantes.mjs` la registra, porque ese es el único momento en que la persona tiene el contexto fresco.
- **Un archivo JSON en su equipo**, `mis-postulaciones.json`. Sin servidor, sin cuenta y sin red: el tablero sabe a qué te postulaste, y eso no tiene por qué saberlo nadie más.

**Tres reglas que el candado sostiene:** no se inventan fechas (una postulación sin fecha de envío no tiene una supuesta); nada se pierde (cada cambio deja su línea en el historial); y la misma vacante no entra dos veces, aunque los portales escriban la empresa como «Ejemplo SAS», «Ejemplo S.A.S» o «Ejemplo S.A.S.».

## Archivos modificados en esta entrega

- `.gitignore` — `mis-postulaciones.json` y sus variantes fuera del repositorio.
- `AGENTS.md` — estado de la Entrega 4, candado nuevo, prioridades y mapa.
- `README.md` — esta foto de entrega.
- `docs/HERRAMIENTAS.md` — el tablero: órdenes, estados y sus tres reglas.
- `herramientas/tablero.mjs` — CLI del tablero: qué toca hoy, listar, estado, nota, seguimiento.
- `herramientas/lib/tablero.mjs` — estados, fechas, identidad sin forma jurídica y consultas.
- `herramientas/vacantes.mjs` — lo que marcas con «s» entra al tablero; `--tablero` y `--sin-tablero`.
- `tests/tablero-contract.mjs` — candado del tablero.
- `tests/proyecto-contract.mjs` — candado nuevo: los archivos de datos personales tienen que estar ignorados.

## Validación

- **VALIDADO EN CÓDIGO** localmente: los **11 candados** pasan (`npm test`), uno de ellos nuevo.
- El candado nuevo de `.gitignore` se verificó **rompiéndolo a propósito**: al quitar `mis-postulaciones` del archivo, falla; al restaurarlo, pasa.
- El tablero se ejecutó a mano contra un archivo con fechas reales: mostró un seguimiento con 28 días de atraso, una entrevista con 2, y propuso cerrar una postulación de hace 35 días.
- Pendiente de las compuertas del PR: **POSTULA CI / validate** y **README Deploy Snapshot**.
- **NO está validado en uso real.** Nadie ha llevado una búsqueda de empleo con este tablero. Los estados, los plazos de seguimiento y el umbral de tres semanas son supuestos razonables, no observaciones.

## Qué sigue

1. **Usar el tablero durante una búsqueda de verdad.** Cada plazo que resulte mal calibrado y cada estado que falte se corrigen con lo observado, no con lo imaginado.
2. **Importar el perfil en POSTULA y postularse.** Sigue siendo el paso que convierte todo esto en `VALIDADO EN USO REAL`, y cada campo que falle en un portal real se vuelve un caso de `tests/matcher-contract.mjs`.
3. **Radar de vacantes** — leer las alertas de empleo del correo para armar solo el archivo que hoy se escribe a mano.
