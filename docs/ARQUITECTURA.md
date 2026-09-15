# Arquitectura

## Decisiones tomadas y por que

| Decision | Eleccion | Motivo |
|---|---|---|
| Multi-tenancy | `organizations` + `memberships` | Una modelo puede trabajar con dos agencias y un editor cubrir varias. Una columna `studio_id` en `profiles` obligaria a migrar el dia que eso pase. |
| Aislamiento | RLS en PostgreSQL | Se aplica en el motor, no en la aplicacion: una llamada directa a la API queda igual de limitada que el panel. |
| Cola de trabajos | Tabla en Postgres con `SKIP LOCKED` | Sin broker que administrar, y encolar es transaccional con el cambio que lo origina. |
| Cumplimiento 2257 | Desde los cimientos, con trigger | Retroadaptarlo sobre miles de assets cuesta mucho mas que disenarlo ahora. |
| Enlaces de subida | URL prefirmada tras validar token | Nunca sale una credencial de escritura del bucket. |
| Acortador | `/l/[slug]` en la misma app | Sin dominio ni despliegue extra. |
| Idiomas | `next-intl`, es + en | Mercado de arranque en espanol, sin cerrar la puerta a vender fuera. |

## Las tres capas de autorizacion

Van de fuera hacia dentro. Cada una sola es insuficiente; juntas, un fallo en
una no abre la puerta.

1. **Privilegios de tabla.** `anon` no tiene concedido nada sobre ninguna tabla.
   Un visitante sin sesion choca aqui, antes de que el RLS llegue a evaluarse.
   Su unica via son dos funciones `SECURITY DEFINER` con la superficie minima
   que necesita el redirector.
2. **Politicas RLS.** Deciden que filas ve cada usuario autenticado. Se apoyan
   en funciones auxiliares del esquema `app`, que son `SECURITY DEFINER` para
   romper la recursion (una politica sobre `memberships` que consultara
   `memberships` se llamaria a si misma sin fin).
3. **Triggers de integridad.** Lo que el RLS no puede expresar: que nadie se
   suba el rol, que nadie se cambie su porcentaje de reparto, que no se programe
   contenido sin sanitizar ni sin expediente 2257 vigente.

### Quien ve que

| | Admin plataforma | Estudio | Editor | Modelo |
|---|---|---|---|---|
| Material de la organizacion | todo | si | si | solo el suyo |
| Expedientes 2257 | todo | si | **no** | solo el suyo |
| Credenciales de plataformas | todo | si | **no** | solo las suyas |
| Finanzas | todo | si | **no** | solo las suyas |
| Otras organizaciones | si | **no** | **no** | **no** |

El editor queda fuera de documentos de identidad, dinero y credenciales a
proposito: necesita ingerir y preparar material, nada mas.

## Camino de un archivo

```
Movil de la modelo
   |  abre /u/<token>
   v
POST /api/uploads/presign   valida token, vigencia, cuota, MIME y peso
   |  devuelve URL prefirmada (minutos de vida, tamano firmado)
   v
PUT directo a R2            el archivo NO pasa por el servidor de Next
   |
   v
inbox/  (sanitized = false) -> la base rechaza programarlo
   |
   v
Worker Python: retira EXIF/GPS, transcodifica, marca de agua
   |
   v
public/ (sanitized = true)  -> ya se puede programar y publicar
```

## Camino de un clic

```
t.me/canal -> /l/alfa-tg-01
   |
   v
middleware.ts
   |-- resolve_tracking_link(slug)    RPC publico, superficie minima
   |-- redirect 302 (sin cache)       el visitante ya se fue
   `-- waitUntil(record_link_click)   la analitica se escribe despues
```

El 302 sin cache es deliberado: un 301 lo guardaria el navegador y los clics
siguientes dejarian de contarse, ademas de impedir cambiar el destino.
