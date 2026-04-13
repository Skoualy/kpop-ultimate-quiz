import { useRef } from 'react'
import type { DraftBundleControlProps } from './DraftBundleControl.types'
import styles from './DraftBundleControl.module.scss'

export function DraftBundleControl({ onFileSelect, className = '' }: DraftBundleControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <input
        ref={inputRef}
        className={styles.input}
        type="file"
        accept="application/json,.zip,application/zip"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          void onFileSelect(file)
          event.target.value = ''
        }}
      />
      <button className="btn btn--secondary btn--sm" onClick={() => inputRef.current?.click()}>
        📥 Charger un brouillon
      </button>
    </div>
  )
}
