#!/usr/bin/env python3
"""
Migrate old assets structure to the new one used by K-Pop Ultimate Quiz.

Old structure:
    assets/{groupId}/idols/{idolId}.jpg|jpeg|png|webp

New structure:
    assets/
      groups/{groupId}/
      idols/{idolId}/portrait.webp|jpg|jpeg|png
      placeholders/

Features:
- create-only mode: only create folder structure
- migrate mode: copy or move idol portraits from old structure
- optional dataset scan to create folders for known groups/idols
- optional conversion to webp (requires Pillow)

Examples:
    python migrate_assets_structure.py --assets ./assets --create-only
    python migrate_assets_structure.py --assets ./assets --dataset ./public/dataset --create-only
    python migrate_assets_structure.py --assets ./assets --migrate --dry-run
    python migrate_assets_structure.py --assets ./assets --migrate --convert-webp
    python migrate_assets_structure.py --assets ./assets --migrate --move
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Iterable

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def iter_group_files(dataset_root: Path) -> Iterable[Path]:
    groups_root = dataset_root / "groups"
    if not groups_root.exists():
        return []

    files: list[Path] = []
    for path in groups_root.rglob("*.json"):
        if path.name == "index.json":
            continue
        files.append(path)
    return files


def collect_known_entities(dataset_root: Path) -> tuple[set[str], set[str]]:
    group_ids: set[str] = set()
    idol_ids: set[str] = set()

    groups_root = dataset_root / "groups"
    index_file = groups_root / "index.json"
    if index_file.exists():
        try:
            index_data = load_json(index_file)
            if isinstance(index_data, list):
                for entry in index_data:
                    if isinstance(entry, dict) and isinstance(entry.get("id"), str):
                        group_ids.add(entry["id"])
        except Exception as exc:
            print(f"[WARN] Failed to read {index_file}: {exc}", file=sys.stderr)

    for group_file in iter_group_files(dataset_root):
        try:
            group = load_json(group_file)
        except Exception as exc:
            print(f"[WARN] Failed to read {group_file}: {exc}", file=sys.stderr)
            continue

        group_id = group.get("id")
        if isinstance(group_id, str):
            group_ids.add(group_id)

        members = group.get("members", [])
        if isinstance(members, list):
            for member in members:
                if isinstance(member, dict):
                    idol_id = member.get("idolId")
                    if isinstance(idol_id, str):
                        idol_ids.add(idol_id)

    idols_file = dataset_root / "idols.json"
    if idols_file.exists():
        try:
            idols_data = load_json(idols_file)
            if isinstance(idols_data, list):
                for idol in idols_data:
                    if isinstance(idol, dict) and isinstance(idol.get("id"), str):
                        idol_ids.add(idol["id"])
        except Exception as exc:
            print(f"[WARN] Failed to read {idols_file}: {exc}", file=sys.stderr)

    return group_ids, idol_ids


def ensure_dir(path: Path, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY] mkdir -p {path}")
        return
    path.mkdir(parents=True, exist_ok=True)


def create_structure(assets_root: Path, group_ids: set[str], idol_ids: set[str], dry_run: bool) -> None:
    ensure_dir(assets_root / "groups", dry_run)
    ensure_dir(assets_root / "idols", dry_run)
    ensure_dir(assets_root / "placeholders", dry_run)

    for group_id in sorted(group_ids):
        ensure_dir(assets_root / "groups" / group_id, dry_run)

    for idol_id in sorted(idol_ids):
        ensure_dir(assets_root / "idols" / idol_id, dry_run)


def detect_old_idol_images(assets_root: Path) -> list[tuple[str, str, Path]]:
    results: list[tuple[str, str, Path]] = []

    reserved = {"groups", "idols", "placeholders"}

    if not assets_root.exists():
        return results

    for group_dir in assets_root.iterdir():
        if not group_dir.is_dir():
            continue
        if group_dir.name in reserved:
            continue

        old_idols_dir = group_dir / "idols"
        if not old_idols_dir.exists() or not old_idols_dir.is_dir():
            continue

        for image_file in old_idols_dir.iterdir():
            if not image_file.is_file():
                continue
            if image_file.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            idol_id = image_file.stem
            results.append((group_dir.name, idol_id, image_file))

    return results


def convert_to_webp(src: Path, dest: Path, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY] convert {src} -> {dest}")
        return

    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Pillow is required for --convert-webp. Install it with: pip install pillow") from exc

    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as img:
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        img.save(dest, format="WEBP", quality=95, method=6)


def transfer_file(src: Path, dest: Path, move: bool, dry_run: bool) -> None:
    if dry_run:
        action = "mv" if move else "cp"
        print(f"[DRY] {action} {src} -> {dest}")
        return

    dest.parent.mkdir(parents=True, exist_ok=True)
    if move:
        shutil.move(str(src), str(dest))
    else:
        shutil.copy2(src, dest)


def migrate_old_structure(assets_root: Path, move: bool, dry_run: bool, convert_webp: bool) -> int:
    migrated_count = 0
    old_images = detect_old_idol_images(assets_root)

    if not old_images:
        print("[INFO] No old idol images found.")
        return migrated_count

    for group_id, idol_id, src in old_images:
        target_dir = assets_root / "idols" / idol_id
        if convert_webp:
            dest = target_dir / "portrait.webp"
            try:
                convert_to_webp(src, dest, dry_run)
                migrated_count += 1
                if move and not dry_run:
                    src.unlink(missing_ok=True)
            except Exception as exc:
                print(f"[ERROR] Failed to convert {src}: {exc}", file=sys.stderr)
        else:
            dest = target_dir / f"portrait{src.suffix.lower()}"
            try:
                transfer_file(src, dest, move, dry_run)
                migrated_count += 1
            except Exception as exc:
                print(f"[ERROR] Failed to transfer {src}: {exc}", file=sys.stderr)

    print(f"[INFO] Migrated {migrated_count} idol image(s).")
    return migrated_count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate old assets structure to the new K-Pop Ultimate Quiz layout.")
    parser.add_argument("--assets", type=Path, required=True, help="Path to the assets root folder.")
    parser.add_argument("--dataset", type=Path, help="Path to dataset root (example: ./public/dataset).")
    parser.add_argument("--create-only", action="store_true", help="Only create folders, do not migrate files.")
    parser.add_argument("--migrate", action="store_true", help="Migrate old idol images to the new structure.")
    parser.add_argument("--move", action="store_true", help="Move files instead of copying them.")
    parser.add_argument("--dry-run", action="store_true", help="Preview actions without writing anything.")
    parser.add_argument("--convert-webp", action="store_true", help="Convert migrated images to portrait.webp (requires Pillow).")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.create_only and not args.migrate:
        print("[ERROR] You must specify at least one action: --create-only and/or --migrate", file=sys.stderr)
        return 1

    assets_root: Path = args.assets
    dataset_root: Path | None = args.dataset

    group_ids: set[str] = set()
    idol_ids: set[str] = set()

    if dataset_root:
        if not dataset_root.exists():
            print(f"[ERROR] Dataset path does not exist: {dataset_root}", file=sys.stderr)
            return 1
        group_ids, idol_ids = collect_known_entities(dataset_root)

    if args.create_only:
        create_structure(assets_root, group_ids, idol_ids, args.dry_run)
        print("[INFO] Folder structure ready.")

    if args.migrate:
        create_structure(assets_root, group_ids, idol_ids, args.dry_run)
        migrate_old_structure(
            assets_root=assets_root,
            move=args.move,
            dry_run=args.dry_run,
            convert_webp=args.convert_webp,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
