export interface ImagePickerControlProps {
  value:          string
  onChange:       (value: string) => void
  onFileChange?:  (file: File | null) => void
  label?:         string
  hint?:          string
  aspectRatio?:   string
  emptyIcon?:     string
  disabled?:      boolean
  outputWidth?:   number
  outputHeight?:  number
}
