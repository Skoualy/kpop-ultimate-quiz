#!/usr/bin/env python3
"""
merge-bundle.py — fusionne un ou plusieurs ZIP de contribution dans le dataset.

Usage:
    python merge-bundle.py bundle1.zip [bundle2.zip ...]

ZIP accepté pour merge final:
    bundle.json
    assets/groups/{groupId}/cover.webp        (optionnel)
    assets/idols/{idolId}/portrait.webp       (optionnel)

ZIP draft:
    draft.json (+ assets/...)
    -> non mergé dans le dataset (informatif uniquement).

Après le merge principal, les crédits images du bundle (champ `credits`)
sont automatiquement validés (lookup Wikimedia API) puis fusionnés dans
public/dataset/credits.json.
"""

from __future__ import annotations

import json
import re
import sys
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REPO_ROOT   = Path(__file__).resolve().parent.parent
DATASET_DIR = REPO_ROOT / 'public' / 'dataset'
GROUPS_DIR  = DATASET_DIR / 'groups'
IDOLS_FILE  = DATASET_DIR / 'idols.json'
LABELS_FILE = DATASET_DIR / 'labels.json'
INDEX_FILE  = GROUPS_DIR / 'index.json'
CREDITS_FILE = DATASET_DIR / 'credits.json'
ASSETS_DIR  = REPO_ROOT / 'assets'

VALID_CATEGORIES = {'girlGroup', 'boyGroup', 'femaleSoloist', 'maleSoloist'}

# ─── Wikimedia ────────────────────────────────────────────────────────────────

WIKIMEDIA_API  = "https://commons.wikimedia.org/w/api.php"
USER_AGENT     = "KPopQuizCreditsValidator/1.0 (kpop-quiz; contact@example.com)"
REQUEST_DELAY  = 0.5


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()


def _normalize_wikimedia_filename(filename: str) -> str:
    """Retire le suffixe .png parasite des fichiers SVG exportés par Wikimedia.
    Ex: 'File:Logo.svg.png' → 'File:Logo.svg'
    """
    if filename.endswith('.svg.png'):
        return filename[:-4]  # retire '.png'
    return filename


def query_wikimedia(filename: str) -> Optional[dict]:
    filename = _normalize_wikimedia_filename(filename)
    clean_filename = filename[:-4] if filename.endswith('.svg.png') else filename
    title = clean_filename if clean_filename.startswith("File:") else f"File:{clean_filename}"
    params = {
        "action": "query", "format": "json", "titles": title,
        "prop": "imageinfo", "iiprop": "url|user|extmetadata",
        "iiextmetadatafilter": "License|LicenseShortName|LicenseUrl|Artist|Credit|DateTimeOriginal",
        "iilimit": "1",
    }
    url = f"{WIKIMEDIA_API}?{urlencode(params)}"
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
    except (URLError, json.JSONDecodeError) as e:
        print(f"    ⚠ Wikimedia API error for '{filename}': {e}", file=sys.stderr)
        return None

    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None
    page = next(iter(pages.values()))
    if "missing" in page:
        return None
    imageinfo = page.get("imageinfo", [])
    if not imageinfo:
        return None

    info    = imageinfo[0]
    extmeta = info.get("extmetadata", {})

    def get_meta(key: str) -> Optional[str]:
        entry = extmeta.get(key, {})
        return entry.get("value") if entry else None

    artist_raw = get_meta("Artist") or info.get("user")
    artist = _strip_html(artist_raw) if artist_raw else None

    return {
        "commonsTitle": page.get("title"),
        "sourceUrl":    f"https://commons.wikimedia.org/wiki/{page.get('title', '').replace(' ', '_')}",
        "fileUrl":      info.get("url"),
        "author":       artist,
        "license":      get_meta("LicenseShortName"),
        "licenseUrl":   get_meta("LicenseUrl"),
    }

# ─── Credit helpers ───────────────────────────────────────────────────────────

def _make_validation(is_valid: bool, status: str,
                     errors: list[str] = None, warnings: list[str] = None) -> dict:
    return {"isValid": is_valid, "status": status,
            "errors": errors or [], "warnings": warnings or []}


def _validate_credit(credit: dict) -> dict:
    source_type = credit.get("sourceType")
    if not source_type:
        return _make_validation(False, "missing_source_type", ["sourceType manquant"])
    if source_type == "unknown":
        return _make_validation(False, "unsupported_source_type",
                                ["Source 'unknown' non valide pour publication"])
    if source_type == "wikimedia":
        if not credit.get("originalFileName"):
            return _make_validation(False, "missing_original_filename",
                                    ["originalFileName requis pour source wikimedia"])
        errors, warnings, status = [], [], "ok"
        if not credit.get("author"):
            errors.append("Auteur introuvable"); status = "missing_author"
        if not credit.get("license"):
            errors.append("Licence introuvable"); status = status if status != "ok" else "missing_license"
        if not credit.get("sourceUrl"):
            errors.append("URL source introuvable"); status = status if status != "ok" else "missing_source_url"
        is_valid = len(errors) == 0
        return _make_validation(is_valid, status, errors, warnings)
    # official
    return _make_validation(True, "manual_review_required",
                            [], ["Source officielle : validation manuelle requise"])


def _build_attribution(credit: dict) -> Optional[str]:
    parts = []
    if credit.get("originalFileName"): parts.append(credit["originalFileName"])
    if credit.get("author"):           parts.append(f"par {credit['author']}")
    if credit.get("license"):          parts.append(f"({credit['license']})")
    return " / ".join(parts) if parts else None


def _build_image_dims(report: dict, prefix: str) -> Optional[dict]:
    if not report:
        return None
    if prefix == "original":
        return {"format": report.get("originalMimeType"),
                "width": report.get("originalWidth"), "height": report.get("originalHeight")}
    return {"format": report.get("finalMimeType", "image/webp"),
            "width": report.get("finalWidth"), "height": report.get("finalHeight")}


def _process_credit_entry(raw: dict, group_id: str) -> dict:
    entity_type      = raw.get("entityType", "group")
    entity_id        = raw.get("entityId", group_id)
    asset_type       = raw.get("assetType", "cover")
    credit_input     = raw.get("creditInput", {})
    source_type      = credit_input.get("sourceType", "unknown")
    _raw_fname       = credit_input.get("originalFileName")
    original_fname   = _normalize_wikimedia_filename(_raw_fname) if _raw_fname else None
    transform_report = credit_input.get("transformReport")
    ai_modified      = bool(credit_input.get("aiModified", False))
    input_source_url = credit_input.get("sourceUrl")

    modifications = []
    if transform_report:
        if transform_report.get("wasCropped"):         modifications.append("recadrage")
        if transform_report.get("wasResized"):         modifications.append("redimensionnement")
        if transform_report.get("wasConvertedToWebp"): modifications.append("conversion webp")

    credit: dict = {
        "id":               f"{entity_type}/{entity_id}/{asset_type}",
        "entityType":       entity_type,
        "entityId":         entity_id,
        "assetType":        asset_type,
        "sourceType":       source_type,
        "originalFileName": original_fname,
        "commonsTitle":     None, "sourceUrl": None, "fileUrl": None,
        "author":           None, "license":   None, "licenseUrl": None,
        "modified":         bool(modifications),
        "modifications":    modifications,
        "aiModified":       ai_modified,
        "sourceUrl":        input_source_url if source_type == "other" else None,
        "originalImage":    _build_image_dims(transform_report, "original"),
        "finalImage":       _build_image_dims(transform_report, "final"),
        "attribution":      None,
        "validation":       _make_validation(False, "missing_source_type"),
    }

    print(f"    [{entity_type}/{entity_id}/{asset_type}] source: {source_type}")

    if source_type == "wikimedia" and original_fname:
        print(f"      → Lookup Wikimedia: {original_fname}")
        time.sleep(REQUEST_DELAY)
        wiki_data = query_wikimedia(original_fname)
        if wiki_data:
            credit.update(wiki_data)
            print(f"      ✓ {wiki_data.get('author')} · {wiki_data.get('license')}")
        else:
            print(f"      ✗ Introuvable sur Wikimedia Commons", file=sys.stderr)
            credit["validation"] = _make_validation(False, "lookup_failed",
                                                    [f"'{original_fname}' introuvable"])
            return credit

    credit["validation"]  = _validate_credit(credit)
    credit["attribution"] = _build_attribution(credit)
    status_icon = "✓" if credit["validation"]["isValid"] else "✗"
    print(f"      {status_icon} {credit['validation']['status']}")
    return credit

# ─── Credits dataset ──────────────────────────────────────────────────────────

def _load_credits() -> dict:
    if CREDITS_FILE.exists():
        with CREDITS_FILE.open(encoding="utf-8") as f:
            return json.load(f)
    return {"meta": {"schemaVersion": 1, "lastUpdated": "1970-01-01T00:00:00Z"}, "credits": []}


def _save_credits(data: dict):
    CREDITS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CREDITS_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✅ {CREDITS_FILE.relative_to(REPO_ROOT)}")


def _compute_credits_summary(credits: list[dict]) -> dict:
    total   = len(credits)
    valid   = sum(1 for c in credits if c.get("validation", {}).get("isValid", False))
    by_type: dict = {}
    for c in credits:
        st = c.get("sourceType", "unknown")
        by_type[st] = by_type.get(st, 0) + 1
    return {"total": total, "valid": valid, "invalid": total - valid,
            "bySourceType": by_type,
            "validationRate": round((valid / total * 100) if total else 0, 1)}


def merge_credits_from_bundle(raw_credits: list[dict], group_id: str):
    """Valide et fusionne les crédits du bundle dans dataset/credits.json."""
    if not raw_credits:
        return

    print(f"\n  🖼  Crédits images ({len(raw_credits)} entrée(s))")

    validated = [_process_credit_entry(r, group_id) for r in raw_credits]

    dataset     = _load_credits()
    existing    = dataset.get("credits", [])
    by_id       = {c["id"]: c for c in existing}
    added, updated = 0, 0

    for credit in validated:
        cid = credit["id"]
        if cid in by_id:
            updated += 1
        else:
            added += 1
        by_id[cid] = credit

    merged = sorted(by_id.values(),
                    key=lambda c: (c.get("entityType",""), c.get("entityId",""), c.get("assetType","")))

    dataset["credits"]             = merged
    dataset["meta"]["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
    dataset["meta"]["summary"]     = _compute_credits_summary(merged)

    _save_credits(dataset)
    print(f"    ✓ +{added} ajouté(s), ↺ {updated} mis à jour")

# ─── Helpers dataset ──────────────────────────────────────────────────────────

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

# ─── Main merge ───────────────────────────────────────────────────────────────

def merge_bundle_zip(zip_path: str):
    print(f'\n📦 Traitement de {zip_path}')

    with zipfile.ZipFile(zip_path, 'r') as zf:
        names = set(zf.namelist())

        if 'bundle.json' not in names:
            if 'draft.json' in names:
                print('  ⚠️ ZIP draft détecté (draft.json). Aucun merge dataset effectué.')
                return
            raise ValueError('bundle.json manquant dans le ZIP')

        bundle     = json.loads(zf.read('bundle.json'))
        group      = bundle.get('group')
        idols      = bundle.get('idols', [])
        new_labels = bundle.get('newLabels', [])
        raw_credits = bundle.get('credits', [])   # ← crédits images

        if not isinstance(group, dict):
            raise ValueError('group manquant ou invalide dans bundle.json')

        group_id = group.get('id')
        category = group.get('category')
        if not isinstance(group_id, str) or not isinstance(category, str):
            raise ValueError('group.id ou group.category invalide')
        if category not in VALID_CATEGORIES:
            raise ValueError(f'Catégorie inconnue: {category}')

        # ── Groupe ────────────────────────────────────────────────────────────
        clean_group = sanitize_group_payload(group)
        group_path  = GROUPS_DIR / category / f'{group_id}.json'
        save_json(group_path, clean_group)

        # ── Idoles ────────────────────────────────────────────────────────────
        existing_idols = load_json(IDOLS_FILE, [])
        idol_map = {idol['id']: idol for idol in existing_idols
                    if isinstance(idol, dict) and 'id' in idol}
        for idol in idols:
            if not isinstance(idol, dict):
                continue
            idol_id = idol.get('id')
            if not isinstance(idol_id, str):
                continue
            idol_map[idol_id] = sanitize_idol_payload(idol)
            print(f'  👤 Idol : {idol_id}')
        save_json(IDOLS_FILE, sorted(idol_map.values(), key=lambda i: i['id']))

        # ── Labels ────────────────────────────────────────────────────────────
        if isinstance(new_labels, list) and new_labels:
            existing_labels_raw = load_json(LABELS_FILE, [])
            existing_labels = (existing_labels_raw.get('labels', [])
                               if isinstance(existing_labels_raw, dict)
                               else existing_labels_raw)
            label_map = {label['id']: label for label in existing_labels
                         if isinstance(label, dict) and isinstance(label.get('id'), str)}
            for label in new_labels:
                if not isinstance(label, dict):
                    continue
                label_id = label.get('id')
                if isinstance(label_id, str):
                    label_map[label_id] = label
                    print(f"  🏷️ Label : {label.get('name', label_id)}")
            save_json(LABELS_FILE, sorted(label_map.values(), key=lambda l: l['id']))

        # ── Assets ────────────────────────────────────────────────────────────
        merge_assets_from_zip(zf)

    # ── Crédits (après fermeture du ZIP) ──────────────────────────────────────
    merge_credits_from_bundle(raw_credits, group_id)

    print(f'  ✓ Groupe {group_id} ({category}) intégré')


def main():
    if len(sys.argv) < 2:
        print('Usage: python scripts/merge-bundle.py bundle1.zip [bundle2.zip ...]')
        sys.exit(1)

    for category in VALID_CATEGORIES:
        (GROUPS_DIR / category).mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    ok = fail = 0

    for zip_path in sys.argv[1:]:
        try:
            merge_bundle_zip(zip_path)
            ok += 1
        except FileNotFoundError:
            print(f'❌ Fichier introuvable : {zip_path}')
            fail += 1
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
