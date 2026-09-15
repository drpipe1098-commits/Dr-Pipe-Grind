-- =============================================================================
-- Pruebas de los conectores de nube
-- =============================================================================
-- `cloud_connections` guarda refresh tokens que dan acceso continuado al Drive
-- completo de una persona. Es la tabla mas sensible del esquema y se prueba como
-- tal: lo que importa no es quien puede leerla sino quien NO.

\set QUIET on
\set ON_ERROR_STOP on
\set studio_a '00000000-0000-0000-0000-00000000a002'
\set editor_a '00000000-0000-0000-0000-00000000a003'
\set model_a1 '00000000-0000-0000-0000-00000000a004'
\set studio_b '00000000-0000-0000-0000-00000000b001'

\echo '== L. Conectores de nube: acceso a los tokens =='

reset role;
insert into public.cloud_connections
  (id, organization_id, provider, account_email, label,
   access_ciphertext, refresh_ciphertext, token_expires_at, root_folder_id, default_profile_id)
values
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000aa',
   'google_drive', 'alfa@gmail.com', 'Drive de Agencia Alfa',
   'v1.aaa.bbb.ccc', 'v1.ddd.eee.fff', now() + interval '1 hour',
   'carpeta-alfa', '00000000-0000-0000-0000-000000000f01'),
  ('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-0000000000bb',
   'dropbox', 'beta@gmail.com', 'Dropbox de Agencia Beta',
   'v1.ggg.hhh.iii', 'v1.jjj.kkk.lll', now() + interval '1 hour',
   'carpeta-beta', '00000000-0000-0000-0000-000000000f03');

insert into public.cloud_ingest_items
  (connection_id, organization_id, remote_file_id, remote_name, remote_mime_type, remote_size_bytes)
values
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000aa',
   'drive-file-001', 'sesion-2023-03-14.mp4', 'video/mp4', 840000000),
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000aa',
   'drive-file-002', 'IMG_0042.jpg', 'image/jpeg', 3200000),
  ('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-0000000000bb',
   'dropbox-file-001', 'set-antiguo.jpg', 'image/jpeg', 2100000);

select set_config('request.jwt.claims', json_build_object('sub', :'studio_a')::text, false);
set role authenticated;

select tests.assert_count('select * from public.cloud_connections', 1,
  'el studio ve solo la conexion de su propia agencia');
select tests.assert_count('select * from public.cloud_ingest_items', 2,
  'el studio ve solo los archivos descubiertos en su agencia');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'studio_b')::text, false);
set role authenticated;

select tests.assert_count(
  'select * from public.cloud_connections where organization_id = ''00000000-0000-0000-0000-0000000000aa''', 0,
  'el studio de Beta NO ve la conexion de Alfa ni sus refresh tokens');
select tests.assert_count('select * from public.cloud_ingest_items', 1,
  'el studio de Beta solo ve sus propios archivos descubiertos');
select tests.assert_rejected(
  'insert into public.cloud_connections
     (organization_id, provider, label, access_ciphertext, refresh_ciphertext, token_expires_at)
   values (''00000000-0000-0000-0000-0000000000aa'', ''dropbox'', ''intrusa'',
           ''x'', ''y'', now() + interval ''1 hour'')',
  'el studio de Beta NO puede conectar una nube dentro de Alfa');

\echo '== M. El editor y la modelo no tocan las llaves =='

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'editor_a')::text, false);
set role authenticated;

select tests.assert_count('select * from public.cloud_connections', 0,
  'el editor NO ve las conexiones de nube: necesita material, no llaves');
select tests.assert_count('select * from public.cloud_ingest_items', 2,
  'el editor SI ve el inventario de archivos: es quien cura que se ingiere');
select tests.assert_affects(
  'update public.cloud_ingest_items set status = ''skipped'', skip_reason = ''duplicado''
     where remote_file_id = ''drive-file-002''', 1,
  'el editor SI puede descartar un archivo');
select tests.assert_rejected(
  'insert into public.cloud_ingest_items
     (connection_id, organization_id, remote_file_id, remote_name)
   values (''00000000-0000-0000-0000-000000000d01'', ''00000000-0000-0000-0000-0000000000aa'',
           ''inventado-001'', ''inventado.jpg'')',
  'nadie puede inventar archivos remotos: solo los crea el worker de escaneo');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'model_a1')::text, false);
set role authenticated;

select tests.assert_count('select * from public.cloud_connections', 0,
  'una modelo NO ve las conexiones de nube de su agencia');

\echo '== N. Deduplicacion del escaneo =='

reset role;
-- Sin esta restriccion, cada pasada del escaneo volveria a descargar los mismos
-- gigabytes y crearia assets duplicados en el vault.
select tests.assert_rejected(
  'insert into public.cloud_ingest_items
     (connection_id, organization_id, remote_file_id, remote_name)
   values (''00000000-0000-0000-0000-000000000d01'', ''00000000-0000-0000-0000-0000000000aa'',
           ''drive-file-001'', ''sesion-2023-03-14.mp4'')',
  'el mismo archivo remoto no se registra dos veces en la misma conexion');

select tests.assert_rejected(
  'insert into public.cloud_connections
     (organization_id, provider, account_email, label,
      access_ciphertext, refresh_ciphertext, token_expires_at)
   values (''00000000-0000-0000-0000-0000000000aa'', ''google_drive'', ''alfa@gmail.com'',
           ''Duplicada'', ''x'', ''y'', now() + interval ''1 hour'')',
  'una misma cuenta remota no se conecta dos veces a la misma organizacion');

select tests.assert(
  (select default_profile_id is not null from public.cloud_connections
    where id = '00000000-0000-0000-0000-000000000d01'),
  'la conexion apunta al perfil destino por defecto');

\echo ''
\echo 'Conectores: todas las aserciones pasaron.'
