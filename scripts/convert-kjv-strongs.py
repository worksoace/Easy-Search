#!/usr/bin/env python3
"""Convert kaiserlik/kjv JSON into the app's translation format with Strong's tags."""

from __future__ import annotations

import json
from pathlib import Path


SOURCE_ROOT = Path("temp-kjv")
BOOKS_PATH = SOURCE_ROOT / "books.json"
OUTPUT_PATH = Path("app/data/translations/kjvplus.json")


def load_book_map() -> list[tuple[str, str]]:
    payload = json.loads(BOOKS_PATH.read_text(encoding="utf-8"))
    items = []
    for entry in payload.get("books", []):
        if not isinstance(entry, dict):
            continue
        for name, code in entry.items():
            items.append((name, code))
    return items


def normalize_book_name(name: str) -> str:
    return "Song of Solomon" if name == "Song of Songs" else name


def main() -> None:
    if not BOOKS_PATH.exists():
        raise SystemExit("Missing temp-kjv/books.json. Clone the repo first.")

    output = []
    for book_name, code in load_book_map():
        book_file = SOURCE_ROOT / f"{code}.json"
        if not book_file.exists():
            print(f"Skipping missing book file: {book_file}")
            continue
        payload = json.loads(book_file.read_text(encoding="utf-8"))
        book_data = payload.get(code, {})
        if not isinstance(book_data, dict):
            continue

        for chapter_key, chapter_data in book_data.items():
            if not isinstance(chapter_data, dict):
                continue
            for verse_key, verse_data in chapter_data.items():
                if not isinstance(verse_data, dict):
                    continue
                try:
                    _, chapter_str, verse_str = verse_key.split("|")
                    chapter = int(chapter_str)
                    verse = int(verse_str)
                except ValueError:
                    continue

                text = verse_data.get("en", "")
                if not text:
                    continue

                output.append(
                    {
                        "book": normalize_book_name(book_name),
                        "chapter": chapter,
                        "verse": verse,
                        "text": text,
                    }
                )

    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(output)} verses")


if __name__ == "__main__":
    main()
