import { useState, useEffect, useCallback, useRef } from "react";
import { Shuffle, Plus, Pencil, Trash2, X, Check, AlertTriangle, ChevronDown, ChevronUp, Download, ExternalLink } from "./icons.jsx";
import STARTER from "./cs2-startbibliotek.json";
import { suggestLineupLinks, catalogStats } from "./lineupMatch.js";

const DEFAULT_MAPS = ["Dust II", "Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Cache"];
const STORAGE_KEY = "cs2-callout-book";
const BACKUP_KEY = "cs2-callout-book-skadet";
const FREEZE_SECONDS = 15;

async function storageGet(key) {
  if (window.storage?.get) return window.storage.get(key, false);
  const value = window.localStorage.getItem(key);
  return value === null ? null : { value };
}

async function storageSet(key, value) {
  if (window.storage?.set) return window.storage.set(key, value, false);
  window.localStorage.setItem(key, value);
  return true;
}

function stratKey(s) {
  return [s.map, s.side, s.site || "", (s.callout || "").trim().toLowerCase(), (s.calloutEn || "").trim().toLowerCase()].join("|");
}

const C = {
  bg: "#0F1216",
  panel: "#171C22",
  panelHi: "#1E252D",
  line: "#2A323C",
  chalk: "#E9E5DA",
  dim: "#8A939E",
  faint: "#5C6570",
  warn: "#C2604F",
  good: "#7E9E5E",
};

const SIDE = {
  T: { accent: "#C08A3E", soft: "rgba(192,138,62,0.14)" },
  CT: { accent: "#6D97B5", soft: "rgba(109,151,181,0.14)" },
};

const SITES = [
  { id: "a", no: "A", en: "A" },
  { id: "b", no: "B", en: "B" },
  { id: "mid", no: "Mid", en: "Mid" },
  { id: "default", no: "Def", en: "Def" },
];

const ROUNDS = [
  { id: "full", no: "Full", en: "Full" },
  { id: "force", no: "Force", en: "Force" },
  { id: "eco", no: "Eco", en: "Eco" },
  { id: "pistol", no: "Pistol", en: "Pistol" },
  { id: "anti", no: "Anti", en: "Anti" },
];

const UI = {
  no: {
    title: "Strat-boka",
    match: "Kamp",
    book: "Boka",
    loading: "LASTER…",
    whereTo: "Hvor skal vi",
    roundLabel: "Runde",
    all: "Alle",
    call: "Gi meg en call",
    callAgain: "Ny call",
    won: "Vunnet",
    lost: "Tapt",
    roundWon: "Runde vunnet",
    roundLost: "Runde tapt",
    noHistory: "ingen historikk",
    pattern: "Mønster · siste runder",
    patternWarn: (s) => `Fire av fem siste gikk ${s}. De leser dere nå.`,
    inPool: (n) => (n === 1 ? "1 strat klar i utvalget." : `${n} strats klare i utvalget.`),
    noMatch: (m) => `Ingen strats matcher dette valget på ${m}.`,
    newStrat: "Ny strat",
    editStrat: "Rediger",
    calloutLabel: "Callout",
    calloutPh: "Fast B",
    explLabel: "Kort forklaring",
    explPh: "Hva er ideen med denne",
    tasksLabel: "Oppgaver (én per spiller)",
    taskPh: "Entry: rush ramp etter flash",
    addTask: "+ Oppgave",
    linksLabel: "Lineup-lenker (forberedelse)",
    linkLabelPh: "Xbox-røyk",
    linkUrlPh: "https://…",
    addLink: "+ Lenke",
    suggestLinks: "Foreslå fra CSNADES",
    linksSuggested: (n) => (n === 1 ? "La til 1 lineup-lenke." : `La til ${n} lineup-lenker.`),
    openLineups: "Lineups",
    targetLabel: "Mål",
    roundsLabel: "Runder (ingen valgt = passer alle)",
    statusLabel: "Status",
    ready: "Klar",
    practice: "Trening",
    save: "Lagre",
    cancel: "Avbryt",
    newBtn: "Ny",
    stratsHeader: (n, m, s) => `${n} strat${n === 1 ? "" : "s"} · ${m} ${s}`,
    includePractice: "Ta med trenings-strats i kamp-utvalget",
    emptyBook: "Tomt her. Legg inn den første straten.",
    allRounds: "alle runder",
    settingsShow: "Kart, deling og startbibliotek",
    settingsHide: "Skjul innstillinger",
    mapsLabel: "Kart",
    newMapPh: "Nytt kart",
    add: "Legg til",
    starterLabel: "Startbibliotek",
    starterDesc: (n) => `${n} enkle strats for alle sju active duty-kart, på norsk og engelsk. Lineup-lenker fra CSNADES.gg.`,
    loadStarter: "Fyll boka",
    starterDone: (n) => `La til ${n} strats.`,
    catalogHint: (n) => `${n} CSNADES-lineups i katalogen.`,
    shareLabel: "Del med laget",
    exportBtn: "Hent ut",
    importBtn: "Legg inn",
    transferPh: "Lim inn strats fra en lagkamerat her, og trykk Legg inn.",
    exportMsg: "Kopier teksten og send den til laget.",
    importOk: (n) => `La til ${n} strats.`,
    importFail: "Fant ikke gyldige strats i teksten.",
    resetLabel: "Nullstill hele boka",
    deleteAll: "Slette alt?",
    yesDelete: "Ja, slett",
    saveError: "Kunne ikke lagre akkurat nå — endringer kan gå tapt.",
    loadError: "Klarte ikke lese den lagrede boka. En kopi er tatt vare på under nøkkelen cs2-callout-book-skadet.",
    editingIn: "Skriver på",
  },
  en: {
    title: "The Playbook",
    match: "Match",
    book: "Book",
    loading: "LOADING…",
    whereTo: "Where are we going",
    roundLabel: "Round",
    all: "All",
    call: "Give me a call",
    callAgain: "New call",
    won: "Won",
    lost: "Lost",
    roundWon: "Round won",
    roundLost: "Round lost",
    noHistory: "no history",
    pattern: "Pattern · last rounds",
    patternWarn: (s) => `Four of the last five went ${s}. They're reading you.`,
    inPool: (n) => `${n} strat${n !== 1 ? "s" : ""} ready in the pool.`,
    noMatch: (m) => `No strats match this selection on ${m}.`,
    newStrat: "New strat",
    editStrat: "Edit",
    calloutLabel: "Callout",
    calloutPh: "Fast B",
    explLabel: "Short explanation",
    explPh: "What's the idea here",
    tasksLabel: "Tasks (one per player)",
    taskPh: "Entry: rush ramp after the flash",
    addTask: "+ Task",
    linksLabel: "Lineup links (prep)",
    linkLabelPh: "Xbox smoke",
    linkUrlPh: "https://…",
    addLink: "+ Link",
    suggestLinks: "Suggest from CSNADES",
    linksSuggested: (n) => (n === 1 ? "Added 1 lineup link." : `Added ${n} lineup links.`),
    openLineups: "Lineups",
    targetLabel: "Target",
    roundsLabel: "Rounds (none selected = fits all)",
    statusLabel: "Status",
    ready: "Ready",
    practice: "Practice",
    save: "Save",
    cancel: "Cancel",
    newBtn: "New",
    stratsHeader: (n, m, s) => `${n} strat${n === 1 ? "" : "s"} · ${m} ${s}`,
    includePractice: "Include practice strats in the match pool",
    emptyBook: "Nothing here yet. Add your first strat.",
    allRounds: "all rounds",
    settingsShow: "Maps, sharing and starter library",
    settingsHide: "Hide settings",
    mapsLabel: "Maps",
    newMapPh: "New map",
    add: "Add",
    starterLabel: "Starter library",
    starterDesc: (n) => `${n} simple strats for all seven active duty maps, in Norwegian and English. Lineup links from CSNADES.gg.`,
    loadStarter: "Fill the book",
    starterDone: (n) => `Added ${n} strats.`,
    catalogHint: (n) => `${n} CSNADES lineups in the catalog.`,
    shareLabel: "Share with the team",
    exportBtn: "Export",
    importBtn: "Import",
    transferPh: "Paste strats from a teammate here, then press Import.",
    exportMsg: "Copy the text and send it to your team.",
    importOk: (n) => `Added ${n} strats.`,
    importFail: "No valid strats found in that text.",
    resetLabel: "Reset the whole book",
    deleteAll: "Delete everything?",
    yesDelete: "Yes, delete",
    saveError: "Couldn't save right now — changes may be lost.",
    loadError: "Couldn't read the saved book. A copy was kept under the key cs2-callout-book-skadet.",
    editingIn: "Writing in",
  },
};

const COND = "'Arial Narrow', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function opt(list, id, lang) {
  const f = list.find((x) => x.id === id);
  return f ? f[lang] : null;
}

function pickText(strat, field, lang) {
  const en = (strat[field + "En"] || "").trim();
  const no = (strat[field] || "").trim();
  return lang === "en" ? en || no : no || en;
}

function pickTasks(strat, lang) {
  const primary = lang === "en" ? strat.tasksEn : strat.tasks;
  const fallback = lang === "en" ? strat.tasks : strat.tasksEn;
  const n = Math.max(primary.length, fallback.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = (primary[i] || "").trim() || (fallback[i] || "").trim();
    if (v) out.push(v);
  }
  return out;
}

function safeHttpUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  try {
    const u = new URL(value);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch (_) {
    // invalid
  }
  return "";
}

function migrateLink(link) {
  const url = safeHttpUrl(link?.url);
  if (!url) return null;
  return {
    label: (link.label || "").trim(),
    labelEn: (link.labelEn || "").trim(),
    url,
  };
}

function pickLinkLabel(link, lang) {
  const en = (link.labelEn || "").trim();
  const no = (link.label || "").trim();
  const text = lang === "en" ? en || no : no || en;
  return text || link.url;
}

function migrate(s) {
  const links = Array.isArray(s.links)
    ? s.links.map(migrateLink).filter(Boolean).slice(0, 5)
    : [];
  return {
    id: s.id || uid(),
    map: s.map,
    side: s.side,
    callout: s.callout || "",
    calloutEn: s.calloutEn || "",
    description: s.description || "",
    descriptionEn: s.descriptionEn || "",
    site: s.site || null,
    rounds: Array.isArray(s.rounds) ? s.rounds : s.buyType && s.buyType !== "any" ? [s.buyType] : [],
    status: s.status || "ready",
    tasks: Array.isArray(s.tasks) ? s.tasks : [],
    tasksEn: Array.isArray(s.tasksEn) ? s.tasksEn : [],
    links,
    wins: s.wins || 0,
    losses: s.losses || 0,
    timesUsed: s.timesUsed || 0,
    lastUsed: s.lastUsed || null,
  };
}

export default function CalloutBook() {
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState("no");
  const [maps, setMaps] = useState(DEFAULT_MAPS);
  const [strats, setStrats] = useState([]);
  const [history, setHistory] = useState([]);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [tab, setTab] = useState("match");
  const [selectedMap, setSelectedMap] = useState(DEFAULT_MAPS[0]);
  const [selectedSide, setSelectedSide] = useState("T");
  const [siteFilter, setSiteFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");
  const [includePractice, setIncludePractice] = useState(false);
  const [currentPick, setCurrentPick] = useState(null);
  const [logged, setLogged] = useState(null);

  const [secondsLeft, setSecondsLeft] = useState(null);
  const timerRef = useRef(null);

  const [showForm, setShowForm] = useState(false);
  const [formLang, setFormLang] = useState("no");
  const [editingId, setEditingId] = useState(null);
  const [fCallout, setFCallout] = useState("");
  const [fCalloutEn, setFCalloutEn] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fDescEn, setFDescEn] = useState("");
  const [fSite, setFSite] = useState("default");
  const [fRounds, setFRounds] = useState([]);
  const [fStatus, setFStatus] = useState("ready");
  const [fTasks, setFTasks] = useState([]);
  const [fTasksEn, setFTasksEn] = useState([]);
  const [fLinks, setFLinks] = useState([]);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [transferText, setTransferText] = useState("");
  const [transferMsg, setTransferMsg] = useState("");
  const [starterMsg, setStarterMsg] = useState("");

  const t = UI[lang];

  useEffect(() => {
    (async () => {
      try {
        const res = await storageGet(STORAGE_KEY);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          // Alt tolkes ferdig før noe settes, så en halvveis lesing ikke skriver over boka
          const m = Array.isArray(data.maps) && data.maps.length ? data.maps : DEFAULT_MAPS;
          const s = Array.isArray(data.strats) ? data.strats.map(migrate) : [];
          const h = Array.isArray(data.history) ? data.history : [];
          setMaps(m);
          setStrats(s);
          setHistory(h);
          setSelectedMap(m[0]);
          if (data.lang === "en" || data.lang === "no") {
            setLang(data.lang);
            setFormLang(data.lang);
          }
        }
      } catch (e) {
        // Ta vare på det ulesbare innholdet før appen lagrer over det
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) window.localStorage.setItem(BACKUP_KEY, raw);
        } catch (_) {
          // ingenting å redde
        }
        setLoadError(true);
      } finally {
        setLoaded(true);
      }
    })();
    return () => clearInterval(timerRef.current);
  }, []);

  const persist = useCallback(async (next) => {
    try {
      const ok = await storageSet(STORAGE_KEY, JSON.stringify(next));
      setSaveError(!ok);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persist({ maps, strats, history, lang });
  }, [maps, strats, history, lang, loaded, persist]);

  useEffect(() => {
    setCurrentPick(null);
    setLogged(null);
    setSecondsLeft(null);
    clearInterval(timerRef.current);
    setConfirmDelete(null);
  }, [selectedMap, selectedSide, siteFilter, roundFilter, includePractice]);

  const isT = selectedSide === "T";
  const sc = SIDE[selectedSide];

  const onMapSide = strats.filter((s) => s.map === selectedMap && s.side === selectedSide);

  const passesStatus = (s) => s.status !== "practice" || includePractice;
  const passesRound = (s) => roundFilter === "all" || s.rounds.length === 0 || s.rounds.includes(roundFilter);

  const eligible = onMapSide.filter((s) => {
    if (!passesStatus(s)) return false;
    if (isT && siteFilter !== "all" && s.site !== siteFilter) return false;
    return passesRound(s);
  });

  const recent = history.filter((h) => h.map === selectedMap && h.side === selectedSide).slice(0, 6);
  const run = recent.slice(0, 5).filter((h) => h.site);
  let patternWarning = null;
  if (isT && run.length >= 4) {
    const counts = {};
    run.forEach((h) => {
      counts[h.site] = (counts[h.site] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 4) patternWarning = opt(SITES, top[0], lang);
  }

  function siteCount(id) {
    return onMapSide.filter((s) => passesStatus(s) && passesRound(s) && (id === "all" || s.site === id)).length;
  }

  function startTimer() {
    clearInterval(timerRef.current);
    setSecondsLeft(FREEZE_SECONDS);
    const end = Date.now() + FREEZE_SECONDS * 1000;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(timerRef.current);
    }, 200);
  }

  function pick(excludeId) {
    let pool = eligible;
    if (excludeId) {
      const f = eligible.filter((s) => s.id !== excludeId);
      if (f.length) pool = f;
    }
    if (!pool.length) return null;
    const w = pool.map((s) => 1 / (s.timesUsed + 1));
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= w[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function handleCall() {
    const p = pick(currentPick ? currentPick.id : null);
    if (!p) return;
    const now = Date.now();
    setStrats((prev) => prev.map((s) => (s.id === p.id ? { ...s, lastUsed: now, timesUsed: s.timesUsed + 1 } : s)));
    setCurrentPick({ ...p, calledAt: now });
    setLogged(null);
    setHistory((prev) =>
      [{ hid: uid(), id: p.id, map: p.map, side: p.side, site: p.site, ts: now, result: null }, ...prev].slice(0, 80)
    );
    startTimer();
  }

  function logResult(result) {
    if (!currentPick || logged) return;
    setLogged(result);
    setStrats((prev) =>
      prev.map((s) =>
        s.id === currentPick.id
          ? { ...s, wins: s.wins + (result === "win" ? 1 : 0), losses: s.losses + (result === "loss" ? 1 : 0) }
          : s
      )
    );
    setHistory((prev) => prev.map((h, i) => (i === 0 ? { ...h, result } : h)));
  }

  function openNew() {
    setEditingId(null);
    setFCallout("");
    setFCalloutEn("");
    setFDesc("");
    setFDescEn("");
    setFSite(isT && siteFilter !== "all" ? siteFilter : "default");
    setFRounds([]);
    setFStatus("ready");
    setFTasks([]);
    setFTasksEn([]);
    setFLinks([]);
    setFormLang(lang);
    setShowForm(true);
  }

  function openEdit(s) {
    setEditingId(s.id);
    setFCallout(s.callout);
    setFCalloutEn(s.calloutEn);
    setFDesc(s.description);
    setFDescEn(s.descriptionEn);
    setFSite(s.site || "default");
    setFRounds(s.rounds);
    setFStatus(s.status);
    const n = Math.max(s.tasks.length, s.tasksEn.length);
    setFTasks(Array.from({ length: n }, (_, i) => s.tasks[i] || ""));
    setFTasksEn(Array.from({ length: n }, (_, i) => s.tasksEn[i] || ""));
    setFLinks((s.links || []).map((l) => ({ label: l.label || "", labelEn: l.labelEn || "", url: l.url || "" })));
    setFormLang(lang);
    setShowForm(true);
  }

  function save() {
    if (!fCallout.trim() && !fCalloutEn.trim()) return;
    let links = fLinks.map(migrateLink).filter(Boolean);
    if (!links.length) {
      links = suggestLineupLinks(
        {
          map: selectedMap,
          side: selectedSide,
          callout: fCallout,
          calloutEn: fCalloutEn,
          description: fDesc,
          descriptionEn: fDescEn,
          tasks: fTasks,
          tasksEn: fTasksEn,
        },
        { side: selectedSide, limit: 5 }
      );
    }
    const payload = {
      callout: fCallout.trim(),
      calloutEn: fCalloutEn.trim(),
      description: fDesc.trim(),
      descriptionEn: fDescEn.trim(),
      rounds: fRounds,
      status: fStatus,
      tasks: fTasks.map((x) => x.trim()),
      tasksEn: fTasksEn.map((x) => x.trim()),
      links,
    };
    if (editingId) {
      setStrats((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...payload, site: s.side === "T" ? fSite : null } : s))
      );
    } else {
      setStrats((prev) => [
        ...prev,
        migrate({ ...payload, id: uid(), map: selectedMap, side: selectedSide, site: isT ? fSite : null }),
      ]);
    }
    setShowForm(false);
  }

  function addTaskRow() {
    setFTasks((p) => [...p, ""]);
    setFTasksEn((p) => [...p, ""]);
  }

  function removeTaskRow(i) {
    setFTasks((p) => p.filter((_, j) => j !== i));
    setFTasksEn((p) => p.filter((_, j) => j !== i));
  }

  function addLinkRow() {
    setFLinks((p) => [...p, { label: "", labelEn: "", url: "" }]);
  }

  function removeLinkRow(i) {
    setFLinks((p) => p.filter((_, j) => j !== i));
  }

  function applySuggestedLinks({ replace = false } = {}) {
    const draft = {
      map: selectedMap,
      side: selectedSide,
      callout: fCallout,
      calloutEn: fCalloutEn,
      description: fDesc,
      descriptionEn: fDescEn,
      tasks: fTasks,
      tasksEn: fTasksEn,
    };
    const suggested = suggestLineupLinks(draft, { side: selectedSide, limit: 5 });
    if (!suggested.length) {
      setStarterMsg("");
      return 0;
    }
    setFLinks((prev) => {
      const base = replace ? [] : prev;
      const existing = new Set(base.map((l) => safeHttpUrl(l.url)).filter(Boolean));
      const merged = [...base];
      for (const s of suggested) {
        if (existing.has(s.url)) continue;
        merged.push({ label: s.label, labelEn: s.labelEn, url: s.url });
        existing.add(s.url);
        if (merged.length >= 5) break;
      }
      return merged;
    });
    return suggested.length;
  }

  function loadStarter() {
    const existing = new Set(strats.map(stratKey));
    const incoming = STARTER.strats
      .filter((s) => !existing.has(stratKey(s)))
      .map((s) => {
        const base = migrate({ ...s, id: uid() });
        if (!base.links.length) {
          base.links = suggestLineupLinks(base, { side: base.side, limit: 5 });
        }
        return base;
      });
    setMaps((prev) => Array.from(new Set([...prev, ...STARTER.maps])));
    if (incoming.length) setStrats((prev) => [...prev, ...incoming]);
    setStarterMsg(t.starterDone(incoming.length));
  }

  function doExport() {
    setTransferText(JSON.stringify({ maps, strats }, null, 1));
    setTransferMsg(t.exportMsg);
  }

  function doImport() {
    try {
      const data = JSON.parse(transferText);
      if (!Array.isArray(data.strats)) throw new Error("no strats");
      const existing = new Set(strats.map(stratKey));
      const incoming = data.strats
        .filter((s) => !existing.has(stratKey(s)))
        .map((s) => migrate({ ...s, id: uid(), wins: 0, losses: 0, timesUsed: 0, lastUsed: null }));
      setMaps((prev) => Array.from(new Set([...prev, ...(data.maps || [])])));
      if (incoming.length) setStrats((prev) => [...prev, ...incoming]);
      setTransferMsg(t.importOk(incoming.length));
      setTransferText("");
    } catch (e) {
      setTransferMsg(t.importFail);
    }
  }

  function resetAll() {
    setMaps(DEFAULT_MAPS);
    setStrats([]);
    setHistory([]);
    setSelectedMap(DEFAULT_MAPS[0]);
    setCurrentPick(null);
    setLogged(null);
    clearInterval(timerRef.current);
    setSecondsLeft(null);
    setConfirmReset(false);
    setStarterMsg("");
  }

  const pill = {
    borderRadius: 3,
    fontFamily: COND,
    fontStretch: "condensed",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontWeight: 700,
  };

  const eyebrow = (text, extra) => (
    <p
      style={{
        fontFamily: COND,
        fontStretch: "condensed",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontSize: 11,
        fontWeight: 700,
        color: C.faint,
        margin: 0,
        ...extra,
      }}
    >
      {text}
    </p>
  );

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: C.bg,
    border: `1px solid ${C.line}`,
    color: C.chalk,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 460, padding: "0 0 40px" }}>
        {!loaded ? (
          <div style={{ padding: "120px 20px", textAlign: "center", color: C.dim, fontFamily: COND, letterSpacing: "0.1em" }}>
            {t.loading}
          </div>
        ) : (
          <>
            <div style={{ position: "sticky", top: 0, zIndex: 20, background: C.bg, borderBottom: `1px solid ${C.line}`, padding: "14px 16px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                {eyebrow(t.title)}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {["no", "en"].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        style={{
                          ...pill,
                          fontSize: 11,
                          padding: "3px 7px",
                          border: "none",
                          background: lang === l ? C.panelHi : "transparent",
                          color: lang === l ? C.chalk : C.faint,
                          cursor: "pointer",
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["T", "CT"].map((k) => (
                      <button
                        key={k}
                        onClick={() => setSelectedSide(k)}
                        style={{
                          ...pill,
                          fontSize: 12,
                          padding: "3px 12px",
                          border: `1px solid ${selectedSide === k ? SIDE[k].accent : C.line}`,
                          background: selectedSide === k ? SIDE[k].soft : "transparent",
                          color: selectedSide === k ? SIDE[k].accent : C.faint,
                          cursor: "pointer",
                        }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
                {maps.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMap(m)}
                    style={{
                      ...pill,
                      flexShrink: 0,
                      fontSize: 12,
                      padding: "4px 10px",
                      border: "none",
                      borderBottom: `2px solid ${selectedMap === m ? sc.accent : "transparent"}`,
                      background: "transparent",
                      color: selectedMap === m ? C.chalk : C.faint,
                      cursor: "pointer",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {saveError && <p style={{ margin: "10px 16px 0", fontSize: 12, color: C.warn }}>{t.saveError}</p>}
            {loadError && <p style={{ margin: "10px 16px 0", fontSize: 12, color: C.warn }}>{t.loadError}</p>}

            <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
              {[["match", t.match], ["book", t.book]].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    ...pill,
                    flex: 1,
                    fontSize: 12,
                    padding: "11px 0",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${tab === id ? C.chalk : "transparent"}`,
                    color: tab === id ? C.chalk : C.faint,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "match" && (
              <div style={{ padding: 16 }}>
                {isT && (
                  <div style={{ marginBottom: 12 }}>
                    {eyebrow(t.whereTo, { marginBottom: 6 })}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
                      {[{ id: "all", no: t.all, en: t.all }, ...SITES].map((s) => {
                        const n = siteCount(s.id);
                        const active = siteFilter === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSiteFilter(s.id)}
                            disabled={n === 0}
                            style={{
                              ...pill,
                              fontSize: 14,
                              padding: "9px 0",
                              border: `1px solid ${active ? sc.accent : C.line}`,
                              background: active ? sc.soft : C.panel,
                              color: active ? sc.accent : C.dim,
                              opacity: n === 0 ? 0.4 : 1,
                              cursor: n === 0 ? "default" : "pointer",
                            }}
                          >
                            {s[lang]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  {eyebrow(t.roundLabel, { marginBottom: 6 })}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[{ id: "all", no: t.all, en: t.all }, ...ROUNDS].map((r) => {
                      const active = roundFilter === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setRoundFilter(r.id)}
                          style={{
                            ...pill,
                            fontSize: 11,
                            padding: "5px 10px",
                            border: `1px solid ${active ? C.chalk : C.line}`,
                            background: active ? C.panelHi : "transparent",
                            color: active ? C.chalk : C.faint,
                            cursor: "pointer",
                          }}
                        >
                          {r[lang]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 3, background: C.line, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: secondsLeft === null ? "0%" : `${(secondsLeft / FREEZE_SECONDS) * 100}%`,
                      background: secondsLeft !== null && secondsLeft <= 4 ? C.warn : sc.accent,
                      transition: "width 0.2s linear",
                    }}
                  />
                </div>

                <div
                  style={{
                    background: C.panel,
                    borderTop: "none",
                    borderRight: `1px solid ${currentPick ? C.line : "transparent"}`,
                    borderBottom: `1px solid ${currentPick ? C.line : "transparent"}`,
                    borderLeft: `1px solid ${currentPick ? C.line : "transparent"}`,
                    padding: currentPick ? 16 : "34px 16px",
                    minHeight: 150,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  {!currentPick ? (
                    <p style={{ margin: 0, textAlign: "center", color: C.faint, fontSize: 13 }}>
                      {eligible.length === 0 ? t.noMatch(selectedMap) : t.inPool(eligible.length)}
                    </p>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ ...pill, fontSize: 11, letterSpacing: "0.16em", color: sc.accent }}>
                          {currentPick.site ? `${selectedMap} · ${opt(SITES, currentPick.site, lang)}` : selectedMap}
                        </span>
                        {secondsLeft !== null && (
                          <span style={{ fontFamily: MONO, fontSize: 12, color: secondsLeft <= 4 ? C.warn : C.faint }}>{secondsLeft}s</span>
                        )}
                      </div>

                      <div
                        style={{
                          fontFamily: COND,
                          fontStretch: "condensed",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          fontSize: 40,
                          lineHeight: 0.95,
                          color: C.chalk,
                          wordBreak: "break-word",
                          marginBottom: 12,
                        }}
                      >
                        {pickText(currentPick, "callout", lang)}
                      </div>

                      {pickText(currentPick, "description", lang) && (
                        <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.5, color: "#B4BAC2" }}>
                          {pickText(currentPick, "description", lang)}
                        </p>
                      )}

                      {pickTasks(currentPick, lang).length > 0 && (
                        <div style={{ borderLeft: `2px solid ${sc.accent}`, paddingLeft: 10, marginBottom: 12 }}>
                          {pickTasks(currentPick, lang).map((x, i) => (
                            <p key={i} style={{ margin: "0 0 3px", fontSize: 13, color: "#B4BAC2", fontFamily: MONO }}>
                              {x}
                            </p>
                          ))}
                        </div>
                      )}

                      {(currentPick.links || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                          {(currentPick.links || []).map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                ...pill,
                                fontSize: 10,
                                padding: "4px 8px",
                                border: `1px solid ${C.line}`,
                                background: "transparent",
                                color: C.dim,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <ExternalLink size={11} />
                              {pickLinkLabel(link, lang)}
                            </a>
                          ))}
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                        {logged ? (
                          <span style={{ ...pill, fontSize: 11, color: logged === "win" ? C.good : C.warn }}>
                            {logged === "win" ? t.roundWon : t.roundLost}
                          </span>
                        ) : (
                          <>
                            <button onClick={() => logResult("win")} style={{ ...pill, fontSize: 11, padding: "5px 12px", border: `1px solid ${C.line}`, background: "transparent", color: C.good, cursor: "pointer" }}>
                              {t.won}
                            </button>
                            <button onClick={() => logResult("loss")} style={{ ...pill, fontSize: 11, padding: "5px 12px", border: `1px solid ${C.line}`, background: "transparent", color: C.warn, cursor: "pointer" }}>
                              {t.lost}
                            </button>
                          </>
                        )}
                        <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: MONO, color: C.faint }}>
                          {(() => {
                            const s = strats.find((x) => x.id === currentPick.id);
                            if (!s || s.wins + s.losses === 0) return t.noHistory;
                            return `${s.wins}–${s.losses} · ${Math.round((s.wins / (s.wins + s.losses)) * 100)}%`;
                          })()}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleCall}
                  disabled={eligible.length === 0}
                  style={{
                    ...pill,
                    width: "100%",
                    fontSize: 16,
                    padding: "16px 0",
                    marginTop: 10,
                    border: "none",
                    background: eligible.length === 0 ? C.panelHi : sc.accent,
                    color: eligible.length === 0 ? C.faint : C.bg,
                    cursor: eligible.length === 0 ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Shuffle size={15} />
                  {currentPick ? t.callAgain : t.call}
                </button>

                {recent.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    {eyebrow(t.pattern, { marginBottom: 8 })}
                    <div style={{ display: "flex", gap: 4, marginBottom: patternWarning ? 8 : 0 }}>
                      {recent.map((h) => (
                        <div
                          key={h.hid || h.ts}
                          style={{
                            flex: 1,
                            padding: "8px 0",
                            textAlign: "center",
                            background: C.panel,
                            borderTop: `2px solid ${h.result === "win" ? C.good : h.result === "loss" ? C.warn : C.line}`,
                            fontFamily: COND,
                            fontStretch: "condensed",
                            fontWeight: 700,
                            fontSize: 13,
                            letterSpacing: "0.08em",
                            color: h.site ? sc.accent : C.faint,
                          }}
                        >
                          {h.site ? opt(SITES, h.site, lang) : "–"}
                        </div>
                      ))}
                    </div>
                    {patternWarning && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.warn, fontSize: 12 }}>
                        <AlertTriangle size={13} />
                        <span>{t.patternWarn(patternWarning)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === "book" && (
              <div style={{ padding: 16 }}>
                {showForm && (
                  <div style={{ background: C.panel, border: `1px solid ${sc.accent}`, padding: 14, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      {eyebrow(`${editingId ? t.editStrat : t.newStrat} · ${selectedMap} ${selectedSide}`, { color: sc.accent })}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 10, color: C.faint }}>{t.editingIn}</span>
                        {["no", "en"].map((l) => (
                          <button
                            key={l}
                            onClick={() => setFormLang(l)}
                            style={{
                              ...pill,
                              fontSize: 10,
                              padding: "2px 7px",
                              border: `1px solid ${formLang === l ? C.chalk : C.line}`,
                              background: "transparent",
                              color: formLang === l ? C.chalk : C.faint,
                              cursor: "pointer",
                            }}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4 }}>{t.calloutLabel}</label>
                    <input
                      value={formLang === "no" ? fCallout : fCalloutEn}
                      onChange={(e) => (formLang === "no" ? setFCallout(e.target.value) : setFCalloutEn(e.target.value))}
                      placeholder={t.calloutPh}
                      style={{
                        ...inputStyle,
                        padding: 10,
                        fontFamily: COND,
                        fontStretch: "condensed",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        fontSize: 20,
                        letterSpacing: "0.04em",
                        marginBottom: 12,
                      }}
                    />

                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4 }}>{t.explLabel}</label>
                    <textarea
                      value={formLang === "no" ? fDesc : fDescEn}
                      onChange={(e) => (formLang === "no" ? setFDesc(e.target.value) : setFDescEn(e.target.value))}
                      rows={2}
                      placeholder={t.explPh}
                      style={{ ...inputStyle, padding: 10, fontSize: 14, resize: "none", marginBottom: 12 }}
                    />

                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4 }}>{t.tasksLabel}</label>
                    {(formLang === "no" ? fTasks : fTasksEn).map((x, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input
                          value={x}
                          onChange={(e) => {
                            const v = e.target.value;
                            const setter = formLang === "no" ? setFTasks : setFTasksEn;
                            setter((p) => p.map((y, j) => (j === i ? v : y)));
                          }}
                          placeholder={t.taskPh}
                          style={{ ...inputStyle, flex: 1, padding: "7px 9px", fontSize: 13, fontFamily: MONO }}
                        />
                        <button onClick={() => removeTaskRow(i)} style={{ background: "transparent", border: "none", color: C.faint, cursor: "pointer", padding: 4 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(formLang === "no" ? fTasks : fTasksEn).length < 5 && (
                      <button onClick={addTaskRow} style={{ ...pill, fontSize: 11, padding: "5px 10px", background: "transparent", border: `1px dashed ${C.line}`, color: C.dim, cursor: "pointer", marginBottom: 12 }}>
                        {t.addTask}
                      </button>
                    )}

                    <label style={{ display: "block", fontSize: 11, color: C.dim, margin: "6px 0 4px" }}>{t.linksLabel}</label>
                    {fLinks.map((link, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input
                          value={formLang === "no" ? link.label : link.labelEn}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFLinks((p) =>
                              p.map((row, j) =>
                                j === i ? { ...row, [formLang === "no" ? "label" : "labelEn"]: v } : row
                              )
                            );
                          }}
                          placeholder={t.linkLabelPh}
                          style={{ ...inputStyle, width: "34%", padding: "7px 9px", fontSize: 13 }}
                        />
                        <input
                          value={link.url}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFLinks((p) => p.map((row, j) => (j === i ? { ...row, url: v } : row)));
                          }}
                          placeholder={t.linkUrlPh}
                          style={{ ...inputStyle, flex: 1, padding: "7px 9px", fontSize: 12, fontFamily: MONO }}
                        />
                        <button onClick={() => removeLinkRow(i)} style={{ background: "transparent", border: "none", color: C.faint, cursor: "pointer", padding: 4 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {fLinks.length < 5 && (
                      <button onClick={addLinkRow} style={{ ...pill, fontSize: 11, padding: "5px 10px", background: "transparent", border: `1px dashed ${C.line}`, color: C.dim, cursor: "pointer", marginBottom: 8, marginRight: 6 }}>
                        {t.addLink}
                      </button>
                    )}
                    <button
                      onClick={() => applySuggestedLinks({ replace: fLinks.length === 0 })}
                      style={{ ...pill, fontSize: 11, padding: "5px 10px", background: sc.soft, border: `1px solid ${sc.accent}`, color: sc.accent, cursor: "pointer", marginBottom: 12 }}
                    >
                      {t.suggestLinks}
                    </button>

                    {isT && (
                      <>
                        <label style={{ display: "block", fontSize: 11, color: C.dim, margin: "6px 0 4px" }}>{t.targetLabel}</label>
                        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                          {SITES.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setFSite(s.id)}
                              style={{
                                ...pill,
                                fontSize: 11,
                                padding: "6px 12px",
                                border: `1px solid ${fSite === s.id ? sc.accent : C.line}`,
                                background: fSite === s.id ? sc.soft : "transparent",
                                color: fSite === s.id ? sc.accent : C.faint,
                                cursor: "pointer",
                              }}
                            >
                              {s[lang]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4 }}>{t.roundsLabel}</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {ROUNDS.map((r) => {
                        const on = fRounds.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            onClick={() => setFRounds((p) => (p.includes(r.id) ? p.filter((y) => y !== r.id) : [...p, r.id]))}
                            style={{
                              ...pill,
                              fontSize: 11,
                              padding: "6px 10px",
                              border: `1px solid ${on ? sc.accent : C.line}`,
                              background: on ? sc.soft : "transparent",
                              color: on ? sc.accent : C.faint,
                              cursor: "pointer",
                            }}
                          >
                            {r[lang]}
                          </button>
                        );
                      })}
                    </div>

                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4 }}>{t.statusLabel}</label>
                    <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                      {[["ready", t.ready], ["practice", t.practice]].map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => setFStatus(id)}
                          style={{
                            ...pill,
                            fontSize: 11,
                            padding: "6px 14px",
                            border: `1px solid ${fStatus === id ? C.chalk : C.line}`,
                            background: fStatus === id ? C.panelHi : "transparent",
                            color: fStatus === id ? C.chalk : C.faint,
                            cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={save} style={{ ...pill, flex: 1, fontSize: 13, padding: "11px 0", border: "none", background: sc.accent, color: C.bg, cursor: "pointer" }}>
                        {t.save}
                      </button>
                      <button onClick={() => setShowForm(false)} style={{ ...pill, fontSize: 13, padding: "11px 16px", border: "none", background: "transparent", color: C.faint, cursor: "pointer" }}>
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  {eyebrow(t.stratsHeader(onMapSide.length, selectedMap, selectedSide))}
                  <button onClick={openNew} style={{ ...pill, fontSize: 11, padding: "6px 12px", border: "none", background: sc.soft, color: sc.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Plus size={13} /> {t.newBtn}
                  </button>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, fontSize: 12, color: C.dim, cursor: "pointer" }}>
                  <input type="checkbox" checked={includePractice} onChange={(e) => setIncludePractice(e.target.checked)} />
                  {t.includePractice}
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 20 }}>
                  {onMapSide.map((s) => {
                    const played = s.wins + s.losses;
                    const open = expandedId === s.id;
                    const desc = pickText(s, "description", lang);
                    const tasks = pickTasks(s, lang);
                    const links = s.links || [];
                    return (
                      <div key={s.id} style={{ background: C.panel, borderLeft: `2px solid ${s.status === "practice" ? C.faint : sc.accent}`, padding: "11px 12px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                              {s.site && (
                                <span style={{ ...pill, fontSize: 10, padding: "1px 5px", background: sc.soft, color: sc.accent }}>
                                  {opt(SITES, s.site, lang)}
                                </span>
                              )}
                              <span style={{ fontFamily: COND, fontStretch: "condensed", textTransform: "uppercase", fontWeight: 700, fontSize: 17, letterSpacing: "0.03em", color: C.chalk }}>
                                {pickText(s, "callout", lang)}
                              </span>
                              {s.status === "practice" && (
                                <span style={{ ...pill, fontSize: 10, padding: "1px 5px", border: `1px solid ${C.line}`, color: C.faint }}>{t.practice}</span>
                              )}
                              {links.length > 0 && (
                                <span style={{ ...pill, fontSize: 10, padding: "1px 5px", border: `1px solid ${C.line}`, color: C.dim }}>{t.openLineups}</span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, fontFamily: MONO, color: C.faint }}>
                              <span>{s.rounds.length ? s.rounds.map((r) => opt(ROUNDS, r, lang)).join(", ") : t.allRounds}</span>
                              <span>{played ? `${s.wins}–${s.losses}` : "0–0"}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                            {confirmDelete === s.id ? (
                              <>
                                <button onClick={() => { setStrats((p) => p.filter((x) => x.id !== s.id)); setConfirmDelete(null); }} style={{ background: C.panelHi, border: "none", color: C.warn, padding: 6, cursor: "pointer" }}>
                                  <Check size={13} />
                                </button>
                                <button onClick={() => setConfirmDelete(null)} style={{ background: "transparent", border: "none", color: C.faint, padding: 6, cursor: "pointer" }}>
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                {(desc || tasks.length > 0 || links.length > 0) && (
                                  <button onClick={() => setExpandedId(open ? null : s.id)} style={{ background: "transparent", border: "none", color: C.faint, padding: 6, cursor: "pointer" }}>
                                    {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                )}
                                <button onClick={() => openEdit(s)} style={{ background: "transparent", border: "none", color: C.faint, padding: 6, cursor: "pointer" }}>
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => setConfirmDelete(s.id)} style={{ background: "transparent", border: "none", color: C.faint, padding: 6, cursor: "pointer" }}>
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {open && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
                            {desc && <p style={{ margin: "0 0 6px", fontSize: 13, color: "#B4BAC2", lineHeight: 1.5 }}>{desc}</p>}
                            {tasks.map((x, i) => (
                              <p key={i} style={{ margin: "0 0 2px", fontSize: 12, fontFamily: MONO, color: C.dim }}>
                                {x}
                              </p>
                            ))}
                            {links.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: tasks.length || desc ? 8 : 0 }}>
                                {links.map((link, i) => (
                                  <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: 12, color: sc.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                                  >
                                    <ExternalLink size={12} />
                                    {pickLinkLabel(link, lang)}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {onMapSide.length === 0 && !showForm && (
                    <p style={{ textAlign: "center", padding: "28px 0", color: C.faint, fontSize: 13 }}>{t.emptyBook}</p>
                  )}
                </div>

                <button onClick={() => setShowSettings((v) => !v)} style={{ ...pill, fontSize: 11, background: "transparent", border: "none", color: C.faint, cursor: "pointer", padding: 0, marginBottom: 10 }}>
                  {showSettings ? t.settingsHide : t.settingsShow}
                </button>

                {showSettings && (
                  <div style={{ background: C.panel, border: `1px solid ${C.line}`, padding: 14 }}>
                    {eyebrow(t.starterLabel, { marginBottom: 6 })}
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{t.starterDesc(STARTER.strats.length)}</p>
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: C.faint }}>{t.catalogHint(catalogStats().total)}</p>
                    <button onClick={loadStarter} style={{ ...pill, fontSize: 11, padding: "8px 14px", border: `1px solid ${sc.accent}`, background: sc.soft, color: sc.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <Download size={13} /> {t.loadStarter}
                    </button>
                    {starterMsg && <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>{starterMsg}</p>}

                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                      {eyebrow(t.mapsLabel, { marginBottom: 8 })}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                        {maps.map((m) => (
                          <span key={m} style={{ display: "flex", alignItems: "center", gap: 4, background: C.bg, padding: "4px 8px", fontSize: 12, color: C.dim }}>
                            {m}
                            {maps.length > 1 && (
                              <button
                                onClick={() => {
                                  const next = maps.filter((x) => x !== m);
                                  setMaps(next);
                                  setStrats((p) => p.filter((s) => s.map !== m));
                                  if (selectedMap === m) setSelectedMap(next[0]);
                                }}
                                style={{ background: "transparent", border: "none", color: C.faint, cursor: "pointer", padding: 0, display: "flex" }}
                              >
                                <X size={11} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={newMapName} onChange={(e) => setNewMapName(e.target.value)} placeholder={t.newMapPh} style={{ ...inputStyle, flex: 1, padding: "8px 10px", fontSize: 13 }} />
                        <button
                          onClick={() => {
                            const n = newMapName.trim();
                            if (n && !maps.includes(n)) {
                              setMaps((p) => [...p, n]);
                              setNewMapName("");
                            }
                          }}
                          style={{ ...pill, fontSize: 11, padding: "8px 14px", border: "none", background: C.panelHi, color: C.chalk, cursor: "pointer" }}
                        >
                          {t.add}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                      {eyebrow(t.shareLabel, { marginBottom: 8 })}
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <button onClick={doExport} style={{ ...pill, flex: 1, fontSize: 11, padding: "8px 0", border: `1px solid ${C.line}`, background: "transparent", color: C.dim, cursor: "pointer" }}>
                          {t.exportBtn}
                        </button>
                        <button onClick={doImport} style={{ ...pill, flex: 1, fontSize: 11, padding: "8px 0", border: `1px solid ${C.line}`, background: "transparent", color: C.dim, cursor: "pointer" }}>
                          {t.importBtn}
                        </button>
                      </div>
                      <textarea value={transferText} onChange={(e) => setTransferText(e.target.value)} rows={4} placeholder={t.transferPh} style={{ ...inputStyle, padding: 9, fontSize: 11, fontFamily: MONO, resize: "none", color: C.dim }} />
                      {transferMsg && <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>{transferMsg}</p>}
                    </div>

                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                      {confirmReset ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: C.dim }}>{t.deleteAll}</span>
                          <button onClick={resetAll} style={{ ...pill, fontSize: 11, padding: "5px 10px", border: "none", background: C.panelHi, color: C.warn, cursor: "pointer" }}>
                            {t.yesDelete}
                          </button>
                          <button onClick={() => setConfirmReset(false)} style={{ background: "transparent", border: "none", color: C.faint, fontSize: 12, cursor: "pointer" }}>
                            {t.cancel}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmReset(true)} style={{ background: "transparent", border: "none", color: C.faint, fontSize: 12, cursor: "pointer", padding: 0 }}>
                          {t.resetLabel}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
