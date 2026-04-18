// ─── Source types ─────────────────────────────────────────────────────────────

export type ImageSourceType = 'wikimedia' | 'official' | 'unknown'

// ─── Transform report ─────────────────────────────────────────────────────────

export interface ImageTransformReport {
  originalFileName: string
  originalMimeType: string
  originalWidth: number | null
  originalHeight: number | null
  finalMimeType: string
  finalWidth: number
  finalHeight: number
  wasCropped: boolean
  wasResized: boolean
  wasConvertedToWebp: boolean
}

// ─── Contributor credit input ─────────────────────────────────────────────────

export interface ImageCreditInput {
  sourceType: ImageSourceType
  originalFileName: string | null
  transformReport: ImageTransformReport | null
  sourceUrl?: string | null
  /** true si l'image a été générée ou retouchée par IA avant upload */
  aiModified: boolean
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type AssetCreditStatus =
  | 'ok'
  | 'missing_source_type'
  | 'missing_original_filename'
  | 'lookup_failed'
  | 'missing_author'
  | 'missing_license'
  | 'missing_license_url'
  | 'missing_source_url'
  | 'unsupported_source_type'
  | 'manual_review_required'

export interface AssetCreditValidation {
  isValid: boolean
  status: AssetCreditStatus
  errors: string[]
  warnings: string[]
}

// ─── Final credit entry ───────────────────────────────────────────────────────

export interface AssetCredit {
  id: string
  entityType: 'idol' | 'group'
  entityId: string
  assetType: 'portrait' | 'cover'

  sourceType: ImageSourceType

  originalFileName: string | null
  commonsTitle?: string | null
  sourceUrl?: string | null
  fileUrl?: string | null
  author?: string | null
  license?: string | null
  licenseUrl?: string | null

  /** true si l'image a subi des transformations techniques (crop, resize, conversion) */
  modified: boolean
  /** Description des transformations techniques appliquées */
  modifications: string[]

  /** true si l'image a été générée ou retouchée par IA avant upload */
  aiModified: boolean

  originalImage?: { format: string | null; width: number | null; height: number | null } | null
  finalImage?: { format: string | null; width: number | null; height: number | null } | null

  attribution: string | null
  validation: AssetCreditValidation
}

// ─── credits.json root ────────────────────────────────────────────────────────

export interface CreditsDataset {
  meta: {
    schemaVersion: number
    lastUpdated: string
  }
  credits: AssetCredit[]
}
