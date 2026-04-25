#!/usr/bin/env python3
"""
validate-credits.py — Validation des crédits images d'un bundle contributor.

Usage:
    python scripts/validate-credits.py path/to/bundle.json [--output credits_validated.json]

Ce script :
  1. Lit un bundle de contribution (avec son champ `credits`)
  2. Pour chaque crédit de type 'wikimedia', interroge l'API Wikimedia Commons
     pour récupérer auteur, licence, URL source
  3. Construit des entrées AssetCredit complètes
  4. Valide chaque entrée et produit un rapport
  5. Écrit un fichier JSON de sortie avec les entrées validées

API Wikimedia utilisée :
  https://commons.wikimedia.org/w/api.php
  action=query, titles=File:..., prop=imageinfo, iiprop=url|user|extmetadata
"""

import json
import sys
import time
import hashlib
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import URLError
from urllib.parse import urlencode

# ─── Constants ────────────────────────────────────────────────────────────────

WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT    = "KPopQuizCreditsValidator/1.0 (kpop-quiz; contact@example.com)"
REQUEST_DELAY = 0.5   # secondes entre requêtes API (respecter les limites de taux)

# ─── Types Python (miroir des types TS) ───────────────────────────────────────

def make_validation(
    is_valid: bool,
    status: str,
    errors: list[str] = None,
    warnings: list[str] = None,
) -> dict:
    return {
        "isValid": is_valid,
        "status": status,
        "errors": errors or [],
        "warnings": warnings or [],
    }

def make_asset_credit(
    entity_type: str,
    entity_id: str,
    asset_type: str,
    source_type: str,
    original_file_name: Optional[str],
    transform_report: Optional[dict],
) -> dict:
    """Crée une entrée AssetCredit vide (à enrichir par lookup Wikimedia)."""
    credit_id = f"{entity_type}/{entity_id}/{asset_type}"
    modifications = []
    modified = False

    if transform_report:
        if transform_report.get("wasCropped"):        modifications.append("recadrage")
        if transform_report.get("wasResized"):        modifications.append("redimensionnement")
        if transform_report.get("wasConvertedToWebp"): modifications.append("conversion webp")
        modified = bool(modifications)

    return {
        "id":               credit_id,
        "entityType":       entity_type,
        "entityId":         entity_id,
        "assetType":        asset_type,
        "sourceType":       source_type,
        "originalFileName": original_file_name,
        "commonsTitle":     None,
        "sourceUrl":        None,
        "fileUrl":          None,
        "author":           None,
        "license":          None,
        "licenseUrl":       None,
        "modified":         modified,
        "modifications":    modifications,
        "originalImage":    _build_image_dims(transform_report, "original") if transform_report else None,
        "finalImage":       _build_image_dims(transform_report, "final")    if transform_report else None,
        "attribution":      None,
        "validation":       make_validation(False, "missing_source_type"),
    }

def _build_image_dims(report: dict, prefix: str) -> Optional[dict]:
    if not report:
        return None
    if prefix == "original":
        return {
            "format": report.get("originalMimeType"),
            "width":  report.get("originalWidth"),
            "height": report.get("originalHeight"),
        }
    else:
        return {
            "format": report.get("finalMimeType", "image/webp"),
            "width":  report.get("finalWidth"),
            "height": report.get("finalHeight"),
        }

# ─── Wikimedia API ────────────────────────────────────────────────────────────

def query_wikimedia(filename: str) -> Optional[dict]:
    """
    Interroge l'API Wikimedia Commons pour un fichier donné.
    Retourne les métadonnées ou None si introuvable.

    filename: ex "File:Jihyo_TWICE_2019.jpg"
    """
    # Normaliser le titre
    title = filename if filename.startswith("File:") else f"File:{filename}"

    params = {
        "action":    "query",
        "format":    "json",
        "titles":    title,
        "prop":      "imageinfo",
        "iiprop":    "url|user|extmetadata",
        "iiextmetadatafilter": "License|LicenseShortName|LicenseUrl|Artist|Credit|DateTimeOriginal",
        "iilimit":   "1",
    }

    url = f"{WIKIMEDIA_API}?{urlencode(params)}"
    req = Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (URLError, json.JSONDecodeError) as e:
        print(f"  ⚠ Erreur API Wikimedia pour '{filename}': {e}", file=sys.stderr)
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

    info     = imageinfo[0]
    extmeta  = info.get("extmetadata", {})

    def get_meta(key: str) -> Optional[str]:
        entry = extmeta.get(key, {})
        return entry.get("value") if entry else None

    # Nettoyage HTML minimal de l'artiste
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

def _strip_html(text: str) -> str:
    """Retire les balises HTML basiques d'une chaîne."""
    import re
    return re.sub(r"<[^>]+>", "", text).strip()

# ─── Validation ───────────────────────────────────────────────────────────────

def validate_credit(credit: dict) -> dict:
    """Valide une entrée AssetCredit complète et retourne la validation."""
    errors   = []
    warnings = []
    status   = "ok"

    source_type = credit.get("sourceType")

    if not source_type:
        return make_validation(False, "missing_source_type", ["sourceType manquant"])

    if source_type == "unknown":
        return make_validation(
            False, "unsupported_source_type",
            ["Source 'unknown' non valide pour publication"],
            ["Fournir une source wikimedia ou official"],
        )

    if source_type == "wikimedia":
        if not credit.get("originalFileName"):
            errors.append("originalFileName requis pour source wikimedia")
            return make_validation(False, "missing_original_filename", errors)

        if not credit.get("author"):
            errors.append("Auteur introuvable via Wikimedia API")
            status = "missing_author"

        if not credit.get("license"):
            errors.append("Licence introuvable via Wikimedia API")
            status = "missing_license" if status == "ok" else status

        if not credit.get("licenseUrl"):
            warnings.append("URL de licence manquante")
            if status == "ok":
                status = "missing_license_url"

        if not credit.get("sourceUrl"):
            errors.append("URL source introuvable")
            if status == "ok":
                status = "missing_source_url"

    elif source_type == "official":
        warnings.append("Source officielle : validation manuelle requise")
        status = "manual_review_required"
        if not credit.get("author"):
            warnings.append("Auteur non renseigné")
        if not credit.get("license"):
            warnings.append("Licence non renseignée")

    is_valid = len(errors) == 0 and status in ("ok", "manual_review_required")
    return make_validation(is_valid, status, errors, warnings)

# ─── Attribution builder ──────────────────────────────────────────────────────

def build_attribution(credit: dict) -> Optional[str]:
    """Construit le texte d'attribution affiché publiquement."""
    parts = []

    if credit.get("originalFileName"):
        parts.append(credit["originalFileName"])

    if credit.get("author"):
        parts.append(f"par {credit['author']}")

    if credit.get("license"):
        parts.append(f"({credit['license']})")

    return " / ".join(parts) if parts else None

# ─── Main ─────────────────────────────────────────────────────────────────────

def process_bundle(bundle_path: Path) -> list[dict]:
    """Traite un bundle et retourne la liste des AssetCredit validés."""
    with open(bundle_path, encoding="utf-8") as f:
        bundle = json.load(f)

    raw_credits: list[dict] = bundle.get("credits", [])
    if not raw_credits:
        print("  ℹ Aucun crédit dans ce bundle (champ 'credits' vide ou absent).")
        return []

    group_data = bundle.get("group", {})
    group_id   = group_data.get("id", "unknown")

    results    = []
    total      = len(raw_credits)

    print(f"  📋 {total} crédit(s) à traiter pour l\'artiste '{group_id}'")

    for i, raw in enumerate(raw_credits, 1):
        entity_type      = raw.get("entityType", "group")
        entity_id        = raw.get("entityId", group_id)
        asset_type       = raw.get("assetType", "cover")
        credit_input     = raw.get("creditInput", {})
        source_type      = credit_input.get("sourceType", "unknown")
        original_fname   = credit_input.get("originalFileName")
        transform_report = credit_input.get("transformReport")

        print(f"  [{i}/{total}] {entity_type}/{entity_id}/{asset_type} — source: {source_type}")

        credit = make_asset_credit(
            entity_type, entity_id, asset_type,
            source_type, original_fname, transform_report,
        )

        # Enrichissement Wikimedia si applicable
        if source_type == "wikimedia" and original_fname:
            print(f"    → Lookup Wikimedia: {original_fname}")
            time.sleep(REQUEST_DELAY)
            wiki_data = query_wikimedia(original_fname)

            if wiki_data:
                credit.update(wiki_data)
                print(f"    ✓ Auteur: {wiki_data.get('author')} · Licence: {wiki_data.get('license')}")
            else:
                print(f"    ✗ Introuvable sur Wikimedia Commons", file=sys.stderr)
                credit["validation"] = make_validation(
                    False, "lookup_failed",
                    [f"'{original_fname}' introuvable sur Wikimedia Commons"],
                )
                results.append(credit)
                continue

        # Validation finale
        credit["validation"]  = validate_credit(credit)
        credit["attribution"] = build_attribution(credit)

        status = "✓" if credit["validation"]["isValid"] else "✗"
        print(f"    {status} Validation: {credit['validation']['status']}")

        results.append(credit)

    return results


def main():
    parser = argparse.ArgumentParser(description="Valider les crédits images d'un bundle contributor")
    parser.add_argument("bundle", help="Chemin vers le bundle JSON contributor")
    parser.add_argument("--output", default=None, help="Chemin de sortie (défaut: credits_validated.json)")
    args = parser.parse_args()

    bundle_path = Path(args.bundle)
    if not bundle_path.exists():
        print(f"Erreur : fichier introuvable : {bundle_path}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output) if args.output else bundle_path.parent / "credits_validated.json"

    print(f"\n🔍 Validation des crédits — {bundle_path.name}")
    print("=" * 60)

    credits = process_bundle(bundle_path)

    result = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "sourceBundle": str(bundle_path),
        "credits":      credits,
        "summary": {
            "total":   len(credits),
            "valid":   sum(1 for c in credits if c["validation"]["isValid"]),
            "invalid": sum(1 for c in credits if not c["validation"]["isValid"]),
        },
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print(f"✅ Validation terminée : {result['summary']['valid']}/{result['summary']['total']} valides")
    print(f"📄 Résultat : {output_path}")


if __name__ == "__main__":
    main()
