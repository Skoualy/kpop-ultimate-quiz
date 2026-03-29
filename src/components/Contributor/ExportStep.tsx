// ─── ExportStep ───────────────────────────────────────────────────────────────
// Étape 4 du formulaire contributor : génération et export du bundle JSON.
// ─────────────────────────────────────────────────────────────────────────────

import { ContributorStep } from './ContributorStep';

interface ExportStepProps {
  exportJson: string;
  onGenerate: () => void;
  onCopy: (text: string) => void;
  onDownload: () => void;
  onBack: () => void;
}

export function ExportStep({ exportJson, onGenerate, onCopy, onDownload, onBack }: ExportStepProps) {
  return (
    <ContributorStep>
      <div className="card export-generate">
        <div className="card__title" style={{ fontSize: 18 }}>⚡ Générer le JSON</div>
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
    </ContributorStep>
  );
}
