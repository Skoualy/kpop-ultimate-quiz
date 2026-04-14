#!/usr/bin/env python3
"""
merge-bundle.py — fusionne un ou plusieurs ZIP de contribution dans le dataset.

Usage:
    python scripts/merge-bundle.py bundle1.zip [bundle2.zip ...]

ZIP accepté pour merge final:
    bundle.json
    assets/groups/{groupId}/cover.webp        (optionnel)
    assets/idols/{idolId}/portrait.webp       (optionnel)

ZIP draft:
    draft.json (+ assets/...)
    -> non mergé dans le dataset (informatif uniquement).
"""

from __future__ import annotations

import json
import os
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = REPO_ROOT / 'public' / 'dataset'
GROUPS_DIR = DATASET_DIR / 'groups'
IDOLS_FILE = DATASET_DIR / 'idols.json'
LABELS_FILE = DATASET_DIR / 'labels.json'
INDEX_FILE = GROUPS_DIR / 'index.json'
ASSETS_DIR = REPO_ROOT / 'assets'

VALID_CATEGORIES = {'girlGroup', 'boyGroup', 'femaleSoloist', 'maleSoloist'}


def load_json(path: Path, default: Any):
    if path.exists():
        with path.open(encoding='utf-8') as f:
            return json.load(f)
    return default


def save_json(path: Path, data: Any):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  ✅ {path.relative_to(REPO_ROOT)}')


def rebuild_index():
    entries: list[dict[str, str]] = []
    for category in sorted(VALID_CATEGORIES):
        cat_dir = GROUPS_DIR / category
        if not cat_dir.exists():
            continue
        for group_file in sorted(cat_dir.glob('*.json')):
            entries.append({'id': group_file.stem, 'category': category})
    save_json(INDEX_FILE, entries)


def normalize_asset_reference(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip()
    while raw.startswith('../'):
        raw = raw[3:]
    while raw.startswith('./'):
        raw = raw[2:]

    if raw.startswith('http://') or raw.startswith('https://'):
        return raw

    if raw.startswith('/'):
        return raw

    if raw.startswith('Assets/'):
        raw = 'assets/' + raw.split('/', 1)[1]

    if not raw.startswith('assets/'):
        raw = 'assets/' + raw.lstrip('/')

    return raw


def sanitize_group_payload(group: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(group)
    normalized['coverImage'] = normalize_asset_reference(group.get('coverImage'))
    return normalized


def sanitize_idol_payload(idol: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(idol)
    normalized['portrait'] = normalize_asset_reference(idol.get('portrait'))
    return normalized


def merge_assets_from_zip(zf: zipfile.ZipFile):
    for name in zf.namelist():
        if not name.startswith('assets/') or name.endswith('/'):
            continue

        relative = Path(name).relative_to('assets')
        target = ASSETS_DIR / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(name) as src, target.open('wb') as dst:
            dst.write(src.read())
        print(f'  🖼  Asset : {target.relative_to(REPO_ROOT)}')


def merge_bundle_zip(zip_path: str):
    print(f'\n📦 Traitement de {zip_path}')

    with zipfile.ZipFile(zip_path, 'r') as zf:
        names = set(zf.namelist())

        if 'bundle.json' not in names:
            if 'draft.json' in names:
                print('  ⚠️ ZIP draft détecté (draft.json). Aucun merge dataset effectué.')
                return
            raise ValueError('bundle.json manquant dans le ZIP')

        bundle = json.loads(zf.read('bundle.json'))
        group = bundle.get('group')
        idols = bundle.get('idols', [])
        new_labels = bundle.get('newLabels', [])

        if not isinstance(group, dict):
            raise ValueError('group manquant ou invalide dans bundle.json')

        group_id = group.get('id')
        category = group.get('category')
        if not isinstance(group_id, str) or not isinstance(category, str):
            raise ValueError('group.id ou group.category invalide')

        if category not in VALID_CATEGORIES:
            raise ValueError(f'Catégorie inconnue: {category}')

        clean_group = sanitize_group_payload(group)
        group_path = GROUPS_DIR / category / f'{group_id}.json'
        save_json(group_path, clean_group)

        existing_idols = load_json(IDOLS_FILE, [])
        idol_map = {idol['id']: idol for idol in existing_idols if isinstance(idol, dict) and 'id' in idol}

        for idol in idols:
            if not isinstance(idol, dict):
                continue
            idol_id = idol.get('id')
            if not isinstance(idol_id, str):
                continue
            idol_map[idol_id] = sanitize_idol_payload(idol)
            print(f'  👤 Idol : {idol_id}')

        save_json(IDOLS_FILE, sorted(idol_map.values(), key=lambda i: i['id']))

        if isinstance(new_labels, list) and new_labels:
            existing_labels_raw = load_json(LABELS_FILE, [])
            if isinstance(existing_labels_raw, dict):
                existing_labels = existing_labels_raw.get('labels', [])
            else:
                existing_labels = existing_labels_raw

            label_map = {
                label['id']: label
                for label in existing_labels
                if isinstance(label, dict) and isinstance(label.get('id'), str)
            }

            for label in new_labels:
                if not isinstance(label, dict):
                    continue
                label_id = label.get('id')
                if isinstance(label_id, str):
                    label_map[label_id] = label
                    print(f"  🏷️ Label : {label.get('name', label_id)}")

            save_json(LABELS_FILE, sorted(label_map.values(), key=lambda l: l['id']))

        merge_assets_from_zip(zf)

    print(f'  ✓ Groupe {group_id} ({category}) intégré')


def main():
    if len(sys.argv) < 2:
        print('Usage: python scripts/merge-bundle.py bundle1.zip [bundle2.zip ...]')
        sys.exit(1)

    for category in VALID_CATEGORIES:
        (GROUPS_DIR / category).mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    ok = 0
    fail = 0

    for zip_path in sys.argv[1:]:
        if not os.path.exists(zip_path):
            print(f'❌ Fichier introuvable : {zip_path}')
            fail += 1
            continue

        try:
            merge_bundle_zip(zip_path)
            ok += 1
        except Exception as exc:
            print(f'❌ Erreur sur {zip_path}: {exc}')
            fail += 1

    print('\n📋 Reconstruction de groups/index.json…')
    rebuild_index()

    print('\n' + '=' * 50)
    print(f'✅ {ok} bundle(s) traité(s) — ❌ {fail} erreur(s)')
    print(f"Mise à jour: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == '__main__':
    main()
