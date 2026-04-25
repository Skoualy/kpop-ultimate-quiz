import { useEffect, useId, useRef, useState } from 'react'
import type { EntityAutoSuggestProps, EntityId } from './EntityAutoSuggest.types'
import { defaultFilterEntities, filterOutSelected } from './EntityAutoSuggest.utils'
import styles from './EntityAutoSuggest.module.scss'

/**
 * EntityAutoSuggest<T> — champ d'autosuggestion générique.
 *
 * Fonctionnalités :
 * - Recherche insensible à la casse / accents
 * - Navigation clavier (↑↓ Enter Escape Backspace)
 * - Mode multi-select avec chips (défaut) ou single-select
 * - Option de création d'une nouvelle entité (allowNewItem)
 * - Toute la ligne de suggestion est cliquable
 * - Pas de logique métier K-Pop — purement générique
 */
export function EntityAutoSuggest<T>({
  id,
  label,
  placeholder = 'Rechercher…',
  helperText,
  items,
  selectedIds,
  onChange,
  getId,
  getLabel,
  getMeta,
  getGeneratedId,
  filterItems,
  allowNewItem = false,
  newItemLabel,
  onNewItem,
  maxSuggestions = 8,
  multiple = true,
  disabled = false,
  emptyMessage = 'Aucun résultat',
  className,
}: EntityAutoSuggestProps<T>) {
  const inputId = useId()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // ── Suggestions calculées ───────────────────────────────────────────────────

  const notSelected = filterOutSelected(items, selectedIds, getId)

  const rawSuggestions = query.trim()
    ? filterItems
      ? filterItems(notSelected, query)
      : defaultFilterEntities(notSelected, query, { getId, getLabel, getMeta })
    : []

  const suggestions = rawSuggestions.slice(0, maxSuggestions)

  // Vérifier si allowNewItem doit être proposé
  const generatedId = getGeneratedId ? getGeneratedId(query) : undefined
  const exactMatch = suggestions.some((s) => getLabel(s).toLowerCase() === query.toLowerCase())
  const showNewItem = allowNewItem && !!onNewItem && query.trim() && !exactMatch

  const totalOptions = suggestions.length + (showNewItem ? 1 : 0)

  // ── Reset activeIndex quand les suggestions changent ────────────────────────

  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  // ── Sélection d'un item ─────────────────────────────────────────────────────

  function selectItem(item: T) {
    const itemId = getId(item)
    if (selectedIds.includes(itemId)) return // doublon

    const next = multiple ? [...selectedIds, itemId] : [itemId]
    onChange(next)
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  function triggerNewItem() {
    onNewItem?.(query.trim(), generatedId)
    setQuery('')
    setOpen(false)
  }

  // ── Navigation clavier ──────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && query.trim()) setOpen(true)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => (i < totalOptions - 1 ? i + 1 : i))
        break

      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => (i > 0 ? i - 1 : -1))
        break

      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          selectItem(suggestions[activeIndex])
        } else if (activeIndex === suggestions.length && showNewItem) {
          triggerNewItem()
        } else if (suggestions.length > 0) {
          // Enter sans highlight → sélectionne le premier résultat
          selectItem(suggestions[0])
        } else if (showNewItem) {
          triggerNewItem()
        }
        break

      case 'Escape':
        if (open) {
          setOpen(false)
          setActiveIndex(-1)
        } else {
          setQuery('')
        }
        break

      case 'Backspace':
        // Supprime la dernière chip si le champ est vide (multi seulement)
        if (multiple && query === '' && selectedIds.length > 0) {
          onChange(selectedIds.slice(0, -1))
        }
        break
    }
  }

  // ── Blur — délai pour laisser le mouseDown sur une suggestion s'exécuter ────

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      setActiveIndex(-1)
    }, 150)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const inputFieldId = id ?? inputId

  return (
    <div className={[styles.root, disabled ? styles.disabled : '', className ?? ''].join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={inputFieldId}>
          {label}
        </label>
      )}

      <div className={styles.inputWrapper}>
        {/* Champ de saisie */}
        <input
          ref={inputRef}
          id={inputFieldId}
          type="text"
          role="combobox"
          aria-expanded={open && totalOptions > 0}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
          aria-autocomplete="list"
          className={styles.input}
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true)
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      {/* Dropdown suggestions */}
      {open && totalOptions > 0 && (
        <ul id={listId} role="listbox" className={styles.dropdown}>
          {suggestions.map((item, idx) => {
            const itemMeta = getMeta ? getMeta(item) : undefined
            return (
              <li
                key={getId(item)}
                id={`${listId}-opt-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                className={[styles.option, idx === activeIndex ? styles.optionActive : ''].join(' ')}
                // onMouseDown évite le blur avant le click
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(item)}
              >
                <span className={styles.optionLabel}>{getLabel(item)}</span>
                {itemMeta && <span className={styles.optionMeta}>{itemMeta}</span>}
              </li>
            )
          })}

          {/* Option de création */}
          {showNewItem && (
            <li
              id={`${listId}-opt-${suggestions.length}`}
              role="option"
              aria-selected={activeIndex === suggestions.length}
              className={[
                styles.option,
                styles.optionNew,
                activeIndex === suggestions.length ? styles.optionActive : '',
              ].join(' ')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={triggerNewItem}
            >
              <span className={styles.optionLabel}>
                {newItemLabel ? newItemLabel(query.trim(), generatedId) : `+ Ajouter "${query.trim()}"`}
              </span>
              {generatedId && <span className={styles.optionMeta}>id : {generatedId}</span>}
            </li>
          )}
        </ul>
      )}

      {/* Message "aucun résultat" */}
      {open && query.trim() && totalOptions === 0 && <div className={styles.emptyMsg}>{emptyMessage}</div>}

      {helperText && <p className={styles.helperText}>{helperText}</p>}
    </div>
  )
}
