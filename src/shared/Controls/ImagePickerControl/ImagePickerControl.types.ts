export interface ImagePickerControlProps {
  value: string
  placeholderImage?: string
  onChange: (value: string) => void
  onFileChange?: (file: File | null) => void
  label?: string
  hint?: string
  aspectRatio?: string
  disabled?: boolean
  outputWidth?: number
  outputHeight?: number
}
