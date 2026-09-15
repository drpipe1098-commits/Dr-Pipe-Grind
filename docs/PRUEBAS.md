# Pruebas

Seis compuertas en CI. La rama principal solo necesita exigir `validate`, que
las agrega.

| Compuerta | Que comprueba | Comando local |
|---|---|---|
| `linters` | ESLint sobre todo el proyecto | `npm run lint` |
| `typescript` | `tsc --noEmit` en modo estricto | `npm run typecheck` |
| `motor hard-rule` | 36 casos de la matematica anti-repeticion | `npm test` |
| `aislamiento RLS` | 53 aserciones contra PostgreSQL real | `npm run test:rls` |
| `build` | Compilacion de produccion de Next | `npm run build` |
| `workers python` | Sintaxis y la barrera anti-doxxing | `python workers/verificar_sanitizacion.py` |

## Por que solo estas dos suites de unidad

El esfuerzo esta puesto donde un fallo no se ve venir.

**El Hard Rule** decide que se publica y cuando. Un error de frontera no rompe
nada visible: simplemente repite contenido antes de tiempo, y eso solo se nota
cuando el publico ya se canso. Por eso las 36 pruebas insisten en los limites
—el instante exacto en que un enfriamiento se cumple, el milisegundo anterior,
el enfriamiento de cero dias— y usan fechas fijas en UTC. Ninguna llama a
`new Date()` sin argumentos: una prueba que dependa del reloj real falla sola
algun martes y nadie sabe por que.

**El RLS** es la unica pieza cuyo fallo no tiene vuelta atras. Si una politica
esta mal, el material privado de una modelo aparece en el panel de otra agencia,
y eso ya no se deshace. Las pruebas no se limitan a comprobar que cada usuario ve
lo suyo: **intentan activamente cruzar la frontera** y exigen que la base lo
impida.

## Como funcionan las pruebas de RLS

`scripts/run-rls-tests.mjs` crea una base desechable, aplica el arranque de auth
(que reproduce lo que Supabase aporta de fabrica: el esquema `auth`, la funcion
`auth.uid()` y los roles `anon` / `authenticated`), corre las diez migraciones,
siembra dos agencias y ejecuta los archivos de asercion.

Cada bloque suplanta a un usuario real fijando el mismo `request.jwt.claims` que
pondria PostgREST y adoptando el rol `authenticated`. No hay atajos: si una
politica esta mal, esas consultas devuelven datos ajenos y la prueba falla.

Un detalle importante del diseno de las aserciones: bajo RLS, un `UPDATE` o un
`DELETE` sobre filas ajenas **no lanza error**, simplemente no afecta a ninguna
fila. Por eso `tests.assert_affects` mide el alcance de la escritura en vez de
esperar una excepcion. Comprobarlo con un `assert_rejected` daria un falso verde.

## Lo que NO esta probado

- **No hay pruebas end-to-end.** Nadie ha recorrido el flujo completo en un
  navegador.
- **Nada se ha ejecutado contra Supabase Cloud ni R2 reales.** El RLS se prueba
  contra PostgreSQL 16 normal, que es el mismo motor, pero Auth y Storage
  gestionados no se han tocado.
- **La transcodificacion y la marca de agua no tienen pruebas automaticas.**
  Solo la sanitizacion EXIF, que es la parte peligrosa.
- **Ningun runner de publicacion existe todavia.** El Modulo 5 esta modelado en
  la base pero no implementado.
