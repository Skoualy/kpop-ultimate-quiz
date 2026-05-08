import { useEffect, useRef, useState } from 'react'
import styles from './AnswerInput.module.scss'

export interface AnswerInputProps {
  onSubmit: (value: string) => void
  disabled?: boolean
  /** Résultat du dernier submit — déclenche le feedback visuel. */
  lastResult?: 'correct' | 'wrong' | null
  placeholder?: string
}

const ERROR_MESSAGES = [
  'Mauvaise réponse !',
  "Malheureusement, ce n'est pas la bonne réponse !",
  'Réponse incorrecte ! Essaie encore...',
]

/** Input de réponse pour le Blind Test. Aucune logique de matching interne. */
export function AnswerInput({
  onSubmit,
  disabled = false,
  lastResult = null,
  placeholder = 'Ta réponse…',
}: AnswerInputProps) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const msgIndexRef = useRef(0)

  const [value,      setValue]      = useState('')
  const [isShaking,  setIsShaking]  = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [isSuccess,  setIsSuccess]  = useState(false)

  // Feedback visuel déclenché par lastResult
  useEffect(() => {
    if (lastResult === 'wrong') {
      const msg = ERROR_MESSAGES[msgIndexRef.current % ERROR_MESSAGES.length]
      msgIndexRef.current++
      setIsShaking(true)
      setFeedbackMsg(msg)
      setIsSuccess(false)
      const t = setTimeout(() => {
        setIsShaking(false)
        setFeedbackMsg(null)
      }, 1500)
      return () => clearTimeout(t)
    }
    if (lastResult === 'correct') {
      setIsSuccess(true)
      setFeedbackMsg(null)
      const t = setTimeout(() => setIsSuccess(false), 800)
      return () => clearTimeout(t)
    }
  }, [lastResult])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || disabled) return
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const wrapperCls = [
    styles.inputWrapper,
    isShaking ? styles.shake   : '',
    isSuccess  ? styles.success : '',
    disabled   ? styles.disabled : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.root}>
      <div className={wrapperCls}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <p className={[styles.hint, feedbackMsg ? styles.hintError : ''].filter(Boolean).join(' ')}>
        {feedbackMsg ?? 'Appuie sur Entrée pour valider'}
      </p>
    </div>
  )
}
