#!/usr/bin/env python3
"""
merge-credits.py — Centralisation des crédits images dans dataset/credits.json.

Usage:
    python scripts/merge-credits.py path/to/credits_validated.json

Note: le chemin du dataset est résolu automatiquement depuis la position du
script (identique à merge-bundle.py : REPO_ROOT/public/dataset).
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime

REPO_ROOT    = Path(__file__).resolve().parent.parent
DATASET_DIR  = REPO_ROOT / 'public' / 'dataset'
CREDITS_FILE = DATASET_DIR / 'credits.json'


def load_credits_dataset() -> dict:
    if CREDITS_FILE.exists():
        with CREDITS_FILE.open(encoding='utf-8') as f:
            return json.load(f)
    print(f"  ℹ {CREDITS_FILE.relative_to(REPO_ROOT)} inexistant — création d'un nouveau fichier.")
    return {
        "meta": {"schemaVersion": 1, "lastUpdated": "1970-01-01T00:00:00Z"},
        "credits": [],
    }


def save_credits_dataset(data: dict):
    CREDITS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CREDITS_FILE.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  💾 {CREDITS_FILE.relative_to(REPO_ROOT)} mis à jour")


def merge_credits(existing: list[dict], incoming: list[dict]) -> tuple[list[dict], dict]:
    existing_by_id = {c['id']: c for c in existing}
    stats = {'added': 0, 'updated': 0}

    for credit in incoming:
        credit_id = credit.get('id')
        if not credit_id:
            print(f"  ⚠ Crédit sans id ignoré", file=sys.stderr)
            continue
        if credit_id in existing_by_id:
            print(f"  ↺ Mise à jour : {credit_id}")
            stats['updated'] += 1
        else:
            print(f"  ＋ Ajout      : {credit_id}")
            stats['added'] += 1
        existing_by_id[credit_id] = credit

    merged = sorted(
        existing_by_id.values(),
        key=lambda c: (c.get('entityType', ''), c.get('entityId', ''), c.get('assetType', '')),
    )
    return merged, stats


def compute_summary(credits: list[dict]) -> dict:
    total   = len(credits)
    valid   = sum(1 for c in credits if c.get('validation', {}).get('isValid', False))
    by_type: dict = {}
    for c in credits:
        st = c.get('sourceType', 'unknown')
        by_type[st] = by_type.get(st, 0) + 1
    return {
        'total': total, 'valid': valid, 'invalid': total - valid,
        'bySourceType': by_type,
        'validationRate': round((valid / total * 100) if total else 0, 1),
    }


def main():
    parser = argparse.ArgumentParser(description='Fusionner les crédits validés dans dataset/credits.json')
    parser.add_argument('validated', help='Chemin vers credits_validated.json')
    args = parser.parse_args()

    validated_path = Path(args.validated)
    if not validated_path.exists():
        print(f'Erreur : fichier introuvable : {validated_path}', file=sys.stderr)
        sys.exit(1)

    print(f'\n🔀 Merge des crédits — {validated_path.name}')
    print(f'   Dataset : {DATASET_DIR.relative_to(REPO_ROOT)}')
    print('=' * 60)

    with validated_path.open(encoding='utf-8') as f:
        validated = json.load(f)

    incoming: list[dict] = validated.get('credits', [])
    if not incoming:
        print('  ℹ Aucun crédit dans le fichier validé. Rien à faire.')
        return

    print(f'  📋 {len(incoming)} crédit(s) entrant(s)')

    dataset  = load_credits_dataset()
    existing: list[dict] = dataset.get('credits', [])
    print(f'  📋 {len(existing)} crédit(s) existant(s)')

    merged, stats = merge_credits(existing, incoming)

    dataset['credits']             = merged
    dataset['meta']['lastUpdated'] = datetime.utcnow().isoformat() + 'Z'
    dataset['meta']['summary']     = compute_summary(merged)

    save_credits_dataset(dataset)

    summary = dataset['meta']['summary']
    print('\n' + '=' * 60)
    print(f"✅ Merge terminé")
    print(f"   Ajoutés   : {stats['added']}")
    print(f"   Mis à jour: {stats['updated']}")
    print(f"   Total     : {summary['total']} crédits ({summary['validationRate']}% valides)")


if __name__ == '__main__':
    main()
