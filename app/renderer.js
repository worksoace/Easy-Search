// Renderer logic: search, dictionary focus, preferences, layout resizing, and chapter interactions.
const DEFAULT_LAYOUT = { left: 430, middle: 320, sidePanelTopHeight: null, namesPanelTopHeight: null, versesPanelTopHeight: null };
const DEFAULT_SHORTCUTS = {
  openSearch: "Ctrl+K",
  openNotes: "N",
  toggleSearchBar: "Ctrl+Shift+S"
};
const DEFAULT_PREFERENCES = {
  fontSize: 14,
  lineHeight: 1.8,
  showSearchBar: true,
  autoOpenStrongsConcordance: true,
  showVerseNumbers: true,
  compactVerseSpacing: false,
  fontFamily: "system",
  redLetterMode: false,
  shortcuts: { ...DEFAULT_SHORTCUTS }
};
const DEFAULT_ANNOTATIONS = { notes: {}, highlights: {} };
const DEFAULT_HIDDEN_SECTIONS = { dictionary: false, concordance: false, bibleNames: false, biodata: false, verses: false, commentary: false };
const DEFAULT_HIGHLIGHT_COLOR = "yellow";
const NAV_HISTORY_MAX = 40;
const SEARCH_HISTORY_MAX = 20;
const VERSE_PAGE_SIZE = 200;
const EDGE_RESIZE_THRESHOLD = 8;
const HIGHLIGHT_COLORS = [
  { code: "yellow", label: "Yellow", css: "var(--highlight-yellow)" },
  { code: "green", label: "Green", css: "var(--highlight-green)" },
  { code: "blue", label: "Blue", css: "var(--highlight-blue)" },
  { code: "pink", label: "Pink", css: "var(--highlight-pink)" },
  { code: "orange", label: "Orange", css: "var(--highlight-orange)" },
  { code: "purple", label: "Purple", css: "var(--highlight-purple)" }
];
const OLD_TESTAMENT_BOOKS = new Set([
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi"
]);

const state = {
  query: "",
  searchVisible: false,
  searchWorker: null,
  requestId: 0,
  isReady: false,
  bibleVersions: [],
  currentVersion: "kjv",
  bibleVersionCache: {},
  bibleData: [],
  rawDictionary: {},
  dictionaryEntries: [],
  bibleNamesData: [],
  nameBiodata: {},
  concordanceData: [],
  bsbConcordanceData: [],
  strongsOccurrences: { entries: {} },
  commentaryManifest: [],
  commentaryCache: {},
  commentaryRenderToken: 0,
  currentCommentaryCode: "",
  searchVerseTotalAll: 0,
  searchBookCounts: [],
  activeResultsBook: "",
  verseResultsPage: 1,
  pagedVerseItems: [],
  books: [],
  chaptersByBook: {},
  lookupFocusQuery: "",
  lastResults: { query: "", dictionary: [], bibleNames: [], concordance: [], verses: { total: 0, items: [], matchMode: "empty", referenceLabel: "" } },
  navigationSelection: { book: "", chapter: 1, verse: null },
  annotations: { ...DEFAULT_ANNOTATIONS },
  activeVerse: null,
  activeVerseAnchor: null,
  activeStrongsLookup: "",
  layout: { ...DEFAULT_LAYOUT },
  preferences: { ...DEFAULT_PREFERENCES },
  hiddenSections: { ...DEFAULT_HIDDEN_SECTIONS },
  contextMenu: { visible: false, x: 0, y: 0, lookupText: "", sectionId: "", sectionLabel: "" },
  lastLookupWasStrongs: false,
  edgeResizeTarget: "",
  navHistory: [],
  navHistoryIndex: -1,
  searchHistory: [],
  focusMode: false,
  strongsTooltip: { visible: false, number: "", entry: null, x: 0, y: 0 },
  parallelVersion: "",
  parallelData: [],
  readingProgress: {},          // { "Genesis|1": true, ... }
  activeVerseIndex: -1,         // for keyboard nav through verse list
  rangeSelectStart: null        // for shift-click range selection
};

const elements = {
  searchInput: document.querySelector("[data-search-input]"),
  themeToggle: document.querySelector("[data-theme-toggle]"),
  themeLabel: document.querySelector("[data-theme-label]"),
  menuEdit: document.querySelector("[data-menu-edit]"),
  menuView: document.querySelector("[data-menu-view]"),
  searchWrap: document.querySelector("[data-search-wrap]"),
  openPreferences: document.querySelector("[data-open-preferences]"),
  openAbout: document.querySelector("[data-open-about]"),
  openTutorial: document.querySelector("[data-open-tutorial]"),
  loading: document.querySelector("[data-loading]"),
  empty: document.querySelector("[data-empty]"),
  summary: document.querySelector("[data-summary]"),
  dictionaryCard: document.querySelector("[data-dictionary-card]"),
  dictionaryList: document.querySelector("[data-dictionary-list]"),
  bibleNamesCard: document.querySelector("[data-bible-names-card]"),
  bibleNamesList: document.querySelector("[data-bible-names-list]"),
  biodataCard: document.querySelector("[data-biodata-card]"),
  biodataList: document.querySelector("[data-biodata-list]"),
  concordanceCard: document.querySelector("[data-concordance-card]"),
  concordanceList: document.querySelector("[data-concordance-list]"),
  commentaryCard: document.querySelector("[data-commentary-card]"),
  commentaryList: document.querySelector("[data-commentary-list]"),
  commentarySelect: document.querySelector("[data-commentary-select]"),
  searchBookSelect: document.querySelector("[data-search-book-filter]"),
  bibleNavForm: document.querySelector("[data-bible-nav-form]"),
  bibleVersionSelect: document.querySelector("[data-bible-version]"),
  bibleBookSelect: document.querySelector("[data-bible-book]"),
  bibleChapterInput: document.querySelector("[data-bible-chapter]"),
  bibleVerseInput: document.querySelector("[data-bible-verse]"),
  numberButtons: document.querySelectorAll("[data-step-target]"),
  bibleNavStatus: document.querySelector("[data-bible-nav-status]"),
  openBookOccurrences: document.querySelector("[data-open-book-occurrences]"),
  bookOccurrencesPopover: document.querySelector("[data-book-occurrences-popover]"),
  bookOccurrencesList: document.querySelector("[data-book-occurrences-list]"),
  verseLoadMore: document.querySelector("[data-verse-load-more]"),
  verseList: document.querySelector("[data-verse-list]"),
  resizers: document.querySelectorAll("[data-resizer]"),
  chapterModal: document.querySelector("[data-chapter-modal]"),
  chapterTitle: document.querySelector("[data-chapter-title]"),
  chapterList: document.querySelector("[data-chapter-list]"),
  modalClose: document.querySelector("[data-modal-close]"),
  verseActionsPopover: document.querySelector("[data-verse-actions-popover]"),
  verseActionsTitle: document.querySelector("[data-verse-actions-title]"),
  addNoteButton: document.querySelector("[data-add-note]"),
  highlightColorList: document.querySelector("[data-highlight-color-list]"),
  clearHighlightButton: document.querySelector("[data-clear-highlight]"),
  viewFullChapterButton: document.querySelector("[data-view-full-chapter]"),
  notesModal: document.querySelector("[data-notes-modal]"),
  notesTitle: document.querySelector("[data-notes-title]"),
  notesClose: document.querySelector("[data-notes-close]"),
  notesInput: document.querySelector("[data-notes-input]"),
  saveNoteButton: document.querySelector("[data-save-note]"),
  clearNoteButton: document.querySelector("[data-clear-note]"),
  preferencesModal: document.querySelector("[data-preferences-modal]"),
  preferencesClose: document.querySelector("[data-preferences-close]"),
  aboutModal: document.querySelector("[data-about-modal]"),
  aboutClose: document.querySelector("[data-about-close]"),
  tutorialModal: document.querySelector("[data-tutorial-modal]"),
  tutorialClose: document.querySelector("[data-tutorial-close]"),
  fontSizeInput: document.querySelector("[data-font-size]"),
  fontSizeValue: document.querySelector("[data-font-size-value]"),
  lineHeightInput: document.querySelector("[data-line-height]"),
  lineHeightValue: document.querySelector("[data-line-height-value]"),
  showSearchBarInput: document.querySelector("[data-show-search-bar]"),
  autoOpenStrongsInput: document.querySelector("[data-auto-open-strongs-concordance]"),
  showVerseNumbersInput: document.querySelector("[data-show-verse-numbers]"),
  compactVerseSpacingInput: document.querySelector("[data-compact-verse-spacing]"),
  shortcutOpenSearchSelect: document.querySelector("[data-shortcut-open-search]"),
  shortcutOpenNotesSelect: document.querySelector("[data-shortcut-open-notes]"),
  shortcutToggleSearchBarSelect: document.querySelector("[data-shortcut-toggle-search-bar]"),
  appContextMenu: document.querySelector("[data-app-context-menu]"),
  contextLookup: document.querySelector("[data-context-lookup]"),
  contextCloseSection: document.querySelector("[data-context-close-section]"),
  menuViewPopover: document.querySelector("[data-menu-view-popover]"),
  showHiddenSections: document.querySelectorAll("[data-show-hidden-section]"),
  showAllSections: document.querySelector("[data-show-all-sections]"),
  content: document.querySelector("[data-content]"),
  sidePanel: document.querySelector(".side-panel"),
  namesPanel: document.querySelector(".names-panel"),
  versesPanel: document.querySelector(".verses-panel"),
  versePanel: document.querySelector(".verse-panel"),
  sidePanelResizer: document.querySelector('[data-resizer="side-panel"]'),
  namesPanelResizer: document.querySelector('[data-resizer="names-panel"]'),
  commentaryPanelResizer: document.querySelector('[data-resizer="commentary-panel"]'),
  leftColumnResizer: document.querySelector('[data-resizer="left"]'),
  middleColumnResizer: document.querySelector('[data-resizer="middle"]'),
  translationSelector: document.querySelector(".bible-translation-selector")
};

// Dynamically created elements
const dynamicElements = {
  strongsTooltip: null,
  focusModeBtn: null
};

function debounce(callback, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function normalizeSearchText(value) {
  return normalizeText(value).replace(/[^a-z0-9'\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeText(value) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function matchesShortcut(event, shortcut) {
  const parts = String(shortcut || "").split("+").map((part) => part.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return false;
  const key = parts[parts.length - 1];
  const requiresCtrl = parts.includes("ctrl");
  const requiresMeta = parts.includes("meta");
  const requiresAlt = parts.includes("alt");
  const requiresShift = parts.includes("shift");
  const ctrlOrMetaNeeded = requiresCtrl || requiresMeta;

  if (ctrlOrMetaNeeded && !(event.ctrlKey || event.metaKey)) return false;
  if (!ctrlOrMetaNeeded && (event.ctrlKey || event.metaKey)) return false;
  if (requiresAlt !== event.altKey) return false;
  if (requiresShift !== event.shiftKey) return false;

  return event.key.toLowerCase() === key;
}

function highlightText(text, query) {
  const safeText = escapeHtml(text);
  if (!query.trim()) return safeText;
  const matcher = new RegExp(`(${escapeRegExp(query.trim())})`, "gi");
  return safeText.replace(matcher, '<mark class="highlight">$1</mark>');
}

const HEBREW_RANGE = /[\u0590-\u05FF]/;
const GREEK_RANGE = /[\u0370-\u03FF\u1F00-\u1FFF]/;

function getTestamentPrefix() {
  const book = state.activeVerse?.book || elements.bibleBookSelect?.value || state.navigationSelection.book;
  if (!book) return "";
  return OLD_TESTAMENT_BOOKS.has(book) ? "H" : "G";
}

function filterStrongsSamples(strongsKey, samples) {
  if (!strongsKey || !Array.isArray(samples)) return [];
  const key = String(strongsKey).toUpperCase();
  const expectsHebrew = key.startsWith("H");
  const expectsGreek = key.startsWith("G");

  return samples.filter((sample) => {
    const word = String(sample.word || "");
    if (!word) return false;
    if (expectsHebrew) return HEBREW_RANGE.test(word);
    if (expectsGreek) return GREEK_RANGE.test(word);
    return true;
  });
}

function loadStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function saveStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizePreferences(preferences) {
  const merged = { ...DEFAULT_PREFERENCES, ...(preferences || {}) };
  merged.shortcuts = {
    ...DEFAULT_SHORTCUTS,
    ...((preferences && preferences.shortcuts) || {})
  };
  merged.showSearchBar = Boolean(merged.showSearchBar);
  merged.autoOpenStrongsConcordance = Boolean(merged.autoOpenStrongsConcordance);
  merged.showVerseNumbers = Boolean(merged.showVerseNumbers);
  merged.compactVerseSpacing = Boolean(merged.compactVerseSpacing);
  merged.fontFamily = ["system", "serif", "mono"].includes(merged.fontFamily) ? merged.fontFamily : "system";
  merged.redLetterMode = Boolean(merged.redLetterMode);
  return merged;
}

function savePreferences() {
  saveStoredJson("preferences", state.preferences);
}

function saveBibleSelection() {
  saveStoredJson("bible-selection", state.navigationSelection);
}

function loadBibleSelection() {
  const saved = loadStoredJson("bible-selection", state.navigationSelection);
  const chapter = Number(saved.chapter);
  const verse = saved.verse === null || typeof saved.verse === "undefined" ? null : Number(saved.verse);
  return {
    book: String(saved.book || ""),
    chapter: Number.isFinite(chapter) && chapter > 0 ? chapter : 1,
    verse: Number.isFinite(verse) && verse > 0 ? verse : null
  };
}

function getVerseKey(verse, version = state.currentVersion) {
  return `${version}|${verse.book}|${verse.chapter}|${verse.verse}`;
}

function getVerseHighlightColor(verse) {
  const value = state.annotations.highlights[getVerseKey(verse)];
  if (typeof value === "string") {
    return value;
  }
  if (value) {
    return DEFAULT_HIGHLIGHT_COLOR;
  }
  return null;
}

function hasVerseNote(verse) {
  return Boolean(state.annotations.notes[getVerseKey(verse)]);
}

function getVerseNote(verse) {
  return state.annotations.notes[getVerseKey(verse)] || "";
}

function createNoteIndicator(noteText) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "note-indicator";
  button.setAttribute("aria-label", "View note");
  button.title = noteText ? `Note: ${noteText}` : "Note";
  button.innerHTML = `
    <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
      <path d="M7 3h10a2 2 0 0 1 2 2v12l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2z"></path>
    </svg>
  `;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openNotesModal();
  });
  return button;
}

function isVerseHighlighted(verse) {
  return Boolean(getVerseHighlightColor(verse));
}

function saveAnnotations() {
  saveStoredJson("annotations", state.annotations);
}

async function fetchJsonWithFallback(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`Unable to load ${url} (Status: ${response.status})`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load local JSON.");
}

function applyLayout() {
  document.documentElement.style.setProperty("--left-width", `${state.layout.left}px`);
  document.documentElement.style.setProperty("--middle-width", `${state.layout.middle}px`);

  const applyStackRows = (panelElement, storedTopHeight, minHeight = 160, options = {}) => {
    const hideTop = Boolean(options.hideTop);
    const hideBottom = Boolean(options.hideBottom);
    const defaultTopRatio = Number.isFinite(options.defaultTopRatio) ? options.defaultTopRatio : 0.5;
    const minTopRatio = Number.isFinite(options.minTopRatio) ? options.minTopRatio : 0;
    if (!panelElement) {
      return storedTopHeight;
    }

    if (hideTop && hideBottom) {
      panelElement.style.gridTemplateRows = "0";
      return storedTopHeight;
    }

    if (hideTop) {
      panelElement.style.gridTemplateRows = `0 0 minmax(${minHeight}px, 1fr)`;
      return storedTopHeight;
    }

    if (hideBottom) {
      panelElement.style.gridTemplateRows = `minmax(${minHeight}px, 1fr) 0 0`;
      return storedTopHeight;
    }

    const rowGap = Number.parseFloat(getComputedStyle(panelElement).rowGap || getComputedStyle(panelElement).gap || "0") || 0;
    const availableHeight = Math.max(minHeight * 2, panelElement.getBoundingClientRect().height - rowGap * 2 - 2);
    const ratioMinimum = Math.floor(availableHeight * minTopRatio);
    const effectiveMinHeight = Math.max(minHeight, ratioMinimum);
    const defaultTopFromRatio = Math.floor(availableHeight * defaultTopRatio);
    const computedTop = Number.isFinite(storedTopHeight)
      ? Math.max(effectiveMinHeight, Math.min(availableHeight - minHeight, storedTopHeight))
      : Math.max(effectiveMinHeight, Math.min(availableHeight - minHeight, defaultTopFromRatio));
    const bottomHeight = Math.max(minHeight, availableHeight - computedTop);
    panelElement.style.gridTemplateRows = `minmax(${minHeight}px, ${computedTop}px) 2px minmax(${minHeight}px, ${bottomHeight}px)`;
    return computedTop;
  };

  const hideDictionary = isSectionHidden("dictionary");
  const hideConcordance = isSectionHidden("concordance");
  const hideBibleNames = isSectionHidden("bibleNames");
  const hideBiodata = isSectionHidden("biodata");
  const hideVerses = isSectionHidden("verses");
  const hideCommentary = isSectionHidden("commentary");

  const showLeftColumn = !(hideDictionary && hideConcordance);
  const showMiddleColumn = !(hideBibleNames && hideBiodata);
  const showRightColumn = !(hideVerses && hideCommentary);

  // Keep responsive stacking logic available if needed.
  const contentWidth = elements.content?.getBoundingClientRect().width || window.innerWidth;
  const desiredWidth = [
    showLeftColumn ? Math.max(200, state.layout.left) : 0,
    showMiddleColumn ? Math.max(200, state.layout.middle) : 0,
    showRightColumn ? 300 : 0,
    showLeftColumn && showMiddleColumn ? 2 : 0,
    (showLeftColumn || showMiddleColumn) && showRightColumn ? 2 : 0
  ].reduce((total, value) => total + value, 0);
  const shouldStack = window.innerWidth <= 1240 || contentWidth < desiredWidth + 24;

  state.layout.sidePanelTopHeight = applyStackRows(elements.sidePanel, state.layout.sidePanelTopHeight, 130, {
    hideTop: hideDictionary,
    hideBottom: hideConcordance
  });
  // Bible Names / Biodata are resizable; default is 50/50 split.
  state.layout.namesPanelTopHeight = applyStackRows(elements.namesPanel, state.layout.namesPanelTopHeight, 130, {
    hideTop: hideBibleNames,
    hideBottom: hideBiodata
  });
  state.layout.versesPanelTopHeight = applyStackRows(elements.versesPanel, state.layout.versesPanelTopHeight, 100, {
    hideTop: hideVerses,
    hideBottom: hideCommentary,
    defaultTopRatio: 0.8,
    minTopRatio: 0.65
  });

  if (elements.sidePanel) {
    elements.sidePanel.hidden = !showLeftColumn;
    elements.sidePanel.style.display = showLeftColumn ? "" : "none";
  }
  if (elements.namesPanel) {
    elements.namesPanel.hidden = !showMiddleColumn;
    elements.namesPanel.style.display = showMiddleColumn ? "" : "none";
  }
  if (elements.versesPanel) {
    elements.versesPanel.hidden = !showRightColumn;
    elements.versesPanel.style.display = showRightColumn ? "" : "none";
  }
  if (elements.versePanel) {
    elements.versePanel.hidden = hideVerses;
    elements.versePanel.style.display = hideVerses ? "none" : "";
  }
  if (elements.commentaryCard) {
    elements.commentaryCard.hidden = hideCommentary;
    elements.commentaryCard.style.display = hideCommentary ? "none" : "";
  }

  if (elements.content) {
    elements.content.classList.toggle("is-stacked", shouldStack);
    if (shouldStack) {
      elements.content.style.gridTemplateColumns = "1fr";
      elements.content.style.gap = "8px";
    } else {
      const columns = [];
      if (showLeftColumn) columns.push("minmax(200px, var(--left-width))");
      if (showMiddleColumn) {
        if (columns.length) columns.push("2px");
        columns.push("minmax(200px, var(--middle-width))");
      }
      if (showRightColumn) {
        if (columns.length) columns.push("2px");
        columns.push("minmax(300px, 1fr)");
      }
      elements.content.style.gridTemplateColumns = columns.length ? columns.join(" ") : "1fr";
      elements.content.style.gap = "0";
    }
  }

  if (elements.sidePanelResizer) {
    elements.sidePanelResizer.hidden = hideDictionary || hideConcordance;
  }
  if (elements.namesPanelResizer) {
    elements.namesPanelResizer.hidden = hideBibleNames || hideBiodata;
  }
  if (elements.leftColumnResizer) {
    elements.leftColumnResizer.hidden = shouldStack || !(showLeftColumn && showMiddleColumn);
  }
  if (elements.middleColumnResizer) {
    elements.middleColumnResizer.hidden = shouldStack || !(showMiddleColumn && showRightColumn);
  }
  if (elements.commentaryPanelResizer) {
    elements.commentaryPanelResizer.hidden = hideVerses || hideCommentary;
  }
}

function applyPreferences() {
  document.documentElement.style.setProperty("--reader-font-size", `${state.preferences.fontSize}px`);
  document.documentElement.style.setProperty("--reader-line-height", `${state.preferences.lineHeight}`);
  document.documentElement.classList.toggle("hide-verse-numbers", !state.preferences.showVerseNumbers);
  document.documentElement.classList.toggle("compact-verses", Boolean(state.preferences.compactVerseSpacing));

  // Font family
  const fontFamilyMap = {
    system: "Inter, \"Segoe UI\", sans-serif",
    serif: "Georgia, \"Times New Roman\", serif",
    mono: "\"Courier New\", Courier, monospace"
  };
  document.documentElement.style.setProperty("--reader-font-family", fontFamilyMap[state.preferences.fontFamily] || fontFamilyMap.system);

  elements.fontSizeInput.value = String(state.preferences.fontSize);
  elements.fontSizeValue.value = `${state.preferences.fontSize}px`;
  elements.lineHeightInput.value = String(state.preferences.lineHeight);
  elements.lineHeightValue.value = state.preferences.lineHeight.toFixed(1);
  if (elements.showSearchBarInput) {
    elements.showSearchBarInput.checked = Boolean(state.preferences.showSearchBar);
  }
  if (elements.autoOpenStrongsInput) {
    elements.autoOpenStrongsInput.checked = Boolean(state.preferences.autoOpenStrongsConcordance);
  }
  if (elements.showVerseNumbersInput) {
    elements.showVerseNumbersInput.checked = Boolean(state.preferences.showVerseNumbers);
  }
  if (elements.compactVerseSpacingInput) {
    elements.compactVerseSpacingInput.checked = Boolean(state.preferences.compactVerseSpacing);
  }
  if (elements.shortcutOpenSearchSelect) {
    elements.shortcutOpenSearchSelect.value = state.preferences.shortcuts.openSearch;
  }
  if (elements.shortcutOpenNotesSelect) {
    elements.shortcutOpenNotesSelect.value = state.preferences.shortcuts.openNotes;
  }
  if (elements.shortcutToggleSearchBarSelect) {
    elements.shortcutToggleSearchBarSelect.value = state.preferences.shortcuts.toggleSearchBar;
  }
  const fontFamilySelect = document.querySelector("[data-font-family]");
  if (fontFamilySelect) {
    fontFamilySelect.value = state.preferences.fontFamily;
  }
  // Red letter mode
  document.documentElement.classList.toggle("red-letter-mode", Boolean(state.preferences.redLetterMode));
  const redLetterInput = document.querySelector("[data-red-letter-mode]");
  if (redLetterInput) redLetterInput.checked = Boolean(state.preferences.redLetterMode);
  // Parallel version select
  const parallelSelect = document.querySelector("[data-parallel-version]");
  if (parallelSelect) parallelSelect.value = state.parallelVersion || "";
  setSearchVisible(state.searchVisible);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  elements.themeLabel.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function setSearchVisible(visible) {
  state.searchVisible = Boolean(visible);
  const shouldShow = Boolean(state.preferences.showSearchBar) || state.searchVisible;
  elements.searchWrap.hidden = !shouldShow;
  elements.searchWrap.classList.toggle("is-hidden", !shouldShow);
  if (!shouldShow) {
    elements.searchInput.blur();
  }
}

function openSearch() {
  closeViewMenu();
  hideContextMenu();
  setSearchVisible(true);
  elements.searchInput.focus();
  elements.searchInput.select();
}

function closeSearch() {
  setSearchVisible(false);
}

function openPreferencesModal() {
  hideContextMenu();
  closeViewMenu();
  elements.preferencesModal.showModal();
  requestAnimationFrame(() => positionMenuDialog(elements.preferencesModal, elements.openPreferences));
}

function closePreferencesModal() {
  if (elements.preferencesModal.open) {
    elements.preferencesModal.close();
  }
}

function closeVerseActionsPopover() {
  elements.verseActionsPopover.hidden = true;
  state.activeVerseAnchor = null;
}

function positionMenuPopover(popover, anchorElement) {
  if (!popover || !anchorElement) {
    return;
  }

  const anchorRect = anchorElement.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const width = popoverRect.width || 260;
  const height = popoverRect.height || 180;
  const left = Math.min(window.innerWidth - width - 10, Math.max(10, anchorRect.left));
  const top = Math.min(window.innerHeight - height - 10, Math.max(10, anchorRect.bottom + 8));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function positionMenuDialog(dialog, anchorElement) {
  if (!dialog || !anchorElement || !dialog.open) {
    return;
  }

  const anchorRect = anchorElement.getBoundingClientRect();
  const dialogRect = dialog.getBoundingClientRect();
  const width = dialogRect.width || 360;
  const height = dialogRect.height || 320;
  const left = Math.min(window.innerWidth - width - 10, Math.max(10, anchorRect.left));
  const top = Math.min(window.innerHeight - height - 10, Math.max(10, anchorRect.bottom + 6));
  dialog.style.left = `${left}px`;
  dialog.style.top = `${top}px`;
}

function openAboutModal() {
  hideContextMenu();
  closeViewMenu();
  elements.aboutModal.showModal();
  requestAnimationFrame(() => positionMenuDialog(elements.aboutModal, elements.openAbout));
}

function closeAboutModal() {
  if (elements.aboutModal.open) {
    elements.aboutModal.close();
  }
}

function openTutorialModal() {
  hideContextMenu();
  closeViewMenu();
  elements.tutorialModal.showModal();
  requestAnimationFrame(() => positionMenuDialog(elements.tutorialModal, elements.openTutorial));
}

function closeTutorialModal() {
  if (elements.tutorialModal.open) {
    elements.tutorialModal.close();
  }
}

function isSectionHidden(sectionId) {
  return Boolean(state.hiddenSections[sectionId]);
}

function setSectionHidden(sectionId, hidden) {
  state.hiddenSections[sectionId] = Boolean(hidden);
  saveStoredJson("hidden-sections", state.hiddenSections);
  refreshRenderedContent();
  refreshViewMenu();
}

function syncSidePanelLayout() {
  const hideDictionary = isSectionHidden("dictionary");
  const hideConcordance = isSectionHidden("concordance");
  const hideBibleNames = isSectionHidden("bibleNames");
  const hideBiodata = isSectionHidden("biodata");
  const hideVerses = isSectionHidden("verses");
  const hideCommentary = isSectionHidden("commentary");

  if (elements.dictionaryCard) {
    elements.dictionaryCard.hidden = hideDictionary;
    elements.dictionaryCard.style.display = hideDictionary ? "none" : "";
  }
  if (elements.concordanceCard) {
    elements.concordanceCard.hidden = hideConcordance;
    elements.concordanceCard.style.display = hideConcordance ? "none" : "";
  }
  if (elements.bibleNamesCard) {
    elements.bibleNamesCard.hidden = hideBibleNames;
    elements.bibleNamesCard.style.display = hideBibleNames ? "none" : "";
  }
  if (elements.biodataCard) {
    elements.biodataCard.hidden = hideBiodata;
    elements.biodataCard.style.display = hideBiodata ? "none" : "";
  }
  if (elements.versePanel) {
    elements.versePanel.hidden = hideVerses;
    elements.versePanel.style.display = hideVerses ? "none" : "";
  }
  if (elements.commentaryCard) {
    elements.commentaryCard.hidden = hideCommentary;
    elements.commentaryCard.style.display = hideCommentary ? "none" : "";
  }
}

function normalizeStrongsNumber(value) {
  return String(value || "").trim().toUpperCase();
}

function restoreAllSections() {
  state.hiddenSections = { ...DEFAULT_HIDDEN_SECTIONS };
  saveStoredJson("hidden-sections", state.hiddenSections);
  refreshRenderedContent();
  refreshViewMenu();
}

function refreshViewMenu() {
  if (!elements.menuViewPopover) {
    return;
  }

  elements.showHiddenSections.forEach((button) => {
    const sectionId = button.dataset.showHiddenSection;
    button.hidden = !isSectionHidden(sectionId);
  });

  const hasHiddenSections = Object.values(state.hiddenSections).some(Boolean);
  elements.showAllSections.hidden = false;
  elements.showAllSections.disabled = !hasHiddenSections;
  elements.showAllSections.textContent = hasHiddenSections ? "Show all sections" : "No hidden sections";
}

function openViewMenu() {
  hideContextMenu();
  refreshViewMenu();
  elements.menuViewPopover.hidden = false;
}

function closeViewMenu() {
  if (elements.menuViewPopover) {
    elements.menuViewPopover.hidden = true;
  }
}

function toggleViewMenu() {
  if (elements.menuViewPopover.hidden) {
    openViewMenu();
  } else {
    closeViewMenu();
  }
}

function hideContextMenu() {
  state.contextMenu.visible = false;
  elements.appContextMenu.hidden = true;
}

function positionContextMenu(x, y) {
  const rect = elements.appContextMenu.getBoundingClientRect();
  const width = rect.width || 240;
  const height = rect.height || 96;
  const left = Math.min(window.innerWidth - width - 10, Math.max(10, x));
  const top = Math.min(window.innerHeight - height - 10, Math.max(10, y));
  elements.appContextMenu.style.left = `${left}px`;
  elements.appContextMenu.style.top = `${top}px`;
}

function openContextMenu({ x, y, lookupText = "", sectionId = "", sectionLabel = "" }) {
  closeVerseActionsPopover();
  closeViewMenu();
  state.contextMenu = { visible: true, x, y, lookupText, sectionId, sectionLabel };
  elements.contextLookup.hidden = !lookupText;
  elements.contextCloseSection.hidden = !sectionId;
  elements.contextCloseSection.textContent = sectionLabel ? `Close ${sectionLabel}` : "Close section";
  elements.appContextMenu.hidden = false;
  requestAnimationFrame(() => positionContextMenu(x, y));
}

function getSelectionText() {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : "";
}

function getEventLookupText(target) {
  const selected = getSelectionText();
  if (selected) {
    return selected;
  }

  const lookupScope = target.closest("[data-lookup-text]");
  return lookupScope?.dataset.lookupText?.trim() || "";
}

function getSectionContext(target) {
  const section = target.closest("[data-section-id]");
  if (!section) {
    return null;
  }

  const sectionHead = target.closest("[data-section-head]");
  if (!sectionHead) {
    return null;
  }

  const sectionId = section.dataset.sectionId;
  const labels = {
    dictionary: "dictionary",
    concordance: "concordance",
    bibleNames: "Bible names",
    biodata: "biodata",
    verses: "Bible verses",
    commentary: "commentary"
  };

  return {
    sectionId,
    sectionLabel: labels[sectionId] || "section"
  };
}

function getVerseFromTarget(target) {
  const verseRow = target.closest("[data-book][data-chapter][data-verse]");
  if (!verseRow) {
    return null;
  }

  return getExactVerse(verseRow.dataset.book, Number(verseRow.dataset.chapter), Number(verseRow.dataset.verse));
}

function compareConcordanceMatches(left, right, query) {
  const leftText = [left.number, left.lemma, left.xlit, left.pronounce, left.description].join(" ").toLowerCase();
  const rightText = [right.number, right.lemma, right.xlit, right.pronounce, right.description].join(" ").toLowerCase();
  const normalizedQuery = normalizeSearchText(query);

  const score = (text, entry) => {
    const exact = [
      normalizeText(entry.number),
      normalizeText(entry.lemma),
      normalizeText(entry.xlit),
      normalizeText(entry.pronounce),
      normalizeText(entry.word)
    ].includes(normalizedQuery);
    if (exact) return 400;
    if (text.startsWith(normalizedQuery)) return 300;
    if (text.includes(normalizedQuery)) return 120;
    return 0;
  };

  return score(rightText, right) - score(leftText, left) || String(left.number).localeCompare(String(right.number));
}

function closeNotesModal() {
  if (elements.notesModal.open) {
    elements.notesModal.close();
  }
}

function applyVerseHighlight(element, verse) {
  const color = getVerseHighlightColor(verse);
  element.classList.toggle("is-highlighted", Boolean(color));
  if (color) {
    element.style.setProperty("--verse-highlight-color", `var(--highlight-${color})`);
    element.dataset.highlightColor = color;
  } else {
    element.style.removeProperty("--verse-highlight-color");
    delete element.dataset.highlightColor;
  }
}

function setLookupFocus(value) {
  state.lookupFocusQuery = value.trim();
  state.activeStrongsLookup = "";
  // If we focus on a word, it's no longer a Strong's lookup intent
  const isStrongsNumber = /^[HG]\d+/i.test(state.lookupFocusQuery);
  state.lastLookupWasStrongs = isStrongsNumber;
  renderResults(state.lastResults);
}

function clearLookupFocus() {
  state.lookupFocusQuery = "";
  state.activeStrongsLookup = "";
  renderResults(state.lastResults);
}

function requestSearch(queryValue = state.query) {
  if (!state.searchWorker || !state.isReady) {
    return;
  }
  state.requestId += 1;
  elements.empty.hidden = true;
  elements.summary.hidden = true;
  state.searchWorker.postMessage({
    type: "search",
    requestId: state.requestId,
    query: queryValue,
    page: state.verseResultsPage,
    pageSize: VERSE_PAGE_SIZE,
    book: state.activeResultsBook || ""
  });
}

function lookupSelectedText(value, isExplicitStrongs = false) {
  const query = String(value || "").trim();
  if (!query) {
    return;
  }

  // Detect if this is a Strong's number (e.g. H430, G80)
  const isStrongsNumber = /^[HG]\d+/i.test(query);
  state.lastLookupWasStrongs = isExplicitStrongs || isStrongsNumber;
  state.activeStrongsLookup = isStrongsNumber ? query.toUpperCase() : "";

  openSearch();
  elements.searchInput.value = query;
  state.query = query;
  state.lookupFocusQuery = "";
  state.verseResultsPage = 1;
  if (state.searchWorker && state.isReady) {
    requestSearch(query);
  }
}

function splitMeaningIntoChunks(meaning) {
  return String(meaning || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/;\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function clampNumber(value, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
}

function parseVerseSelection(value, maximum) {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.min(maximum, Math.trunc(numeric));
}

function getChapterCount(book) {
  return state.chaptersByBook[book] || 1;
}

function getVerseCount(book, chapter) {
  return getChapterVerses(book, chapter).length || 1;
}

function getReferenceLabel(book, chapter, verse) {
  return verse ? `${book} ${chapter}:${verse}` : `${book} ${chapter}`;
}

function getExactVerse(book, chapter, verse) {
  return state.bibleData.find((entry) => entry.book === book && entry.chapter === chapter && entry.verse === verse) || null;
}

function setBibleNavigationStatus(message) {
  elements.bibleNavStatus.textContent = message;
}

function refreshRenderedContent() {
  renderResults(state.lastResults);
  syncSidePanelLayout();
  if (elements.chapterModal.open && state.activeVerse) {
    openChapterModal(state.activeVerse);
  }
  if (state.activeVerse && state.activeVerseAnchor) {
    positionVerseActionsPopover(state.activeVerseAnchor);
  }
}

function getEmptyResults() {
  return {
    query: "",
    dictionary: [],
    bibleNames: [],
    concordance: [],
    verses: { total: 0, items: [], matchMode: "empty", referenceLabel: "" }
  };
}

async function loadLocalJson(relativePath) {
  if (window.easySearch && typeof window.easySearch.readJson === "function") {
    return window.easySearch.readJson(relativePath);
  }

  const appdataPath = `appdata://local/${relativePath}`;
  const fileUrl = new URL(`./data/${relativePath}`, window.location.href).href;
  return fetchJsonWithFallback([appdataPath, fileUrl]);
}

async function fetchTextWithFallback(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`Unable to load ${url} (Status: ${response.status})`);
        continue;
      }
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load local text.");
}

async function loadLocalText(relativePath) {
  const appdataPath = `appdata://local/${relativePath}`;
  const fileUrl = new URL(`./data/${relativePath}`, window.location.href).href;
  return fetchTextWithFallback([appdataPath, fileUrl]);
}

function populateVersionOptions() {
  elements.bibleVersionSelect.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.bibleVersions.forEach((version) => {
    const option = document.createElement("option");
    option.value = version.code;
    option.textContent = `${version.shortLabel} - ${version.label}`;
    fragment.appendChild(option);
  });

  elements.bibleVersionSelect.appendChild(fragment);
  elements.bibleVersionSelect.value = state.currentVersion;

  if (elements.translationSelector) {
    elements.translationSelector.innerHTML = "";
    const tabsFragment = document.createDocumentFragment();

    state.bibleVersions.forEach((version) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "translation-btn";
      button.dataset.versionCode = version.code;
      button.textContent = version.shortLabel || String(version.code || "").toUpperCase();
      button.title = version.label || version.code;
      button.classList.toggle("active", version.code === state.currentVersion);
      button.addEventListener("click", () => {
        if (version.code === state.currentVersion) {
          return;
        }
        elements.bibleVersionSelect.value = version.code;
        elements.bibleVersionSelect.dispatchEvent(new Event("change"));
      });
      tabsFragment.appendChild(button);
    });

    elements.translationSelector.appendChild(tabsFragment);
  }

  // Populate parallel version select
  const parallelSelect = document.querySelector("[data-parallel-version]");
  if (parallelSelect) {
    parallelSelect.innerHTML = '<option value="">None</option>';
    const pFrag = document.createDocumentFragment();
    state.bibleVersions.forEach((version) => {
      if (version.code === state.currentVersion) return; // skip current
      const opt = document.createElement("option");
      opt.value = version.code;
      opt.textContent = `${version.shortLabel} — ${version.label}`;
      pFrag.appendChild(opt);
    });
    parallelSelect.appendChild(pFrag);
    parallelSelect.value = state.parallelVersion || "";
  }
}

function populateBookOptions() {
  elements.bibleBookSelect.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.books.forEach((book) => {
    const option = document.createElement("option");
    option.value = book;
    option.textContent = book;
    fragment.appendChild(option);
  });

  elements.bibleBookSelect.appendChild(fragment);
  populateSearchBookFilterOptions();
}

function syncBibleNavigatorInputs() {
  const book = state.navigationSelection.book || state.books[0] || "";
  if (!book) {
    return;
  }

  const maxChapter = getChapterCount(book);
  const chapter = clampNumber(state.navigationSelection.chapter, 1, maxChapter);
  const maxVerse = getVerseCount(book, chapter);
  const verse = parseVerseSelection(state.navigationSelection.verse, maxVerse);

  state.navigationSelection = { book, chapter, verse };
  elements.bibleBookSelect.value = book;

  elements.bibleChapterInput.innerHTML = "";
  for (let index = 1; index <= maxChapter; index += 1) {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = String(index);
    elements.bibleChapterInput.appendChild(option);
  }
  elements.bibleChapterInput.value = String(chapter);

  elements.bibleVerseInput.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All";
  elements.bibleVerseInput.appendChild(allOption);
  for (let index = 1; index <= maxVerse; index += 1) {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = String(index);
    elements.bibleVerseInput.appendChild(option);
  }
  elements.bibleVerseInput.value = verse ? String(verse) : "";
}

function buildHighlightColorButtons() {
  elements.highlightColorList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  HIGHLIGHT_COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "highlight-color-button";
    button.dataset.highlightColor = color.code;
    button.title = color.label;
    button.setAttribute("aria-label", `${color.label} highlight`);
    button.style.setProperty("--color", color.css);
    button.addEventListener("click", () => setActiveVerseHighlight(color.code));
    fragment.appendChild(button);
  });

  elements.highlightColorList.appendChild(fragment);
}

function updateHighlightPickerSelection() {
  const activeColor = state.activeVerse ? getVerseHighlightColor(state.activeVerse) : null;
  elements.highlightColorList.querySelectorAll("[data-highlight-color]").forEach((button) => {
    const isActive = button.dataset.highlightColor === activeColor;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  elements.clearHighlightButton.hidden = !activeColor;
}

function buildNavigationResults() {
  const { book, chapter, verse } = state.navigationSelection;
  if (!book) {
    return [];
  }

  const selectedVerse = getExactVerse(book, chapter, verse);
  if (selectedVerse) {
    return [selectedVerse];
  }

  return getChapterVerses(book, chapter);
}

function populateCommentaryOptions() {
  if (!elements.commentarySelect) return;
  elements.commentarySelect.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.commentaryManifest.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = item.label;
    fragment.appendChild(option);
  });

  elements.commentarySelect.appendChild(fragment);
  if (state.currentCommentaryCode) {
    elements.commentarySelect.value = state.currentCommentaryCode;
  }
}

function populateSearchBookFilterOptions() {
  if (!elements.searchBookSelect) return;
  elements.searchBookSelect.innerHTML = "";
  const fragment = document.createDocumentFragment();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All books";
  fragment.appendChild(allOption);

  state.books.forEach((book) => {
    const option = document.createElement("option");
    option.value = book;
    option.textContent = book;
    fragment.appendChild(option);
  });

  elements.searchBookSelect.appendChild(fragment);

  if (!state.books.includes(state.activeResultsBook)) {
    state.activeResultsBook = "";
    localStorage.removeItem("search-book-filter");
  }

  elements.searchBookSelect.value = state.activeResultsBook;
}

function syncSearchBookFilter() {
  if (!elements.searchBookSelect) return;
  elements.searchBookSelect.value = state.activeResultsBook;
}

function isHtmlCommentarySource(source) {
  return String(source?.kind || source?.format || "").toLowerCase() === "html";
}

function getCommentaryBookIndex(book) {
  if (!book) return 0;
  const normalizedBook = normalizeText(book).replace(/[^a-z0-9]/g, "");
  const index = state.books.findIndex((candidate) => normalizeText(candidate).replace(/[^a-z0-9]/g, "") === normalizedBook);
  return index >= 0 ? index + 1 : 0;
}

function padCommentaryNumber(value, width) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return String(Math.trunc(numeric)).padStart(Math.max(0, Number(width) || 0), "0");
}

function formatCommentaryTemplate(template, values) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ""));
}

function buildCommentaryPath(source, selection) {
  if (!source) return "";
  const bookIndex = getCommentaryBookIndex(selection.book);
  const bookIndexText = bookIndex ? padCommentaryNumber(bookIndex, source.bookIndexPadding || 2) : "";
  const chapterText = padCommentaryNumber(selection.chapter, source.chapterPadding || 0);
  const values = {
    bookIndex: bookIndexText,
    chapter: chapterText,
    book: selection.book || ""
  };

  if (!bookIndex && !source.tocFile) {
    return "";
  }

  const fileName = bookIndex
    ? formatCommentaryTemplate(source.filePattern || source.file || "", values) || String(source.tocFile || source.file || "")
    : String(source.tocFile || source.file || "");
  return ["commentaries", source.folder || "", fileName].filter(Boolean).join("/");
}

function buildCommentaryUrl(source, selection) {
  const commentaryPath = buildCommentaryPath(source, selection);
  if (!commentaryPath) {
    return "";
  }

  const pathParts = ["appdata://local", commentaryPath].filter(Boolean);
  const baseUrl = pathParts.join("/");
  const anchorPattern = source?.chapterAnchorPattern && selection.chapter
    ? formatCommentaryTemplate(source.chapterAnchorPattern, {
        bookIndex: padCommentaryNumber(getCommentaryBookIndex(selection.book), source?.bookIndexPadding || 2),
        chapter: padCommentaryNumber(selection.chapter, source?.chapterPadding || 0),
        book: selection.book || ""
      })
    : "";

  return anchorPattern ? `${baseUrl}#${anchorPattern}` : baseUrl;
}

const COMMENTARY_BOOK_CODES = {
  "Genesis": "Ge",
  "Exodus": "Ex",
  "Leviticus": "Le",
  "Numbers": "Nu",
  "Deuteronomy": "De",
  "Joshua": "Jos",
  "Judges": "Jud",
  "Ruth": "Ru",
  "1 Samuel": "1Sa",
  "2 Samuel": "2Sa",
  "1 Kings": "1Ki",
  "2 Kings": "2Ki",
  "1 Chronicles": "1Ch",
  "2 Chronicles": "2Ch",
  "Ezra": "Ezr",
  "Nehemiah": "Ne",
  "Esther": "Es",
  "Job": "Job",
  "Psalms": "Ps",
  "Proverbs": "Pr",
  "Ecclesiastes": "Ec",
  "Song of Solomon": "So",
  "Isaiah": "Isa",
  "Jeremiah": "Jer",
  "Lamentations": "La",
  "Ezekiel": "Eze",
  "Daniel": "Da",
  "Hosea": "Ho",
  "Joel": "Joe",
  "Amos": "Am",
  "Obadiah": "Ob",
  "Jonah": "Jon",
  "Micah": "Mic",
  "Nahum": "Na",
  "Habakkuk": "Hab",
  "Zephaniah": "Zep",
  "Haggai": "Hag",
  "Zechariah": "Zec",
  "Malachi": "Mal",
  "Matthew": "Mt",
  "Mark": "Mr",
  "Luke": "Lu",
  "John": "Joh",
  "Acts": "Ac",
  "Romans": "Ro",
  "1 Corinthians": "1Co",
  "2 Corinthians": "2Co",
  "Galatians": "Ga",
  "Ephesians": "Eph",
  "Philippians": "Php",
  "Colossians": "Col",
  "1 Thessalonians": "1Th",
  "2 Thessalonians": "2Th",
  "1 Timothy": "1Ti",
  "2 Timothy": "2Ti",
  "Titus": "Tit",
  "Philemon": "Phm",
  "Hebrews": "Heb",
  "James": "Jas",
  "1 Peter": "1Pe",
  "2 Peter": "2Pe",
  "1 John": "1Jo",
  "2 John": "2Jo",
  "3 John": "3Jo",
  "Jude": "Jud",
  "Revelation": "Re"
};

function getCommentaryBookCode(book) {
  return COMMENTARY_BOOK_CODES[book] || "";
}

function normalizeCommentaryWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clearActiveVerseFocus() {
  state.activeVerse = null;
  state.activeVerseAnchor = null;
  closeVerseActionsPopover();
}

function getCommentaryFocusSelection() {
  if (state.activeVerse) {
    return {
      book: state.activeVerse.book,
      chapter: state.activeVerse.chapter,
      verse: state.activeVerse.verse
    };
  }

  if (!state.navigationSelection.book) {
    return null;
  }

  return {
    book: state.navigationSelection.book,
    chapter: state.navigationSelection.chapter,
    verse: state.navigationSelection.verse || null
  };
}

function getCommentarySource() {
  return state.commentaryManifest.find((entry) => entry.code === state.currentCommentaryCode)
    || state.commentaryManifest[0]
    || null;
}

function buildCommentaryCacheKey(source, commentaryPath) {
  return [
    source?.code || "",
    commentaryPath || ""
  ].join("|");
}

async function loadCommentaryHtml(source, selection) {
  const commentaryPath = buildCommentaryPath(source, selection);
  if (!commentaryPath) {
    return "";
  }

  const cacheKey = buildCommentaryCacheKey(source, commentaryPath);
  if (state.commentaryCache[cacheKey]) {
    return state.commentaryCache[cacheKey];
  }

  const html = await loadLocalText(commentaryPath);
  state.commentaryCache[cacheKey] = html;
  return html;
}

function getCommentarySelectionLabel(selection) {
  if (!selection) {
    return "";
  }

  return getReferenceLabel(selection.book, selection.chapter, selection.verse || undefined);
}

function getCommentaryVerseText(selection) {
  if (!selection?.verse) {
    return "";
  }

  return getExactVerse(selection.book, selection.chapter, selection.verse)?.text || "";
}

function extractJfbCommentary(doc, source, selection) {
  const chapterAnchorName = formatCommentaryTemplate(source.chapterAnchorPattern || "Chapter{{chapter}}", {
    chapter: String(selection.chapter),
    bookIndex: padCommentaryNumber(getCommentaryBookIndex(selection.book), source.bookIndexPadding || 2),
    book: selection.book || ""
  });

  const nodes = Array.from(doc.querySelectorAll("a[name], p"));
  const chapterParagraphs = [];
  let inChapter = false;

  nodes.forEach((node) => {
    if (node.tagName === "A") {
      const name = node.getAttribute("name") || "";
      if (name === chapterAnchorName) {
        inChapter = true;
        return;
      }
      if (inChapter && /^Chapter\d+$/i.test(name) && name !== chapterAnchorName) {
        inChapter = false;
      }
      return;
    }

    if (!inChapter) {
      return;
    }

    const text = normalizeCommentaryWhitespace(node.textContent);
    if (text) {
      chapterParagraphs.push(text);
    }
  });

  const sections = [];
  let currentSection = null;
  chapterParagraphs.forEach((text) => {
    const headingMatch = text.match(new RegExp(`^\\S+\\s+${selection.chapter}:(\\d+)(?:\\s*[-,]\\s*(\\d+))?\\b`, "i"));
    if (headingMatch) {
      const start = Number(headingMatch[1]);
      const end = Number(headingMatch[2] || headingMatch[1]);
      currentSection = {
        heading: text,
        start,
        end,
        paragraphs: [text]
      };
      sections.push(currentSection);
      return;
    }

    if (currentSection) {
      currentSection.paragraphs.push(text);
    }
  });

  if (!sections.length) {
    return {
      title: getCommentarySelectionLabel(selection),
      subtitle: source.label,
      paragraphs: chapterParagraphs.slice(0, 6),
      verseText: getCommentaryVerseText(selection)
    };
  }

  const selectedSection = selection.verse
    ? sections.find((section) => selection.verse >= section.start && selection.verse <= section.end) || null
    : sections[0];

  const commentaryParagraphs = selectedSection ? selectedSection.paragraphs.slice(1) : [];
  const title = selectedSection?.heading || getCommentarySelectionLabel(selection);
  const subtitle = selectedSection?.heading
    ? getCommentarySelectionLabel(selection)
    : source.label;

  return {
    title,
    subtitle,
    paragraphs: commentaryParagraphs.slice(0, 6),
    verseText: getCommentaryVerseText(selection)
  };
}

function getCommentaryAnchorVerseNumbers(anchorName) {
  const match = String(anchorName || "").match(/^[A-Za-z0-9]+(?:\d+)?_(\d+)$/);
  return match ? [Number(match[1])] : [];
}

function extractMhcCommentary(doc, source, selection) {
  const nodes = Array.from(doc.querySelectorAll("a[name], p"));
  const introParagraphs = [];
  const blocks = [];
  const pendingVerseNumbers = [];
  let currentBlock = null;

  const finalizeBlock = () => {
    if (!currentBlock) {
      return;
    }

    const paragraphs = currentBlock.paragraphs.filter(Boolean);
    if (paragraphs.length > 0) {
      blocks.push({
        start: currentBlock.start,
        end: currentBlock.end,
        paragraphs
      });
    }
    currentBlock = null;
  };

  nodes.forEach((node) => {
    if (node.tagName === "A") {
      const name = node.getAttribute("name") || "";
      if (/^Sec\d+$/i.test(name)) {
        finalizeBlock();
        const verseNumbers = pendingVerseNumbers.length > 0 ? [...pendingVerseNumbers] : [];
        const start = verseNumbers.length ? Math.min(...verseNumbers) : null;
        const end = verseNumbers.length ? Math.max(...verseNumbers) : null;
        currentBlock = {
          start,
          end,
          paragraphs: []
        };
        pendingVerseNumbers.length = 0;
        return;
      }

      const verseNumbers = getCommentaryAnchorVerseNumbers(name);
      if (verseNumbers.length > 0) {
        pendingVerseNumbers.push(...verseNumbers);
      }
      return;
    }

    const text = normalizeCommentaryWhitespace(node.textContent);
    if (!text) {
      return;
    }

    if (currentBlock) {
      currentBlock.paragraphs.push(text);
    } else {
      introParagraphs.push(text);
    }
  });

  finalizeBlock();

  const selectedBlock = selection.verse
    ? blocks.find((block) => Number.isFinite(block.start) && Number.isFinite(block.end) && selection.verse >= block.start && selection.verse <= block.end)
      || blocks.find((block) => Number.isFinite(block.start) && selection.verse >= block.start)
      || blocks[0]
    : blocks[0];

  const paragraphs = selectedBlock ? selectedBlock.paragraphs : introParagraphs;

  return {
    title: getCommentarySelectionLabel(selection),
    subtitle: source.label,
    paragraphs: paragraphs.slice(0, 6),
    verseText: ""
  };
}

function buildCommentaryEmptyState(message) {
  const empty = document.createElement("div");
  empty.className = "commentary-empty-state";

  const title = document.createElement("p");
  title.className = "commentary-empty-title";
  title.textContent = message;
  empty.appendChild(title);

  const detail = document.createElement("p");
  detail.className = "commentary-empty-detail";
  detail.textContent = "Click a verse to refresh the excerpt, or change the commentary source above.";
  empty.appendChild(detail);

  return empty;
}

async function renderCommentaryPanel() {
  const renderToken = ++state.commentaryRenderToken;

  if (!elements.commentaryList || isSectionHidden("commentary")) {
    return;
  }

  const source = getCommentarySource();
  const selection = getCommentaryFocusSelection();

  elements.commentaryList.innerHTML = "";

  if (!source) {
    elements.commentaryList.appendChild(buildCommentaryEmptyState("No commentary sources are available."));
    return;
  }

  if (!selection) {
    elements.commentaryList.appendChild(buildCommentaryEmptyState("Pick a verse or chapter to see commentary."));
    return;
  }

  const loading = buildCommentaryEmptyState(`Loading ${source.label}...`);
  elements.commentaryList.appendChild(loading);

  let html = "";
  try {
    html = await loadCommentaryHtml(source, selection);
  } catch (error) {
    if (renderToken !== state.commentaryRenderToken) {
      return;
    }
    elements.commentaryList.innerHTML = "";
    elements.commentaryList.appendChild(buildCommentaryEmptyState(`Unable to load commentary: ${error.message}`));
    return;
  }

  if (renderToken !== state.commentaryRenderToken) {
    return;
  }

  if (!html) {
    elements.commentaryList.innerHTML = "";
    elements.commentaryList.appendChild(buildCommentaryEmptyState("No commentary text was found for this selection."));
    return;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const excerpt = isHtmlCommentarySource(source)
    ? (source.code === "jfb"
      ? extractJfbCommentary(doc, source, selection)
      : extractMhcCommentary(doc, source, selection))
    : {
        title: getCommentarySelectionLabel(selection),
        subtitle: source.label,
        paragraphs: [],
        verseText: getCommentaryVerseText(selection)
      };

  elements.commentaryList.innerHTML = "";

  const card = document.createElement("article");
  card.className = "commentary-shell";

  const header = document.createElement("div");
  header.className = "commentary-shell-head";

  const headCopy = document.createElement("div");
  headCopy.className = "commentary-shell-head-copy";

  const sourceLabel = document.createElement("p");
  sourceLabel.className = "commentary-source-label";
  sourceLabel.textContent = source.label;

  const title = document.createElement("h3");
  title.className = "commentary-title";
  title.textContent = getCommentarySelectionLabel(selection);

  headCopy.append(sourceLabel, title);

  const reference = document.createElement("p");
  reference.className = "commentary-reference";
  reference.textContent = excerpt.subtitle || getCommentarySelectionLabel(selection);

  header.append(headCopy, reference);
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "commentary-excerpt";

  if (Array.isArray(excerpt.paragraphs) && excerpt.paragraphs.length > 0) {
    excerpt.paragraphs.forEach((paragraphText) => {
      const paragraph = document.createElement("p");
      paragraph.className = "commentary-paragraph";
      paragraph.textContent = paragraphText;
      body.appendChild(paragraph);
    });
  } else {
    const fallback = document.createElement("p");
    fallback.className = "commentary-paragraph commentary-paragraph-muted";
    fallback.textContent = selection.verse
      ? "No verse-specific commentary was found for this verse."
      : "This commentary page did not expose an excerpt, but the source loaded successfully.";
    body.appendChild(fallback);
  }

  card.appendChild(body);
  elements.commentaryList.appendChild(card);
}

function rebuildBibleIndexes() {
  state.books = [...new Set(state.bibleData.map((entry) => entry.book))];
  state.chaptersByBook = state.books.reduce((accumulator, book) => {
    accumulator[book] = Math.max(...state.bibleData.filter((entry) => entry.book === book).map((entry) => entry.chapter));
    return accumulator;
  }, {});

  if (!state.navigationSelection.book && state.bibleData.length > 0) {
    const firstVerse = state.bibleData[0];
    state.navigationSelection = {
      book: firstVerse.book,
      chapter: firstVerse.chapter,
      verse: null
    };
  }
}

async function loadBibleVersion(versionCode) {
  const fallbackVersion = state.bibleVersions.find((version) => version.code === versionCode)
    ? versionCode
    : state.bibleVersions[0]?.code || "kjv";

  clearActiveVerseFocus();

  try {
    if (!state.bibleVersionCache[fallbackVersion]) {
      console.log(`[DEBUG] Fetching Bible version: ${fallbackVersion}`);
      const fileName = `${fallbackVersion}.json`;
      state.bibleVersionCache[fallbackVersion] = await loadLocalJson(`translations/${fileName}`);
      console.log(`[DEBUG] Successfully loaded ${fallbackVersion}.json. Verse count: ${state.bibleVersionCache[fallbackVersion].length}`);
    }
  } catch (error) {
    console.error(`[DEBUG ERROR] loadBibleVersion failed for ${fallbackVersion}:`, error);
    alert(`Error loading Bible version: ${error.message}`);
    setLoading(false);
    return;
  }

  state.currentVersion = fallbackVersion;
  localStorage.setItem("bible-version", fallbackVersion);
  state.bibleData = state.bibleVersionCache[fallbackVersion];
  rebuildBibleIndexes();

  if (!state.books.includes(state.navigationSelection.book)) {
    state.navigationSelection.book = state.books[0] || "";
    state.navigationSelection.chapter = 1;
    state.navigationSelection.verse = null;
  }

  populateVersionOptions();
  populateBookOptions();
  syncBibleNavigatorInputs();
  saveBibleSelection();
  setLoading(false);
  // Show the current Bible passage immediately instead of waiting for the search worker.
  if (!state.query.trim()) {
    renderNavigationSelection();
  } else {
    renderResults(state.lastResults);
  }

  if (state.searchWorker) {
      state.searchWorker.postMessage({
        type: "init",
        payload: {
          dictionary: state.rawDictionary,
          bible: state.bibleData,
          bibleNames: state.bibleNamesData,
          concordance: state.concordanceData,
          bsbConcordance: state.bsbConcordanceData
        }
      });
    }
  }

function renderNavigationSelection() {
  syncBibleNavigatorInputs();
  const verses = buildNavigationResults();
  renderVerses(verses, "");
  void renderCommentaryPanel();
  const { book, chapter, verse } = state.navigationSelection;
  const selectionText = verse
    ? `Showing ${getReferenceLabel(book, chapter, verse)}.`
    : `Showing full chapter ${getReferenceLabel(book, chapter)}.`;
  setBibleNavigationStatus(`${selectionText} Click any verse to open the full chapter.`);
  saveBibleSelection();
  pushNavHistory({ ...state.navigationSelection });
}

function nudgeNavigationValue(target, direction) {
  clearActiveVerseFocus();
  const book = state.navigationSelection.book || state.books[0];
  if (!book) {
    return;
  }

  if (target === "chapter") {
    const chapter = clampNumber(
      state.navigationSelection.chapter + direction,
      1,
      getChapterCount(book)
    );
    state.navigationSelection.chapter = chapter;
    state.navigationSelection.verse = parseVerseSelection(
      state.navigationSelection.verse,
      getVerseCount(book, chapter)
    );
  }

  if (target === "verse") {
    const chapter = clampNumber(state.navigationSelection.chapter, 1, getChapterCount(book));
    state.navigationSelection.chapter = chapter;
    const currentVerse = parseVerseSelection(state.navigationSelection.verse, getVerseCount(book, chapter));
    if (direction > 0) {
      state.navigationSelection.verse = currentVerse ? currentVerse + direction : 1;
    } else {
      state.navigationSelection.verse = currentVerse ? currentVerse + direction : null;
    }
    state.navigationSelection.verse = parseVerseSelection(
      state.navigationSelection.verse,
      getVerseCount(book, chapter)
    );
  }

  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) {
    renderNavigationSelection();
  }
}

function findDictionaryEntries(query) {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return [];

  const scored = [];
  state.dictionaryEntries.forEach((entry) => {
    let score = 0;
    if (entry.lowerWord === normalizedQuery) score = 500;
    else if (entry.lowerWord.startsWith(normalizedQuery)) score = 380;
    else if (entry.lowerWord.includes(normalizedQuery)) score = 260;
    else if (entry.lowerMeaning.includes(normalizedQuery)) score = 180;
    if (score > 0) scored.push({ score, entry });
  });

  scored.sort((left, right) => right.score - left.score || left.entry.word.localeCompare(right.entry.word));
  return scored.slice(0, 8).map((item) => item.entry);
}

function findBibleNameEntries(query) {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return [];

  const scored = [];
  state.bibleNamesData.forEach((entry) => {
    const lowerName = normalizeText(entry.name);
    const lowerMeaning = normalizeText(entry.meaning);
    let score = 0;

    if (lowerName === normalizedQuery) score = 500;
    else if (lowerName.startsWith(normalizedQuery)) score = 380;
    else if (lowerName.includes(normalizedQuery)) score = 260;
    else if (lowerMeaning.includes(normalizedQuery)) score = 180;

    if (score > 0) scored.push({ score, entry });
  });

  scored.sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name));
  return scored.slice(0, 6).map((item) => item.entry);
}

function findConcordanceEntries(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const scored = [];
  state.concordanceData.forEach((entry) => {
    const fields = [
      normalizeText(entry.number),
      normalizeText(entry.lemma),
      normalizeText(entry.xlit),
      normalizeText(entry.pronounce),
      normalizeText(entry.description)
    ];
    let score = 0;

    if (fields.slice(0, 3).some((field) => field === normalizedQuery)) score = 420;
    else if (fields.slice(0, 4).some((field) => field.startsWith(normalizedQuery))) score = 300;
    else if (fields.some((field) => field.includes(normalizedQuery))) score = 140;

    if (score > 0) scored.push({ score, entry });
  });

  scored.sort((left, right) => right.score - left.score || left.entry.number.localeCompare(right.entry.number));
  return scored.slice(0, 8).map((item) => item.entry);
}

function findConcordanceEntriesByLanguage(query, prefix, limit = 12) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const scored = [];
  state.concordanceData.forEach((entry) => {
    if (!String(entry.number).startsWith(prefix)) {
      return;
    }

    const fields = [
      normalizeSearchText(entry.number),
      normalizeSearchText(entry.word),
      normalizeSearchText(entry.lemma),
      normalizeSearchText(entry.xlit),
      normalizeSearchText(entry.pronounce),
      normalizeSearchText(entry.description)
    ];

    let score = 0;
    if (fields.slice(0, 4).some((field) => field === normalizedQuery)) score = 420;
    else if (fields.slice(0, 5).some((field) => field.startsWith(normalizedQuery))) score = 300;
    else if (fields.some((field) => field.includes(normalizedQuery))) score = 140;

    if (score > 0) {
      scored.push({ score, entry });
    }
  });

  scored.sort((left, right) => right.score - left.score || left.entry.number.localeCompare(right.entry.number));
  return scored.slice(0, limit).map((item) => item.entry);
}

function findFocusedConcordanceEntries(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const forcedPrefix = normalizedQuery.startsWith("h") ? "H" : normalizedQuery.startsWith("g") ? "G" : "";
  const testamentPrefix = forcedPrefix || getTestamentPrefix();
  if (testamentPrefix) {
    const byLanguage = findConcordanceEntriesByLanguage(query, testamentPrefix, 1);
    if (byLanguage.length) return byLanguage;
    if (!forcedPrefix) {
      const filtered = findConcordanceEntries(query)
        .filter((entry) => String(entry.number || "").toUpperCase().startsWith(testamentPrefix));
      return filtered.slice(0, 1);
    }
  }

  return findConcordanceEntries(query).slice(0, 1);
}

function filterConcordanceByTestament(items) {
  const prefix = getTestamentPrefix();
  if (!prefix || !Array.isArray(items)) {
    return items;
  }

  return items.filter((entry) => {
    if (entry.source === "bsb") {
      if (!entry.number) return true;
      return String(entry.number).toUpperCase().startsWith(prefix);
    }
    return String(entry.number || "").toUpperCase().startsWith(prefix);
  });
}

function createInfoCard(title, body, query) {
  const card = document.createElement("article");
  card.className = "info-item";

  const heading = document.createElement("h3");
  heading.className = "info-title";
  heading.innerHTML = highlightText(title, query);

  const text = document.createElement("p");
  text.className = "info-body";
  text.innerHTML = highlightText(body, query);

  card.append(heading, text);
  return card;
}

function createMetaLine(label, value) {
  const row = document.createElement("p");
  row.className = "bio-line";
  row.innerHTML = `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`;
  return row;
}

// Regex to detect Strong's number tags like [H430] or [G3056]
const STRONGS_TAG_REGEX = /(\[[HG]\d+\])/g;

function lookupStrongsEntry(strongsNumber) {
  // Normalize: strip brackets if present, e.g. "[H430]" -> "H430"
  const key = String(strongsNumber).replace(/[\[\]]/g, "").trim().toUpperCase();
  return state.concordanceData.find(
    (entry) => String(entry.number).trim().toUpperCase() === key
  ) || null;
}

function isolateStrongsLookup(strongsNum) {
  const entry = lookupStrongsEntry(strongsNum);
  if (!entry) return;

  // Only set activeStrongsLookup — do NOT touch lookupFocusQuery so
  // dictionary and Bible names results from the current search are preserved.
  state.activeStrongsLookup = String(strongsNum).trim().toUpperCase();
  state.lastLookupWasStrongs = true;
  if (state.currentVersion === "kjv_plus" && state.preferences.autoOpenStrongsConcordance) {
    setSectionHidden("concordance", false);
  } else {
    refreshRenderedContent();
  }
}


function createInteractiveTextNode(text, query = "") {
  const fragment = document.createDocumentFragment();
  const loweredQuery = (query || "").trim().toLowerCase();

  // Strip <em>...</em> tags but preserve their content as italic spans
  let cleanedText = String(text);

  // Split on <em>...</em> first to handle italics, then process each segment
  const emParts = cleanedText.split(/(<em>.*?<\/em>)/gi);

  const processPlainSegment = (segment, isItalic) => {
    // Robust regex to split words and Strong's tags (handles [H123], [G123a], etc)
    const splitPattern = /([A-Za-z']+|\[[HhGg]\d+[A-Za-z]?\])/g;
    const parts = segment.split(splitPattern);
    
    const hasStrongs = segment.includes('[H') || segment.includes('[G') || segment.includes('[h') || segment.includes('[g');
    if (hasStrongs) {
      console.log(`[DEBUG] Processing KJV+ segment: "${segment.substring(0, 50)}..."`);
      console.log(`[DEBUG] Split parts:`, parts);
    }

    parts.forEach((part) => {
      if (!part) return;

      // Detect Strong's number tag like [H430] or [H430a]
      if (part.startsWith("[") && part.endsWith("]") && (part.includes("H") || part.includes("G") || part.includes("h") || part.includes("g"))) {
        const strongsNum = part.slice(1, -1).toUpperCase();
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "strongs-chip";
        chip.textContent = strongsNum;
        chip.title = `Look up ${strongsNum} in the lexicon`;
        chip.dataset.strongsNumber = strongsNum;
        chip.addEventListener("click", (event) => {
          event.stopPropagation();
          hideStrongsTooltip();
          isolateStrongsLookup(strongsNum);
        });
        chip.addEventListener("mouseenter", (event) => {
          showStrongsTooltip(strongsNum, chip);
        });
        chip.addEventListener("mouseleave", () => {
          // Small delay so user can move to tooltip
          setTimeout(() => {
            const tooltip = dynamicElements.strongsTooltip;
            if (tooltip && !tooltip.matches(":hover")) hideStrongsTooltip();
          }, 120);
        });
        
        if (isItalic) {
          const em = document.createElement("em");
          em.appendChild(chip);
          fragment.appendChild(em);
        } else {
          fragment.appendChild(chip);
        }
        return;
      }

      // Detect words for lookup (letters and apostrophes only)
      if (/^[A-Za-z']+$/.test(part)) {
        const cleanWord = part.replace(/^'+|'+$/g, "");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "word-chip";
        if (isItalic) button.classList.add("word-chip-italic");
        button.textContent = part;
        if (loweredQuery && normalizeText(part).includes(loweredQuery)) {
          button.classList.add("word-chip-highlight");
        }
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (cleanWord) setLookupFocus(cleanWord);
        });
        fragment.appendChild(button);
        return;
      }

      // Fallback for symbols, digits outside brackets, punctuation, spaces
      if (isItalic && part.trim()) {
        const em = document.createElement("em");
        em.appendChild(document.createTextNode(part));
        fragment.appendChild(em);
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });
  };

  emParts.forEach((segment) => {
    if (/^<em>(.*)<\/em>$/i.test(segment)) {
      const inner = segment.replace(/^<em>(.*)<\/em>$/i, "$1");
      processPlainSegment(inner, true);
    } else {
      processPlainSegment(segment, false);
    }
  });

  return fragment;
}

function renderDictionaryList(items, query, focusedWord) {
  elements.dictionaryList.innerHTML = "";
  if (isSectionHidden("dictionary") || !items.length) {
    elements.dictionaryCard.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "info-item dictionary-entry";
    card.dataset.lookupText = item.word;

    const heading = document.createElement("div");
    heading.className = "dictionary-entry-head";

    const title = document.createElement("h3");
    title.className = "info-title";
    title.innerHTML = highlightText(item.word, query);
    heading.appendChild(title);

    if (focusedWord) {
      const badge = document.createElement("span");
      badge.className = "dictionary-badge";
      badge.textContent = `Word lookup: ${focusedWord}`;
      heading.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "dictionary-body";
    splitMeaningIntoChunks(item.meaning).forEach((chunk) => {
      const paragraph = document.createElement("p");
      paragraph.className = "dictionary-paragraph";
      paragraph.innerHTML = highlightText(chunk, query);
      body.appendChild(paragraph);
    });

    card.append(heading, body);
    fragment.appendChild(card);
  });

  elements.dictionaryList.appendChild(fragment);
  elements.dictionaryCard.hidden = false;
}

function renderInfoList(container, parentCard, items, query, keyName) {
  container.innerHTML = "";
  if (!items.length) {
    parentCard.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(createInfoCard(item[keyName], item.meaning, query)));
  container.appendChild(fragment);
  parentCard.hidden = false;
}

function renderBibleNamesList(items, query) {
  elements.bibleNamesList.innerHTML = "";

  if (isSectionHidden("bibleNames") || !items.length) {
    elements.bibleNamesCard.hidden = true;
    return null;
  }

  const fragment = document.createDocumentFragment();
  let primaryBio = null;

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "info-item bible-name-entry";
    card.dataset.lookupText = item.name;

    const title = document.createElement("h3");
    title.className = "info-title";
    title.innerHTML = highlightText(item.name, query);

    const meaning = document.createElement("p");
    meaning.className = "info-body";
    meaning.innerHTML = highlightText(item.meaning, query);

    card.append(title, meaning);

    const bios = state.nameBiodata[item.name] || [];
    if (bios.length > 0) {
      primaryBio = primaryBio || { name: item.name, meaning: item.meaning, bios };
    }

    fragment.appendChild(card);
  });

  elements.bibleNamesList.appendChild(fragment);
  elements.bibleNamesCard.hidden = false;
  return primaryBio;
}

function renderBiodata(primaryBio, query) {
  elements.biodataList.innerHTML = "";

  if (isSectionHidden("biodata") || !primaryBio) {
    elements.biodataCard.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  const lead = document.createElement("article");
  lead.className = "info-item bio-card";
  lead.dataset.lookupText = primaryBio.name;

  const leadTitle = document.createElement("p");
  leadTitle.className = "bio-title";
  leadTitle.innerHTML = highlightText(primaryBio.name, query);

  const leadMeaning = document.createElement("p");
  leadMeaning.className = "bio-summary";
  leadMeaning.innerHTML = highlightText(primaryBio.meaning, query);

  lead.append(leadTitle, leadMeaning);
  fragment.appendChild(lead);

  primaryBio.bios.slice(0, 2).forEach((bio) => {
    const bioCard = document.createElement("article");
    bioCard.className = "info-item bio-card";
    bioCard.dataset.lookupText = bio.title || primaryBio.name;

    const bioTitle = document.createElement("p");
    bioTitle.className = "bio-title";
    bioTitle.textContent = bio.title;
    bioCard.appendChild(bioTitle);

    if (bio.summary) {
      const summary = document.createElement("p");
      summary.className = "bio-summary";
      summary.textContent = bio.summary;
      bioCard.appendChild(summary);
    }

    const meta = [
      ["Gender", bio.gender],
      ["Occupation", bio.occupation],
      ["Born", bio.born],
      ["Died", bio.died],
      ["Birth place", bio.birthPlace],
      ["Death place", bio.deathPlace],
      ["Group", bio.group]
    ].filter(([, value]) => value);

    meta.forEach(([label, value]) => {
      bioCard.appendChild(createMetaLine(label, value));
    });

    fragment.appendChild(bioCard);
  });

  elements.biodataList.appendChild(fragment);
  elements.biodataCard.hidden = false;
}

function renderConcordanceList(items, query) {
  elements.concordanceList.innerHTML = "";

  if (isSectionHidden("concordance") || state.currentVersion !== "kjv_plus" || !state.lastLookupWasStrongs) {
    elements.concordanceCard.hidden = true;
    return;
  }

  const groupedItems = Array.isArray(items)
    ? null
    : [
        { label: "Hebrew", items: items.hebrew || [] },
        { label: "Greek", items: items.greek || [] }
      ];

  const hasItems = Array.isArray(items)
    ? items.length > 0
    : groupedItems.some((group) => group.items.length > 0);

  if (!hasItems) {
    elements.concordanceCard.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  const renderEntry = (item) => {
    const card = document.createElement("article");
    card.className = "info-item concordance-entry";
    card.dataset.lookupText = item.source === "bsb" ? item.entry : item.lemma || item.xlit || item.number;

    const head = document.createElement("div");
    head.className = "concordance-head";

    const code = document.createElement("span");
    code.className = "concordance-code";
    code.dataset.source = item.source || "strongs";
    code.textContent = item.source === "bsb" ? "BSB" : item.number;

    const lemma = document.createElement("h3");
    lemma.className = "info-title";
    lemma.innerHTML = highlightText(item.source === "bsb" ? item.entry : item.lemma || item.xlit || item.number, query);

    head.append(code, lemma);

    const meta = document.createElement("p");
    meta.className = "concordance-meta";
    const strongsKey = item.number ? String(item.number).trim().toUpperCase() : "";
    const strongsEntry = strongsKey ? state.strongsOccurrences.entries[strongsKey] : null;
    const strongsSummary = strongsEntry && Number.isFinite(strongsEntry.total)
      ? `Total occurrences: ${strongsEntry.total}`
      : "";

    meta.textContent = item.source === "bsb"
      ? `${item.occurrences || 0} occurrences${(item.samples || []).length ? ` • ${(item.samples || []).map((sample) => sample.reference).filter(Boolean).slice(0, 3).join(" • ")}` : ""}`
      : [item.xlit, item.pronounce, strongsSummary].filter(Boolean).join(" • ");

    const description = document.createElement("p");
    description.className = "info-body";
    const strongsSamples = strongsEntry && Array.isArray(strongsEntry.samples)
      ? filterStrongsSamples(strongsKey, strongsEntry.samples)
          .map((sample) => `${sample.reference || ""} ${sample.word || ""}`.trim())
          .filter(Boolean)
          .slice(0, 2)
          .join(" • ")
      : "";

    description.innerHTML =
      item.source === "bsb"
        ? highlightText((item.samples || []).map((sample) => sample.context).filter(Boolean).slice(0, 2).join(" "), query)
        : highlightText([item.description, strongsSamples].filter(Boolean).join(" "), query);

    card.append(head);
    if (meta.textContent) {
      card.append(meta);
    }
    card.append(description);
    fragment.appendChild(card);
  };

  if (Array.isArray(items)) {
    items.forEach(renderEntry);
  } else {
    groupedItems.forEach((group) => {
      if (!group.items.length) {
        return;
      }

      const groupLabel = document.createElement("p");
      groupLabel.className = "bio-label";
      groupLabel.textContent = `${group.label} Lexicon`;
      fragment.appendChild(groupLabel);

      group.items.forEach(renderEntry);
    });
  }

  elements.concordanceList.appendChild(fragment);
  elements.concordanceCard.hidden = false;
}

function getChapterVerses(book, chapter) {
  return state.bibleData.filter((entry) => entry.book === book && entry.chapter === chapter);
}

function closeChapterModal() {
  if (elements.chapterModal.open) elements.chapterModal.close();
}

function openChapterModal(selectedVerse) {
  state.activeVerse = selectedVerse;
  state.activeVerseAnchor = null;
  const chapterVerses = getChapterVerses(selectedVerse.book, selectedVerse.chapter);
  elements.chapterTitle.textContent = `${selectedVerse.book} ${selectedVerse.chapter}`;
  elements.chapterList.innerHTML = "";
  void renderCommentaryPanel();

  const fragment = document.createDocumentFragment();
  chapterVerses.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "chapter-verse";
    row.dataset.book = entry.book;
    row.dataset.chapter = String(entry.chapter);
    row.dataset.verse = String(entry.verse);
    if (entry.verse === selectedVerse.verse) row.classList.add("chapter-verse-active");
    applyVerseHighlight(row, entry);
    if (hasVerseNote(entry)) {
      row.classList.add("has-note");
      row.appendChild(createNoteIndicator(getVerseNote(entry)));
    }
    row.tabIndex = 0;

    const number = document.createElement("span");
    number.className = "chapter-verse-number";
    number.textContent = entry.verse;

    const text = document.createElement("p");
    text.className = "chapter-verse-text";
    text.appendChild(createInteractiveTextNode(entry.text, state.query));

    const chapterCopyBtn = document.createElement("button");
    chapterCopyBtn.type = "button";
    chapterCopyBtn.className = "verse-copy-btn";
    chapterCopyBtn.title = "Copy verse";
    chapterCopyBtn.setAttribute("aria-label", "Copy verse");
    chapterCopyBtn.innerHTML = '<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1H8V4Zm0 0H6m10 4h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-2"/></svg>';
    chapterCopyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      copyVerseToClipboard(entry);
    });

    row.append(number, text, chapterCopyBtn);
    fragment.appendChild(row);
  });

  elements.chapterList.appendChild(fragment);
  if (!elements.chapterModal.open) {
    elements.chapterModal.showModal();
  }
}

function positionVerseActionsPopover(anchorElement) {
  if (!anchorElement || elements.verseActionsPopover.hidden) {
    return;
  }

  const anchorRect = anchorElement.getBoundingClientRect();
  const popoverRect = elements.verseActionsPopover.getBoundingClientRect();
  const popoverWidth = popoverRect.width || 320;
  const popoverHeight = popoverRect.height || 220;
  const margin = 12;

  let left = anchorRect.left;
  let top = anchorRect.top - popoverHeight - margin;

  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  left = Math.max(10, left);

  if (top < 10) {
    top = Math.min(window.innerHeight - popoverHeight - 10, anchorRect.bottom + margin);
  }

  elements.verseActionsPopover.style.left = `${left}px`;
  elements.verseActionsPopover.style.top = `${Math.max(10, top)}px`;
}

function openVerseActions(verse, anchorElement) {
  hideContextMenu();
  state.activeVerse = verse;
  state.activeVerseAnchor = anchorElement || null;
  elements.verseActionsTitle.textContent = `${verse.book} ${verse.chapter}:${verse.verse} (${state.currentVersion.toUpperCase()})`;
  elements.addNoteButton.textContent = hasVerseNote(verse) ? "Edit Note" : "Add Notes";
  closeNotesModal();
  updateHighlightPickerSelection();
  elements.verseActionsPopover.hidden = false;
  positionVerseActionsPopover(anchorElement);
  void renderCommentaryPanel();
}

function openNotesModal() {
  if (!state.activeVerse) {
    return;
  }

  hideContextMenu();
  const key = getVerseKey(state.activeVerse);
  const savedNote = state.annotations.notes[key] ?? "";
  elements.notesTitle.textContent = `${state.activeVerse.book} ${state.activeVerse.chapter}:${state.activeVerse.verse}`;
  elements.notesInput.value = savedNote;
  elements.notesInput.defaultValue = savedNote;
  closeVerseActionsPopover();
  elements.notesModal.showModal();
  requestAnimationFrame(() => {
    elements.notesInput.focus();
    elements.notesInput.setSelectionRange(savedNote.length, savedNote.length);
  });
}

function saveActiveVerseNote() {
  if (!state.activeVerse) {
    return;
  }

  const key = getVerseKey(state.activeVerse);
  const value = elements.notesInput.value.trim();
  if (value) {
    state.annotations.notes[key] = value;
  } else {
    delete state.annotations.notes[key];
  }
  saveAnnotations();
  closeNotesModal();
  refreshRenderedContent();
}

function clearActiveVerseNote() {
  if (!state.activeVerse) {
    return;
  }

  delete state.annotations.notes[getVerseKey(state.activeVerse)];
  elements.notesInput.value = "";
  saveAnnotations();
  closeNotesModal();
  refreshRenderedContent();
}

function setActiveVerseHighlight(color) {
  if (!state.activeVerse) {
    return;
  }

  const key = getVerseKey(state.activeVerse);
  state.annotations.highlights[key] = color;
  saveAnnotations();
  closeVerseActionsPopover();
  refreshRenderedContent();
}

function clearActiveVerseHighlight() {
  if (!state.activeVerse) {
    return;
  }

  delete state.annotations.highlights[getVerseKey(state.activeVerse)];
  saveAnnotations();
  closeVerseActionsPopover();
  refreshRenderedContent();
}

function renderVerses(verses, query) {
  elements.verseList.innerHTML = "";
  if (isSectionHidden("verses") || !verses.length) {
    return;
  }

  const hasParallel = Boolean(state.parallelVersion && state.parallelData.length);
  const fragment = document.createDocumentFragment();
  const groups = new Map();
  let verseIndex = 0;

  verses.forEach((verse) => {
    const key = `${verse.book}|${verse.chapter}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(verse);
  });

  groups.forEach((chapterVerses, key) => {
    const [book, chapter] = key.split("|");
    const section = document.createElement("section");
    section.className = "verse-group";

    const headingRow = document.createElement("div");
    headingRow.className = "verse-group-heading-row";

    const heading = document.createElement("h3");
    heading.className = "verse-group-title";
    heading.textContent = `${book} Chapter ${chapter}`;
    headingRow.appendChild(heading);

    const chapterKey = `${book}|${chapter}`;
    const isRead = Boolean(state.readingProgress[chapterKey]);
    const readBtn = document.createElement("button");
    readBtn.type = "button";
    readBtn.className = "chapter-read-btn" + (isRead ? " is-read" : "");
    readBtn.title = isRead ? "Mark as unread" : "Mark chapter as read";
    readBtn.textContent = isRead ? "\u2713 Read" : "Mark read";
    readBtn.dataset.chapterKey = chapterKey;
    readBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleChapterRead(chapterKey);
    });
    headingRow.appendChild(readBtn);
    section.appendChild(headingRow);

    const list = document.createElement("div");
    list.className = "verse-group-list" + (hasParallel ? " verse-group-parallel" : "");

    chapterVerses.forEach((verse) => {
      const item = document.createElement("article");
      item.className = "verse-line";
      item.dataset.book = verse.book;
      item.dataset.chapter = String(verse.chapter);
      item.dataset.verse = String(verse.verse);
      item.dataset.verseIndex = String(verseIndex++);
      applyVerseHighlight(item, verse);
      if (hasVerseNote(verse)) {
        item.classList.add("has-note");
        item.appendChild(createNoteIndicator(getVerseNote(verse)));
      }
      item.tabIndex = 0;

      const number = document.createElement("span");
      number.className = "verse-line-number";
      number.textContent = `${verse.verse}.`;

      const textWrap = document.createElement("div");
      textWrap.className = "verse-line-content";

      const text = document.createElement("p");
      text.className = "verse-text";
      text.appendChild(createInteractiveTextNode(verse.text, query));

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "verse-copy-btn";
      copyBtn.title = "Copy verse";
      copyBtn.setAttribute("aria-label", "Copy verse");
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1H8V4Zm0 0H6m10 4h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-2"/></svg>';
      copyBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        copyVerseToClipboard(verse);
      });

      textWrap.appendChild(text);
      textWrap.appendChild(copyBtn);

      if (hasParallel) {
        const parallelEntry = state.parallelData.find(
          (e) => e.book === verse.book && e.chapter === verse.chapter && e.verse === verse.verse
        );
        const parallelWrap = document.createElement("div");
        parallelWrap.className = "verse-line-parallel";
        const parallelLabel = document.createElement("span");
        parallelLabel.className = "parallel-version-label";
        parallelLabel.textContent = state.parallelVersion.toUpperCase();
        const parallelText = document.createElement("p");
        parallelText.className = "verse-text verse-text-parallel";
        parallelText.textContent = parallelEntry ? parallelEntry.text : "\u2014";
        parallelWrap.append(parallelLabel, parallelText);
        item.append(number, textWrap, parallelWrap);
      } else {
        item.append(number, textWrap);
      }

      list.appendChild(item);
    });

    section.appendChild(list);
    fragment.appendChild(section);
  });

  elements.verseList.appendChild(fragment);

  // Smooth scroll to active verse if navigating to a specific verse
  if (state.navigationSelection.verse && !query) {
    requestAnimationFrame(() => {
      const book = state.navigationSelection.book.replace(/"/g, '\\"');
      const target = elements.verseList.querySelector(
        `[data-book="${book}"][data-chapter="${state.navigationSelection.chapter}"][data-verse="${state.navigationSelection.verse}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("verse-pulse");
        setTimeout(() => target.classList.remove("verse-pulse"), 1200);
      }
    });
  }
}

function closeBookOccurrencesPopover() {
  if (elements.bookOccurrencesPopover) {
    elements.bookOccurrencesPopover.hidden = true;
  }
}

function renderBookOccurrencesPopover() {
  if (!elements.bookOccurrencesList || !elements.openBookOccurrences || !elements.bookOccurrencesPopover) return;
  elements.bookOccurrencesList.innerHTML = "";
  const hasQuery = Boolean(state.query && state.query.trim());
  const hasBooks = state.searchBookCounts.length > 0;
  elements.openBookOccurrences.hidden = !(hasQuery && hasBooks);
  if (!hasQuery || !hasBooks) {
    closeBookOccurrencesPopover();
    return;
  }

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "menu-popover-item";
  allButton.textContent = `All books (${state.searchVerseTotalAll})`;
  allButton.disabled = !state.activeResultsBook;
  allButton.addEventListener("click", () => {
    state.activeResultsBook = "";
    state.verseResultsPage = 1;
    localStorage.removeItem("search-book-filter");
    syncSearchBookFilter();
    requestSearch();
    closeBookOccurrencesPopover();
  });
  elements.bookOccurrencesList.appendChild(allButton);

  state.searchBookCounts.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-popover-item";
    button.textContent = `${item.book} (${item.count})`;
    if (state.activeResultsBook === item.book) {
      button.classList.add("is-active");
      button.disabled = true;
    }
    button.addEventListener("click", () => {
      state.activeResultsBook = item.book;
      state.verseResultsPage = 1;
      localStorage.setItem("search-book-filter", state.activeResultsBook);
      syncSearchBookFilter();
      requestSearch();
      closeBookOccurrencesPopover();
    });
    elements.bookOccurrencesList.appendChild(button);
  });
}

function renderSummary(results) {
  const hasQuery = Boolean(results.query);
  const hasResults =
    results.dictionary.length > 0 ||
    results.bibleNames.length > 0 ||
    results.concordance.length > 0 ||
    results.verses.total > 0;
  if (!hasQuery || !hasResults) {
    elements.summary.hidden = true;
    return;
  }

  const verseText = results.verses.total > results.verses.items.length
    ? `${results.verses.items.length} of ${results.verses.total} verses shown`
    : `${results.verses.total} verses`;

  elements.summary.textContent = `${results.dictionary.length} dictionary • ${results.bibleNames.length} names • ${results.concordance.length} concordance • ${verseText}`;
  elements.summary.hidden = false;
}

function renderResults(results) {
  const hasQuery = Boolean(results.query);
  const hasResults =
    results.dictionary.length > 0 ||
    results.bibleNames.length > 0 ||
    results.concordance.length > 0 ||
    results.verses.total > 0;

  // Dictionary and names always use the word-click focus or the search query —
  // never the Strong's number, so clicking a chip doesn't wipe those panels.
  const sideQuery = state.lookupFocusQuery || results.query;
  const dictionaryItems = state.lookupFocusQuery ? findDictionaryEntries(state.lookupFocusQuery) : results.dictionary;
  const bibleNameItems = state.lookupFocusQuery ? findBibleNameEntries(state.lookupFocusQuery) : results.bibleNames;

  // Concordance is driven independently: Strong's chip > word-click > search results
  const concordanceItems = state.activeStrongsLookup
    ? [lookupStrongsEntry(state.activeStrongsLookup)].filter(Boolean)
    : state.lookupFocusQuery
    ? findFocusedConcordanceEntries(state.lookupFocusQuery)
    : filterConcordanceByTestament(results.concordance);
  if (results.verses.matchMode === "reference" && results.verses.referenceLabel) {
    const referenceMatch = results.verses.referenceLabel.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(\d+))?$/);
    if (referenceMatch) {
      const [, book, chapter, verse] = referenceMatch;
      state.navigationSelection = {
        book,
        chapter: Number(chapter),
        verse: verse ? Number(verse) : null
      };
      saveBibleSelection();
      syncBibleNavigatorInputs();
    }
  }

  renderDictionaryList(dictionaryItems, sideQuery, state.lookupFocusQuery);
  const primaryBio = renderBibleNamesList(bibleNameItems, sideQuery);
  renderBiodata(primaryBio, sideQuery);
  renderConcordanceList(concordanceItems, sideQuery);

  if (hasQuery) {
    state.searchVerseTotalAll = Number(results.verses.totalAll || 0);
    state.searchBookCounts = Array.isArray(results.verses.bookCounts) ? results.verses.bookCounts : [];
    const pageItems = Array.isArray(results.verses.items) ? results.verses.items : [];
    if (state.verseResultsPage > 1) {
      state.pagedVerseItems = [...state.pagedVerseItems, ...pageItems];
    } else {
      state.pagedVerseItems = pageItems;
    }
    renderVerses(state.pagedVerseItems, results.query);
    const referenceLabel = results.verses.referenceLabel ? `Reference: ${results.verses.referenceLabel}. ` : "";
    const phraseLabel = results.verses.matchMode === "phrase" ? "Phrase search active. " : "";
    const filterLabel = state.activeResultsBook ? `${state.activeResultsBook}: ` : "";
    const totalForCurrentView = Number(results.verses.total || 0);
    const shownCount = state.pagedVerseItems.length;
    const paginationLabel = results.verses.hasMore
      ? ` Showing ${shownCount} of ${totalForCurrentView} (page ${state.verseResultsPage}).`
      : ` Showing ${shownCount} of ${totalForCurrentView}.`;
    setBibleNavigationStatus(
      `${referenceLabel}${phraseLabel}${filterLabel}${totalForCurrentView} occurrence${totalForCurrentView === 1 ? "" : "s"} found.${paginationLabel}`
    );
    if (elements.verseLoadMore) {
      elements.verseLoadMore.hidden = !results.verses.hasMore;
    }
  } else {
    state.searchVerseTotalAll = 0;
    state.searchBookCounts = [];
    state.verseResultsPage = 1;
    state.pagedVerseItems = [];
    if (elements.verseLoadMore) {
      elements.verseLoadMore.hidden = true;
    }
    renderNavigationSelection();
  }
  renderBookOccurrencesPopover();
  syncSearchBookFilter();
  void renderCommentaryPanel();
  renderSummary({
    ...results,
    dictionary: dictionaryItems,
    bibleNames: bibleNameItems,
    concordance: Array.isArray(concordanceItems)
      ? concordanceItems
      : [...concordanceItems.hebrew, ...concordanceItems.greek]
  });

  elements.empty.hidden = !hasQuery || hasResults;
  syncSidePanelLayout();
  applyLayout();
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.searchInput.disabled = isLoading;
  applyLayout();
}

function canUseEdgeResize() {
  return window.innerWidth > 860 && !elements.content?.classList.contains("is-stacked");
}

function isVisibleElement(element) {
  return Boolean(element && !element.hidden && element.style.display !== "none");
}

function getEdgeResizeTarget(clientX, clientY) {
  if (!canUseEdgeResize() || !elements.content) {
    return "";
  }

  const contentRect = elements.content.getBoundingClientRect();
  if (
    clientX < contentRect.left ||
    clientX > contentRect.right ||
    clientY < contentRect.top ||
    clientY > contentRect.bottom
  ) {
    return "";
  }

  // Column edges (width resize)
  if (isVisibleElement(elements.sidePanel) && isVisibleElement(elements.namesPanel)) {
    const x = elements.sidePanel.getBoundingClientRect().right;
    if (Math.abs(clientX - x) <= EDGE_RESIZE_THRESHOLD) {
      return "left";
    }
  }
  if (isVisibleElement(elements.namesPanel) && isVisibleElement(elements.versesPanel)) {
    const x = elements.namesPanel.getBoundingClientRect().right;
    if (Math.abs(clientX - x) <= EDGE_RESIZE_THRESHOLD) {
      return "middle";
    }
  }

  // Row edges (height resize)
  if (isVisibleElement(elements.dictionaryCard) && isVisibleElement(elements.concordanceCard)) {
    const splitY = elements.dictionaryCard.getBoundingClientRect().bottom;
    const sideRect = elements.sidePanel?.getBoundingClientRect();
    if (sideRect && clientX >= sideRect.left && clientX <= sideRect.right && Math.abs(clientY - splitY) <= EDGE_RESIZE_THRESHOLD) {
      return "side-panel";
    }
  }
  if (isVisibleElement(elements.bibleNamesCard) && isVisibleElement(elements.biodataCard)) {
    const splitY = elements.bibleNamesCard.getBoundingClientRect().bottom;
    const namesRect = elements.namesPanel?.getBoundingClientRect();
    if (namesRect && clientX >= namesRect.left && clientX <= namesRect.right && Math.abs(clientY - splitY) <= EDGE_RESIZE_THRESHOLD) {
      return "names-panel";
    }
  }
  if (isVisibleElement(elements.versePanel) && isVisibleElement(elements.commentaryCard)) {
    const splitY = elements.versePanel.getBoundingClientRect().bottom;
    const versesRect = elements.versesPanel?.getBoundingClientRect();
    if (versesRect && clientX >= versesRect.left && clientX <= versesRect.right && Math.abs(clientY - splitY) <= EDGE_RESIZE_THRESHOLD) {
      return "commentary-panel";
    }
  }

  return "";
}

function applyEdgeResizeCursor(target) {
  if (!elements.content) {
    return;
  }
  if (target === "left" || target === "middle") {
    elements.content.style.cursor = "col-resize";
  } else if (target === "side-panel" || target === "names-panel" || target === "commentary-panel") {
    elements.content.style.cursor = "row-resize";
  } else {
    elements.content.style.cursor = "";
  }
}

function updateEdgeResizeFromPointer(event) {
  const target = getEdgeResizeTarget(event.clientX, event.clientY);
  state.edgeResizeTarget = target;
  applyEdgeResizeCursor(target);
}

function startResize(which, pointer) {
  const initialLeft = state.layout.left;
  const initialMiddle = state.layout.middle;
  const getStackResizeContext = (selector, currentTop, minHeight) => {
    const panelElement = document.querySelector(selector);
    const panelRect = panelElement?.getBoundingClientRect();
    const rowGap = panelElement
      ? Number.parseFloat(getComputedStyle(panelElement).rowGap || getComputedStyle(panelElement).gap || "0") || 0
      : 0;
    const availableHeight = panelRect
      ? Math.max(minHeight * 2, panelRect.height - rowGap * 2 - 2)
      : minHeight * 2;
    const baseTop = Number.isFinite(currentTop)
      ? currentTop
      : panelRect
        ? Math.max(minHeight, Math.floor(availableHeight / 2))
        : minHeight;
    return { panelRect, availableHeight, baseTop, minHeight };
  };

  const sidePanelContext = getStackResizeContext(".side-panel", state.layout.sidePanelTopHeight, 130);
  const namesPanelContext = getStackResizeContext(".names-panel", state.layout.namesPanelTopHeight, 130);
  const commentaryPanelContext = getStackResizeContext(".verses-panel", state.layout.versesPanelTopHeight, 100);
  const startX = typeof pointer === "number" ? pointer : pointer.clientX;
  const startY = typeof pointer === "number" ? null : pointer.clientY;

  function onMove(event) {
    if (which === "left" || which === "middle") {
      const delta = event.clientX - startX;
      if (which === "left") state.layout.left = Math.max(300, Math.min(620, initialLeft + delta));
      if (which === "middle") state.layout.middle = Math.max(220, Math.min(520, initialMiddle + delta));
    }

    if (which === "side-panel" && startY !== null && sidePanelContext.panelRect) {
      const delta = event.clientY - startY;
      const minimum = sidePanelContext.minHeight;
      const maximum = Math.max(minimum, sidePanelContext.availableHeight - minimum);
      state.layout.sidePanelTopHeight = Math.max(minimum, Math.min(maximum, sidePanelContext.baseTop + delta));
    }

    if (which === "names-panel" && startY !== null && namesPanelContext.panelRect) {
      const delta = event.clientY - startY;
      const minimum = namesPanelContext.minHeight;
      const maximum = Math.max(minimum, namesPanelContext.availableHeight - minimum);
      state.layout.namesPanelTopHeight = Math.max(minimum, Math.min(maximum, namesPanelContext.baseTop + delta));
    }

    if (which === "commentary-panel" && startY !== null && commentaryPanelContext.panelRect) {
      const delta = event.clientY - startY;
      const minimum = commentaryPanelContext.minHeight;
      const maximum = Math.max(minimum, commentaryPanelContext.availableHeight - minimum);
      state.layout.versesPanelTopHeight = Math.max(minimum, Math.min(maximum, commentaryPanelContext.baseTop + delta));
    }

    applyLayout();
  }

  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    saveStoredJson("layout", state.layout);
    document.body.classList.remove("is-resizing");
    document.body.classList.remove("is-resizing-vertical");
  }

  document.body.classList.add("is-resizing");
  if (which === "side-panel" || which === "names-panel" || which === "commentary-panel") {
    document.body.classList.add("is-resizing-vertical");
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

// ─── Navigation History ───────────────────────────────────────────────────────

function pushNavHistory(selection) {
  const entry = { ...selection };
  const current = state.navHistory[state.navHistoryIndex];
  if (current && current.book === entry.book && current.chapter === entry.chapter && current.verse === entry.verse) return;
  if (state.navHistoryIndex < state.navHistory.length - 1) {
    state.navHistory = state.navHistory.slice(0, state.navHistoryIndex + 1);
  }
  state.navHistory.push(entry);
  if (state.navHistory.length > NAV_HISTORY_MAX) state.navHistory.shift();
  state.navHistoryIndex = state.navHistory.length - 1;
  updateNavHistoryButtons();
}

function navigateBack() {
  if (state.navHistoryIndex <= 0) return;
  state.navHistoryIndex -= 1;
  const entry = state.navHistory[state.navHistoryIndex];
  state.navigationSelection = { ...entry };
  clearActiveVerseFocus();
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) renderNavigationSelection();
  updateNavHistoryButtons();
}

function navigateForward() {
  if (state.navHistoryIndex >= state.navHistory.length - 1) return;
  state.navHistoryIndex += 1;
  const entry = state.navHistory[state.navHistoryIndex];
  state.navigationSelection = { ...entry };
  clearActiveVerseFocus();
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) renderNavigationSelection();
  updateNavHistoryButtons();
}

function updateNavHistoryButtons() {
  const backBtn = document.querySelector("[data-nav-back]");
  const fwdBtn = document.querySelector("[data-nav-forward]");
  if (backBtn) backBtn.disabled = state.navHistoryIndex <= 0;
  if (fwdBtn) fwdBtn.disabled = state.navHistoryIndex >= state.navHistory.length - 1;
}

// ─── Search History ───────────────────────────────────────────────────────────

function pushSearchHistory(query) {
  const q = String(query || "").trim();
  if (!q) return;
  const idx = state.searchHistory.indexOf(q);
  if (idx !== -1) state.searchHistory.splice(idx, 1);
  state.searchHistory.unshift(q);
  if (state.searchHistory.length > SEARCH_HISTORY_MAX) state.searchHistory = state.searchHistory.slice(0, SEARCH_HISTORY_MAX);
  saveStoredJson("search-history", state.searchHistory);
}

function openSearchHistory() {
  const popover = document.querySelector("[data-search-history-popover]");
  if (!popover || !state.searchHistory.length) return;
  const list = popover.querySelector("[data-search-history-list]");
  if (!list) return;
  list.innerHTML = "";
  const fragment = document.createDocumentFragment();
  state.searchHistory.slice(0, 10).forEach((q) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-popover-item search-history-item";
    btn.textContent = q;
    btn.addEventListener("click", () => {
      elements.searchInput.value = q;
      state.query = q;
      state.verseResultsPage = 1;
      clearActiveVerseFocus();
      requestSearch(q);
      closeSearchHistory();
    });
    fragment.appendChild(btn);
  });
  list.appendChild(fragment);
  popover.removeAttribute("hidden");
  requestAnimationFrame(() => positionMenuPopover(popover, elements.searchInput));
}

function closeSearchHistory() {
  const popover = document.querySelector("[data-search-history-popover]");
  if (popover) popover.setAttribute("hidden", "");
}

// ─── Focus Mode ───────────────────────────────────────────────────────────────

function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  document.documentElement.classList.toggle("focus-mode", state.focusMode);
  const btn = document.querySelector("[data-focus-mode]");
  if (btn) btn.textContent = state.focusMode ? "Exit Focus" : "Focus";
  if (state.focusMode) {
    state.hiddenSections.dictionary = true;
    state.hiddenSections.concordance = true;
    state.hiddenSections.bibleNames = true;
    state.hiddenSections.biodata = true;
    state.hiddenSections.commentary = true;
    refreshRenderedContent();
    refreshViewMenu();
  } else {
    restoreAllSections();
  }
}

// ─── Inline Strong's Tooltip ──────────────────────────────────────────────────

function createStrongsTooltip() {
  const el = document.createElement("div");
  el.className = "strongs-tooltip";
  el.setAttribute("role", "tooltip");
  el.setAttribute("hidden", "");
  el.innerHTML = [
    '<div class="strongs-tooltip-head">',
    '  <span class="strongs-tooltip-number" data-tooltip-number></span>',
    '  <span class="strongs-tooltip-lemma" data-tooltip-lemma></span>',
    '  <span class="strongs-tooltip-xlit" data-tooltip-xlit></span>',
    '</div>',
    '<p class="strongs-tooltip-desc" data-tooltip-desc></p>',
    '<button class="strongs-tooltip-more" data-tooltip-more type="button">Full entry</button>'
  ].join("");
  document.body.appendChild(el);
  el.querySelector("[data-tooltip-more]").addEventListener("click", () => {
    if (state.strongsTooltip.number) isolateStrongsLookup(state.strongsTooltip.number);
    hideStrongsTooltip();
  });
  dynamicElements.strongsTooltip = el;
  return el;
}

function showStrongsTooltip(strongsNumber, anchorEl) {
  const entry = lookupStrongsEntry(strongsNumber);
  if (!entry) return;
  state.strongsTooltip = { visible: true, number: strongsNumber, entry };
  const tooltip = dynamicElements.strongsTooltip || createStrongsTooltip();
  tooltip.querySelector("[data-tooltip-number]").textContent = entry.number || strongsNumber;
  tooltip.querySelector("[data-tooltip-lemma]").textContent = entry.lemma || entry.word || "";
  tooltip.querySelector("[data-tooltip-xlit]").textContent = entry.xlit ? "(" + entry.xlit + ")" : "";
  const desc = String(entry.description || "").split(";")[0].trim();
  tooltip.querySelector("[data-tooltip-desc]").textContent = desc;
  tooltip.removeAttribute("hidden");
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tRect = tooltip.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + tRect.width > window.innerWidth - 10) left = window.innerWidth - tRect.width - 10;
    if (top + tRect.height > window.innerHeight - 10) top = rect.top - tRect.height - 6;
    tooltip.style.left = Math.max(6, left) + "px";
    tooltip.style.top = Math.max(6, top) + "px";
  });
}

function hideStrongsTooltip() {
  state.strongsTooltip.visible = false;
  if (dynamicElements.strongsTooltip) dynamicElements.strongsTooltip.setAttribute("hidden", "");
}

// ─── Copy Verse ───────────────────────────────────────────────────────────────

function copyVerseToClipboard(verse) {
  const ref = verse.book + " " + verse.chapter + ":" + verse.verse;
  const versionLabel = state.currentVersion.toUpperCase();
  const text = ref + " (" + versionLabel + ") - " + verse.text;
  const doFallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showCopyFeedback(ref);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showCopyFeedback(ref)).catch(doFallback);
  } else {
    doFallback();
  }
}

function showCopyFeedback(ref) {
  let toast = document.querySelector(".copy-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "copy-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = "Copied " + ref;
  toast.classList.add("is-visible");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

// ─── Keyboard Chapter Navigation ─────────────────────────────────────────────

function navigatePrevChapter() {
  const book = state.navigationSelection.book || state.books[0];
  if (!book) return;
  const chapter = state.navigationSelection.chapter;
  if (chapter > 1) {
    state.navigationSelection.chapter = chapter - 1;
  } else {
    const bookIdx = state.books.indexOf(book);
    if (bookIdx > 0) {
      const prevBook = state.books[bookIdx - 1];
      state.navigationSelection.book = prevBook;
      state.navigationSelection.chapter = getChapterCount(prevBook);
    }
  }
  state.navigationSelection.verse = null;
  clearActiveVerseFocus();
  pushNavHistory({ ...state.navigationSelection });
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) renderNavigationSelection();
}

function navigateNextChapter() {
  const book = state.navigationSelection.book || state.books[0];
  if (!book) return;
  const chapter = state.navigationSelection.chapter;
  const maxChapter = getChapterCount(book);
  if (chapter < maxChapter) {
    state.navigationSelection.chapter = chapter + 1;
  } else {
    const bookIdx = state.books.indexOf(book);
    if (bookIdx < state.books.length - 1) {
      state.navigationSelection.book = state.books[bookIdx + 1];
      state.navigationSelection.chapter = 1;
    }
  }
  state.navigationSelection.verse = null;
  clearActiveVerseFocus();
  pushNavHistory({ ...state.navigationSelection });
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) renderNavigationSelection();
}

// ─── Reading Progress ─────────────────────────────────────────────────────────

function toggleChapterRead(chapterKey) {
  if (state.readingProgress[chapterKey]) {
    delete state.readingProgress[chapterKey];
  } else {
    state.readingProgress[chapterKey] = true;
  }
  saveStoredJson("reading-progress", state.readingProgress);
  // Refresh verse list to update button state
  if (!state.query.trim()) renderNavigationSelection();
  else renderResults(state.lastResults);
  renderReadingProgressBar();
}

function renderReadingProgressBar() {
  const bar = document.querySelector("[data-reading-progress-bar]");
  const label = document.querySelector("[data-reading-progress-label]");
  if (!bar || !state.books.length) return;
  let total = 0;
  let done = 0;
  state.books.forEach((book) => {
    const chapters = state.chaptersByBook[book] || 1;
    total += chapters;
    for (let c = 1; c <= chapters; c++) {
      if (state.readingProgress[`${book}|${c}`]) done++;
    }
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  bar.style.width = `${pct}%`;
  if (label) label.textContent = `${done} / ${total} chapters read (${pct}%)`;
}

// ─── Parallel Translation ─────────────────────────────────────────────────────

async function loadParallelVersion(versionCode) {
  if (!versionCode) {
    state.parallelVersion = "";
    state.parallelData = [];
    saveStoredJson("parallel-version", "");
    if (!state.query.trim()) renderNavigationSelection();
    else renderResults(state.lastResults);
    return;
  }
  try {
    if (!state.bibleVersionCache[versionCode]) {
      state.bibleVersionCache[versionCode] = await loadLocalJson(`translations/${versionCode}.json`);
    }
    state.parallelVersion = versionCode;
    state.parallelData = state.bibleVersionCache[versionCode];
    saveStoredJson("parallel-version", versionCode);
  } catch (e) {
    state.parallelVersion = "";
    state.parallelData = [];
  }
  if (!state.query.trim()) renderNavigationSelection();
  else renderResults(state.lastResults);
}

// ─── Cross-references (Strong's-based) ───────────────────────────────────────

function getCrossReferences(verse) {
  // Find Strong's numbers in this verse's text (KJV+ format)
  const strongsInVerse = [];
  const tagRegex = /\[([HG]\d+[A-Za-z]?)\]/g;
  let m;
  while ((m = tagRegex.exec(verse.text)) !== null) {
    strongsInVerse.push(m[1].toUpperCase());
  }
  if (!strongsInVerse.length) return [];

  // Find other verses that share at least one Strong's number
  const results = [];
  const seen = new Set();
  const selfKey = `${verse.book}|${verse.chapter}|${verse.verse}`;

  for (const num of strongsInVerse.slice(0, 3)) { // limit to first 3 strongs for perf
    const occEntry = state.strongsOccurrences.entries[num];
    if (!occEntry || !Array.isArray(occEntry.samples)) continue;
    for (const sample of occEntry.samples.slice(0, 8)) {
      if (!sample.reference) continue;
      const key = sample.reference;
      if (seen.has(key) || key === selfKey) continue;
      seen.add(key);
      // Parse "Book Chapter:Verse"
      const refMatch = sample.reference.match(/^(.+?)\s+(\d+):(\d+)$/);
      if (!refMatch) continue;
      const [, refBook, refChapter, refVerse] = refMatch;
      const entry = getExactVerse(refBook, Number(refChapter), Number(refVerse));
      if (entry) results.push({ strongsNum: num, verse: entry });
      if (results.length >= 6) break;
    }
    if (results.length >= 6) break;
  }
  return results;
}

function renderCrossReferences(verse) {
  const panel = document.querySelector("[data-cross-refs-panel]");
  if (!panel) return;
  const list = panel.querySelector("[data-cross-refs-list]");
  if (!list) return;

  // Only works well with KJV+ which has Strong's tags
  const refs = getCrossReferences(verse);
  if (!refs.length) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  const refTitle = panel.querySelector("[data-cross-refs-title]");
  if (refTitle) refTitle.textContent = `${verse.book} ${verse.chapter}:${verse.verse}`;

  list.innerHTML = "";
  const frag = document.createDocumentFragment();
  refs.forEach(({ strongsNum, verse: refVerse }) => {
    const item = document.createElement("article");
    item.className = "cross-ref-item";

    const head = document.createElement("div");
    head.className = "cross-ref-head";

    const ref = document.createElement("button");
    ref.type = "button";
    ref.className = "cross-ref-link";
    ref.textContent = `${refVerse.book} ${refVerse.chapter}:${refVerse.verse}`;
    ref.addEventListener("click", () => {
      state.navigationSelection = { book: refVerse.book, chapter: refVerse.chapter, verse: refVerse.verse };
      syncBibleNavigatorInputs();
      saveBibleSelection();
      pushNavHistory({ ...state.navigationSelection });
      if (!state.query.trim()) renderNavigationSelection();
    });

    const tag = document.createElement("span");
    tag.className = "cross-ref-tag";
    tag.textContent = strongsNum;

    head.append(ref, tag);

    const text = document.createElement("p");
    text.className = "cross-ref-text";
    // Strip Strong's tags for clean display
    text.textContent = refVerse.text.replace(/\[[HG]\d+[A-Za-z]?\]/g, "").replace(/\s+/g, " ").trim();

    item.append(head, text);
    frag.appendChild(item);
  });
  list.appendChild(frag);
}

// ─── Keyboard navigation through verse list ───────────────────────────────────

function getVerseItems() {
  return Array.from(elements.verseList.querySelectorAll("[data-verse-index]"));
}

function focusVerseByIndex(idx) {
  const items = getVerseItems();
  if (!items.length) return;
  const clamped = Math.max(0, Math.min(items.length - 1, idx));
  state.activeVerseIndex = clamped;
  const el = items[clamped];
  if (!el) return;
  el.focus({ preventScroll: false });
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const verse = getExactVerse(el.dataset.book, Number(el.dataset.chapter), Number(el.dataset.verse));
  if (verse) {
    state.activeVerse = verse;
    state.activeVerseAnchor = el;
    void renderCommentaryPanel();
    renderCrossReferences(verse);
  }
}

// ─── Verse range selection ────────────────────────────────────────────────────

function handleVerseRangeClick(verse, el, event) {
  if (event.shiftKey && state.rangeSelectStart) {
    // Select range
    const items = getVerseItems();
    const startIdx = items.findIndex(
      (i) => i.dataset.book === state.rangeSelectStart.book &&
             Number(i.dataset.chapter) === state.rangeSelectStart.chapter &&
             Number(i.dataset.verse) === state.rangeSelectStart.verse
    );
    const endIdx = items.findIndex(
      (i) => i.dataset.book === verse.book &&
             Number(i.dataset.chapter) === verse.chapter &&
             Number(i.dataset.verse) === verse.verse
    );
    if (startIdx !== -1 && endIdx !== -1) {
      const lo = Math.min(startIdx, endIdx);
      const hi = Math.max(startIdx, endIdx);
      const rangeVerses = items.slice(lo, hi + 1).map((i) =>
        getExactVerse(i.dataset.book, Number(i.dataset.chapter), Number(i.dataset.verse))
      ).filter(Boolean);
      // Copy all selected verses
      const text = rangeVerses.map((v) => `${v.book} ${v.chapter}:${v.verse} — ${v.text}`).join("\n");
      navigator.clipboard.writeText(text).catch(() => {});
      showCopyFeedback(`${rangeVerses.length} verses`);
      // Highlight selection visually
      items.forEach((i) => i.classList.remove("verse-range-selected"));
      items.slice(lo, hi + 1).forEach((i) => i.classList.add("verse-range-selected"));
      return true;
    }
  }
  // Normal click — set range start
  state.rangeSelectStart = verse;
  getVerseItems().forEach((i) => i.classList.remove("verse-range-selected"));
  return false;
}

async function initializeApp() {
  setLoading(true);

  try {
    state.layout = loadStoredJson("layout", DEFAULT_LAYOUT);
    state.preferences = normalizePreferences(loadStoredJson("preferences", DEFAULT_PREFERENCES));
    state.annotations = loadStoredJson("annotations", DEFAULT_ANNOTATIONS);
    state.searchHistory = (() => { try { return JSON.parse(localStorage.getItem("search-history") || "[]"); } catch { return []; } })();
    state.readingProgress = loadStoredJson("reading-progress", {});
    state.parallelVersion = (() => { try { return localStorage.getItem("parallel-version") || ""; } catch { return ""; } })();
    state.hiddenSections = loadStoredJson("hidden-sections", DEFAULT_HIDDEN_SECTIONS);
    state.activeResultsBook = localStorage.getItem("search-book-filter") || "";
    state.navigationSelection = loadBibleSelection();
    applyLayout();
    applyPreferences();
    setSearchVisible(false);
    refreshViewMenu();
    buildHighlightColorButtons();

    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);

    const [dictionary, versionsManifest, bibleNames, bibleNameBiodata, concordance, bsbConcordance, strongsOccurrences, commentaryManifest] = await Promise.all([
      loadLocalJson("dictionary.json"),
      loadLocalJson("bible-versions.json"),
      loadLocalJson("bible-names.json"),
      loadLocalJson("bible-name-biodata.json"),
      loadLocalJson("concordance.json"),
      loadLocalJson("bsb_concordance.json").catch(() => ({ entries: [] })),
      loadLocalJson("strongs-occurrences.json").catch(() => ({ entries: {} })),
      loadLocalJson("commentary-manifest.json").catch(() => ({ defaultCommentary: "", commentaries: [] }))
    ]);

    state.rawDictionary = dictionary;
    state.bibleVersions = versionsManifest.versions || [];
    state.currentVersion = localStorage.getItem("bible-version") || versionsManifest.defaultVersion || "kjv";
    state.bibleNamesData = bibleNames;
    state.nameBiodata = bibleNameBiodata;
    state.concordanceData = concordance;
    state.bsbConcordanceData = Array.isArray(bsbConcordance.entries) ? bsbConcordance.entries : [];
    state.strongsOccurrences = strongsOccurrences && strongsOccurrences.entries ? strongsOccurrences : { entries: {} };
    state.commentaryManifest = Array.isArray(commentaryManifest.commentaries) ? commentaryManifest.commentaries : [];
    state.currentCommentaryCode = localStorage.getItem("commentary-code") || commentaryManifest.defaultCommentary || state.commentaryManifest[0]?.code || "";
    populateCommentaryOptions();
    state.dictionaryEntries = Object.entries(dictionary).map(([word, meaning]) => ({
      word,
      meaning,
      lowerWord: normalizeText(word),
      lowerMeaning: normalizeText(meaning)
    }));

    state.searchWorker = new Worker("./search-worker.js");
    state.searchWorker.addEventListener("message", (event) => {
      const message = event.data;

      if (message.type === "ready") {
        state.isReady = true;
        if (state.query.trim()) {
          requestSearch(state.query);
        } else {
          state.lastResults = getEmptyResults();
          renderResults(state.lastResults);
        }
        return;
      }

      if (message.type === "results" && message.requestId === state.requestId) {
        state.lastResults = message.payload;
        renderResults(state.lastResults);
        return;
      }

      if (message.type === "error") {
        elements.empty.hidden = false;
        elements.empty.textContent = `Search error: ${message.message}`;
      }
    });

    console.log(`[DEBUG] Initializing app... Current version: ${state.currentVersion}`);
    await loadBibleVersion(state.currentVersion);
    if (state.activeResultsBook && !state.books.includes(state.activeResultsBook)) {
      state.activeResultsBook = "";
      localStorage.removeItem("search-book-filter");
    }
    void renderCommentaryPanel();
    try { renderReadingProgressBar(); } catch(e) { console.warn("renderReadingProgressBar:", e); }
    // Load parallel version if saved
    if (state.parallelVersion) {
      void loadParallelVersion(state.parallelVersion);
    }
  } catch (error) {
    console.error(`[DEBUG ERROR] initializeApp failed:`, error);
    elements.empty.hidden = false;
    elements.empty.textContent = `Critical Initialization Error: ${error.message}`;
    setLoading(false);
  }
}

const debouncedSearch = debounce((value) => {
  state.query = value;
  state.lookupFocusQuery = "";
  state.verseResultsPage = 1;
  clearActiveVerseFocus();
  const isStrongsNumber = /^[HG]\d+/i.test(value.trim());
  state.lastLookupWasStrongs = isStrongsNumber;
  if (value.trim().length >= 2) pushSearchHistory(value.trim());
  if (!state.searchWorker || !state.isReady) return;
  requestSearch(value);
}, 90);

elements.searchInput.addEventListener("input", (event) => debouncedSearch(event.target.value));
elements.searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSearchHistory();
    closeSearch();
  }
  if (event.key === "ArrowDown" && !isEditableTarget(event.target)) {
    openSearchHistory();
  }
});
if (elements.searchBookSelect) {
  elements.searchBookSelect.addEventListener("change", () => {
    clearActiveVerseFocus();
    state.activeResultsBook = elements.searchBookSelect.value;
    if (state.activeResultsBook) {
      localStorage.setItem("search-book-filter", state.activeResultsBook);
    } else {
      localStorage.removeItem("search-book-filter");
    }
    state.verseResultsPage = 1;
    if (state.query.trim() && state.searchWorker && state.isReady) {
      requestSearch();
    } else {
      void renderCommentaryPanel();
    }
  });
}
elements.bibleVersionSelect.addEventListener("change", async () => {
  setLoading(true);
  try {
    await loadBibleVersion(elements.bibleVersionSelect.value);
    refreshRenderedContent();
  } catch (error) {
    setLoading(false);
    elements.empty.hidden = false;
    elements.empty.textContent = `Unable to switch Bible version: ${error.message}`;
  }
});
if (elements.commentarySelect) {
  elements.commentarySelect.addEventListener("change", () => {
    state.currentCommentaryCode = elements.commentarySelect.value;
    localStorage.setItem("commentary-code", state.currentCommentaryCode);
    void renderCommentaryPanel();
  });
}
elements.bibleBookSelect.addEventListener("change", () => {
  clearActiveVerseFocus();
  state.navigationSelection.book = elements.bibleBookSelect.value;
  state.navigationSelection.chapter = 1;
  state.navigationSelection.verse = null;
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) {
    renderNavigationSelection();
  }
});
elements.bibleChapterInput.addEventListener("change", () => {
  clearActiveVerseFocus();
  const book = state.navigationSelection.book || state.books[0];
  state.navigationSelection.chapter = clampNumber(elements.bibleChapterInput.value, 1, getChapterCount(book));
  state.navigationSelection.verse = parseVerseSelection(
    elements.bibleVerseInput.value,
    getVerseCount(book, state.navigationSelection.chapter)
  );
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) {
    renderNavigationSelection();
  }
});
elements.bibleVerseInput.addEventListener("change", () => {
  clearActiveVerseFocus();
  const book = state.navigationSelection.book || state.books[0];
  const chapter = clampNumber(elements.bibleChapterInput.value || state.navigationSelection.chapter, 1, getChapterCount(book));
  state.navigationSelection.chapter = chapter;
  state.navigationSelection.verse = parseVerseSelection(elements.bibleVerseInput.value, getVerseCount(book, chapter));
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  if (!state.query.trim()) {
    renderNavigationSelection();
  }
});
elements.numberButtons.forEach((button) => {
  button.addEventListener("click", () => {
    nudgeNavigationValue(button.dataset.stepTarget, Number(button.dataset.stepDirection));
  });
});
elements.bibleNavForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearActiveVerseFocus();
  const book = elements.bibleBookSelect.value || state.books[0];
  const chapter = clampNumber(elements.bibleChapterInput.value, 1, getChapterCount(book));
  const verse = parseVerseSelection(elements.bibleVerseInput.value, getVerseCount(book, chapter));
  state.navigationSelection = { book, chapter, verse };
  syncBibleNavigatorInputs();
  saveBibleSelection();
  void renderCommentaryPanel();
  elements.searchInput.value = "";
  state.query = "";
  state.lookupFocusQuery = "";
  state.lastResults = getEmptyResults();
  state.verseResultsPage = 1;
  if (elements.verseLoadMore) {
    elements.verseLoadMore.hidden = true;
  }
  renderNavigationSelection();
});

// Chapter prev/next buttons
const chapterPrevBtn = document.querySelector("[data-chapter-prev]");
const chapterNextBtn = document.querySelector("[data-chapter-next]");
if (chapterPrevBtn) chapterPrevBtn.addEventListener("click", navigatePrevChapter);
if (chapterNextBtn) chapterNextBtn.addEventListener("click", navigateNextChapter);

elements.themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});
elements.menuEdit.addEventListener("click", () => {
  openSearch();
});
elements.menuView.addEventListener("click", () => {
  toggleViewMenu();
});
if (elements.openBookOccurrences) {
  elements.openBookOccurrences.addEventListener("click", () => {
    if (!elements.bookOccurrencesPopover) return;
    const isHidden = elements.bookOccurrencesPopover.hidden;
    if (isHidden) {
      renderBookOccurrencesPopover();
      elements.bookOccurrencesPopover.hidden = false;
      requestAnimationFrame(() => positionMenuPopover(elements.bookOccurrencesPopover, elements.openBookOccurrences));
    } else {
      closeBookOccurrencesPopover();
    }
  });
}
if (elements.verseLoadMore) {
  elements.verseLoadMore.addEventListener("click", () => {
    if (!state.query.trim()) return;
    state.verseResultsPage += 1;
    requestSearch();
  });
}
elements.openPreferences.addEventListener("click", openPreferencesModal);
elements.openAbout.addEventListener("click", openAboutModal);
elements.openTutorial.addEventListener("click", openTutorialModal);

// Nav history buttons
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-nav-back]")) navigateBack();
  if (event.target.closest("[data-nav-forward]")) navigateForward();
  if (event.target.closest("[data-focus-mode]")) toggleFocusMode();
  if (!event.target.closest("[data-search-history-popover]") && !event.target.closest("[data-search-input]")) {
    closeSearchHistory();
  }
  // Hide Strong's tooltip when clicking elsewhere
  if (!event.target.closest(".strongs-chip") && !event.target.closest(".strongs-tooltip")) {
    hideStrongsTooltip();
  }
}, true);
elements.aboutClose.addEventListener("click", closeAboutModal);
elements.tutorialClose.addEventListener("click", closeTutorialModal);
elements.showHiddenSections.forEach((button) => {
  button.addEventListener("click", () => {
    const sectionId = button.dataset.showHiddenSection;
    if (sectionId) {
      setSectionHidden(sectionId, false);
    }
    closeViewMenu();
  });
});
elements.showAllSections.addEventListener("click", () => {
  restoreAllSections();
  closeViewMenu();
});
elements.contextLookup.addEventListener("click", () => {
  lookupSelectedText(state.contextMenu.lookupText);
  hideContextMenu();
});
elements.contextCloseSection.addEventListener("click", () => {
  if (state.contextMenu.sectionId) {
    setSectionHidden(state.contextMenu.sectionId, true);
  }
  hideContextMenu();
});

elements.resizers.forEach((resizer) => {
  resizer.addEventListener("pointerdown", (event) => {
    if (window.innerWidth <= 860) return;
    event.preventDefault();
    const isVerticalResizer = ["side-panel", "names-panel", "commentary-panel"].includes(resizer.dataset.resizer);
    startResize(
      resizer.dataset.resizer,
      isVerticalResizer ? event : event.clientX
    );
  });
});

elements.fontSizeInput.addEventListener("input", () => {
  state.preferences.fontSize = Number(elements.fontSizeInput.value);
  applyPreferences();
  savePreferences();
});
elements.lineHeightInput.addEventListener("input", () => {
  state.preferences.lineHeight = Number(elements.lineHeightInput.value);
  applyPreferences();
  savePreferences();
});
if (elements.showSearchBarInput) {
  elements.showSearchBarInput.addEventListener("change", () => {
    state.preferences.showSearchBar = elements.showSearchBarInput.checked;
    setSearchVisible(state.searchVisible);
    savePreferences();
  });
}
if (elements.autoOpenStrongsInput) {
  elements.autoOpenStrongsInput.addEventListener("change", () => {
    state.preferences.autoOpenStrongsConcordance = elements.autoOpenStrongsInput.checked;
    savePreferences();
  });
}
if (elements.showVerseNumbersInput) {
  elements.showVerseNumbersInput.addEventListener("change", () => {
    state.preferences.showVerseNumbers = elements.showVerseNumbersInput.checked;
    applyPreferences();
    savePreferences();
  });
}
if (elements.compactVerseSpacingInput) {
  elements.compactVerseSpacingInput.addEventListener("change", () => {
    state.preferences.compactVerseSpacing = elements.compactVerseSpacingInput.checked;
    applyPreferences();
    savePreferences();
  });
}
// Font family preference
document.addEventListener("change", (event) => {
  if (event.target.matches("[data-font-family]")) {
    state.preferences.fontFamily = event.target.value;
    applyPreferences();
    savePreferences();
  }
  if (event.target.matches("[data-parallel-version]")) {
    void loadParallelVersion(event.target.value);
  }
  if (event.target.matches("[data-red-letter-mode]")) {
    state.preferences.redLetterMode = event.target.checked;
    applyPreferences();
    savePreferences();
  }
});
if (elements.shortcutOpenSearchSelect) {
  elements.shortcutOpenSearchSelect.addEventListener("change", () => {
    state.preferences.shortcuts.openSearch = elements.shortcutOpenSearchSelect.value;
    savePreferences();
  });
}
if (elements.shortcutOpenNotesSelect) {
  elements.shortcutOpenNotesSelect.addEventListener("change", () => {
    state.preferences.shortcuts.openNotes = elements.shortcutOpenNotesSelect.value;
    savePreferences();
  });
}
if (elements.shortcutToggleSearchBarSelect) {
  elements.shortcutToggleSearchBarSelect.addEventListener("change", () => {
    state.preferences.shortcuts.toggleSearchBar = elements.shortcutToggleSearchBarSelect.value;
    savePreferences();
  });
}

elements.modalClose.addEventListener("click", closeChapterModal);
elements.notesClose.addEventListener("click", closeNotesModal);
elements.addNoteButton.addEventListener("click", openNotesModal);
elements.clearHighlightButton.addEventListener("click", clearActiveVerseHighlight);
elements.viewFullChapterButton.addEventListener("click", () => {
  if (!state.activeVerse) {
    return;
  }
  closeVerseActionsPopover();
  openChapterModal(state.activeVerse);
});
elements.saveNoteButton.addEventListener("click", saveActiveVerseNote);
elements.clearNoteButton.addEventListener("click", clearActiveVerseNote);
elements.preferencesClose.addEventListener("click", closePreferencesModal);
if (elements.strongsClose) elements.strongsClose.addEventListener("click", closeStrongsModal);

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-app-context-menu]")) {
    hideContextMenu();
  }
  if (!event.target.closest("[data-menu-view-popover]") && !event.target.closest("[data-menu-view]")) {
    closeViewMenu();
  }
  if (!event.target.closest("[data-book-occurrences-popover]") && !event.target.closest("[data-open-book-occurrences]")) {
    closeBookOccurrencesPopover();
  }
  if (!elements.verseActionsPopover.hidden && !event.target.closest("[data-verse-actions-popover]") && !event.target.closest(".verse-line") && !event.target.closest(".chapter-verse")) {
    closeVerseActionsPopover();
  }
});

document.addEventListener("contextmenu", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const verse = getVerseFromTarget(target);
  if (verse) {
    event.preventDefault();
    openVerseActions(verse, target.closest("[data-book][data-chapter][data-verse]"));
    return;
  }

  const section = getSectionContext(target);
  const lookupText = getEventLookupText(target);

  if (section || lookupText) {
    event.preventDefault();
    openContextMenu({
      x: event.clientX,
      y: event.clientY,
      lookupText,
      sectionId: section?.sectionId || "",
      sectionLabel: section?.sectionLabel || ""
    });
    return;
  }

  hideContextMenu();
});

function closeIfBackdrop(dialog, closeFn, event) {
  if (event.target === dialog) {
    closeFn();
    return;
  }
  const bounds = dialog.getBoundingClientRect();
  const clickedBackdrop =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;
  if (clickedBackdrop) closeFn();
}

elements.chapterModal.addEventListener("click", (event) => closeIfBackdrop(elements.chapterModal, closeChapterModal, event));
elements.notesModal.addEventListener("click", (event) => closeIfBackdrop(elements.notesModal, closeNotesModal, event));
elements.preferencesModal.addEventListener("click", (event) => closeIfBackdrop(elements.preferencesModal, closePreferencesModal, event));
elements.aboutModal.addEventListener("click", (event) => closeIfBackdrop(elements.aboutModal, closeAboutModal, event));
elements.tutorialModal.addEventListener("click", (event) => closeIfBackdrop(elements.tutorialModal, closeTutorialModal, event));

document.addEventListener("keydown", (event) => {
  if (matchesShortcut(event, state.preferences.shortcuts.openSearch)) {
    event.preventDefault();
    openSearch();
    return;
  }

  if (!isEditableTarget(event.target) && matchesShortcut(event, state.preferences.shortcuts.openNotes)) {
    if (state.activeVerse) {
      event.preventDefault();
      openNotesModal();
      return;
    }
  }

  if (!isEditableTarget(event.target) && matchesShortcut(event, state.preferences.shortcuts.toggleSearchBar)) {
    event.preventDefault();
    state.preferences.showSearchBar = !state.preferences.showSearchBar;
    if (elements.showSearchBarInput) {
      elements.showSearchBarInput.checked = state.preferences.showSearchBar;
    }
    setSearchVisible(state.searchVisible);
    savePreferences();
    return;
  }

  // Chapter navigation: [ ] or plain ArrowLeft/ArrowRight (no modifier)
  if (!isEditableTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (event.key === "[" || event.key === "ArrowLeft") {
      event.preventDefault();
      navigatePrevChapter();
      return;
    }
    if (event.key === "]" || event.key === "ArrowRight") {
      event.preventDefault();
      navigateNextChapter();
      return;
    }
    // Verse list keyboard navigation
    if (event.key === "ArrowDown" && event.target.closest("[data-verse-index]")) {
      event.preventDefault();
      focusVerseByIndex(state.activeVerseIndex + 1);
      return;
    }
    if (event.key === "ArrowUp" && event.target.closest("[data-verse-index]")) {
      event.preventDefault();
      focusVerseByIndex(state.activeVerseIndex - 1);
      return;
    }
    if (event.key === "Enter" && event.target.closest("[data-verse-index]")) {
      event.preventDefault();
      const el = event.target.closest("[data-verse-index]");
      const verse = getExactVerse(el.dataset.book, Number(el.dataset.chapter), Number(el.dataset.verse));
      if (verse) openVerseActions(verse, el);
      return;
    }
  }

  // Navigation history: Alt+Left / Alt+Right
  if (!isEditableTarget(event.target) && event.altKey && !event.ctrlKey && !event.metaKey) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateBack();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateForward();
      return;
    }
  }

  // Focus mode: F key
  if (!isEditableTarget(event.target) && event.key === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    toggleFocusMode();
    return;
  }

  // Copy active verse: C key
  if (!isEditableTarget(event.target) && event.key === "c" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (state.activeVerse) {
      event.preventDefault();
      copyVerseToClipboard(state.activeVerse);
      return;
    }
  }

  if (event.key === "Escape") {
    hideStrongsTooltip();
    closeSearchHistory();
    if (state.searchVisible) {
      closeSearch();
      return;
    }
    closeChapterModal();
    closeVerseActionsPopover();
    closeNotesModal();
    closePreferencesModal();
    closeAboutModal();
    closeTutorialModal();
    hideContextMenu();
  }
});

window.addEventListener("resize", () => {
  applyLayout();
  applyEdgeResizeCursor("");
  positionVerseActionsPopover(state.activeVerseAnchor);
  if (state.contextMenu.visible) {
    positionContextMenu(state.contextMenu.x, state.contextMenu.y);
  }
  if (elements.preferencesModal.open) {
    positionMenuDialog(elements.preferencesModal, elements.openPreferences);
  }
  if (elements.aboutModal.open) {
    positionMenuDialog(elements.aboutModal, elements.openAbout);
  }
  if (elements.tutorialModal.open) {
    positionMenuDialog(elements.tutorialModal, elements.openTutorial);
  }
});

if (elements.content) {
  elements.content.addEventListener("pointermove", updateEdgeResizeFromPointer);
  elements.content.addEventListener("pointerleave", () => {
    state.edgeResizeTarget = "";
    applyEdgeResizeCursor("");
  });
  elements.content.addEventListener("pointerdown", (event) => {
    if (!state.edgeResizeTarget) {
      return;
    }
    event.preventDefault();
    const isVerticalResizer = ["side-panel", "names-panel", "commentary-panel"].includes(state.edgeResizeTarget);
    startResize(state.edgeResizeTarget, isVerticalResizer ? event : event.clientX);
    state.edgeResizeTarget = "";
    applyEdgeResizeCursor("");
  });
}
elements.verseList.addEventListener("scroll", closeVerseActionsPopover);
elements.verseList.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const verseRow = target.closest("[data-book][data-chapter][data-verse]");
  if (!verseRow || !elements.verseList.contains(verseRow)) return;

  const verse = getExactVerse(verseRow.dataset.book, Number(verseRow.dataset.chapter), Number(verseRow.dataset.verse));
  if (!verse) return;

  // Range selection (shift-click)
  const wasRange = handleVerseRangeClick(verse, verseRow, event);
  if (wasRange) return;

  state.activeVerse = verse;
  state.activeVerseAnchor = verseRow;
  state.activeVerseIndex = Number(verseRow.dataset.verseIndex ?? -1);
  void renderCommentaryPanel();
  try { renderCrossReferences(verse); } catch(e) { console.warn("renderCrossReferences:", e); }
});
elements.chapterList.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const verseRow = target.closest("[data-book][data-chapter][data-verse]");
  if (!verseRow || !elements.chapterList.contains(verseRow)) {
    return;
  }

  const verse = getExactVerse(verseRow.dataset.book, Number(verseRow.dataset.chapter), Number(verseRow.dataset.verse));
  if (!verse) {
    return;
  }

  state.activeVerse = verse;
  state.activeVerseAnchor = null;
  void renderCommentaryPanel();
});
elements.chapterList.addEventListener("scroll", closeVerseActionsPopover);

initializeApp();
