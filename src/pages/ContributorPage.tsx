import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type {
  Group,
  GroupCategory,
  GroupStatus,
  Generation,
  NationalityCode,
  MemberRole,
  MemberStatus,
  LanguageCode,
  EditableMemberRow,
  ContributionBundle,
  Idol,
  SongEntry,
} from '../types';
import { slugify, generateIdolId, getYouTubeThumbnail, getCategoryGender } from '../services/dataService';
import { ImagePicker } from '../components/ImagePicker';
import { useToast } from '../components/shared';

// ─── Constants ─────────────────────────────────────────────────────────────────
const ALL_ROLES: MemberRole[] = [
  'leader',
  'mainVocal',
  'vocal',
  'mainDancer',
  'dancer',
  'mainRapper',
  'rapper',
  'visual',
  'maknae',
];
const ROLE_LABELS: Record<MemberRole, string> = {
  leader: 'Leader',
  mainVocal: 'Main Vocal',
  vocal: 'Vocal',
  mainDancer: 'Main Dancer',
  dancer: 'Dancer',
  mainRapper: 'Main Rapper',
  rapper: 'Rapper',
  visual: 'Visual',
  maknae: 'Maknae',
};
const NATIONALITIES: { code: NationalityCode; label: string }[] = [
  { code: 'kr', label: '🇰🇷 Corée' },
  { code: 'jp', label: '🇯🇵 Japon' },
  { code: 'cn', label: '🇨🇳 Chine' },
  { code: 'tw', label: '🇹🇼 Taïwan' },
  { code: 'th', label: '🇹🇭 Thaïlande' },
  { code: 'us', label: '🇺🇸 USA' },
  { code: 'au', label: '🇦🇺 Australie' },
];

// ─── Editable group form state ─────────────────────────────────────────────────
interface GroupForm {
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

// Génération suggérée depuis l'année de début
function guessGeneration(year: number): Generation {
  if (year < 2000) return '1';
  if (year < 2012) return '2';
  if (year < 2018) return '3';
  if (year < 2023) return '4';
  return '5';
}

interface EditableSong {
  _key: string;
  id: string;
  title: string;
  youtubeUrl: string;
  language: LanguageCode | '';
  isDebutSong: boolean;
}

function emptyForm(): GroupForm {
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

function emptyMemberRow(status: MemberStatus = 'current'): EditableMemberRow {
  return {
    _uiKey: Math.random().toString(36).slice(2),
    idol: { name: '', nationality: 'kr', portrait: null, fandomUrl: null, notes: null },
    membership: { status, roles: [] },
    idolResolution: { mode: 'new', selectedExistingId: null, resolvedId: null },
  };
}

function emptySong(): EditableSong {
  return {
    _key: Math.random().toString(36).slice(2),
    id: '',
    title: '',
    youtubeUrl: '',
    language: '',
    isDebutSong: false,
  };
}

// ─── Main component ──────────────────────────────────────────────────────────────
export function ContributorPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId?: string }>();
  const { groups, idols, labels, addGroup, updateGroup, addOrUpdateIdols, addOrUpdateLabels } = useApp();
  const { showToast, ToastEl } = useToast();

  const editGroup = groupId ? groups.find((g) => g.id === groupId) : null;
  const isEdit = !!editGroup;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GroupForm>(() =>
    editGroup
      ? {
          id: editGroup.id,
          name: editGroup.name,
          category: editGroup.category,
          parentGroupId: editGroup.parentGroupId ?? '',
          generation: editGroup.generation,
          debutYear: String(editGroup.debutYear),
          status: editGroup.status,
          company: editGroup.company,
          coverImage: editGroup.coverImage ?? '',
          fandomName: editGroup.fandomName ?? '',
          fandomUrl: editGroup.fandomUrl ?? '',
          notes: editGroup.notes ?? '',
        }
      : emptyForm()
  );

  const [members, setMembers] = useState<EditableMemberRow[]>(() => {
    if (!editGroup) return [emptyMemberRow('current')];
    const idolMap = new Map(idols.map((i) => [i.id, i]));
    return editGroup.members.map((m) => {
      const idol = idolMap.get(m.idolId);
      return {
        _uiKey: Math.random().toString(36).slice(2),
        idol: {
          id: m.idolId,
          name: idol?.name ?? m.idolId,
          nationality: idol?.nationality ?? 'kr',
          portrait: idol?.portrait ?? null,
          fandomUrl: idol?.fandomUrl ?? null,
          notes: idol?.notes ?? null,
        },
        membership: { status: m.status, roles: m.roles },
        idolResolution: { mode: 'existing', selectedExistingId: m.idolId, resolvedId: m.idolId },
      };
    });
  });

  const [titles, setTitles] = useState<EditableSong[]>(() => {
    if (!editGroup) return [emptySong()];
    return editGroup.discography.titles.map((s) => ({
      _key: Math.random().toString(36).slice(2),
      id: s.id,
      title: s.title,
      youtubeUrl: s.youtubeUrl,
      language: s.language ?? '',
      isDebutSong: s.isDebutSong ?? false,
    }));
  });

  const [bSides, setBSides] = useState<EditableSong[]>(() => {
    if (!editGroup) return [];
    return editGroup.discography.bSides.map((s) => ({
      _key: Math.random().toString(36).slice(2),
      id: s.id,
      title: s.title,
      youtubeUrl: s.youtubeUrl,
      language: s.language ?? '',
      isDebutSong: false,
    }));
  });

  const [exportJson, setExportJson] = useState('');

  // ─── Auto-generate group id from name ──────────────────────────────────────────
  useEffect(() => {
    if (!isEdit && form.name) {
      setForm((f) => ({ ...f, id: slugify(f.name) }));
    }
  }, [form.name, isEdit]);

  // ─── Idol name → search existing ───────────────────────────────────────────────
  function getIdolMatches(name: string): Idol[] {
    if (!name || name.length < 2) return [];
    return idols.filter((i) => i.name.toLowerCase().startsWith(name.toLowerCase())).slice(0, 5);
  }

  // ─── Step 4: generate bundle ───────────────────────────────────────────────────
  function generateBundle(): ContributionBundle {
    const gender = getCategoryGender(form.category);

    const bundleIdols: Idol[] = members.map((m) => {
      const existingId = m.idolResolution.selectedExistingId;
      if (existingId) {
        const found = idols.find((i) => i.id === existingId);
        return (
          found ?? {
            id: existingId,
            name: m.idol.name,
            primaryGroupId: form.id,
            gender,
            nationality: m.idol.nationality,
            portrait: m.idol.portrait ?? null,
            fandomUrl: m.idol.fandomUrl ?? null,
            notes: m.idol.notes ?? null,
          }
        );
      }
      const newId = generateIdolId(m.idol.name, idols);
      return {
        id: newId,
        name: m.idol.name,
        primaryGroupId: form.id,
        gender,
        nationality: m.idol.nationality,
        portrait: m.idol.portrait ?? null,
        fandomUrl: m.idol.fandomUrl ?? null,
        notes: m.idol.notes ?? null,
      };
    });

    const makeSong = (s: EditableSong): SongEntry => ({
      id: s.id || slugify(s.title),
      title: s.title,
      youtubeUrl: s.youtubeUrl,
      ...(s.language ? { language: s.language as LanguageCode } : {}),
      ...(s.isDebutSong ? { isDebutSong: true } : {}),
    });

    const group: Group = {
      id: form.id || slugify(form.name),
      name: form.name,
      category: form.category,
      parentGroupId: form.parentGroupId || null,
      generation: (form.generation || '4') as Generation,
      debutYear: parseInt(form.debutYear) || new Date().getFullYear(),
      status: form.status,
      company: form.company,
      coverImage: form.coverImage || null,
      members: members.map((m, i) => ({
        idolId: bundleIdols[i].id,
        status: m.membership.status,
        roles: m.membership.roles,
      })),
      discography: {
        titles: titles.filter((s) => s.title).map(makeSong),
        bSides: bSides.filter((s) => s.title).map(makeSong),
      },
      fandomName: form.fandomName || null,
      fandomUrl: form.fandomUrl || null,
      notes: form.notes || null,
    };

    return {
      meta: { schemaVersion: 1, generatedAt: new Date().toISOString() },
      group,
      idols: bundleIdols,
    };
  }

  function handleGenerateJson() {
    const bundle = generateBundle();
    // Ajouter le label s'il est nouveau
    const existingLabel = labels.find((l) => l.name.toLowerCase() === form.company.toLowerCase());
    if (!existingLabel && form.company) {
      addOrUpdateLabels([
        {
          id: slugify(form.company),
          name: form.company,
          country: 'kr', // défaut, modifiable manuellement ensuite
          logo: null,
        },
      ]);
    }
    setExportJson(JSON.stringify(bundle, null, 2));
    addOrUpdateIdols(bundle.idols);
    if (isEdit) updateGroup(bundle.group);
    else addGroup(bundle.group);
    showToast('✅ Bundle généré et sauvegardé localement');
  }

  function handleDownloadJson() {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.id || 'contribution'}.bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Copié !');
    } catch {
      showToast('Échec de la copie');
    }
  }

  // ─── Top-level groups for parentGroupId autocomplete ──────────────────────────
  const topLevelGroups = useMemo(
    () => groups.filter((g) => !g.parentGroupId && (g.category === 'girlGroup' || g.category === 'boyGroup')),
    [groups]
  );

  // ─── Render steps ──────────────────────────────────────────────────────────────
  const TABS = ['① Infos groupe', '② Membres', '③ Musiques', '④ Export'];

  return (
    <div className="page-container">
      {ToastEl}

      <div className="page-header">
        <div className="page-header__left">
          <h1>🎵 Proposer / Modifier un groupe</h1>
          <p>Remplis ce formulaire pour soumettre un nouveau groupe ou corriger un groupe existant.</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => navigate(-1)}>
            ← Retour
          </button>
        </div>
      </div>

      {isEdit && (
        <div className="contributor-mode-bar">
          ✏️ Mode édition — <strong>{editGroup.name}</strong>
        </div>
      )}

      {/* Tabs */}
      <div className="contributor-tabs">
        {TABS.map((tab, i) => (
          <button key={tab} className={`contributor-tab${step === i ? ' active' : ''}`} onClick={() => setStep(i)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Step 1: Group info */}
      {step === 0 && (
        <GroupInfoStep form={form} setForm={setForm} topLevelGroups={topLevelGroups} labels={labels} isEdit={isEdit} />
      )}

      {/* Step 2: Members */}
      {step === 1 && <MembersStep members={members} setMembers={setMembers} getIdolMatches={getIdolMatches} idols={idols} />}

      {/* Step 3: Songs */}
      {step === 2 && <SongsStep titles={titles} setTitles={setTitles} bSides={bSides} setBSides={setBSides} />}

      {/* Step 4: Export */}
      {step === 3 && (
        <ExportStep
          exportJson={exportJson}
          onGenerate={handleGenerateJson}
          onCopy={handleCopy}
          onDownload={handleDownloadJson}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step nav (steps 0–2) */}
      {step < 3 && (
        <div className="step-nav">
          {step > 0 && (
            <button className="btn btn--ghost" onClick={() => setStep(step - 1)}>
              ← Retour
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary" onClick={() => setStep(step + 1)}>
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Group Info ─────────────────────────────────────────────────────────
function GroupInfoStep({
  form,
  setForm,
  topLevelGroups,
  labels,
  isEdit,
}: {
  form: GroupForm;
  setForm: React.Dispatch<React.SetStateAction<GroupForm>>;
  topLevelGroups: Group[];
  labels: import('../types').Label[];
  isEdit: boolean;
}) {
  const upd = (k: keyof GroupForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ─── Génération auto depuis l'année ───────────────────────────────────────────
  // genManual = true dès que l'utilisateur touche au select génération manuellement
  const [genManual, setGenManual] = useState(isEdit);

  useEffect(() => {
    if (genManual) return;
    const year = parseInt(form.debutYear);
    if (!isNaN(year) && year > 1990) {
      upd('generation', guessGeneration(year));
    }
  }, [form.debutYear, genManual]);

  // ─── Label autocomplete ───────────────────────────────────────────────────────
  const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  const labelSuggestions = useMemo(() => {
    if (!form.company || form.company.length < 1) return [];
    return labels.filter((l) => l.name.toLowerCase().includes(form.company.toLowerCase())).slice(0, 6);
  }, [form.company, labels]);

  const isNewLabel = form.company.length > 0 && !labels.find((l) => l.name.toLowerCase() === form.company.toLowerCase());

  // Fermer suggestions au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setShowLabelSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="contributor-step">
      <div className="card">
        <div className="card__title" style={{ fontSize: 18, marginBottom: 20 }}>
          Informations générales
        </div>

        {/* ── Ligne 1 : Nom + Statut (col gauche) | Cover image (col droite) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '0.97fr 180px', gap: 40, marginBottom: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Nom du groupe */}
            <div className="form-field">
              <label className="form-label">
                Nom du groupe <span>*</span>
              </label>
              <input className="input" value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Ex: TWICE" />
              {form.id && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: 3 }}>
                  id : {form.id}
                </span>
              )}
            </div>
            {/* Statut */}
            <div className="form-field">
              <label className="form-label">
                Statut <span>*</span>
              </label>
              <select className="select" value={form.status} onChange={(e) => upd('status', e.target.value)}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">
                Sub-unit de
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                  — laisser vide si groupe indépendant
                </span>
              </label>
              <select className="select" value={form.parentGroupId} onChange={(e) => upd('parentGroupId', e.target.value)}>
                <option value="">— Aucun (groupe indépendant)</option>
                {topLevelGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {form.parentGroupId && (
                <span style={{ fontSize: 11, color: 'var(--accent-teal)', marginTop: 4, display: 'block' }}>
                  ✦ Catégorie forcée depuis le groupe parent
                </span>
              )}
            </div>
          </div>

          {/* Cover image */}
          <ImagePicker
            value={form.coverImage}
            onChange={(v) => upd('coverImage', v)}
            label="Cover du groupe"
            placeholder="assets/groups/.../cover.webp"
            aspectRatio="1/1"
            hint="600×600 px recommandé · webp"
            emptyIcon="🎵"
          />
        </div>

        {/* ── Ligne 2 : Année de début | Génération ── */}
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
              {(['1', '2', '3', '4', '5'] as Generation[]).map((g) => (
                <option key={g} value={g}>
                  Gen {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Ligne 3 : Label / Agence | Catégorie ── */}
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
            {/* Suggestions dropdown */}
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
            {/* Badge nouveau label */}
            {isNewLabel && form.company && (
              <span
                style={{
                  fontSize: 11,
                  color: '#fbbf24',
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ✦ Nouveau label — sera ajouté automatiquement à la soumission
              </span>
            )}
          </div>

          {/* Catégorie */}
          <div className="form-field">
            <label className="form-label">
              Catégorie <span>*</span>
            </label>
            <select className="select" value={form.category} onChange={(e) => upd('category', e.target.value)}>
              <option value="girlGroup">Girls group</option>
              <option value="boyGroup">Boys group</option>
              <option value="femaleSoloist">Soloiste (F)</option>
              <option value="maleSoloist">Soloiste (M)</option>
            </select>
          </div>
        </div>

        {/* ── Ligne 4 : Nom fandom | URL fandom ── */}
        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <div className="form-field">
            <label className="form-label">Nom de la fandom</label>
            <input
              className="input"
              value={form.fandomName}
              onChange={(e) => upd('fandomName', e.target.value)}
              placeholder="Ex: ONCE"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Lien Fandom wiki</label>
            <input
              className="input"
              value={form.fandomUrl}
              onChange={(e) => upd('fandomUrl', e.target.value)}
              placeholder="https://kpop.fandom.com/wiki/..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Members ────────────────────────────────────────────────────────────
function MembersStep({
  members,
  setMembers,
  getIdolMatches,
  idols,
}: {
  members: EditableMemberRow[];
  setMembers: React.Dispatch<React.SetStateAction<EditableMemberRow[]>>;
  getIdolMatches: (name: string) => Idol[];
  idols: Idol[];
}) {
  const currentMembers = members.filter((m) => m.membership.status === 'current');
  const formerMembers = members.filter((m) => m.membership.status === 'former');

  const updateMember = (key: string, updater: (m: EditableMemberRow) => EditableMemberRow) => {
    setMembers((prev) => prev.map((m) => (m._uiKey === key ? updater(m) : m)));
  };

  const removeMember = (key: string) => {
    setMembers((prev) => prev.filter((m) => m._uiKey !== key));
  };

  return (
    <div className="contributor-step">
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

        <button className="btn btn--secondary btn--sm" onClick={() => setMembers((prev) => [...prev, emptyMemberRow('current')])}>
          + Ajouter un membre
        </button>
      </div>

      <div className="member-section" style={{ marginTop: 16 }}>
        <div className="member-section__title">
          Anciens membres <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span>
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

        <button className="btn btn--ghost btn--sm" onClick={() => setMembers((prev) => [...prev, emptyMemberRow('former')])}>
          + Ajouter un ancien membre
        </button>
      </div>
    </div>
  );
}

// ─── Member row editor ─────────────────────────────────────────────────────────
function MemberRowEditor({
  member,
  onUpdate,
  onRemove,
  getIdolMatches,
  idols,
}: {
  member: EditableMemberRow;
  onUpdate: (updater: (m: EditableMemberRow) => EditableMemberRow) => void;
  onRemove: () => void;
  getIdolMatches: (name: string) => Idol[];
  idols: Idol[];
}) {
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
                  onUpdate((m) => ({ ...m, idolResolution: { mode: 'new', selectedExistingId: null, resolvedId: null } }))
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
              onChange={(e) => onUpdate((m) => ({ ...m, idol: { ...m.idol, fandomUrl: e.target.value || null } }))}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Nationalité</label>
            <select
              className="select"
              value={member.idol.nationality}
              onChange={(e) => onUpdate((m) => ({ ...m, idol: { ...m.idol, nationality: e.target.value as NationalityCode } }))}
            >
              {NATIONALITIES.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">
            Rôles <span>*</span> <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(au moins un)</span>
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
            onChange={(e) => onUpdate((m) => ({ ...m, idol: { ...m.idol, portrait: e.target.value || null } }))}
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

// ─── Step 3: Songs ──────────────────────────────────────────────────────────────
function SongsStep({
  titles,
  setTitles,
  bSides,
  setBSides,
}: {
  titles: EditableSong[];
  setTitles: React.Dispatch<React.SetStateAction<EditableSong[]>>;
  bSides: EditableSong[];
  setBSides: React.Dispatch<React.SetStateAction<EditableSong[]>>;
}) {
  return (
    <div className="contributor-step">
      <SongList label="Title tracks" songs={titles} setSongs={setTitles} showDebutFlag />
      <SongList label="B-sides" songs={bSides} setSongs={setBSides} showDebutFlag={false} />
    </div>
  );
}

function SongList({
  label,
  songs,
  setSongs,
  showDebutFlag,
}: {
  label: string;
  songs: EditableSong[];
  setSongs: React.Dispatch<React.SetStateAction<EditableSong[]>>;
  showDebutFlag: boolean;
}) {
  const update = (key: string, field: keyof EditableSong, value: string | boolean) => {
    setSongs((prev) =>
      prev.map((s) => {
        if (s._key !== key) return s;
        const updated = { ...s, [field]: value };
        if (field === 'title') updated.id = slugify(String(value));
        return updated;
      })
    );
  };

  const remove = (key: string) => setSongs((prev) => prev.filter((s) => s._key !== key));
  const add = () => setSongs((prev) => [...prev, emptySong()]);

  return (
    <div className="songs-section">
      <div className="songs-section__title">
        {label}
        <button className="btn btn--secondary btn--sm" onClick={add}>
          + Ajouter
        </button>
      </div>
      <div className="songs-warning">
        ⚠️ <strong>Vérifiez les noms</strong> — utilisés comme réponses en blind test. Le titre doit être en anglais ou latin,
        sans caractères coréens.
      </div>

      {songs.map((s) => {
        const thumb = s.youtubeUrl ? getYouTubeThumbnail(s.youtubeUrl) : null;
        return (
          <div key={s._key} className="song-row">
            <div className="song-row__fields">
              <div className="song-row__header">
                <button className="btn btn--danger btn--sm" onClick={() => remove(s._key)}>
                  🗑 Supprimer
                </button>
              </div>
              <div className="form-field">
                <label className="form-label">
                  Titre <span>*</span>{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    (nom exact, sans caractères coréens ni crochets)
                  </span>
                </label>
                <input
                  className="input"
                  value={s.title}
                  onChange={(e) => update(s._key, 'title', e.target.value)}
                  placeholder="Ex: Feel Special"
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Lien YouTube <span>*</span>
                </label>
                <input
                  className="input"
                  value={s.youtubeUrl}
                  onChange={(e) => update(s._key, 'youtubeUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="song-row__options">
                <div className="form-field">
                  <label className="form-label">Langue</label>
                  <select
                    className="select"
                    style={{ width: 'auto', minWidth: 120 }}
                    value={s.language}
                    onChange={(e) => update(s._key, 'language', e.target.value)}
                  >
                    <option value="">🇰🇷 Coréen (défaut)</option>
                    <option value="jp">🇯🇵 Japonais</option>
                    <option value="en">🇺🇸 Anglais</option>
                  </select>
                </div>
                {showDebutFlag && (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={s.isDebutSong}
                      onChange={(e) => update(s._key, 'isDebutSong', e.target.checked)}
                    />
                    Chanson de début
                  </label>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="song-thumbnail">
                {thumb ? <img src={thumb} alt={s.title} /> : <div className="song-thumbnail__placeholder">🎵</div>}
              </div>
              {s.youtubeUrl && (
                <a
                  href={s.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost btn--sm"
                  style={{ justifyContent: 'center' }}
                >
                  ▶ Regarder
                </a>
              )}
            </div>
          </div>
        );
      })}

      {songs.length === 0 && (
        <button className="btn btn--secondary" onClick={add} style={{ alignSelf: 'flex-start' }}>
          + Ajouter une chanson
        </button>
      )}
    </div>
  );
}

// ─── Step 4: Export ─────────────────────────────────────────────────────────────
function ExportStep({
  exportJson,
  onGenerate,
  onCopy,
  onDownload,
  onBack,
}: {
  exportJson: string;
  onGenerate: () => void;
  onCopy: (text: string) => void;
  onDownload: () => void;
  onBack: () => void;
}) {
  return (
    <div className="export-section">
      <div className="card export-generate">
        <div className="card__title" style={{ fontSize: 18 }}>
          ⚡ Générer le JSON
        </div>
        <p>Vérifie toutes les informations avant de générer. Les noms des chansons sont utilisés comme réponses en blind test.</p>
        <button className="btn btn--primary" onClick={onGenerate}>
          ⚡ Générer le JSON
        </button>
      </div>

      <div className="export-json">
        <div className="export-json__title">JSON du groupe</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button className="btn btn--secondary btn--sm" onClick={() => onCopy(exportJson)}>
            📋 Copier
          </button>
        </div>
        <textarea
          className="export-json__area"
          value={exportJson}
          readOnly
          placeholder="Le JSON apparaîtra ici après génération…"
        />
      </div>

      <div className="export-actions card">
        <div className="export-actions__title">Télécharger &amp; envoyer</div>
        <div className="export-actions__buttons">
          <button className="btn btn--primary" onClick={onDownload} disabled={!exportJson}>
            ↓ Télécharger le JSON
          </button>
          <button className="btn btn--secondary" onClick={() => onCopy(exportJson)} disabled={!exportJson}>
            📋 Copier JSON
          </button>
          <button className="btn btn--ghost" onClick={onBack}>
            ✏️ Modifier
          </button>
        </div>
      </div>
    </div>
  );
}
