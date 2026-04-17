// ─── Source types ─────────────────────────────────────────────────────────────

/** Type de source d'une image. 'wikimedia' est la source préférée. */
export type ImageSourceType = 'wikimedia' | 'official' | 'unknown'

// ─── Transform report ─────────────────────────────────────────────────────────

/**
 * Rapport de transformation produit automatiquement par `ImagePickerControl`
 * lors de chaque upload/crop. Transmis dans le bundle contributor.
 */
export interface ImageTransformReport {
  /** Nom du fichier original tel que sélectionné par le contributeur */
  originalFileName: string
  /** Type MIME du fichier original (ex: 'image/jpeg') */
  originalMimeType: string
  /** Largeur de l'image originale en pixels */
  originalWidth: number | null
  /** Hauteur de l'image originale en pixels */
  originalHeight: number | null
  /** Type MIME final après traitement (toujours 'image/webp') */
  finalMimeType: string
  /** Largeur finale après crop/resize */
  finalWidth: number
  /** Hauteur finale après crop/resize */
  finalHeight: number
  /** true si l'image a été recadrée par le modal crop */
  wasCropped: boolean
  /** true si les dimensions finales diffèrent des originales */
  wasResized: boolean
  /** true si le format a changé (non-webp → webp) */
  wasConvertedToWebp: boolean
}

// ─── Contributor credit input ─────────────────────────────────────────────────

/**
 * Informations déclarées par le contributeur au moment de l'upload.
 * Saisies via `ImageSourceControl`, incluses dans le bundle.
 */
export interface ImageCreditInput {
  sourceType: ImageSourceType
  /**
   * Nom de fichier Commons original (ex: "File:Jihyo_2019_Fancy_showcase.jpg").
   * Obligatoire si sourceType = 'wikimedia'. Doit rester inchangé.
   */
  originalFileName: string | null
  /** Transformations appliquées à l'image */
  transformReport: ImageTransformReport | null
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

/**
 * Entrée complète dans `dataset/credits.json`.
 * Produite par le script Python de merge à partir du bundle contributor.
 */
export interface AssetCredit {
  /** Identifiant unique : '{entityType}/{entityId}/{assetType}' */
  id: string
  entityType: 'idol' | 'group'
  entityId: string
  assetType: 'portrait' | 'cover'

  sourceType: ImageSourceType

  /** Nom de fichier Commons original (conservé intact) */
  originalFileName: string | null
  /** Titre canonique Commons (ex: "File:Jihyo_2019_Fancy_showcase.jpg") */
  commonsTitle?: string | null
  /** URL de la page Commons de l'image */
  sourceUrl?: string | null
  /** URL directe vers le fichier image Commons */
  fileUrl?: string | null
  /** Auteur de l'image (ex: "JYP Entertainment / Naver") */
  author?: string | null
  /** Licence SPDX (ex: "CC BY-SA 4.0") */
  license?: string | null
  /** URL de la licence */
  licenseUrl?: string | null

  /** true si l'image a subi des transformations (crop, resize, conversion) */
  modified: boolean
  /** Description des modifications appliquées */
  modifications: string[]

  originalImage?: {
    format: string | null
    width: number | null
    height: number | null
  } | null

  finalImage?: {
    format: string | null
    width: number | null
    height: number | null
  } | null

  /**
   * Texte d'attribution prêt à afficher.
   * Ex: "© Jihyo_2019.jpg / JYP Entertainment (CC BY-SA 4.0)"
   */
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
