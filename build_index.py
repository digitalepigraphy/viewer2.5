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
) -> dict[str, Any]:
    """Parse a source/editor element and its referenced Info.xml, if present."""
    result: dict[str, Any] = dict(reference.attrib)
    reference_id = reference.get("id")
    if not reference_id:
        return result

    reference_path = resolve_record_path(reference_id, record_directory)
    if reference_path is None:
        return result

    result.update(parse_record(reference_path, field_names))
    return result


def parse_record(
    record_path: Path,
    field_names: dict[str, str],
) -> dict[str, Any]:
    """Convert one record XML file into a JSON-compatible dictionary."""
    root = ET.parse(record_path).getroot()
    record: dict[str, Any] = {}
    editors: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []

    for field in root.findall("field"):
        field_id = field.get("id", "")
        field_name = field_names.get(field_id, f"Field {field_id}")
        record[field_name] = field.get("value", "")

        for editor in field.findall("editor"):
            editors.append(parse_reference(editor, record_path.parent, field_names))
        for source in field.findall("source"):
            sources.append(parse_reference(source, record_path.parent, field_names))

    if editors:
        record["Editors"] = editors
    if sources:
        record["Sources"] = sources

    return record


def build_index(root_directory: Path, field_names: dict[str, str]) -> dict[str, dict[str, Any]]:
    """Index every directory below root_directory that contains Info.xml."""
    index: dict[str, dict[str, Any]] = {}
    for info_path in sorted(root_directory.rglob("Info.xml")):
        folder_name = info_path.parent.name
        if folder_name in index:
            raise ValueError(f"Duplicate folder name in index: {folder_name}")

        entry = parse_record(info_path, field_names)
        for record_name in ("Squeeze", "Inscription"):
            record_path = info_path.parent / f"{record_name}.xml"
            if record_path.is_file():
                entry[record_name] = parse_record(record_path, field_names)
        index[folder_name] = entry
    return index


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
    print(f"Indexed {len(index)} folders into {args.output}")


if __name__ == "__main__":
    main()