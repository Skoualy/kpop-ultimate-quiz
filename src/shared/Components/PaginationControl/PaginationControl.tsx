import { ButtonControl } from '@/shared/Controls/ButtonControl'
import type { PaginationControlProps } from './PaginationControl.types'
import styles from './PaginationControl.module.scss'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function PaginationControl({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [6, 12, 24, 48],
  onPageChange,
  onPageSizeChange,
  className = '',
}: PaginationControlProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = clamp(currentPage, 1, totalPages)
  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <div className={styles.meta}>
        <label className={styles.pageSizeGroup}>
          <span>Par page</span>
          <select
            className={['select', styles.pageSizeSelect].join(' ')}
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <span className={styles.pageInfo}>
          Page {safePage} / {totalPages}
        </span>
      </div>

      <div className={styles.actions}>
        <ButtonControl
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
        >
          ← Précédente
        </ButtonControl>

        <ButtonControl
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
        >
          Suivante →
        </ButtonControl>
      </div>
    </div>
  )
}
