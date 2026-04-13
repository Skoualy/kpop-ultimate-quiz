export interface DraftBundleControlProps {
  onFileSelect: (file: File) => void | Promise<void>
  className?: string
}
