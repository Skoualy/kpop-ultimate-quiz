// ─── GroupInfoStep ────────────────────────────────────────────────────────────
// Étape 1 du formulaire contributor : informations générales du groupe.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useRef } from 'react';
import type { GroupCategory, GroupStatus, Generation } from '../../types';
import type { Group, Label } from '../../types';
import { ImagePicker } from '../ImagePicker';
import { ContributorStep } from './ContributorStep';
import { CATEGORY_OPTIONS, GENERATION_OPTIONS, guessGeneration, isSoloistCategory } from '../../constants/mappings';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroupForm {
  id: string;
  name: string;
  category: GroupCategory;
  parentGroupId: string;
  generation: Generation | '';
  debutYear: string;
  status: GroupStatus;
  company: string;
  coverImage: string;
  fandomName: string;
  fandomUrl: string;
  notes: string;
}

export function emptyGroupForm(): GroupForm {
  return {
    id: '',
    name: '',
    category: 'girlGroup',
    parentGroupId: '',
    generation: '',
    debutYear: '',
    status: 'active',
    company: '',
    coverImage: '',
    fandomName: '',
    fandomUrl: '',
    notes: '',
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateGroupInfo(form: GroupForm, existingGroups: Group[], isEdit: boolean): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) {
    errors.push('Le nom du groupe est requis');
  } else if (!isEdit && existingGroups.some((g) => g.id === form.id)) {
    errors.push(`Un groupe avec l'ID "${form.id}" existe déjà — choisis un autre nom`);
  }
  const year = parseInt(form.debutYear);
  if (!form.debutYear || isNaN(year) || year < 1990 || year > new Date().getFullYear()) {
    errors.push("L'année de début est requise (ex: 2015)");
  }
  if (!form.generation) errors.push('La génération est requise');
  if (!form.company.trim()) errors.push('Le label / agence est requis');
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GroupInfoStepProps {
  form: GroupForm;
  setForm: React.Dispatch<React.SetStateAction<GroupForm>>;
  topLevelGroups: Group[];
  existingGroups: Group[];
  labels: Label[];
  isEdit: boolean;
  errors?: string[];
}

export function GroupInfoStep({ form, setForm, topLevelGroups, existingGroups, labels, isEdit, errors }: GroupInfoStepProps) {
  const upd = (k: keyof GroupForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ─── Génération auto depuis l'année ───────────────────────────────────────────
  const [genManual, setGenManual] = useState(isEdit);

  useEffect(() => {
    if (genManual) return;
    const year = parseInt(form.debutYear);
    if (!isNaN(year) && year > 1990) {
      upd('generation', guessGeneration(year));
    }
  }, [form.debutYear, genManual]);

  // ─── Collision ID en temps réel ───────────────────────────────────────────────
  const idCollision = !isEdit && form.id.length > 0 && existingGroups.some((g) => g.id === form.id);

  // ─── Label autocomplete ───────────────────────────────────────────────────────
  const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  const labelSuggestions = useMemo(() => {
    if (!form.company || form.company.length < 1) return [];
    return labels.filter((l) => l.name.toLowerCase().includes(form.company.toLowerCase())).slice(0, 6);
  }, [form.company, labels]);

  const isNewLabel = form.company.length > 0 && !labels.find((l) => l.name.toLowerCase() === form.company.toLowerCase());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setShowLabelSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSoloist = isSoloistCategory(form.category);

  return (
    <ContributorStep errors={errors}>
      <div className="card">
        <div className="card__title" style={{ fontSize: 18, marginBottom: 20 }}>
          Informations générales
        </div>

        {/* ── Ligne 1 : Nom du groupe + Statut ── */}
        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <div className="form-field">
            <label className="form-label">
              Nom du groupe <span>*</span>
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                background: 'var(--bg-input)',
                border: `1px solid ${idCollision ? 'rgba(239,68,68,0.6)' : 'var(--border-strong)'}`,
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
              onFocusCapture={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = idCollision
                  ? 'rgba(239,68,68,0.8)'
                  : 'var(--accent-purple)')
              }
              onBlurCapture={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = idCollision
                  ? 'rgba(239,68,68,0.6)'
                  : 'var(--border-strong)')
              }
            >
              <input
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  minWidth: 0,
                }}
                value={form.name}
                onChange={(e) => upd('name', e.target.value)}
                placeholder="Ex: TWICE"
              />
              {form.id && (
                <span
                  style={{
                    padding: '10px 12px',
                    fontSize: 11,
                    color: idCollision ? '#f87171' : 'var(--text-muted)',
                    fontFamily: 'DM Mono, monospace',
                    background: 'var(--bg-surface)',
                    borderLeft: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {idCollision && '⚠'}
                  ID généré : {form.id}
                </span>
              )}
            </div>
            {idCollision && (
              <span style={{ fontSize: 11, color: '#f87171', marginTop: 3 }}>Cet ID existe déjà — choisis un autre nom</span>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">
              Statut <span>*</span>
            </label>
            <select className="select" value={form.status} onChange={(e) => upd('status', e.target.value)}>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </div>

        {/* ── Ligne 2 : Catégorie + Sub-unit ── */}
        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <div className="form-field">
            <label className="form-label">
              Catégorie <span>*</span>
            </label>
            <select className="select" value={form.category} onChange={(e) => upd('category', e.target.value as GroupCategory)}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label" style={{ opacity: isSoloist ? 0.45 : 1 }}>
              Sub-unit de
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                — laisser vide si groupe indépendant
              </span>
            </label>
            <select
              className="select"
              value={isSoloist ? '' : form.parentGroupId}
              disabled={isSoloist}
              onChange={(e) => upd('parentGroupId', e.target.value)}
              style={{
                opacity: isSoloist ? 0.4 : 1,
                cursor: isSoloist ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">— Aucun (groupe indépendant)</option>
              {[...topLevelGroups]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
            {!isSoloist && form.parentGroupId && (
              <span style={{ fontSize: 11, color: 'var(--accent-teal)', marginTop: 4, display: 'block' }}>
                ✦ Catégorie forcée depuis le groupe parent
              </span>
            )}
          </div>
        </div>

        {/* ── Ligne 3 : Année de début + Génération ── */}
        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <div className="form-field">
            <label className="form-label">
              Année de début <span>*</span>
            </label>
            <input
              className="input"
              type="number"
              min={1990}
              max={new Date().getFullYear()}
              value={form.debutYear}
              onChange={(e) => upd('debutYear', e.target.value)}
              placeholder="Ex: 2015"
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Génération <span>*</span>
              {!genManual && form.generation && (
                <span style={{ color: 'var(--accent-teal)', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>✦ auto</span>
              )}
            </label>
            <select
              className="select"
              value={form.generation}
              onChange={(e) => {
                setGenManual(true);
                upd('generation', e.target.value);
              }}
            >
              <option value="">— Sélectionner</option>
              {GENERATION_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  Gen {g.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Ligne 4 : Label / Agence + Fandom ── */}
        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          {/* Label avec autocomplete */}
          <div className="form-field" style={{ position: 'relative' }} ref={labelRef}>
            <label className="form-label">
              Label / Agence <span>*</span>
            </label>
            <input
              className="input"
              value={form.company}
              onChange={(e) => {
                upd('company', e.target.value);
                setShowLabelSuggestions(true);
              }}
              onFocus={() => setShowLabelSuggestions(true)}
              placeholder="Ex: JYP Entertainment"
              autoComplete="off"
            />
            {showLabelSuggestions && labelSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: 2,
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {labelSuggestions.map((l) => (
                  <button
                    key={l.id}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    onMouseDown={() => {
                      upd('company', l.name);
                      setShowLabelSuggestions(false);
                    }}
                  >
                    {l.name}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>{l.country.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
            {isNewLabel && form.company && (
              <span style={{ fontSize: 11, color: '#fbbf24', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                ✦ Nouveau label — sera ajouté automatiquement à la soumission
              </span>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">Nom de la fandom</label>
            <input
              className="input"
              value={form.fandomName}
              onChange={(e) => upd('fandomName', e.target.value)}
              placeholder="Ex: ONCE"
            />
          </div>
        </div>

        {/* ── Ligne 5 : Cover (1/3) + Notes (2/3) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 16, alignItems: 'start' }}>
          <ImagePicker
            value={form.coverImage}
            onChange={(v) => upd('coverImage', v)}
            label="Cover du groupe"
            aspectRatio="1/1"
            hint="600×600 px · webp"
            emptyIcon="🎵"
          />

          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea
              className="input"
              value={form.notes}
              onChange={(e) => upd('notes', e.target.value)}
              placeholder="Informations complémentaires, contexte, sources…"
              style={{
                resize: 'none',
                height: 180,
                lineHeight: 1.5,
              }}
            />
          </div>
        </div>
      </div>
    </ContributorStep>
  );
}
