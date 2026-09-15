/**
 * Lectura de variables de entorno con validacion temprana.
 *
 * La alternativa —leer `process.env.X!` donde haga falta— convierte una variable
 * mal escrita en un `undefined` que viaja hasta el SDK de AWS y estalla en
 * tiempo de peticion con un mensaje que no menciona la causa. Aqui falla al
 * arrancar y dice exactamente que falta.
 */
import { z } from 'zod';

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ENDPOINT: z.string().url(),
  R2_REGION: z.string().default('auto'),
  UPLOAD_LINK_SECRET: z.string().min(32),
  UPLOAD_PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(300),
  UPLOAD_MAX_BYTES_PER_FILE: z.coerce.number().int().positive().default(2_147_483_648),
  UPLOAD_MAX_FILES_PER_LINK: z.coerce.number().int().positive().default(50),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

let cachedServerEnv: ServerEnv | null = null;

/**
 * Solo debe llamarse desde codigo de servidor. Incluye la clave de servicio, que
 * omite el RLS: si alguna vez acaba en un bundle de cliente, todo el aislamiento
 * multi-tenant queda anulado.
 */
export function serverEnv(): ServerEnv {
  if (cachedServerEnv !== null) return cachedServerEnv;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Variables de entorno de servidor invalidas o ausentes: ${missing}. ` +
        'Revisa .env.example y copia los valores a .env.local.',
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function publicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.example.',
    );
  }

  return parsed.data;
}
