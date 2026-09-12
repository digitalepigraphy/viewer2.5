#!/usr/bin/env python3
"""Build a JSON index from Digital Epigraphy and Archaeology record XML files."""

from __future__ import annotations

import argparse
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from PIL import Image


FIELDS_URL = "https://digitalepigraphy.github.io/viewer2.5/fields.xml"
THUMBNAIL_SIZE = 760
THUMBNAIL_SOURCE_NAMES = (
    "ImageLeft.png",
    "ImageRight.png",
    "ImageTop.png",
    "ImageBottom.png",
    "Heightmap.png",
)


def load_field_names(url: str = FIELDS_URL) -> dict[str, str]:
    """Fetch the viewer field dictionary and return numeric ID to name mappings."""
    with urllib.request.urlopen(url) as response:
        root = ET.fromstring(response.read())

    return {
        field.findtext("id", "").strip(): field.findtext("name", "").strip()
        for field in root.findall(".//field")
        if field.findtext("id") and field.findtext("name")
    }


def resolve_record_path(record_path: str, record_directory: Path) -> Path | None:
    """Resolve a relative record reference such as ../References/Person/Info.xml."""
    candidate = (record_directory / record_path).resolve()
    if candidate.is_file():
        return candidate

    reference_parts = tuple(
        "References" if part == "Resources" else part
        for part in Path(record_path).parts
    )
    if reference_parts == Path(record_path).parts:
        return None

    alternate = (record_directory / Path(*reference_parts)).resolve()
    return alternate if alternate.is_file() else None


def parse_reference(
    reference: ET.Element,
    record_directory: Path,
    field_names: dict[str, str],
    registry: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Return a compact ID for a referenced record or preserve direct attributes."""
    result: dict[str, Any] = dict(reference.attrib)
    reference_id = reference.get("id")
    if not reference_id:
        return result

    reference_path = resolve_record_path(reference_id, record_directory)
    if reference_path is None:
        return result

    indexed_id = reference_path.parent.name
    registry.setdefault(indexed_id, parse_record(reference_path, field_names))
    return {"id": indexed_id}


def parse_record(
    record_path: Path,
    field_names: dict[str, str],
    registries: dict[str, dict[str, dict[str, Any]]] | None = None,
    active_paths: frozenset[Path] | None = None,
) -> dict[str, Any]:
    """Convert one record XML file into a JSON-compatible dictionary."""
    root = ET.parse(record_path).getroot()
    active_paths = frozenset() if active_paths is None else active_paths
    current_paths = active_paths | {record_path}
    record: dict[str, Any] = {}
    editors: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []
    editor_registry = registries["Editors"] if registries else {}
    source_registry = registries["Sources"] if registries else {}

    for field in root.findall("field"):
        field_id = field.get("id", "")
        field_name = field_names.get(field_id, f"Field {field_id}")
        record[field_name] = field.get("value", "")

        for editor in field.findall("editor"):
            editors.append(
                parse_reference(editor, record_path.parent, field_names, editor_registry)
            )
        for source in field.findall("source"):
            sources.append(
                parse_reference(source, record_path.parent, field_names, source_registry)
            )

    if editors:
        record["Editors"] = editors
    if sources:
        record["Sources"] = sources

    for link in root.findall("record_link"):
        value = link.get("value", "")
        if not value.lower().endswith(".xml"):
            continue
        linked_path = resolve_record_path(value, record_path.parent)
        if linked_path is None or linked_path in current_paths:
            continue
        linked_record = parse_record(
            linked_path, field_names, registries, current_paths
        )
        nested_records = {
            key: value
            for key, value in linked_record.items()
            if isinstance(value, dict)
        }
        for key, value in nested_records.items():
            record[key] = value
            del linked_record[key]
        record[linked_path.stem] = linked_record

    return record


def make_thumbnail(record_directory: Path) -> Path | None:
    """Create thumb.jpg in record_directory from the first available source image."""
    source_path = next(
        (record_directory / name for name in THUMBNAIL_SOURCE_NAMES
         if (record_directory / name).is_file()),
        None,
    )
    if source_path is None:
        return None

    thumbnail_path = record_directory / "thumb.jpg"
    with Image.open(source_path) as image:
        image = image.convert("RGB")
        image.thumbnail((THUMBNAIL_SIZE, THUMBNAIL_SIZE), Image.LANCZOS)
        image.save(thumbnail_path, "JPEG", quality=90)
    return thumbnail_path


def load_existing_metadata(output_path: Path) -> tuple[str, str]:
    """Read Collection and URL values from a pre-existing index file, if any."""
    if not output_path.is_file():
        return "", ""
    try:
        existing = json.loads(output_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return "", ""
    return existing.get("Collection", ""), existing.get("URL", "")


def build_index(
    root_directory: Path,
    field_names: dict[str, str],
    collection: str = "",
    url: str = "",
) -> dict[str, Any]:
    """Build records and deduplicated editor/source registries."""
    registries: dict[str, dict[str, dict[str, Any]]] = {
        "Editors": {},
        "Sources": {},
    }
    records: dict[str, dict[str, Any]] = {}
    for info_path in sorted(root_directory.rglob("Info.xml")):
        if "References" in info_path.relative_to(root_directory).parts:
            continue
        folder_name = info_path.parent.name
        if folder_name in records:
            raise ValueError(f"Duplicate folder name in index: {folder_name}")

        entry = parse_record(info_path, field_names, registries)
        records[folder_name] = entry
        make_thumbnail(info_path.parent)
    return {
        "Collection": collection,
        "URL": url,
        "Records": records,
        "Editors": registries["Editors"],
        "Sources": registries["Sources"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=Path("."))
    parser.add_argument("-o", "--output", type=Path, default=Path("index.json"))
    parser.add_argument("--fields-url", default=FIELDS_URL)
    args = parser.parse_args()

    field_names = load_field_names(args.fields_url)
    collection, url = load_existing_metadata(args.output)
    index = build_index(args.root.resolve(), field_names, collection, url)
    args.output.write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Indexed {len(index['Records'])} folders into {args.output}")


if __name__ == "__main__":
    main()