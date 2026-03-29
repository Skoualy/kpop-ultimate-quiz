// ─── ContributorStep ──────────────────────────────────────────────────────────
// Composant générique encapsulant la logique commune à chaque étape contributor :
// - wrapper de mise en page uniforme
// - affichage des erreurs de validation
// (future : indicateur autosave, compteur de progression, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

interface ContributorStepProps {
  children: ReactNode;
  /** Erreurs de validation affichées en haut de l'étape */
  errors?: string[];
}

export function ContributorStep({ children, errors }: ContributorStepProps) {
  return (
    <div className="contributor-step">
      {errors && errors.length > 0 && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>
            ⚠ Champs requis manquants
          </div>
          {errors.map((err, i) => (
            <div key={i} style={{ fontSize: 13, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.5 }}>·</span> {err}
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
