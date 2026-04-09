#!/usr/bin/env python3
"""
merge-bundle.py — Fusionne un ou plusieurs ZIPs de contribution dans le dataset.

Usage:
    python merge-bundle.py bundle1.zip [bundle2.zip ...]

Structure attendue dans chaque ZIP:
    bundle.json
    assets/groups/{groupId}/cover.webp        (optionnel)
    assets/idols/{idolId}/portrait.webp       (optionnel)

Structure dataset cible:
    dataset/groups/{category}/{groupId}.json
    dataset/groups/index.json
    dataset/idols.json
    dataset/labels.json
    public/assets/groups/{groupId}/cover.webp
    public/assets/idols/{idolId}/portrait.webp
"""

import json
import os
import sys
import zipfile
from pathlib import Path
from datetime import datetime

# ─── Chemins ──────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent
DATASET_DIR  = ROOT / "dataset"
GROUPS_DIR   = DATASET_DIR / "groups"
IDOLS_FILE   = DATASET_DIR / "idols.json"
LABELS_FILE  = DATASET_DIR / "labels.json"
ASSETS_DIR   = ROOT / "public" / "assets"
INDEX_FILE   = GROUPS_DIR / "index.json"

VALID_CATEGORIES = {"girlGroup", "boyGroup", "femaleSoloist", "maleSoloist"}


def load_json(path: Path, default=None):
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default if default is not None else {}


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✅ {path.relative_to(ROOT)}")


def rebuild_index():
    """Reconstruit index.json depuis les fichiers présents dans dataset/groups/"""
    entries = []
    for cat in VALID_CATEGORIES:
        cat_dir = GROUPS_DIR / cat
        if not cat_dir.exists():
            continue
        for json_file in sorted(cat_dir.glob("*.json")):
            entries.append({"id": json_file.stem, "category": cat})
    save_json(INDEX_FILE, entries)


def merge_bundle(zip_path: str):
    print(f"\n📦 Traitement de {zip_path}")

    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()

        # ── Lecture bundle.json ─────────────────────────────────────────────
        if "bundle.json" not in names:
            print(f"  ❌ bundle.json manquant — ignoré")
            return

        bundle = json.loads(zf.read("bundle.json"))
        group  = bundle.get("group")
        idols  = bundle.get("idols", [])
        new_labels = bundle.get("newLabels", [])

        if not group or not group.get("id") or not group.get("category"):
            print("  ❌ group.id ou group.category manquant — ignoré")
            return

        group_id  = group["id"]
        category  = group["category"]

        if category not in VALID_CATEGORIES:
            print(f"  ❌ Catégorie inconnue : {category}")
            return

        # ── Sauvegarde du groupe ────────────────────────────────────────────
        group_path = GROUPS_DIR / category / f"{group_id}.json"
        save_json(group_path, group)

        # ── Mise à jour idols.json ─────────────────────────────────────────
        existing_idols = load_json(IDOLS_FILE, [])
        idol_map = {i["id"]: i for i in existing_idols}
        for idol in idols:
            idol_id = idol.get("id")
            if not idol_id:
                continue
            idol_map[idol_id] = idol
            print(f"  👤 Idol : {idol_id}")
        save_json(IDOLS_FILE, list(idol_map.values()))

        # ── Mise à jour labels.json ────────────────────────────────────────
        if new_labels:
            existing_labels = load_json(LABELS_FILE, {"labels": []})
            label_map = {l["id"]: l for l in existing_labels.get("labels", [])}
            for label in new_labels:
                lid = label.get("id")
                if lid and lid not in label_map:
                    label_map[lid] = label
                    print(f"  🏷️  Label : {label.get('name')}")
            save_json(LABELS_FILE, {"labels": list(label_map.values())})

        # ── Assets ──────────────────────────────────────────────────────────
        for name in names:
            if name == "bundle.json" or not name.startswith("assets/"):
                continue
            target = ASSETS_DIR / Path(name).relative_to("assets")
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(name) as src, open(target, "wb") as dst:
                dst.write(src.read())
            print(f"  🖼  Asset : {target.relative_to(ROOT)}")

    print(f"  ✓ Groupe {group_id} ({category}) intégré avec succès")


def main():
    if len(sys.argv) < 2:
        print("Usage: python merge-bundle.py bundle1.zip [bundle2.zip ...]")
        sys.exit(1)

    # Création des répertoires si besoin
    for cat in VALID_CATEGORIES:
        (GROUPS_DIR / cat).mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    zip_files = sys.argv[1:]
    ok, fail = 0, 0

    for zip_path in zip_files:
        if not os.path.exists(zip_path):
            print(f"❌ Fichier introuvable : {zip_path}")
            fail += 1
            continue
        try:
            merge_bundle(zip_path)
            ok += 1
        except Exception as e:
            print(f"  ❌ Erreur : {e}")
            fail += 1

    # Reconstruction de l'index
    print("\n📋 Reconstruction de index.json…")
    rebuild_index()

    print(f"\n{'='*50}")
    print(f"✅ {ok} bundle(s) intégré(s) — ❌ {fail} erreur(s)")
    print(f"Dataset mis à jour : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
