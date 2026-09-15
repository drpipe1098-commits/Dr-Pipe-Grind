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
| Despliegue | VPS propio con contenedores (Docker). Supabase sigue aportando base y Auth. Se descarto Vercel: ToS de contenido adulto y limites de FFmpeg |
| Multi-tenancy | `organizations` + `memberships`, RLS por `organization_id` |
| Cola | Tabla en Postgres con `FOR UPDATE SKIP LOCKED` |
| Cumplimiento 2257 | Desde los cimientos, con bloqueo en la base |
| Idiomas | Bilingue es/en con `next-intl` desde el inicio |
| Subidas | URL prefirmada tras validar token, con vigencia y limites estrictos |
| Acortador | `/l/[slug]` en la misma app, sin dominio aparte |
| CI | Linters, TypeScript, unidad, RLS, build, workers e imagenes Docker |
| Secretos en reposo | AES-256-GCM con `ENCRYPTION_MASTER_KEY` del entorno |
| Limite del acortador | Dos capas: memoria del borde y ventana de 60 s en PostgreSQL |
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

8. **Ningun token se escribe en `platform_credentials` fuera de
   `src/lib/credentials.ts`.** Ese modulo cifra antes de insertar. Escribir por
   otra via guarda el secreto en claro y la base no puede impedirlo: solo ve
   texto.

9. **La ventana de deduplicacion de clics no es un parametro.** Vive como
   constante en el cuerpo de `record_link_click`. Quien invoca esa funcion es
   anonimo; si pudiera elegir la ventana, pasaria cero y el limite dejaria de
   existir.

10. **`web` nunca se expone directamente a internet.** El limitador identifica al
    visitante por `X-Forwarded-For`, que el cliente puede falsificar. Sin un proxy
    inverso delante que la reescriba, el limite es decorativo.

11. **De la IP no se guarda nunca la direccion, solo su hash con sal.** Ni en la
    base ni en los registros.

## Topologia de compuertas

```
lint ──────┐
typecheck ─┤
hard-rule ─┤
rls ───────┼─> validate   (la unica que hay que exigir en la rama principal)
build ─────┤
workers ───┤
docker ────┘
```

`rls` levanta un PostgreSQL 16 de servicio, aplica el arranque de auth que
reproduce lo que Supabase da de fabrica, corre las once migraciones y ejecuta las
65 aserciones.

La compuerta `docker` construye las dos imagenes de verdad. Existe porque el
despliegue es por contenedores: un Dockerfile roto no se descubriria al hacer
merge sino al intentar desplegar.

## Mapa del repositorio

| Ruta | Contenido |
|---|---|
| `src/app/[locale]/(panel)/` | Paneles de admin, estudio y modelo |
| `src/app/[locale]/u/[token]/` | Pagina publica de subida sin cuenta |
| `src/app/api/uploads/presign/` | Unico endpoint que atiende sin sesion |
| `src/lib/scheduling/hard-rule.ts` | Motor anti-repeticion, codigo puro |
| `src/lib/crypto/secrets.ts` | Cifrado AES-256-GCM, formato versionado `v1.` |
| `src/lib/credentials.ts` | Unico camino de entrada y salida de los tokens |
| `src/lib/rate-limit.ts` | Ventana fija en memoria y hash de IP |
| `Dockerfile`, `workers/Dockerfile` | Imagenes de panel y workers |
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

## Riesgos cerrados

- ~~ToS de Vercel y limites de FFmpeg~~ → se pivoto a VPS propio con contenedores.
- ~~`record_link_click` invocable por `anon` sin limite~~ → dos capas de limite,
  la autoritativa en PostgreSQL.
- ~~Falta la funcion de cifrado de credenciales~~ → `src/lib/crypto/secrets.ts`,
  con 20 pruebas centradas en la deteccion de manipulacion.

## Riesgos abiertos

- **La perdida de `ENCRYPTION_MASTER_KEY` es irreversible.** Sin ella, las
  credenciales guardadas no se recuperan ni con el volcado completo de la base, y
  hay que reconectar cada cuenta a mano. Debe respaldarse fuera del servidor.
- **El cifrado no protege un servidor comprometido en ejecucion**, donde la clave
  esta en memoria. El paso siguiente, si el producto crece, es un KMS.
- **La rotacion de clave todavia no esta implementada.** El formato lleva prefijo
  de version (`v1.`) precisamente para permitirla sin migrar todas las filas de
  golpe, pero la funcion que reescribe los criptogramas no existe.
- **Las imagenes Docker se construyen en CI pero no se han arrancado en un
  servidor.** El primer despliegue real sigue siendo la prueba que falta.
- **No hay copia de seguridad automatizada** de nada que no cubra Supabase.
