# Conectores de ingesta — diseño (Fase 2, sin implementar)

Escanear Google Drive y Dropbox en busca de material antiguo y traerlo al vault.
Es el reciclador del Modulo 2: casi toda agencia tiene años de sesiones en una
carpeta compartida que nadie vuelve a abrir.

**Estado: Dropbox implementado.** OAuth2, escaneo, enrutado, deduplicacion e
ingesta a R2. Google Drive sigue pendiente: mismo esquema, otro archivo en
`providers/`, y el tramite de verificacion corriendo en paralelo.

---

## En que lenguaje va el worker: Node, no Python

Los workers de medios son Python porque su trabajo es CPU y binarios: FFmpeg y
Pillow. El de ingesta no se le parece en nada — es E/S pura: hablar HTTP con dos
APIs, seguir paginaciones y volcar bytes a R2. Tres razones concretas para
separarlo:

1. **El cifrado ya existe una sola vez, en Node.** Los refresh tokens se guardan
   con el formato de `src/lib/crypto/secrets.ts`: AES-256-GCM, prefijo de
   version, y contexto firmado que ata el criptograma a su organizacion. Un
   worker en Python necesitaria una segunda implementacion del mismo formato.
   Dos implementaciones de un formato criptografico es exactamente el tipo de
   duplicacion que acaba divergiendo en silencio: se arregla un detalle de
   padding en una y la otra deja de descifrar meses despues.

2. **Los tipos del esquema ya estan en TypeScript.** `CloudConnectionRow` y
   `CloudIngestItemRow` los verifica el compilador. En Python serian diccionarios
   sin comprobar.

3. **Es E/S, no CPU.** Descargar cientos de archivos en paralelo es justo lo que
   Node hace bien sin esfuerzo, y no compite por la CPU que necesita FFmpeg.

Los workers de medios se quedan en Python. No hay razon para tocarlos.

---

## Estructura

```
src/lib/connectors/
  dropbox.ts          Cliente HTTP de la API de Dropbox
  connection.ts       Guarda, carga y refresca conexiones (cifra los tokens)
  routing.ts          Enrutado hibrido — codigo puro, muy probado
  oauth-state.ts      Firma y verifica el parametro `state`
src/workers/ingest/
  index.ts            Bucle: toma trabajos de la cola y despacha
  scan.ts             scan_cloud_folder:  descubre, enruta y encola
  ingest.ts           ingest_cloud_file:  descarga, deduplica y crea el asset
  media-types.ts      Que archivos merece la pena traer
src/app/api/conectores/dropbox/
  start/              Inicia el flujo OAuth2
  callback/           Retorno: valida, intercambia y guarda la conexion
```

Despliegue: servicio `ingest` en `docker-compose.yml`, con su propia imagen
(`workers/ingest.Dockerfile`). No necesita FFmpeg, asi que es mucho mas ligera
que la de los workers de medios.

Corre TypeScript directamente con `tsx` y un `tsconfig.workers.json` propio. Ese
tsconfig existe por una razon concreta: los modulos compartidos llevan
`import 'server-only'`, que lanza una excepcion al cargarse fuera de un React
Server Component. El tsconfig de los workers lo sustituye por un modulo vacio; el
principal no lo toca, asi que la proteccion del bundle del navegador sigue intacta.

---

## Las tres reglas de enrutado

Decididas por el arquitecto e implementadas en `routing.ts`, que es codigo puro
y por tanto muy probado (14 casos):

1. **`default_profile_id` manda.** El caso de la modelo independiente: todo su
   Dropbox es suyo. Pesa mas que cualquier deduccion, porque es una decision
   explicita de quien conecto la cuenta.
2. **Match por subcarpeta de primer nivel.** El caso del estudio:
   `/Modelos/alfa_uno/set01/foto.jpg` va al perfil `alfa_uno`. Compara contra el
   handle y contra el nombre publico, tolerando mayusculas, acentos, guiones y
   espacios, porque quien creo la carpeta no sabia el handle exacto.
3. **Sin asignar.** Queda en `unassigned` con la carpeta que se intento, para el
   triaje del estudio.

Un matiz que no estaba en el encargo: **ante dos perfiles que normalizan igual,
no se adivina**. El archivo queda sin asignar con motivo `coincidencia_ambigua`.
Mandar el material de una modelo al perfil de otra es peor que dejarlo sin
asignar — sin asignar alguien lo revisa; mal asignado, nadie, y acaba publicado
en la cuenta equivocada.

## Deduplicacion en dos pasos

Los duplicados **nunca se descartan en silencio**. La fila se conserva con
`status = 'duplicate'`, el motivo y `duplicate_of_item_id` apuntando al original,
para que el panel pueda decir "ya lo tienes, subido el 3 de marzo".

1. **Antes de descargar**, con el hash que da el proveedor. Es la comprobacion
   barata: evita traer los bytes.
2. **Despues de descargar**, con el SHA-256 del contenido, calculado al vuelo
   mientras los bytes van de Dropbox a R2. Es la certera, y la unica comparable
   entre proveedores: el mismo archivo en Drive y en Dropbox da distinto checksum
   remoto y el mismo SHA-256. Si salta, se borra la copia recien subida — la fila
   se queda, los bytes duplicados no.

## Los dos trabajos

**`scan_cloud_folder`** — recorre la carpeta autorizada y registra en
`cloud_ingest_items` lo que encuentra. No descarga nada. Usa `delta_cursor`
(`pageToken` en Drive, `cursor` en Dropbox) para pedir solo lo que cambio desde
la ultima pasada: en una cuenta con años de material, la diferencia entre
minutos y horas.

**`ingest_cloud_file`** — descarga un archivo concreto a R2 con streaming (nunca
entero en memoria: hay videos de varios GB), crea la fila en `media_assets` con
`sanitized = false`, y encola el trabajo de sanitizacion. A partir de ahi el
material sigue exactamente el mismo camino que una subida desde el movil, con
las mismas barreras: sin EXIF retirado no se puede programar. Que venga de una
carpeta compartida no le da ningun privilegio — conserva las mismas coordenadas
GPS que una foto subida a mano.

**Un archivo sin perfil no se descarga.** Sin perfil no hay carpeta de R2 donde
ponerlo, y traer gigabytes que nadie ha reclamado es trabajo tirado. Espera en
`unassigned` a que el triaje le asigne uno.

---

## Lo que ya impone el esquema

- **Deduplicacion.** `unique (connection_id, remote_file_id)`. Sin ella, cada
  pasada volveria a descargar los mismos gigabytes y a duplicar assets.
- **Deteccion del mismo contenido con otro nombre.** Indice sobre
  `remote_checksum`, que en una carpeta compartida de años es lo habitual.
- **Nadie inventa archivos remotos.** `cloud_ingest_items` no tiene politica de
  INSERT: solo los crea el worker con la clave de servicio.
- **El editor no ve las llaves.** `cloud_connections` esta al nivel de
  `platform_credentials`: fuera del alcance del editor y de la modelo. El
  inventario de archivos si lo ve el editor, porque es quien decide que se
  ingiere.
- **La carpeta raiz acota el escaneo.** Aunque el token de OAuth de acceso a todo
  el Drive, el worker no mira fuera de `root_folder_id`.

---

## Lo delicado: OAuth2

Es la parte que pediste revisar antes de escribir, y con razon.

**Alcances minimos.** Drive ofrece `drive.readonly` (todo el Drive) y
`drive.file` (solo lo que la app abrio). Para escanear una carpeta existente hace
falta el primero, que es mucho permiso: hay que explicarlo en la pantalla de
conexion y acotarlo con `root_folder_id`. Dropbox permite limitar la app a una
carpeta propia, que es bastante mas limpio.

**Verificacion de Google.** Los alcances de Drive son "sensibles" y exigen
revision de Google antes de salir de modo prueba, con un limite de 100 usuarios
mientras tanto. **Hay que contar con semanas de espera**, y merece la pena
empezar ese tramite antes que el codigo. Ojo tambien a las politicas de Google
sobre el tipo de contenido del producto.

**Redirecciones.** Cada URI de retorno se registra exacta en la consola del
proveedor. Con desarrollo local, un dominio de pruebas y produccion son tres
entradas por proveedor. Conviene fijar `https://<panel>/api/conectores/<proveedor>/callback`
desde ahora y no tocarlo.

**Estado anti-CSRF.** El parametro `state` tiene que ir firmado y atado a la
sesion: sin eso, un tercero puede lograr que una agencia conecte *su* Drive a la
cuenta del atacante. Se resuelve con el mismo HMAC que ya usan los enlaces de
subida.

**Refresco.** Google entrega el refresh token **solo la primera vez** que la
persona autoriza, salvo que se pida `prompt=consent` explicitamente. Si no se
guarda en ese momento, se pierde y hay que desconectar y reconectar a mano. Es el
fallo mas comun de estas integraciones.

**Revocacion.** Cuando el refresh token deja de valer, la conexion pasa a
`expired` y el panel debe pedir reconexion. No se arregla reintentando, y
reintentar en bucle es como se acaba en la lista negra del proveedor.

---

## Lo que falta

- **Google Drive.** Mismo esquema y mismos trabajos; cambia el cliente HTTP y el
  formato del cursor. El tramite de verificacion es lo que marca el calendario,
  no el codigo.
- **Pantalla de triaje.** El backend deja los archivos en `unassigned` con la
  carpeta que se intento; falta la vista donde el estudio los asigna.
- **Escaneo programado.** Hoy el trabajo `scan_cloud_folder` hay que encolarlo a
  mano. Falta decidir la cadencia (¿cada hora? ¿cada noche?) y quien lo dispara.
- **Prueba contra Dropbox real.** Nada de esto se ha ejecutado contra la API: el
  entorno de desarrollo no alcanza internet. El enrutado, el estado de OAuth y el
  filtro de tipos estan probados; el cliente HTTP, no.
