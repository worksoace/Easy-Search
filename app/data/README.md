# Data Sources

## Bundled now

- `bible-versions.json`
  Notes: local manifest describing the bundled Bible versions available in the app selector.

- `translations/akjv.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/AKJV.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/kjv.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/KJV.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/asv.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/ASV.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/bbe.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/BBE.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/drc.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/DRC.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/darby.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/Darby.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/geneva1599.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/Geneva1599.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/webster.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/Webster.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `translations/web.json`
  Source: `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-web`
  Notes: downloaded on April 5, 2026 chapter-by-chapter from `wldeh/bible-api` and converted into the app's JSON shape for fully offline use.

- `translations/ylt.json`
  Source: `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/YLT.csv`
  Notes: downloaded on April 5, 2026 and converted from CSV into the app's JSON shape.

- `dictionary.json`
  Source: `https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary.json`
  Notes: Webster dictionary JSON mirror. The repository notes that the original dictionary text comes from Project Gutenberg, while the parser and example JSON output files are distributed under GPL v2.

- `bible-names.json`
  Source: `https://www.ccel.org/h/hitchcock/bible_names/bible_names.html`
  Notes: Hitchcock's Bible Names Dictionary downloaded from CCEL and converted into the app's local JSON shape.

- `bible-name-biodata.json`
  Source: `https://github.com/robertrouse/KJV-bible-database-with-metadata-MetaV-/tree/master/CSV`
  Notes: generated from MetaV `People.csv` and `Places.csv` and matched to the bundled Bible names so the app can show short biodata under many names.

- `concordance.json`
  Source: `https://github.com/mormon-documentation-project/strongs`
  Notes: Strong's Hebrew and Greek concordance JSON mirror. The repository license says the data is public domain.

- `commentaries/matthew_henry/*` and `commentaries/jfb_commentary/*`
  Source: local HTML commentary dumps already included in the app bundle.
  Notes: rendered directly inside the app so they can be browsed offline alongside the Bible text.

## Not bundled

- `NKJV`
  Thomas Nelson says uses outside its gratis limits require written permission, and full-text use in its entirety requires a license.

- `NIV`
  NIV is not bundled because digital app use is permission-controlled rather than public-domain redistribution.

- `ESV`
  Crossway offers controlled permissions and API-style access, but not unrestricted public-domain-style redistribution.

- `NLT`
  NLT allows limited quotation, but broader or full-text app redistribution requires approval.

Only clearly redistributable offline texts are bundled here. An `OEB` CSV was tested on April 5, 2026 but skipped because that source snapshot was incomplete for full-Bible offline use.
