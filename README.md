# MediaVault & Traffic Engine

Plataforma SaaS multi-tenant para estudios de contenido adulto y modelos
independientes: vault de material, sanitizacion anti-doxxing, programacion con
reglas duras, distribucion multiplataforma, enlaces rastreados y reparto de
ingresos.

Contexto durable en `AGENTS.md` y `docs/`.

---

## Estado: Entrega 1 — Cimientos

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

### Validacion

| Compuerta | Resultado |
|---|---|
| ESLint | limpio |
| TypeScript estricto | limpio |
| Hard Rule | 36/36 |
| Aislamiento RLS | 53/53 contra PostgreSQL 16 |
| Build de produccion | correcto, 8 rutas y middleware |
| Barrera anti-doxxing | GPS 4 campos → 0, pixeles intactos |

**Lo que NO esta validado:** nada se ha ejecutado contra Supabase Cloud ni
Cloudflare R2 reales, no hay pruebas end-to-end en navegador y no existe todavia
ningun runner que publique en una plataforma. Ver `docs/PRUEBAS.md`.

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

Detalle completo en `docs/INSTALACION.md`.

## Comandos

| Comando | Que hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run validate` | Lint + typecheck + Hard Rule + RLS |
| `npm test` | Matematica del motor anti-repeticion |
| `npm run test:rls` | Aislamiento multi-tenant contra PostgreSQL real |
| `npm run build` | Build de produccion |

## Mapa del repositorio

```
src/
  app/[locale]/          Paneles por rol, login y pagina publica de subida
  app/api/uploads/       Emision de URLs prefirmadas
  lib/scheduling/        Motor Hard Rule (codigo puro, sin dependencias)
  lib/supabase/          Clientes: navegador, servidor y servicio
  lib/r2.ts              Cloudflare R2 por API S3
  middleware.ts          Redirector de enlaces cortos, i18n y sesion
supabase/
  migrations/            Diez migraciones en orden
  tests/                 53 aserciones de aislamiento y compuertas
workers/                 Pipeline de medios en Python
tests/                   36 pruebas del Hard Rule
docs/                    Arquitectura, instalacion, base de datos, pruebas
```

## Siguiente entrega

El Modulo 5 (runners de publicacion a Telegram, X, Reddit y Bluesky) y el
validador de textos del Modulo 4 estan modelados en la base pero sin implementar.
Ver `AGENTS.md`.
