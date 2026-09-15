# Pruebas de POSTULA

## Filosofía

Las pruebas de `tests/` **no son solo pruebas unitarias: son candados sobre las decisiones de producto** de la sección 4 de `AGENTS.md`. Cuando se toma una decisión, se escribe la prueba que impide romperla.

Un candado no valida que el código funcione. Valida que el producto siga siendo el producto.

## Ejecutar

```bash
npm test
```

No necesita `npm install`. Todo corre con Node puro, sin dependencias. Cada candado se ejecuta en su propio proceso para que un fallo no tape a los demás.

Un candado suelto:

```bash
node tests/matcher-contract.mjs
```

## Los candados

| Archivo | Qué protege |
|---|---|
| `privacidad-contract.mjs` | que los datos del usuario no salgan de su computador: prohíbe `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `chrome.storage.sync`, URLs externas, permisos de host, content scripts permanentes y procesos en segundo plano |
| `envio-contract.mjs` | que POSTULA nunca envíe el formulario: prohíbe `submit()`, `click()` y eventos de envío en el código inyectado |
| `matcher-contract.mjs` | que el reconocimiento acierte, y sobre todo que **nunca** toque contraseñas, medios de pago, buscadores ni datos de terceros |
| `perfil-contract.mjs` | que el esquema del perfil sea estable y que exportar/importar sea reversible |
| `autofill-contract.mjs` | de dónde sale cada valor, los respaldos y la elección en listas desplegables |
| `proyecto-contract.mjs` | la estructura de `AGENTS.md` y `README.md`, que la extensión cargue sin compilar, que matcher y perfil no se desincronicen, y que **no haya datos personales reales en el repositorio** |

## Cómo se prueba código de navegador sin navegador

Los archivos de `extension/` se escriben como scripts clásicos que se cuelgan del objeto global (`globalThis.POSTULA_*`), igual que el navegador los carga uno tras otro. `tests/ayuda.mjs` los carga en un sandbox del módulo `vm` de Node, en el mismo orden.

Ventaja: se prueba exactamente el archivo que se publica, sin compilación y sin dependencias.

Lo que depende del DOM (recorrer el formulario, leer etiquetas, escribir valores) no se prueba aquí. Eso se valida en uso real.

## Lenguaje de estado

- **IMPLEMENTADO** — el código existe.
- **VALIDADO EN CÓDIGO** — el CI y las pruebas pasaron.
- **INSTALADO** — la extensión está cargada en el navegador del usuario.
- **VALIDADO EN USO REAL** — se rellenó y envió una postulación de verdad en un portal real.

**Nunca declarar validación en uso real a partir del CI.** Que los candados estén verdes no significa que Computrabajo aceptó la postulación. Esa distinción es la misma que usa BRVTAL y existe porque confundirlas hace que se declare terminado algo que nunca se probó.

## Cuando algo falla en un portal real

Ese es el insumo más valioso que tiene el proyecto:

1. Anotar el portal, el rótulo exacto del campo y qué pasó.
2. Convertirlo en un caso de `tests/matcher-contract.mjs`.
3. Corregir el patrón.
4. `npm test`.

Así cada error de la vida real se convierte en un candado permanente.
