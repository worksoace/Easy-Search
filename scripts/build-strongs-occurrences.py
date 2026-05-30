#!/usr/bin/env python3
"""Build Strong's occurrence counts from OSHB OSIS XML + STEPBible TAGNT."""

from __future__ import annotations

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


OSIS_NS = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"
GITHUB_API = "https://api.github.com/repos/openscriptures/morphhb/contents/wlc"
RAW_BASE = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc"
TAGNT_FILES = [
    "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/"
    "Translators%20Amalgamated%20OT%2BNT/"
    "TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-"
    "%20STEPBible.org%20CC-BY.txt",
    "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/"
    "Translators%20Amalgamated%20OT%2BNT/"
    "TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-"
    "%20STEPBible.org%20CC-BY.txt",
]

BOOK_MAP = {
    "Gen": "Genesis",
    "Exod": "Exodus",
    "Lev": "Leviticus",
    "Num": "Numbers",
    "Deut": "Deuteronomy",
    "Josh": "Joshua",
    "Judg": "Judges",
    "Ruth": "Ruth",
    "1Sam": "1 Samuel",
    "2Sam": "2 Samuel",
    "1Kgs": "1 Kings",
    "2Kgs": "2 Kings",
    "1Chr": "1 Chronicles",
    "2Chr": "2 Chronicles",
    "Ezra": "Ezra",
    "Neh": "Nehemiah",
    "Esth": "Esther",
    "Job": "Job",
    "Ps": "Psalms",
    "Prov": "Proverbs",
    "Eccl": "Ecclesiastes",
    "Song": "Song of Solomon",
    "Isa": "Isaiah",
    "Jer": "Jeremiah",
    "Lam": "Lamentations",
    "Ezek": "Ezekiel",
    "Dan": "Daniel",
    "Hos": "Hosea",
    "Joel": "Joel",
    "Amos": "Amos",
    "Obad": "Obadiah",
    "Jonah": "Jonah",
    "Mic": "Micah",
    "Nah": "Nahum",
    "Hab": "Habakkuk",
    "Zeph": "Zephaniah",
    "Hag": "Haggai",
    "Zech": "Zechariah",
    "Mal": "Malachi",
}

NT_BOOK_MAP = {
    "Mat": "Matthew",
    "Mar": "Mark",
    "Mrk": "Mark",
    "Luk": "Luke",
    "Joh": "John",
    "Jhn": "John",
    "Act": "Acts",
    "Rom": "Romans",
    "1Co": "1 Corinthians",
    "2Co": "2 Corinthians",
    "Gal": "Galatians",
    "Eph": "Ephesians",
    "Php": "Philippians",
    "Col": "Colossians",
    "1Th": "1 Thessalonians",
    "2Th": "2 Thessalonians",
    "1Ti": "1 Timothy",
    "2Ti": "2 Timothy",
    "Tit": "Titus",
    "Phm": "Philemon",
    "Heb": "Hebrews",
    "Jas": "James",
    "1Pe": "1 Peter",
    "2Pe": "2 Peter",
    "1Jo": "1 John",
    "2Jo": "2 John",
    "3Jo": "3 John",
    "1Jn": "1 John",
    "2Jn": "2 John",
    "3Jn": "3 John",
    "Jud": "Jude",
    "Rev": "Revelation",
}


def fetch_json(url: str) -> list[dict]:
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url) as response:
        return response.read()


def parse_osis_ids(osis_id: str) -> tuple[str, int, int]:
    parts = osis_id.split(".")
    if len(parts) < 3:
        raise ValueError(f"Unexpected osisID: {osis_id}")
    book = BOOK_MAP.get(parts[0], parts[0])
    chapter = int(parts[1])
    verse = int(parts[2])
    return book, chapter, verse


def extract_strongs(lemma: str, prefix: str) -> list[str]:
    numbers = re.findall(r"\d+", lemma)
    strongs = []
    for number in numbers:
        value = int(number)
        if value <= 0:
            continue
        strongs.append(f"{prefix}{value}")
    return strongs


def add_sample(occurrences: dict[str, dict], strongs: str, reference: str, word: str, max_samples: int) -> None:
    entry = occurrences.setdefault(strongs, {"total": 0, "samples": []})
    entry["total"] += 1
    if word and len(entry["samples"]) < max_samples:
        entry["samples"].append({"reference": reference, "word": word})


def build_occurrences(max_samples: int = 4) -> dict[str, dict]:
    occurrences: dict[str, dict] = {}
    listing = fetch_json(GITHUB_API)
    xml_files = [item["name"] for item in listing if item["name"].endswith(".xml")]

    for filename in xml_files:
        url = f"{RAW_BASE}/{filename}"
        data = fetch_bytes(url)
        root = ET.fromstring(data)

        for verse in root.iter(f"{OSIS_NS}verse"):
            osis_id = verse.attrib.get("osisID")
            if not osis_id:
                continue
            try:
                book, chapter, verse_num = parse_osis_ids(osis_id)
            except ValueError:
                continue

            for word in verse.iter(f"{OSIS_NS}w"):
                lemma = word.attrib.get("lemma", "")
                if not lemma:
                    continue
                strongs_list = extract_strongs(lemma, "H")
                if not strongs_list:
                    continue
                text = (word.text or "").strip()
                for strongs in strongs_list:
                    add_sample(
                        occurrences,
                        strongs,
                        f"{book} {chapter}:{verse_num}",
                        text,
                        max_samples,
                    )

    for url in TAGNT_FILES:
        data = fetch_bytes(url).decode("utf-8", errors="replace").splitlines()
        for line in data:
            if not line or line.startswith("="):
                continue
            if not re.match(r"^[1-3]?[A-Za-z]{2,3}\.", line):
                continue
            columns = [col.strip() for col in line.split("\t")]
            if not columns:
                continue
            match = re.match(r"^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)", columns[0])
            if not match:
                continue
            book_code, chapter, verse_num = match.group(1), int(match.group(2)), int(match.group(3))
            book = NT_BOOK_MAP.get(book_code)
            if not book:
                continue
            greek_word = columns[1] if len(columns) > 1 else ""
            strongs_list = [f"G{num}" for num in re.findall(r"G(\d+)", line)]
            if not strongs_list:
                continue
            for strongs in strongs_list:
                add_sample(
                    occurrences,
                    strongs,
                    f"{book} {chapter}:{verse_num}",
                    greek_word,
                    max_samples,
                )

    return occurrences


def main() -> None:
    output_path = Path("app/data/strongs-occurrences.json")
    occurrences = build_occurrences()
    payload = {"source": "OSHB+TAGNT", "entries": occurrences}
    output_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {output_path} with {len(occurrences)} Strong's entries")


if __name__ == "__main__":
    main()
