/**
 * Tipos de la base de datos.
 *
 * Escritos a mano para esta entrega y alineados con las migraciones de
 * `supabase/migrations`. En cuanto exista un proyecto Supabase real conviene
 * regenerarlos y reemplazar este archivo entero:
 *
 *   npx supabase gen types typescript --local > src/lib/database.types.ts
 *
 * Mientras tanto, cualquier cambio en una migracion tiene que reflejarse aqui:
 * es la unica pieza del proyecto que el compilador no puede verificar contra la
 * base.
 *
 * Todo lo de este archivo son ALIAS de tipo, nunca interfaces. PostgREST exige
 * que cada fila encaje en `Record<string, unknown>`, y una interfaz no obtiene
 * indice implicito: al no encajar, el esquema entero se resuelve a `never` y
 * todas las consultas pierden el tipado en silencio, sin un solo error que
 * senale la causa.
 */

export type UserRole = 'admin' | 'studio' | 'model' | 'editor';
export type OrgType = 'studio' | 'independent';
export type MediaType = 'image' | 'video';
export type AssetStatus = 'raw' | 'edited' | 'scheduled' | 'published' | 'archived';
export type Platform = 'telegram' | 'x' | 'reddit' | 'bluesky' | 'webhook';
export type CredentialType = 'oauth' | 'api_key';
export type ScheduleStatus = 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled';
export type JobType = 'sanitize_exif' | 'watermark' | 'transcode' | 'generate_teaser' | 'publish';
export type JobStatus = 'pending' | 'claimed' | 'done' | 'failed' | 'dead';
export type ComplianceStatus = 'pending' | 'verified' | 'expired' | 'rejected';
export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'disputed';

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  created_at: string;
}

export type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export type ProfileRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  display_name: string;
  handle: string;
  rev_share_percentage: number;
  r2_folder_path: string;
  created_at: string;
}

export type ComplianceRecordRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  status: ComplianceStatus;
  id_document_r2_key: string | null;
  model_release_r2_key: string | null;
  date_of_birth: string | null;
  verified_at: string | null;
  expires_at: string | null;
  verified_by: string | null;
  custodian_name: string | null;
  custodian_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MediaAssetRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  r2_key: string;
  file_type: MediaType;
  mime_type: string;
  bytes: number;
  checksum_sha256: string | null;
  sanitized: boolean;
  watermarked: boolean;
  outfit_tag: string | null;
  session_date: string | null;
  status: AssetStatus;
  derivatives: Record<string, string>;
  created_at: string;
  last_published_at: string | null;
}

export type UploadLinkEventRow = {
  id: string;
  upload_link_id: string;
  r2_key: string;
  bytes: number | null;
  mime_type: string | null;
  ip: string | null;
  occurred_at: string;
};

export type UploadLinkRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  token_hash: string;
  label: string | null;
  expires_at: string;
  max_files: number;
  max_bytes_per_file: number;
  allowed_mime: string[];
  uses_count: number;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export type ScheduleRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  asset_id: string;
  platform: Platform;
  scheduled_at: string;
  status: ScheduleStatus;
  published: boolean;
  published_at: string | null;
  caption_text: string;
  outfit_tag: string | null;
  tracking_link_id: string | null;
  attempts: number;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
}

export type SchedulingRulesRow = {
  organization_id: string;
  asset_cooldown_days: number;
  outfit_cooldown_days: number;
  min_gap_minutes: number;
  max_posts_per_day: number;
  updated_at: string;
}

export type TrackingLinkRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  asset_id: string | null;
  slug: string;
  destination_url: string;
  campaign: string | null;
  network: Platform | null;
  clicks_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export type LinkClickRow = {
  id: number;
  tracking_link_id: string;
  occurred_at: string;
  country: string | null;
  referrer: string | null;
  ua_family: string | null;
  network: Platform | null;
}

export type FinancialRecordRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  agency_fee: number;
  net_amount: number;
  currency: string;
  payout_status: PayoutStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export type JobRow = {
  id: string;
  organization_id: string;
  job_type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  run_after: string;
  claimed_at: string | null;
  claimed_by: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export type PlatformCredentialRow = {
  id: string;
  organization_id: string;
  profile_id: string | null;
  platform: Platform;
  credential_type: CredentialType;
  label: string;
  account_identifier: string | null;
  secret_ciphertext: string;
  refresh_ciphertext: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  settings: Record<string, unknown>;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
}

/**
 * Forma que consume `@supabase/supabase-js` para tipar consultas.
 *
 * Tiene que ser un alias de tipo, no una interfaz: PostgREST exige
 * `Record<string, GenericTable>`, y una interfaz no obtiene indice implicito,
 * asi que no encaja y todas las consultas degradan silenciosamente a `never`.
 */
export type Database = {
  public: {
    Tables: {
      organizations: { Row: OrganizationRow; Insert: Partial<OrganizationRow>; Update: Partial<OrganizationRow>; Relationships: [] };
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow>; Relationships: [] };
      memberships: { Row: MembershipRow; Insert: Partial<MembershipRow>; Update: Partial<MembershipRow>; Relationships: [] };
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow>; Relationships: [] };
      compliance_records: { Row: ComplianceRecordRow; Insert: Partial<ComplianceRecordRow>; Update: Partial<ComplianceRecordRow>; Relationships: [] };
      media_assets: { Row: MediaAssetRow; Insert: Partial<MediaAssetRow>; Update: Partial<MediaAssetRow>; Relationships: [] };
      upload_link_events: { Row: UploadLinkEventRow; Insert: Partial<UploadLinkEventRow>; Update: Partial<UploadLinkEventRow>; Relationships: [] };
      upload_links: { Row: UploadLinkRow; Insert: Partial<UploadLinkRow>; Update: Partial<UploadLinkRow>; Relationships: [] };
      schedules: { Row: ScheduleRow; Insert: Partial<ScheduleRow>; Update: Partial<ScheduleRow>; Relationships: [] };
      scheduling_rules: { Row: SchedulingRulesRow; Insert: Partial<SchedulingRulesRow>; Update: Partial<SchedulingRulesRow>; Relationships: [] };
      tracking_links: { Row: TrackingLinkRow; Insert: Partial<TrackingLinkRow>; Update: Partial<TrackingLinkRow>; Relationships: [] };
      link_clicks: { Row: LinkClickRow; Insert: Partial<LinkClickRow>; Update: Partial<LinkClickRow>; Relationships: [] };
      financial_records: { Row: FinancialRecordRow; Insert: Partial<FinancialRecordRow>; Update: Partial<FinancialRecordRow>; Relationships: [] };
      jobs: { Row: JobRow; Insert: Partial<JobRow>; Update: Partial<JobRow>; Relationships: [] };
      platform_credentials: { Row: PlatformCredentialRow; Insert: Partial<PlatformCredentialRow>; Update: Partial<PlatformCredentialRow>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      resolve_tracking_link: {
        Args: { p_slug: string };
        Returns: { destination_url: string }[];
      };
      record_link_click: {
        Args: {
          p_slug: string;
          p_country?: string | null;
          p_referrer?: string | null;
          p_ua_family?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
