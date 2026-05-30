// Search worker: preprocesses large local datasets so typing stays responsive.
const MAX_VERSE_RESULTS = 80;
const MAX_DICTIONARY_RESULTS = 6;
const MAX_NAME_RESULTS = 6;
const MAX_CONCORDANCE_RESULTS = 1;
const BOOK_ALIAS_LOOKUP = new Map();
const ROMAN_NUMERALS = { i: 1, ii: 2, iii: 3 };
const NUMBERED_BOOK_ABBREVIATIONS = new Map([
  ["corinthians", ["cor", "chor"]],
  ["chronicles", ["chro", "chr"]],
  ["kings", ["kin"]],
  ["samuel", ["sam"]],
  ["thessalonians", ["thes", "thess"]],
  ["timothy", ["tim"]],
  ["peter", ["pet"]],
  ["john", ["jn", "jhn"]]
]);
const BOOK_ALIAS_OVERRIDES = {
  genesis: ["gen", "ge", "gn", "genesis", "genesi", "gensis", "gns", "genesis1", "thegenesis"],
  exodus: ["ex", "exo", "exod", "exodus", "exdus", "exds", "exoduss"],
  leviticus: ["lev", "le", "lv", "leviticus", "levit", "lvt", "levticus"],
  numbers: ["num", "nu", "nm", "numbers", "nmb", "nms", "numbrs"],
  deuteronomy: ["deut", "de", "dt", "deutero", "deuteronomy", "dtr", "dtn", "deutronomy"],
  joshua: ["jos", "josh", "jsh", "joshua", "jua", "joshu"],
  judges: ["judg", "jdg", "jg", "judges", "jdgs", "judgs"],
  ruth: ["ru", "rt", "ruth", "rth"],
  "1 samuel": ["1sam", "1 sam", "1sa", "1s", "first samuel", "1st samuel", "i samuel", "isam", "sam1"],
  "2 samuel": ["2sam", "2 sam", "2sa", "2s", "second samuel", "2nd samuel", "ii samuel", "iisam", "sam2"],
  "1 kings": ["1ki", "1kgs", "1k", "first kings", "1st kings", "i kings", "kings1", "1king"],
  "2 kings": ["2ki", "2kgs", "2k", "second kings", "2nd kings", "ii kings", "kings2", "2king"],
  "1 chronicles": ["1chr", "1ch", "first chronicles", "1st chronicles", "i chronicles", "chron1", "1chron", "ichron", "1 chron", "i chron"],
  "2 chronicles": ["2chr", "2ch", "second chronicles", "2nd chronicles", "ii chronicles", "chron2", "2chron", "iichron", "2 chron", "ii chron"],
  ezra: ["ezr", "ez", "ezra", "ezrah"],
  nehemiah: ["neh", "ne", "nehemiah", "nhem", "nehe"],
  esther: ["est", "es", "esther", "esth", "estherh"],
  job: ["job", "jb", "jbo"],
  psalms: ["ps", "psa", "psm", "pslm", "psalm", "psalms", "pslms", "psaume"],
  proverbs: ["pro", "prov", "prv", "pr", "proverbs", "proverb", "provrbs"],
  ecclesiastes: ["ecc", "eccl", "ecl", "eccles", "ecclesiastes", "eccle", "ecclst"],
  "song of solomon": ["song", "songs", "sos", "songofsongs", "songofsolomon", "solomon", "song sol", "songofs", "sng"],
  isaiah: ["isa", "is", "isaiah", "isay", "isaia"],
  jeremiah: ["jer", "je", "jr", "jeremiah", "jeremi", "jerem"],
  lamentations: ["lam", "la", "lament", "lamentations", "laments", "lamentn"],
  ezekiel: ["ezek", "eze", "ek", "ezekiel", "ezekil", "ezk"],
  daniel: ["dan", "da", "dn", "daniel", "danl"],
  hosea: ["hos", "ho", "hosea", "hose"],
  joel: ["joel", "jl", "joeel"],
  amos: ["am", "amos", "amo"],
  obadiah: ["ob", "obad", "oba", "obadiah", "obdia"],
  jonah: ["jon", "jnh", "jonah", "jona"],
  micah: ["mic", "mc", "micah", "mica"],
  nahum: ["nah", "na", "nahum", "nahu"],
  habakkuk: ["hab", "hb", "habakkuk", "habak", "hbkk"],
  zephaniah: ["zep", "zeph", "zp", "zephaniah", "zepha"],
  haggai: ["hag", "hg", "haggai", "hagai"],
  zechariah: ["zec", "zech", "zc", "zechariah", "zecha"],
  malachi: ["mal", "ml", "malachi", "malac"],
  matthew: ["mat", "mt", "matt", "matthew", "matthe", "matth"],
  mark: ["mk", "mrk", "mark", "mr"],
  luke: ["lk", "luk", "luke", "lke"],
  john: ["jn", "joh", "jhn", "john", "johhn"],
  acts: ["act", "ac", "acts", "acta"],
  romans: ["rom", "ro", "romans", "roman", "rmns"],
  "1 corinthians": ["1cor", "1 cor", "1co", "first corinthians", "i corinthians", "cor1", "1corin"],
  "2 corinthians": ["2cor", "2 cor", "2co", "second corinthians", "ii corinthians", "cor2", "2corin"],
  galatians: ["gal", "ga", "galatians", "galat", "gala"],
  ephesians: ["eph", "ep", "ephesians", "ephs", "ephes"],
  philippians: ["phil", "php", "phl", "philippians", "philip", "phill"],
  colossians: ["col", "co", "colossians", "colos", "coloss"],
  "1 thessalonians": ["1thes", "1 th", "1th", "first thessalonians", "i thessalonians", "thes1", "1thess"],
  "2 thessalonians": ["2thes", "2 th", "2th", "second thessalonians", "ii thessalonians", "thes2", "2thess"],
  "1 timothy": ["1tim", "1 ti", "first timothy", "i timothy", "tim1", "1timoth"],
  "2 timothy": ["2tim", "2 ti", "second timothy", "ii timothy", "tim2", "2timoth"],
  titus: ["tit", "ti", "titus", "titu"],
  philemon: ["phm", "phile", "philemon", "philem", "phmn"],
  hebrews: ["heb", "he", "hebrews", "hebr", "hebrew"],
  james: ["jas", "jm", "james", "jame"],
  "1 peter": ["1pet", "1 pe", "first peter", "i peter", "pet1", "1peter"],
  "2 peter": ["2pet", "2 pe", "second peter", "ii peter", "pet2", "2peter"],
  "1 john": ["1jn", "1 jn", "first john", "i john", "john1", "1john"],
  "2 john": ["2jn", "2 jn", "second john", "ii john", "john2", "2john"],
  "3 john": ["3jn", "3 jn", "third john", "iii john", "john3", "3john"],
  jude: ["jud", "jude", "jd"],
  revelation: ["rev", "re", "revel", "revelation", "apoc", "apocalypse", "revn", "revs"]
};

const searchState = {
  bible: [],
  books: [],
  versesByReference: new Map(),
  dictionary: [],
  bibleNames: [],
  concordance: [],
  bsbConcordance: [],
  previousQuery: "",
  previousBook: "",
  previousVerseCandidates: null
};

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function normalizeSearchText(value) {
  return normalizeText(value).replace(/[^a-z0-9'\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeReferenceText(value) {
  return normalizeText(value)
    .replace(/\b(first|1st|i)\b/g, "1")
    .replace(/\b(second|2nd|ii)\b/g, "2")
    .replace(/\b(third|3rd|iii)\b/g, "3")
    .replace(/[^a-z0-9'\s:.-]+/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value).match(/[a-z0-9']+/g) || [];
}

function startsWithToken(tokens, query) {
  return tokens.some((token) => token.startsWith(query));
}

function includesLoose(text, query) {
  return text.includes(query);
}

function createBookAliases(book) {
  const aliases = new Set();
  const normalizedBook = normalizeSearchText(book);
  const normalizedNoSpace = normalizedBook.replace(/\s+/g, "");
  const overrides = BOOK_ALIAS_OVERRIDES[normalizedBook];

  const addPrefixAliases = (value, limit = 6) => {
    for (let index = 1; index <= Math.min(limit, value.length); index += 1) {
      aliases.add(value.slice(0, index));
    }
  };

  aliases.add(normalizedBook);
  aliases.add(normalizedNoSpace);
  if (overrides) {
    overrides.forEach((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      if (!normalizedAlias) return;
      aliases.add(normalizedAlias);
      aliases.add(normalizedAlias.replace(/\s+/g, ""));
    });
  }
  addPrefixAliases(normalizedBook);
  addPrefixAliases(normalizedNoSpace);

  const parts = normalizedBook.split(" ");
  if (parts.length > 1) {
    const first = parts[0];
    const rest = parts.slice(1).join(" ");
    const restNoSpace = rest.replace(/\s+/g, "");
    const numeralValue = ROMAN_NUMERALS[first];

    if (numeralValue) {
      aliases.add(`${numeralValue} ${rest}`);
      aliases.add(`${numeralValue}${rest}`);
      aliases.add(`${numeralValue}${restNoSpace}`);
      aliases.add(`${first}${rest}`);
      aliases.add(`${first}${restNoSpace}`);
      aliases.add(rest);
      aliases.add(`${numeralValue} ${rest.slice(0, 3)}`);
      aliases.add(`${numeralValue}${rest.slice(0, 3)}`);

      const restWords = rest.split(" ");
      if (restWords.length) {
        aliases.add(`${numeralValue} ${restWords[0]}`);
        aliases.add(`${numeralValue}${restWords[0]}`);
        aliases.add(`${first} ${restWords[0]}`);
        aliases.add(`${first}${restWords[0]}`);
        addPrefixAliases(`${numeralValue}${restWords[0]}`, 5);
        addPrefixAliases(`${first}${restWords[0]}`, 5);
      }
    }
  }

  const words = normalizedBook.split(" ");
  if (words.length) {
    aliases.add(words[0]);
    aliases.add(words.map((word) => word[0]).join(""));
    if (words.length > 1) {
      aliases.add(words.slice(0, 2).map((word) => word[0]).join(""));
      aliases.add(words.slice(-1)[0]);
      aliases.add(words.map((word) => word.slice(0, 3)).join(""));
      aliases.add(words.slice(0, 2).map((word) => word.slice(0, 3)).join(""));
    }
    words.forEach((word) => addPrefixAliases(word));
  }

  const numberedBookMatch = normalizedBook.match(/^([12])\s+(.*)$/);
  if (numberedBookMatch) {
    const [, number, baseName] = numberedBookMatch;
    const compactBaseName = baseName.replace(/\s+/g, "");
    const baseWords = baseName.split(" ");

    aliases.add(`${number}${baseName}`);
    aliases.add(`${number}${compactBaseName}`);
    aliases.add(`${number} ${baseName}`);
    aliases.add(`${number} ${compactBaseName}`);

    const lastWord = baseWords.slice(-1)[0];
    const abbreviationSet = new Set([
      ...(NUMBERED_BOOK_ABBREVIATIONS.get(lastWord) || []),
      ...(NUMBERED_BOOK_ABBREVIATIONS.get(baseName) || [])
    ]);

    abbreviationSet.forEach((abbreviation) => {
      aliases.add(`${number}${abbreviation}`);
      aliases.add(`${number} ${abbreviation}`);
      aliases.add(`${number}${abbreviation}${baseWords.length > 1 ? baseWords[0].slice(0, 3) : ""}`);
    });
  }

  if (normalizedBook === "song of solomon") {
    aliases.add("song");
    aliases.add("songs");
    aliases.add("songofsongs");
    aliases.add("sos");
  }

  if (normalizedBook === "psalms") {
    aliases.add("psalm");
    aliases.add("ps");
    aliases.add("psa");
    aliases.add("psm");
  }

  if (normalizedBook === "proverbs") {
    aliases.add("pro");
    aliases.add("prov");
    aliases.add("prv");
  }

  if (normalizedBook === "matthew") {
    aliases.add("mat");
    aliases.add("mt");
  }

  if (normalizedBook === "mark") aliases.add("mk");
  if (normalizedBook === "luke") aliases.add("lk");
  if (normalizedBook === "john") aliases.add("jn");
  if (normalizedBook === "acts") aliases.add("ac");
  if (normalizedBook === "romans") aliases.add("rom");
  if (normalizedBook === "galatians") aliases.add("gal");
  if (normalizedBook === "ephesians") aliases.add("eph");
  if (normalizedBook === "philippians") aliases.add("phil");
  if (normalizedBook === "colossians") aliases.add("col");
  if (normalizedBook === "thessalonians") aliases.add("thes");
  if (normalizedBook === "timothy") aliases.add("tim");
  if (normalizedBook === "titus") aliases.add("tit");
  if (normalizedBook === "philemon") aliases.add("phm");
  if (normalizedBook === "hebrews") aliases.add("heb");
  if (normalizedBook === "james") aliases.add("jas");
  if (normalizedBook === "peter") aliases.add("pet");
  if (normalizedBook === "revelation") {
    aliases.add("rev");
    aliases.add("re");
  }

  return aliases;
}

function resolveBookDisplayName(code) {
  const normalizedCode = normalizeSearchText(code).replace(/\s+/g, "");
  if (!normalizedCode) {
    return "";
  }

  return BOOK_ALIAS_LOOKUP.get(normalizedCode) || BOOK_ALIAS_LOOKUP.get(normalizeSearchText(code)) || code;
}

function registerBookAliases(books) {
  BOOK_ALIAS_LOOKUP.clear();

  for (const book of books) {
    for (const alias of createBookAliases(book)) {
      if (!BOOK_ALIAS_LOOKUP.has(alias)) {
        BOOK_ALIAS_LOOKUP.set(alias, book);
      }
      const compact = alias.replace(/\s+/g, "");
      if (compact && !BOOK_ALIAS_LOOKUP.has(compact)) {
        BOOK_ALIAS_LOOKUP.set(compact, book);
      }
    }
  }
}

function parseReferenceQuery(query) {
  const normalizedQuery = normalizeReferenceText(query);
  if (!normalizedQuery) {
    return null;
  }

  const match = normalizedQuery.match(/^(.+?)\s+(\d+)(?:\s*[:.\s-]\s*(\d+)(?:\s*-\s*(\d+))?)?$/);
  if (!match) {
    return null;
  }

  const [, rawBook, rawChapter, rawVerse, rawEndVerse] = match;
  const bookCandidate = rawBook.replace(/\s+/g, " ").trim().replace(/^the\s+/, "");
  const compactCandidate = bookCandidate.replace(/\s+/g, "");
  const book =
    BOOK_ALIAS_LOOKUP.get(bookCandidate) ||
    BOOK_ALIAS_LOOKUP.get(compactCandidate) ||
    null;

  if (!book) {
    return null;
  }

  return {
    book,
    chapter: Number(rawChapter),
    verse: rawVerse ? Number(rawVerse) : null,
    endVerse: rawEndVerse ? Number(rawEndVerse) : null
  };
}

function buildIndexes(payload) {
  searchState.bible = payload.bible.map((verse) => ({
    ...verse,
    lowerText: normalizeText(verse.text),
    normalizedText: normalizeSearchText(verse.text),
    tokens: tokenize(verse.text)
  }));
  searchState.books = [...new Set(payload.bible.map((verse) => verse.book))];
  searchState.versesByReference = new Map(
    searchState.bible.map((verse) => [`${verse.book}|${verse.chapter}|${verse.verse}`, verse])
  );
  registerBookAliases(searchState.books);

  searchState.dictionary = Object.entries(payload.dictionary).map(([word, meaning]) => ({
    word,
    meaning,
    lowerWord: normalizeText(word),
    lowerMeaning: normalizeText(meaning),
    tokens: tokenize(`${word} ${meaning}`)
  }));

  searchState.bibleNames = payload.bibleNames.map((entry) => ({
    name: entry.name,
    meaning: entry.meaning,
    lowerName: normalizeText(entry.name),
    lowerMeaning: normalizeText(entry.meaning),
    tokens: tokenize(`${entry.name} ${entry.meaning}`)
  }));

  searchState.concordance = payload.concordance.map((entry) => ({
    source: "strongs",
    number: entry.number,
    word: entry.word,
    lemma: entry.lemma,
    xlit: entry.xlit,
    pronounce: entry.pronounce,
    description: entry.description,
    lowerNumber: normalizeText(entry.number),
    lowerWord: normalizeText(entry.word),
    lowerLemma: normalizeText(entry.lemma),
    lowerXlit: normalizeText(entry.xlit),
    lowerPronounce: normalizeText(entry.pronounce),
    lowerDescription: normalizeText(entry.description),
    normalizedText: normalizeSearchText(`${entry.number} ${entry.word} ${entry.lemma} ${entry.xlit} ${entry.pronounce} ${entry.description}`),
    tokens: tokenize(`${entry.number} ${entry.word} ${entry.lemma} ${entry.xlit} ${entry.pronounce} ${entry.description}`)
  }));

  const bsbEntries = Array.isArray(payload.bsbConcordance?.entries) ? payload.bsbConcordance.entries : [];
  searchState.bsbConcordance = bsbEntries.map((entry) => {
    const samples = Array.isArray(entry.samples) ? entry.samples : [];
    const sampleSearchParts = [];
    const sampleDisplayParts = [];

    for (const sample of samples) {
      const bookDisplay = resolveBookDisplayName(sample.bookCode || "");
      const reference = String(sample.reference || "").trim();
      const fullReference = reference ? reference.replace(/^\S+/, bookDisplay || sample.bookCode || "") : "";
      sampleSearchParts.push(bookDisplay, reference, fullReference, sample.context || "");
      sampleDisplayParts.push(fullReference || reference, sample.context || "");
    }

    const entryLabel = entry.entry || entry.label || "";
    const bookCodes = Array.isArray(entry.bookCodes) ? entry.bookCodes : [];

    return {
      source: "bsb",
      number: entryLabel,
      word: entryLabel,
      lemma: entryLabel,
      xlit: entryLabel,
      pronounce: entryLabel,
      description: sampleDisplayParts.join(" "),
      occurrences: Number(entry.occurrences || 0),
      bookCodes,
      lowerNumber: normalizeText(entryLabel),
      lowerWord: normalizeText(entryLabel),
      lowerLemma: normalizeText(entryLabel),
      lowerXlit: normalizeText(entryLabel),
      lowerPronounce: normalizeText(entryLabel),
      lowerDescription: normalizeText(sampleDisplayParts.join(" ")),
      normalizedText: normalizeSearchText(`${entryLabel} ${entry.label || ""} ${bookCodes.join(" ")} ${sampleSearchParts.join(" ")}`),
      tokens: tokenize(`${entryLabel} ${entry.label || ""} ${bookCodes.join(" ")} ${sampleSearchParts.join(" ")}`)
    };
  });

  searchState.previousQuery = "";
  searchState.previousBook = "";
  searchState.previousVerseCandidates = null;
}

function searchDictionary(entries, query, type) {
  const results = [];

  for (const entry of entries) {
    const exact = type === "word" ? entry.lowerWord === query : entry.lowerName === query;
    const prefix = type === "word" ? entry.lowerWord.startsWith(query) : entry.lowerName.startsWith(query);
    const tokenPrefix = startsWithToken(entry.tokens, query);
    const loose =
      type === "word"
        ? includesLoose(entry.lowerWord, query) || includesLoose(entry.lowerMeaning, query)
        : includesLoose(entry.lowerName, query) || includesLoose(entry.lowerMeaning, query);

    let score = 0;

    if (exact) score = 400;
    else if (prefix) score = 280;
    else if (tokenPrefix) score = 220;
    else if (loose) score = 120;

    if (score > 0) {
      results.push({ score, entry });
    }
  }

  results.sort((left, right) => right.score - left.score || String(left.entry.word || left.entry.name).localeCompare(String(right.entry.word || right.entry.name)));
  return results.slice(0, type === "word" ? MAX_DICTIONARY_RESULTS : MAX_NAME_RESULTS).map((item) => item.entry);
}

function searchConcordance(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const results = [];

  for (const entry of searchState.concordance) {
    const exact = entry.lowerNumber === normalizedQuery || entry.lowerWord === normalizedQuery || entry.lowerLemma === normalizedQuery || entry.lowerXlit === normalizedQuery;
    const prefix =
      entry.lowerNumber.startsWith(normalizedQuery) ||
      entry.lowerWord.startsWith(normalizedQuery) ||
      entry.lowerLemma.startsWith(normalizedQuery) ||
      entry.lowerXlit.startsWith(normalizedQuery) ||
      entry.lowerPronounce.startsWith(normalizedQuery);
    const tokenPrefix = startsWithToken(entry.tokens, normalizedQuery);
    const loose =
      includesLoose(entry.lowerNumber, normalizedQuery) ||
      includesLoose(entry.lowerWord, normalizedQuery) ||
      includesLoose(entry.lowerLemma, normalizedQuery) ||
      includesLoose(entry.lowerXlit, normalizedQuery) ||
      includesLoose(entry.lowerPronounce, normalizedQuery) ||
      includesLoose(entry.lowerDescription, normalizedQuery) ||
      includesLoose(entry.normalizedText, normalizedQuery);

    let score = 0;
    if (exact) score = 420;
    else if (prefix) score = 300;
    else if (tokenPrefix) score = 220;
    else if (loose) score = 120;

    if (score > 0) {
      results.push({ score, entry });
    }
  }

  for (const entry of searchState.bsbConcordance) {
    const exact = entry.lowerNumber === normalizedQuery || entry.lowerWord === normalizedQuery;
    const prefix =
      entry.lowerNumber.startsWith(normalizedQuery) ||
      entry.lowerWord.startsWith(normalizedQuery) ||
      entry.lowerDescription.startsWith(normalizedQuery);
    const tokenPrefix = startsWithToken(entry.tokens, normalizedQuery);
    const loose =
      includesLoose(entry.lowerNumber, normalizedQuery) ||
      includesLoose(entry.lowerWord, normalizedQuery) ||
      includesLoose(entry.lowerDescription, normalizedQuery) ||
      includesLoose(entry.normalizedText, normalizedQuery);

    let score = 0;
    if (exact) score = 380;
    else if (prefix) score = 260;
    else if (tokenPrefix) score = 200;
    else if (loose) score = 120;

    if (score > 0) {
      results.push({ score, entry });
    }
  }

  results.sort((left, right) => right.score - left.score || String(left.entry.number || left.entry.entry || "").localeCompare(String(right.entry.number || right.entry.entry || "")));
  return results.slice(0, MAX_CONCORDANCE_RESULTS).map((item) => item.entry);
}

function toPublicVerse(verse) {
  return {
    book: verse.book,
    chapter: verse.chapter,
    verse: verse.verse,
    text: verse.text
  };
}

function searchVerses(query, options = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.max(1, Number(options.pageSize) || MAX_VERSE_RESULTS);
  const selectedBook = String(options.book || "").trim();
  const offset = (page - 1) * pageSize;
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    searchState.previousQuery = "";
    searchState.previousBook = "";
    searchState.previousVerseCandidates = null;
    return {
      total: 0,
      totalAll: 0,
      items: [],
      hasMore: false,
      bookCounts: [],
      matchMode: "empty",
      referenceLabel: ""
    };
  }

  const reference = parseReferenceQuery(query);
  if (reference) {
    const referenceItems = [];

    if (reference.verse) {
      const endVerse = reference.endVerse || reference.verse;
      for (let verseNumber = reference.verse; verseNumber <= endVerse; verseNumber += 1) {
        const verse = searchState.versesByReference.get(`${reference.book}|${reference.chapter}|${verseNumber}`);
        if (verse) {
          referenceItems.push({
            book: verse.book,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verse.text
          });
        }
      }
    } else {
      for (const verse of searchState.bible) {
        if (verse.book === reference.book && verse.chapter === reference.chapter) {
          if (referenceItems.length < MAX_VERSE_RESULTS) {
            referenceItems.push({
              book: verse.book,
              chapter: verse.chapter,
              verse: verse.verse,
              text: verse.text
            });
          }
        }
      }
    }

    searchState.previousQuery = normalizedQuery;
    searchState.previousBook = "";
    searchState.previousVerseCandidates = null;

    return {
      total: referenceItems.length,
      totalAll: referenceItems.length,
      items: referenceItems.slice(offset, offset + pageSize),
      hasMore: offset + pageSize < referenceItems.length,
      bookCounts: [{ book: reference.book, count: referenceItems.length }],
      matchMode: "reference",
      referenceLabel: reference.verse
        ? `${reference.book} ${reference.chapter}:${reference.verse}${reference.endVerse ? `-${reference.endVerse}` : ""}`
        : `${reference.book} ${reference.chapter}`
    };
  }

  const baseCandidates =
    searchState.previousVerseCandidates &&
    normalizedQuery.startsWith(searchState.previousQuery) &&
    selectedBook === searchState.previousBook
      ? searchState.previousVerseCandidates
      : searchState.bible;

  const nextCandidates = [];
  const isPhrase = normalizedQuery.includes(" ");

  for (const verse of baseCandidates) {
    const phraseMatch = isPhrase && includesLoose(verse.normalizedText, normalizedQuery);
    const tokenSequenceMatch =
      isPhrase &&
      normalizeText(verse.text).includes(normalizedQuery);
    const match = isPhrase
      ? phraseMatch || tokenSequenceMatch
      : startsWithToken(verse.tokens, normalizedQuery) || includesLoose(verse.normalizedText, normalizedQuery);

    if (match) {
      nextCandidates.push(verse);
    }
  }

  searchState.previousQuery = normalizedQuery;
  searchState.previousBook = selectedBook;
  searchState.previousVerseCandidates = nextCandidates;

  const bookMap = new Map();
  for (const verse of nextCandidates) {
    bookMap.set(verse.book, (bookMap.get(verse.book) || 0) + 1);
  }
  const bookCounts = [...bookMap.entries()]
    .map(([book, count]) => ({ book, count }))
    .sort((left, right) => right.count - left.count || left.book.localeCompare(right.book));

  const filteredCandidates = selectedBook
    ? nextCandidates.filter((verse) => verse.book === selectedBook)
    : nextCandidates;
  const pageItems = filteredCandidates.slice(offset, offset + pageSize).map(toPublicVerse);

  return {
    total: filteredCandidates.length,
    totalAll: nextCandidates.length,
    items: pageItems,
    hasMore: offset + pageSize < filteredCandidates.length,
    bookCounts,
    matchMode: isPhrase ? "phrase" : "word",
    referenceLabel: ""
  };
}

function runSearch(query, options = {}) {
  const normalizedQuery = normalizeText(query).trim();

  if (!normalizedQuery) {
    searchState.previousQuery = "";
    searchState.previousVerseCandidates = null;
    return {
      query: "",
      dictionary: [],
      bibleNames: [],
      concordance: [],
      verses: { total: 0, totalAll: 0, items: [], hasMore: false, bookCounts: [], matchMode: "empty", referenceLabel: "" }
    };
  }

  return {
    query: normalizedQuery,
    dictionary: searchDictionary(searchState.dictionary, normalizedQuery, "word"),
    bibleNames: searchDictionary(searchState.bibleNames, normalizedQuery, "name"),
    concordance: searchConcordance(normalizedQuery),
    verses: searchVerses(normalizedQuery, options)
  };
}

self.onmessage = (event) => {
  const { type, payload, requestId, query, page, pageSize, book } = event.data;

  try {
    if (type === "init") {
      buildIndexes(payload);
      self.postMessage({ type: "ready" });
      return;
    }

    if (type === "search") {
      const results = runSearch(query, { page, pageSize, book });
      self.postMessage({ type: "results", requestId, payload: results });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      requestId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};
