import type { ToggleControlProps } from './ToggleControl.types'
import styles from './ToggleControl.module.scss'

export function ToggleControl({
  checked,
  onChange,
  label,
  labelPosition = 'right',
  disabled = false,
  size = 'md',
}: ToggleControlProps) {
  const wrapperCls = [
    styles.wrapper,
    disabled ? styles.disabled : '',
  ].filter(Boolean).join(' ')

  const trackCls = [
    styles.track,
    size === 'sm' ? styles.trackSm : styles.trackMd,
    checked ? styles.checked : '',
  ].filter(Boolean).join(' ')

  const thumbCls = [
    styles.thumb,
    size === 'sm' ? styles.thumbSm : styles.thumbMd,
  ].join(' ')

  const labelEl = label ? <span className={styles.label}>{label}</span> : null

  return (
    <div
      className={wrapperCls}
      onClick={() => !disabled && onChange(!checked)}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onChange(!checked) } }}
    >
      {labelPosition === 'left' && labelEl}
      <div className={trackCls}>
        <div className={thumbCls} />
      </div>
      {labelPosition === 'right' && labelEl}
    </div>
  )
}
