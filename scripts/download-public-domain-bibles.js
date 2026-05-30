const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "app", "data");
const TRANSLATIONS_DIR = path.join(DATA_DIR, "translations");
const LEGACY_BIBLE_PATH = path.join(DATA_DIR, "bible.json");

const VERSION_CONFIG = [
  {
    code: "akjv",
    label: "American King James Version",
    shortLabel: "AKJV",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/AKJV.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "kjv",
    label: "King James Version",
    shortLabel: "KJV",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/KJV.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "asv",
    label: "American Standard Version",
    shortLabel: "ASV",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/ASV.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "bbe",
    label: "Bible in Basic English",
    shortLabel: "BBE",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/BBE.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "drc",
    label: "Douay-Rheims Challoner",
    shortLabel: "DRC",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/DRC.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "darby",
    label: "Darby Bible Translation",
    shortLabel: "DARBY",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/Darby.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "geneva1599",
    label: "Geneva Bible 1599",
    shortLabel: "GNV",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/Geneva1599.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "webster",
    label: "Webster Bible",
    shortLabel: "WBT",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/Webster.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  },
  {
    code: "web",
    label: "World English Bible",
    shortLabel: "WEB",
    source: "https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-web",
    sourceType: "chapter-json",
    notes: "Public-domain translation downloaded chapter-by-chapter from wldeh/bible-api and converted into the app JSON format."
  },
  {
    code: "ylt",
    label: "Young Literal Translation",
    shortLabel: "YLT",
    source: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv/YLT.csv",
    sourceType: "csv",
    notes: "Public-domain translation converted from scrollmapper CSV into the app JSON format."
  }
];

function requestText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Request failed for ${url}: ${response.statusCode}`));
          response.resume();
          return;
        }

        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  result.push(current);
  return result;
}

function parseBibleCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const rows = [];

  for (let index = 1; index < lines.length; index += 1) {
    const [book, chapter, verse, ...textParts] = parseCsvLine(lines[index]);
    const text = textParts.join(",").trim();

    if (!book || !chapter || !verse || !text) {
      continue;
    }

    rows.push({
      book: book.trim(),
      chapter: Number(chapter),
      verse: Number(verse),
      text
    });
  }

  return rows;
}

function normalizeWebVerseText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/([A-Za-z])\d+:\d+\s/g, "$1 ")
    .trim();
}

function toBibleApiBookSlug(book) {
  const normalized = String(book || "").trim();
  const aliases = {
    "Revelation of John": "revelation"
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const numeralMatch = normalized.match(/^(I{1,3})\s+(.+)$/);
  if (numeralMatch) {
    const numeralMap = { I: "1", II: "2", III: "3" };
    return `${numeralMap[numeralMatch[1]]}${numeralMatch[2].toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
  }

  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function downloadChapterJson(baseUrl, books) {
  const chapterJobs = [];
  const rows = [];
  const seenReferences = new Set();

  books.forEach(({ book, chapters }) => {
    const slug = toBibleApiBookSlug(book);
    for (let chapter = 1; chapter <= chapters; chapter += 1) {
      chapterJobs.push({ book, chapter, url: `${baseUrl}/books/${slug}/chapters/${chapter}.json` });
    }
  });

  const batchSize = 24;
  for (let index = 0; index < chapterJobs.length; index += batchSize) {
    const batch = chapterJobs.slice(index, index + batchSize);
    const batchRows = await Promise.all(
      batch.map(async ({ url }) => {
        const chapterText = await requestText(url);
        const payload = JSON.parse(chapterText);
        const chapterRows = [];

        (payload.data || []).forEach((entry) => {
          const normalizedEntry = {
            book: entry.book,
            chapter: Number(entry.chapter),
            verse: Number(entry.verse),
            text: normalizeWebVerseText(entry.text)
          };
          const reference = `${normalizedEntry.book}|${normalizedEntry.chapter}|${normalizedEntry.verse}`;
          if (!seenReferences.has(reference)) {
            seenReferences.add(reference);
            chapterRows.push(normalizedEntry);
          }
        });

        return chapterRows;
      })
    );

    rows.push(...batchRows.flat());
    console.log(`Downloaded WEB chapters ${Math.min(index + batch.length, chapterJobs.length)}/${chapterJobs.length}`);
  }

  return rows;
}

async function buildTranslations() {
  fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });

  const legacyBible = JSON.parse(fs.readFileSync(LEGACY_BIBLE_PATH, "utf8"));
  const bookMetadata = [...new Map(
    legacyBible.map((entry) => [entry.book, entry.chapter])
  ).entries()].reduce((accumulator, [book]) => {
    const chapters = Math.max(...legacyBible.filter((entry) => entry.book === book).map((entry) => entry.chapter));
    accumulator.push({ book, chapters });
    return accumulator;
  }, []);

  for (const version of VERSION_CONFIG) {
    let rows = [];

    if (version.sourceType === "csv") {
      const csvText = await requestText(version.source);
      rows = parseBibleCsv(csvText);
    }

    if (version.sourceType === "chapter-json") {
      rows = await downloadChapterJson(version.source, bookMetadata);
    }

    fs.writeFileSync(
      path.join(TRANSLATIONS_DIR, `${version.code}.json`),
      JSON.stringify(rows)
    );
    console.log(`Saved ${version.code}.json with ${rows.length} verses`);
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "bible-versions.json"),
    JSON.stringify(
      {
        defaultVersion: "kjv",
        versions: VERSION_CONFIG.map(({ code, label, shortLabel, notes, source }) => ({
          code,
          label,
          shortLabel,
          notes,
          source,
          publicDomain: true
        }))
      },
      null,
      2
    )
  );
}

buildTranslations().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
