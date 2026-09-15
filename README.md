# MediaVault & Traffic Engine

Plataforma SaaS multi-tenant para estudios de contenido adulto y modelos
independientes: vault de material, sanitizacion anti-doxxing, programacion con
reglas duras, distribucion multiplataforma, enlaces rastreados y reparto de
ingresos.

Contexto durable en `AGENTS.md` y `docs/`.

---

## Estado: Sprint 2, Fase 2 — Ingesta desde Dropbox

Lo que existe y esta verificado:

- **Esquema completo y multi-tenant.** Catorce tablas, diez tipos enumerados,
  claves foraneas compuestas que impiden que un asset apunte a un perfil de otra
  organizacion.
- **Aislamiento RLS.** Politicas por accion sobre las catorce tablas, con
  **53 aserciones ejecutadas contra PostgreSQL 16 real** que intentan cruzar la
  frontera entre dos agencias y exigen que la base lo impida.
- **Autenticacion y cuatro roles.** Admin de plataforma, estudio, editor y
  modelo, con paneles segregados en `/admin`, `/studio` y `/model`.
- **Cumplimiento 2257 desde los cimientos.** Expediente por modelo y un trigger
  que bloquea la programacion si no esta verificado y vigente.
- **Subidas sin cuenta.** URL prefirmada de R2 emitida solo tras validar token,
  vigencia, cuota, tipo MIME y peso. El peso va firmado dentro de la URL.
- **Motor Hard Rule.** Anti-repeticion por asset, por prenda, separacion minima y
  tope diario. **36 pruebas de unidad**, centradas en las fronteras.
- **Acortador con analitica.** `/l/[slug]` resuelto en middleware, redireccion
  302 sin cache y registro del clic despues de responder.
- **Workers de Python.** Retirada de EXIF/GPS, transcodificacion H.264/WEBP y
  marca de agua, sobre una cola en Postgres con `SKIP LOCKED`.
- **Bilingue.** Espanol e ingles con `next-intl` desde la primera entrega.
- **Credenciales cifradas en reposo.** AES-256-GCM con clave del entorno y
  contexto que ata cada criptograma a su organizacion y plataforma.
- **Acortador con limite de tasa en dos capas.** Ventana en memoria del borde y
  ventana autoritativa en PostgreSQL. De la IP solo se guarda su hash con sal.
- **Despliegue en contenedores.** Imagen del panel (Next standalone) e imagen de
  los workers (con FFmpeg), orquestadas para VPS propio.
- **Validador de textos (Modulo 4).** Tuberia generar → validar → reintentar →
  fallar cerrado, con filtro estricto de terminos, enlaces, longitud y formato
  por plataforma. La garantia de que nada del LLM llega al publicador sin filtrar
  la impone el compilador, no una convencion.
- **Ingesta desde Dropbox (Modulo 2).** OAuth2 con `state` firmado, escaneo
  incremental por cursor, enrutado hibrido a perfiles, deduplicacion en dos pasos
  e ingesta en flujo a R2. Google Drive queda pendiente del tramite de
  verificacion: ver `docs/CONECTORES.md`.

### Validacion

| Compuerta | Resultado |
|---|---|
| ESLint | limpio |
| TypeScript estricto | limpio |
| Unidad (Hard Rule, cifrado, limite, textos, conectores) | 141/141 |
| Aislamiento RLS, limite, conectores y cola | 88/88 contra PostgreSQL 16 |
| Build de produccion | correcto, 8 rutas y middleware |
| Barrera anti-doxxing | GPS 4 campos → 0, pixeles intactos |
| Imagenes Docker | se construyen en CI |

**Lo que NO esta validado:** nada se ha ejecutado contra Supabase Cloud ni
Cloudflare R2 reales, no hay pruebas end-to-end en navegador, no existe todavia
ningun runner que publique en una plataforma, y las imagenes Docker se compilan
en CI pero no se han arrancado en un servidor. Ver `docs/PRUEBAS.md`.

---

## Arranque rapido

```bash
npm install
npx supabase start            # PostgreSQL, Auth, PostgREST en local
docker compose up -d          # MinIO simulando R2
cp .env.example .env.local    # pega las claves que imprimio supabase start
npx supabase db reset         # aplica las diez migraciones
npm run dev
```

Detalle completo en `docs/INSTALACION.md`. Para servidor propio con
contenedores, `docs/DESPLIEGUE.md`.

## Comandos

| Comando | Que hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run validate` | Lint + typecheck + Hard Rule + RLS |
| `npm test` | Hard Rule, cifrado y limite de tasa |
| `npm run test:rls` | Aislamiento multi-tenant y limite de tasa, contra PostgreSQL real |
| `npm run build` | Build de produccion |

## Mapa del repositorio

```
src/
  app/[locale]/          Paneles por rol, login y pagina publica de subida
  app/api/uploads/       Emision de URLs prefirmadas
  lib/scheduling/        Motor Hard Rule (codigo puro, sin dependencias)
  lib/captions/          Validador de textos y tuberia del Modulo 4
  lib/connectors/        Dropbox, enrutado, ciclo de vida de conexiones
  workers/ingest/        Worker de ingesta desde la nube (Node)
  lib/crypto/            Cifrado AES-256-GCM de credenciales
  lib/credentials.ts     Unico camino de entrada y salida de los tokens
  lib/rate-limit.ts      Ventana fija y hash de IP
  lib/supabase/          Clientes: navegador, servidor y servicio
  lib/r2.ts              Cloudflare R2 por API S3
  middleware.ts          Redirector de enlaces cortos, i18n y sesion
supabase/
  migrations/            Quince migraciones en orden
  tests/                 88 aserciones de aislamiento, compuertas, limite y conectores
workers/                 Pipeline de medios en Python
tests/                   141 pruebas de unidad
docs/                    Arquitectura, instalacion, base de datos, pruebas, despliegue
Dockerfile               Imagen del panel (Next standalone)
workers/Dockerfile       Imagen de los workers de medios (con FFmpeg)
workers/ingest.Dockerfile Imagen del worker de ingesta (Node, sin FFmpeg)
docker-compose.yml       Orquestacion para VPS propio
```

## Siguiente entrega

1. **Primera conexion real a Dropbox.** Nada de la integracion se ha ejecutado
   contra la API: el entorno de desarrollo no alcanza internet.
2. **Pantalla de triaje** para los archivos que quedan sin asignar.
3. **Google Drive**, en cuanto avance el tramite de verificacion.
4. **Conectar un proveedor de IA real** al generador de textos.

El Modulo 5 (runners de publicacion a Telegram, X, Reddit y Bluesky) sigue
modelado en la base pero sin implementar. Ver `AGENTS.md`.
