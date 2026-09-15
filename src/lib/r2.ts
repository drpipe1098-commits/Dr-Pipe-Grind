import 'server-only';

import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { serverEnv } from '@/lib/env';

/**
 * Acceso a Cloudflare R2 por su API compatible con S3.
 *
 * R2 no cobra egreso, que es lo que hace viable servir video pesado. La region
 * es siempre 'auto': R2 la ignora, pero el SDK de AWS exige un valor.
 */
let cachedClient: S3Client | null = null;

export function r2Client(): S3Client {
  if (cachedClient !== null) return cachedClient;

  const env = serverEnv();
  cachedClient = new S3Client({
    region: env.R2_REGION,
    endpoint: env.R2_ENDPOINT,
    // R2 y MinIO necesitan rutas del tipo endpoint/bucket/key.
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

/**
 * Deja el nombre de archivo en algo seguro para una clave de objeto.
 *
 * Quita rutas, acentos y todo lo que no sea alfanumerico. Un nombre como
 * "../../otra-modelo/foto.jpg" no debe poder escribir fuera de su carpeta.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'archivo';
  const normalized = base.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return cleaned.slice(0, 120) || 'archivo';
}

/**
 * Clave de destino de una subida. El UUID delante evita colisiones entre dos
 * telefonos que suban "IMG_0001.jpg" el mismo dia, y el prefijo `inbox/` marca
 * que el archivo aun no esta sanitizado.
 */
export function buildInboxKey(profileFolder: string, filename: string): string {
  const folder = profileFolder.replace(/^\/+|\/+$/g, '');
  return `${folder}/inbox/${randomUUID()}-${sanitizeFilename(filename)}`;
}

export interface PresignUploadInput {
  key: string;
  contentType: string;
  /**
   * Tamano exacto del archivo. Se firma dentro de la URL: si el cliente envia
   * un byte de mas o de menos, R2 rechaza la peticion. Es lo que convierte el
   * limite de peso en una barrera real y no en una comprobacion que el cliente
   * puede saltarse.
   */
  contentLength: number;
  ttlSeconds?: number;
}

export async function presignUpload(input: PresignUploadInput): Promise<string> {
  const env = serverEnv();
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });

  return getSignedUrl(r2Client(), command, {
    expiresIn: input.ttlSeconds ?? env.UPLOAD_PRESIGN_TTL_SECONDS,
  });
}

/**
 * URL de lectura temporal. La usan los paneles para mostrar material que no es
 * publico: originales sin marca de agua y, sobre todo, los documentos del
 * expediente 2257, que nunca deben quedar accesibles por URL permanente.
 */
export async function presignDownload(key: string, ttlSeconds = 120): Promise<string> {
  const env = serverEnv();
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key });
  return getSignedUrl(r2Client(), command, { expiresIn: ttlSeconds });
}
