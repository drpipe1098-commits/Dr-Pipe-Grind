# Conectores de ingesta — diseño (Fase 2, sin implementar)

Escanear Google Drive y Dropbox en busca de material antiguo y traerlo al vault.
Es el reciclador del Modulo 2: casi toda agencia tiene años de sesiones en una
carpeta compartida que nadie vuelve a abrir.

**Estado: solo esquema.** Las tablas, el RLS y los tipos estan listos y probados
(13 aserciones en `supabase/tests/50_connectors.sql`). El flujo OAuth y las
llamadas a cada API no estan escritos, a la espera de tu visto bueno.

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

## Estructura propuesta

```
src/workers/ingest/
  index.ts            Bucle: toma trabajos de la cola y despacha
  connection.ts       Carga la conexion, descifra tokens, refresca si caducaron
  providers/
    types.ts          Interfaz CloudProvider (listar, descargar, cursor)
    google-drive.ts   Implementacion de Drive
    dropbox.ts        Implementacion de Dropbox
  scan.ts             Trabajo scan_cloud_folder:  descubre y registra
  ingest.ts           Trabajo ingest_cloud_file:  descarga y crea el asset
```

La interfaz `CloudProvider` mantiene `scan.ts` e `ingest.ts` ignorantes de si
detras hay Drive o Dropbox, igual que `CaptionProvider` hace con el generador de
textos. Añadir OneDrive mañana seria un archivo mas en `providers/`.

Despliegue: un tercer servicio en `docker-compose.yml`, misma imagen que el
panel con otro `command`. No necesita FFmpeg, asi que no carga la imagen pesada
de los workers de medios.

---

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
las mismas barreras: sin EXIF retirado no se puede programar.

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

## Preguntas antes de implementar

1. **¿Empezamos por Dropbox?** Su OAuth es mas simple, permite acotar la app a
   una carpeta y no exige revision previa. Serviria para validar toda la tuberia
   mientras corre el tramite de verificacion de Google.
2. **¿Los archivos se asignan a una modelo automaticamente?** El esquema soporta
   `default_profile_id` por conexion, pero una carpeta compartida con varias
   modelos necesitaria reglas por subcarpeta.
3. **¿Que hacemos con los duplicados detectados por checksum?** ¿Se descartan
   solos o se dejan marcados para que alguien decida?
