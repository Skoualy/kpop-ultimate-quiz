// ─── MembersStep ──────────────────────────────────────────────────────────────
// Étape 2 du formulaire contributor : gestion des membres du groupe.
// ─────────────────────────────────────────────────────────────────────────────

import type { EditableMemberRow, MemberStatus, MemberRole, NationalityCode, Idol } from '../../types';
import { ALL_ROLES, ROLE_LABELS, NATIONALITY_OPTIONS } from '../../constants/mappings';
import { ContributorStep } from './ContributorStep';

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateMembers(members: EditableMemberRow[]): string[] {
  const errors: string[] = [];
  const current = members.filter((m) => m.membership.status === 'current');
  if (current.length === 0) errors.push('Au moins un membre actuel est requis');
  for (const m of members) {
    if (!m.idol.name.trim()) {
      errors.push("Un membre n'a pas de nom de scène");
      break;
    }
  }
  for (const m of members) {
    if (m.membership.roles.length === 0) {
      errors.push(`${m.idol.name.trim() || 'Un membre'} doit avoir au moins un rôle`);
    }
  }
  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function emptyMemberRow(status: MemberStatus = 'current'): EditableMemberRow {
  return {
    _uiKey: Math.random().toString(36).slice(2),
    idol: { name: '', nationality: 'kr', portrait: null, fandomUrl: null, notes: null },
    membership: { status, roles: [] },
    idolResolution: { mode: 'new', selectedExistingId: null, resolvedId: null },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MembersStepProps {
  members: EditableMemberRow[];
  setMembers: React.Dispatch<React.SetStateAction<EditableMemberRow[]>>;
  getIdolMatches: (name: string) => Idol[];
  idols: Idol[];
  errors?: string[];
}

export function MembersStep({
  members,
  setMembers,
  getIdolMatches,
  idols,
  errors,
}: MembersStepProps) {
  const currentMembers = members.filter((m) => m.membership.status === 'current');
  const formerMembers = members.filter((m) => m.membership.status === 'former');

  const updateMember = (key: string, updater: (m: EditableMemberRow) => EditableMemberRow) => {
    setMembers((prev) => prev.map((m) => (m._uiKey === key ? updater(m) : m)));
  };

  const removeMember = (key: string) => {
    setMembers((prev) => prev.filter((m) => m._uiKey !== key));
  };

  return (
    <ContributorStep errors={errors}>
      <div className="member-section">
        <div className="member-section__title">Membres actuels</div>
        <div className="member-section__hint">
          Portrait recommandé — 400 × 533 px (ratio 3:4). JPG de bonne qualité. Recadrage automatique centré sur le visage.
        </div>

        {currentMembers.map((m) => (
          <MemberRowEditor
            key={m._uiKey}
            member={m}
            onUpdate={(updater) => updateMember(m._uiKey, updater)}
            onRemove={() => removeMember(m._uiKey)}
            getIdolMatches={getIdolMatches}
            idols={idols}
          />
        ))}

        <button
          className="btn btn--secondary btn--sm"
          onClick={() => setMembers((prev) => [...prev, emptyMemberRow('current')])}
        >
          + Ajouter un membre
        </button>
      </div>

      <div className="member-section" style={{ marginTop: 16 }}>
        <div className="member-section__title">
          Anciens membres{' '}
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span>
        </div>

        {formerMembers.map((m) => (
          <MemberRowEditor
            key={m._uiKey}
            member={m}
            onUpdate={(updater) => updateMember(m._uiKey, updater)}
            onRemove={() => removeMember(m._uiKey)}
            getIdolMatches={getIdolMatches}
            idols={idols}
          />
        ))}

        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setMembers((prev) => [...prev, emptyMemberRow('former')])}
        >
          + Ajouter un ancien membre
        </button>
      </div>
    </ContributorStep>
  );
}

// ─── MemberRowEditor ──────────────────────────────────────────────────────────

interface MemberRowEditorProps {
  member: EditableMemberRow;
  onUpdate: (updater: (m: EditableMemberRow) => EditableMemberRow) => void;
  onRemove: () => void;
  getIdolMatches: (name: string) => Idol[];
  idols: Idol[];
}

function MemberRowEditor({ member, onUpdate, onRemove, getIdolMatches }: MemberRowEditorProps) {
  const matches = getIdolMatches(member.idol.name);
  const hasMatches = matches.length > 0 && member.idolResolution.mode !== 'existing';

  const toggleRole = (role: MemberRole) => {
    onUpdate((m) => {
      const roles = m.membership.roles.includes(role)
        ? m.membership.roles.filter((r) => r !== role)
        : [...m.membership.roles, role];
      return { ...m, membership: { ...m.membership, roles } };
    });
  };

  const selectExisting = (idol: Idol) => {
    onUpdate((m) => ({
      ...m,
      idol: {
        ...m.idol,
        id: idol.id,
        name: idol.name,
        nationality: idol.nationality,
        portrait: idol.portrait ?? null,
        fandomUrl: idol.fandomUrl ?? null,
      },
      idolResolution: { mode: 'existing', selectedExistingId: idol.id, resolvedId: idol.id },
    }));
  };

  const clearExisting = () => {
    onUpdate((m) => ({
      ...m,
      idolResolution: { mode: 'new', selectedExistingId: null, resolvedId: null },
    }));
  };

  const thumbnailUrl = member.idol.portrait;

  return (
    <div className="member-row">
      <div className="member-row__fields">
        <div className="member-row__header">
          <button className="btn btn--danger btn--sm" onClick={onRemove}>
            🗑 Supprimer
          </button>
        </div>

        <div className="form-field">
          <label className="form-label">
            Nom de scène <span>*</span>
          </label>
          <input
            className="input"
            value={member.idol.name}
            placeholder="Ex: Jihyo"
            onChange={(e) =>
              onUpdate((m) => ({
                ...m,
                idol: { ...m.idol, name: e.target.value },
                idolResolution: { mode: 'new', selectedExistingId: null, resolvedId: null },
              }))
            }
          />
        </div>

        {/* Collision detection */}
        {hasMatches && (
          <div className="idol-resolution">
            <div className="idol-resolution__title">⚠️ Idoles similaires trouvées — rattacher une existante ?</div>
            <div className="idol-matches">
              {matches.map((idol) => (
                <button
                  key={idol.id}
                  className={`idol-match-btn${member.idolResolution.selectedExistingId === idol.id ? ' selected' : ''}`}
                  onClick={() => selectExisting(idol)}
                >
                  {idol.name} —{' '}
                  <span style={{ opacity: 0.6 }}>
                    {idol.primaryGroupId} · {idol.id}
                  </span>
                </button>
              ))}
              <button
                className="idol-match-btn"
                style={{ marginTop: 4, color: 'var(--text-muted)' }}
                onClick={() =>
                  onUpdate((m) => ({
                    ...m,
                    idolResolution: { mode: 'new', selectedExistingId: null, resolvedId: null },
                  }))
                }
              >
                Non, c'est un(e) autre artiste →
              </button>
            </div>
          </div>
        )}

        {member.idolResolution.mode === 'existing' && (
          <div style={{ fontSize: 12, color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: 8 }}>
            ✓ Idole existante liée : <strong>{member.idolResolution.selectedExistingId}</strong>
            <button className="btn btn--ghost btn--sm" onClick={clearExisting}>
              Changer
            </button>
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label">Lien page Fandom</label>
            <input
              className="input"
              value={member.idol.fandomUrl ?? ''}
              placeholder="https://kpop.fandom.com/wiki/..."
              onChange={(e) =>
                onUpdate((m) => ({ ...m, idol: { ...m.idol, fandomUrl: e.target.value || null } }))
              }
            />
          </div>
          <div className="form-field">
            <label className="form-label">Nationalité</label>
            <select
              className="select"
              value={member.idol.nationality}
              onChange={(e) =>
                onUpdate((m) => ({
                  ...m,
                  idol: { ...m.idol, nationality: e.target.value as NationalityCode },
                }))
              }
            >
              {NATIONALITY_OPTIONS.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">
            Rôles <span>*</span>{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(au moins un)</span>
          </label>
          <div className="role-pills">
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                className={`role-pill${member.membership.roles.includes(role) ? ' selected' : ''}`}
                onClick={() => toggleRole(role)}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">URL portrait (optionnel)</label>
          <input
            className="input"
            value={member.idol.portrait ?? ''}
            placeholder="assets/idols/.../portrait.webp"
            onChange={(e) =>
              onUpdate((m) => ({ ...m, idol: { ...m.idol, portrait: e.target.value || null } }))
            }
          />
        </div>
      </div>

      <div className="member-row__portrait">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={member.idol.name} className="portrait-img" />
        ) : (
          <div className="portrait-placeholder">👤</div>
        )}
        <div className="portrait-hint">400×533 px · recadrage auto</div>
      </div>
    </div>
  );
}
