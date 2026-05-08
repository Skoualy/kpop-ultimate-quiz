import { useEffect, useRef, useState } from 'react'
import styles from './AnswerInput.module.scss'

const ERROR_MESSAGES = [
  'Mauvaise réponse !',
  "Malheureusement, ce n'est pas la bonne réponse !",
  'Réponse incorrecte ! Essaie encore...',
]

export interface AnswerInputProps {
  onSubmit: (value: string) => void
  disabled?: boolean
  lastResult?: 'correct' | 'wrong' | null
  placeholder?: string
}

export function AnswerInput({ onSubmit, disabled = false, lastResult, placeholder }: AnswerInputProps) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const msgIndexRef = useRef(0) // cycles through error messages

  // React to lastResult changes driven by the parent
  useEffect(() => {
    if (!lastResult) return

    if (lastResult === 'wrong') {
      const msg = ERROR_MESSAGES[msgIndexRef.current % ERROR_MESSAGES.length]
      msgIndexRef.current++
      setErrorMsg(msg)
      setFeedback('wrong')
      const id = setTimeout(() => setFeedback(null), 1500)
      return () => clearTimeout(id)
    }

    if (lastResult === 'correct') {
      setFeedback('correct')
      const id = setTimeout(() => setFeedback(null), 800)
      return () => clearTimeout(id)
    }
  }, [lastResult])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const trimmed = value.trim()
    setValue('')
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    // Keep focus after clearing
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const wrapClass = [
    styles.wrap,
    feedback === 'correct' ? styles.success : '',
    feedback === 'wrong' ? styles.error : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.root}>
      <div className={wrapClass}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? 'Artiste ou titre… puis Entrée'}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
      </div>
      {feedback === 'wrong' && <p className={styles.errorMsg}>{errorMsg}</p>}
    </div>
  )
}
