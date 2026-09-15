# Contexto durable — MediaVault & Traffic Engine

Este archivo es el contexto que sobrevive entre entregas. El `README.md` es una
foto de la entrega actual; esto es lo que hay que saber siempre.

---

## Que es el producto

Plataforma SaaS multi-tenant para estudios de contenido adulto y modelos
independientes. Siete modulos: control de acceso por rol, ingesta y reciclado de
vault, pipeline de medios, programacion con reglas duras, distribucion
automatizada, enlaces rastreados y libro de reparto de ingresos.

## Decisiones cerradas

Se acordaron con el cliente antes de escribir codigo. No se cambian sin volver a
preguntar.

| Tema | Decision |
|---|---|
| Stack | Next.js App Router, TypeScript, Tailwind v4, Supabase, Cloudflare R2, Python 3.11 |
| Despliegue | Vercel + Supabase Cloud + R2 (workers aparte) |
| Multi-tenancy | `organizations` + `memberships`, RLS por `organization_id` |
| Cola | Tabla en Postgres con `FOR UPDATE SKIP LOCKED` |
| Cumplimiento 2257 | Desde los cimientos, con bloqueo en la base |
| Idiomas | Bilingue es/en con `next-intl` desde el inicio |
| Subidas | URL prefirmada tras validar token, con vigencia y limites estrictos |
| Acortador | `/l/[slug]` en la misma app, sin dominio aparte |
| CI | Linters, TypeScript, Hard Rule y RLS |
| Plataformas | Telegram, X, Reddit, Bluesky y webhook generico; credenciales OAuth y API key |

## Reglas que no se rompen

1. **El aislamiento vive en la base, no en la aplicacion.** Toda consulta nueva
   pasa por RLS. Si algo necesita la clave de servicio, es que falta una politica
   o que de verdad no hay usuario que autorice la operacion (subida anonima,
   workers, runners de publicacion). No hay un tercer caso.

2. **Nada se publica sin sanitizar.** Una foto de movil lleva las coordenadas del
   sitio donde se tomo. El trigger `schedules_enforce_gates` lo impide en la
   base; no lo debilites para desbloquear una demo.

3. **Nada se publica sin expediente 2257 vigente.** Mismo trigger, misma razon:
   es requisito legal, no una preferencia de producto.

4. **Los tipos de `database.types.ts` son alias, nunca interfaces.** PostgREST
   exige `Record<string, unknown>` y una interfaz no obtiene indice implicito. Si
   alguien la convierte en interfaz, el esquema entero se resuelve a `never` y
   **las consultas pierden el tipado en silencio**. Ya paso una vez durante la
   Entrega 1 y costo un buen rato localizarlo.

5. **`@supabase/ssr` tiene que ir al dia.** La version 0.5.2 arrastra una copia
   antigua de supabase-js cuyas firmas genericas no encajan con las actuales, y
   el sintoma es exactamente el mismo: todo a `never`, sin ningun error que
   apunte a la causa.

6. **Las pruebas de RLS no comprueban permisos, intentan violarlos.** Una prueba
   que solo verifique que cada usuario ve lo suyo no sirve. Hay que intentar leer
   y escribir datos ajenos y exigir que la base lo impida.

7. **Bajo RLS, un UPDATE ajeno no lanza error: afecta a cero filas.** Por eso
   existe `tests.assert_affects`. Comprobar esos casos con `assert_rejected` da
   un falso verde.

## Topologia de compuertas

```
lint ─┐
typecheck ─┤
hard-rule ─┼─> validate   (la unica que hay que exigir en la rama principal)
rls ───────┤
build ─────┤
workers ───┘
```

`rls` levanta un PostgreSQL 16 de servicio, aplica el arranque de auth que
reproduce lo que Supabase da de fabrica, corre las diez migraciones y ejecuta las
53 aserciones.

## Mapa del repositorio

| Ruta | Contenido |
|---|---|
| `src/app/[locale]/(panel)/` | Paneles de admin, estudio y modelo |
| `src/app/[locale]/u/[token]/` | Pagina publica de subida sin cuenta |
| `src/app/api/uploads/presign/` | Unico endpoint que atiende sin sesion |
| `src/lib/scheduling/hard-rule.ts` | Motor anti-repeticion, codigo puro |
| `src/lib/supabase/service.ts` | Clave de servicio: omite RLS, marcado `server-only` |
| `src/middleware.ts` | Redirector `/l/`, i18n y refresco de sesion |
| `supabase/migrations/` | Diez migraciones, orden alfabetico |
| `supabase/tests/` | Arranque de auth, semilla y aserciones |
| `workers/` | Pipeline de medios en Python |

## Estado por modulo

| Modulo | Estado |
|---|---|
| 1 — Roles y aislamiento | Completo y probado |
| 2 — Ingesta y vault | Subidas completas. Faltan conectores de Drive/Dropbox |
| 3 — Pipeline de medios | Workers escritos; solo la sanitizacion EXIF esta verificada |
| 4 — Hard Rule | Motor completo y probado. Falta el validador de textos |
| 5 — Distribucion | Modelado en la base; **ningun runner implementado** |
| 6 — Enlaces y trafico | Acortador y analitica funcionando. Falta el panel de metricas |
| 7 — Finanzas | Esquema y vista de la modelo. Falta la gestion desde el estudio |

## Riesgos abiertos

- **Los terminos de Vercel prohiben contenido adulto.** Hay que confirmarlo o
  prever alojamiento alternativo antes de produccion.
- **Los workers no caben en Vercel:** FFmpeg sobre video largo excede los limites
  de una funcion serverless. Necesitan VPS, Fly.io o Railway.
- **`record_link_click` es invocable por `anon`.** Es lo que permite contar clics
  sin sesion, pero tambien permite inflar el contador de un enlace conocido. Si
  importa, hay que meter limite de tasa en el borde.
- **`platform_credentials.secret_ciphertext` espera cifrado en la aplicacion.**
  La funcion que cifra todavia no existe: hay que escribirla antes de guardar la
  primera credencial real.
