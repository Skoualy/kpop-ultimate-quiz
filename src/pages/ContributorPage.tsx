// ─── ContributorPage ──────────────────────────────────────────────────────────
// Orchestrateur du formulaire contributor en 4 étapes.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Group, EditableMemberRow, ContributionBundle, Idol, SongEntry, LanguageCode, Generation } from '../types';
import { slugify, generateIdolId, getCategoryGender } from '../services/dataService';
import { useToast } from '../components/shared';

import { GroupInfoStep, emptyGroupForm, validateGroupInfo } from '../components/Contributor/GroupInfoStep';
import type { GroupForm } from '../components/Contributor/GroupInfoStep';
import { MembersStep, emptyMemberRow, validateMembers } from '../components/Contributor/MembersStep';
import { SongsStep, emptySong, validateSongs } from '../components/Contributor/SongsStep';
import type { EditableSong } from '../components/Contributor/SongsStep';
import { ExportStep } from '../components/Contributor/ExportStep';

export function ContributorPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId?: string }>();
  const { groups, idols, labels, addGroup, updateGroup, addOrUpdateIdols, addOrUpdateLabels } = useApp();
  const { showToast, ToastEl } = useToast();

  const editGroup = groupId ? groups.find((g) => g.id === groupId) : null;
  const isEdit = !!editGroup;

  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  // maxStep : étape la plus loin validée — bloque la navigation en avant sur les onglets
  const [maxStep, setMaxStep] = useState(isEdit ? 3 : 0);

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
      : emptyGroupForm()
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
      id: s.id, title: s.title, youtubeUrl: s.youtubeUrl,
      language: s.language ?? '', isDebutSong: s.isDebutSong ?? false,
    }));
  });

  const [bSides, setBSides] = useState<EditableSong[]>(() => {
    if (!editGroup) return [];
    return editGroup.discography.bSides.map((s) => ({
      _key: Math.random().toString(36).slice(2),
      id: s.id, title: s.title, youtubeUrl: s.youtubeUrl,
      language: s.language ?? '', isDebutSong: false,
    }));
  });

  const [exportJson, setExportJson] = useState('');

  useEffect(() => {
    if (!isEdit && form.name) {
      setForm((f) => ({ ...f, id: slugify(f.name) }));
    }
  }, [form.name, isEdit]);

  useEffect(() => {
    setStepErrors([]);
  }, [step]);

  function getIdolMatches(name: string): Idol[] {
    if (!name || name.length < 2) return [];
    return idols.filter((i) => i.name.toLowerCase().startsWith(name.toLowerCase())).slice(0, 5);
  }

  // ─── Validation + navigation ──────────────────────────────────────────────────
  function validate(targetStep: number): string[] {
    if (targetStep === 0) return validateGroupInfo(form, groups, isEdit);
    if (targetStep === 1) return validateMembers(members);
    if (targetStep === 2) return validateSongs(titles, bSides);
    return [];
  }

  function tryAdvance() {
    const errors = validate(step);
    if (errors.length > 0) {
      setStepErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStepErrors([]);
    const next = step + 1;
    setMaxStep((m) => Math.max(m, next));
    setStep(next);
  }

  function handleTabClick(i: number) {
    if (i > maxStep) return; // onglet non encore débloqué
    // Valider l'étape courante si on avance
    if (i > step) {
      const errors = validate(step);
      if (errors.length > 0) {
        setStepErrors(errors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setMaxStep((m) => Math.max(m, i));
    }
    setStepErrors([]);
    setStep(i);
  }

  // ─── Bundle ───────────────────────────────────────────────────────────────────
  function generateBundle(): ContributionBundle {
    const gender = getCategoryGender(form.category);
    const bundleIdols: Idol[] = members.map((m) => {
      const existingId = m.idolResolution.selectedExistingId;
      if (existingId) {
        const found = idols.find((i) => i.id === existingId);
        return found ?? {
          id: existingId, name: m.idol.name, primaryGroupId: form.id,
          gender, nationality: m.idol.nationality,
          portrait: m.idol.portrait ?? null, fandomUrl: m.idol.fandomUrl ?? null, notes: m.idol.notes ?? null,
        };
      }
      const newId = generateIdolId(m.idol.name, idols);
      return {
        id: newId, name: m.idol.name, primaryGroupId: form.id,
        gender, nationality: m.idol.nationality,
        portrait: m.idol.portrait ?? null, fandomUrl: m.idol.fandomUrl ?? null, notes: m.idol.notes ?? null,
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

    return { meta: { schemaVersion: 1, generatedAt: new Date().toISOString() }, group, idols: bundleIdols };
  }

  function handleGenerateJson() {
    const bundle = generateBundle();
    const existingLabel = labels.find((l) => l.name.toLowerCase() === form.company.toLowerCase());
    if (!existingLabel && form.company) {
      addOrUpdateLabels([{ id: slugify(form.company), name: form.company, country: 'kr', logo: null }]);
    }
    setExportJson(JSON.stringify(bundle, null, 2));
    addOrUpdateIdols(bundle.idols);
    if (isEdit) updateGroup(bundle.group); else addGroup(bundle.group);
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
    try { await navigator.clipboard.writeText(text); showToast('📋 Copié !'); }
    catch { showToast('Échec de la copie'); }
  }

  const topLevelGroups = useMemo(
    () => groups.filter((g) => !g.parentGroupId && (g.category === 'girlGroup' || g.category === 'boyGroup')),
    [groups]
  );

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
          <button className="btn btn--ghost" onClick={() => navigate(-1)}>← Retour</button>
        </div>
      </div>

      {isEdit && (
        <div className="contributor-mode-bar">
          ✏️ Mode édition — <strong>{editGroup.name}</strong>
        </div>
      )}

      {/* Tabs — désactivés si étape non encore débloquée */}
      <div className="contributor-tabs">
        {TABS.map((tab, i) => {
          const locked = i > maxStep;
          return (
            <button
              key={tab}
              className={`contributor-tab${step === i ? ' active' : ''}`}
              onClick={() => handleTabClick(i)}
              disabled={locked}
              title={locked ? 'Complète les étapes précédentes d\'abord' : undefined}
              style={{ opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <GroupInfoStep
          form={form}
          setForm={setForm}
          topLevelGroups={topLevelGroups}
          existingGroups={groups}
          labels={labels}
          isEdit={isEdit}
          errors={stepErrors}
        />
      )}

      {step === 1 && (
        <MembersStep
          members={members}
          setMembers={setMembers}
          getIdolMatches={getIdolMatches}
          idols={idols}
          errors={stepErrors}
        />
      )}

      {step === 2 && (
        <SongsStep
          titles={titles}
          setTitles={setTitles}
          bSides={bSides}
          setBSides={setBSides}
          errors={stepErrors}
        />
      )}

      {step === 3 && (
        <ExportStep
          exportJson={exportJson}
          onGenerate={handleGenerateJson}
          onCopy={handleCopy}
          onDownload={handleDownloadJson}
          onBack={() => setStep(2)}
        />
      )}

      {step < 3 && (
        <div className="step-nav">
          {step > 0 && (
            <button className="btn btn--ghost" onClick={() => { setStepErrors([]); setStep((s) => s - 1); }}>
              ← Retour
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn--primary" onClick={tryAdvance}>
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
