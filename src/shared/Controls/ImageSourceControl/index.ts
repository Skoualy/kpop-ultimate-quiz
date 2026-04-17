export { ImageSourceControl } from './ImageSourceControl'

import type { ImageCreditInput } from '@/shared/models/AssetCredit'

/** Valeur par défaut pour un nouveau champ de crédit */
export function makeEmptyCreditInput(): ImageCreditInput {
  return {
    sourceType: 'wikimedia',
    originalFileName: null,
    transformReport: null,
  }
}
