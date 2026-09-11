#!/usr/bin/env python3
"""Build a JSON index from Ancyranum record XML files."""

from __future__ import annotations

import argparse
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any


FIELDS_URL = "https://digitalepigraphy.github.io/viewer2.5/fields.xml"


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
    return candidate if candidate.is_file() else None


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
) -> dict[str, Any]:
    """Convert one record XML file into a JSON-compatible dictionary."""
    root = ET.parse(record_path).getroot()
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
        if linked_path is None or linked_path == record_path:
            continue
        record[linked_path.stem] = parse_record(linked_path, field_names, registries)

    return record


def build_index(root_directory: Path, field_names: dict[str, str]) -> dict[str, Any]:
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
    return {
        "Collection": "",
        "URL": "",
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
    index = build_index(args.root.resolve(), field_names)
    args.output.write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Indexed {len(index['Records'])} folders into {args.output}")


if __name__ == "__main__":
    main()