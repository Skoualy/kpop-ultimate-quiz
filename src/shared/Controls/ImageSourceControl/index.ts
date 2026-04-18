export { ImageSourceControl } from './ImageSourceControl'

import type { ImageCreditInput } from '@/shared/models/AssetCredit'

export function makeEmptyCreditInput(): ImageCreditInput {
  return {
    sourceType: 'wikimedia',
    originalFileName: null,
    transformReport: null,
    sourceUrl: null,
    aiModified: false,
  }
}
