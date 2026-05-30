#!/usr/bin/env python3
"""Convert the BSB concordance workbook into a compact JSON index."""

from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ENTRY_LABEL_RE = re.compile(r"^(.*?)\s+\((\d+)\s+Occurrences?\)$", re.IGNORECASE)
MAX_SAMPLES_PER_ENTRY = 4


def read_shared_strings(zip_file: zipfile.ZipFile) -> list[str]:
    shared: list[str] = []
    with zip_file.open("xl/sharedStrings.xml") as stream:
        for event, elem in ET.iterparse(stream, events=("end",)):
            if elem.tag != f"{NS}si":
                continue
            shared.append("".join(text.text or "" for text in elem.iter(f"{NS}t")))
            elem.clear()
    return shared


def cell_value(cell: ET.Element, shared: list[str]) -> str:
    value_element = cell.find(f"{NS}v")
    if value_element is None or value_element.text is None:
        return ""

    if cell.attrib.get("t") == "s":
        return shared[int(value_element.text)]

    return value_element.text


def row_values(row: ET.Element, shared: list[str]) -> dict[str, str]:
    values: dict[str, str] = {}
    for cell in row.findall(f"{NS}c"):
        ref = cell.attrib.get("r", "")
        column = "".join(char for char in ref if char.isalpha())
        values[column] = cell_value(cell, shared)
    return values


def convert_workbook(input_path: Path) -> dict[str, object]:
    with zipfile.ZipFile(input_path) as zip_file:
        shared = read_shared_strings(zip_file)

        entries: list[dict[str, object]] = []
        current_entry: dict[str, object] | None = None

        with zip_file.open("xl/worksheets/sheet1.xml") as stream:
            for event, elem in ET.iterparse(stream, events=("end",)):
                if elem.tag != f"{NS}row":
                    continue

                row_number = int(elem.attrib.get("r", "0"))
                if row_number <= 2:
                    elem.clear()
                    continue

                values = row_values(elem, shared)
                entry_label = values.get("G", "").strip()

                if entry_label:
                    if current_entry is not None:
                        entries.append(current_entry)

                    match = ENTRY_LABEL_RE.match(entry_label)
                    entry_text = match.group(1).strip() if match else entry_label
                    occurrence_count = int(match.group(2)) if match else int(values.get("F", "0") or "0")

                    current_entry = {
                        "sort": int(values.get("A", "0") or "0"),
                        "entry": entry_text,
                        "label": entry_label,
                        "occurrences": occurrence_count,
                        "bookCodes": [],
                        "samples": [],
                    }
                    elem.clear()
                    continue

                if current_entry is None:
                    elem.clear()
                    continue

                book_code = values.get("B", "").strip()
                reference = values.get("H", "").strip()
                context = values.get("I", "").strip()

                if book_code and book_code not in current_entry["bookCodes"]:
                    current_entry["bookCodes"].append(book_code)

                if reference and context:
                    samples = current_entry["samples"]
                    if len(samples) < MAX_SAMPLES_PER_ENTRY:
                        samples.append(
                            {
                                "bookCode": book_code,
                                "reference": reference,
                                "context": context,
                            }
                        )

                elem.clear()

        if current_entry is not None:
            entries.append(current_entry)

    return {
        "source": "BSB concordance",
        "entries": entries,
    }


def main() -> int:
    default_input = Path("app/data/bsb_concordance.xlsx")
    default_output = Path("app/data/bsb_concordance.json")

    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_input
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else default_output

    if not input_path.exists():
        print(f"Missing workbook: {input_path}", file=sys.stderr)
        return 1

    payload = convert_workbook(input_path)
    output_path.write_text(json.dumps(payload, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {output_path} with {len(payload['entries'])} entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
