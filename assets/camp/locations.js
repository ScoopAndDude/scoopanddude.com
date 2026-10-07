// Curated quick-pick hubs across every US region, PLUS full nationwide
// town/city search (via Open-Meteo's free geocoding API) for any US
// location's exact lat/lon. Every place carries its own IANA time zone so
// forecasts are labeled in the place's local time, not the visitor's.
const MIDWEST_LOCATIONS = [
  { id: "laporte",      name: "La Porte, IN",      lat: 41.6081, lon: -86.7189, tz: "America/Chicago", home: true, region: "Midwest (Home)" },
  { id: "chicago",      name: "Chicago, IL",       lat: 41.8781, lon: -87.6298, tz: "America/Chicago", region: "Midwest" },
  { id: "indianapolis", name: "Indianapolis, IN",  lat: 39.7684, lon: -86.1581, tz: "America/Indiana/Indianapolis", region: "Midwest" },
  { id: "grandrapids",  name: "Grand Rapids, MI",  lat: 42.9634, lon: -85.6681, tz: "America/Detroit", region: "Midwest" },
  { id: "milwaukee",    name: "Milwaukee, WI",     lat: 43.0389, lon: -87.9065, tz: "America/Chicago", region: "Midwest" },
  { id: "minneapolis",  name: "Minneapolis, MN",   lat: 44.9778, lon: -93.2650, tz: "America/Chicago", region: "Midwest" },
  { id: "columbus",     name: "Columbus, OH",      lat: 39.9612, lon: -82.9988, tz: "America/New_York", region: "Midwest" },
  { id: "desmoines",    name: "Des Moines, IA",    lat: 41.5868, lon: -93.6250, tz: "America/Chicago", region: "Midwest" },
  { id: "newyork",      name: "New York, NY",      lat: 40.7128, lon: -74.0060, tz: "America/New_York", region: "Northeast" },
  { id: "boston",       name: "Boston, MA",        lat: 42.3601, lon: -71.0589, tz: "America/New_York", region: "Northeast" },
  { id: "atlanta",      name: "Atlanta, GA",       lat: 33.7490, lon: -84.3880, tz: "America/New_York", region: "Southeast" },
  { id: "miami",        name: "Miami, FL",         lat: 25.7617, lon: -80.1918, tz: "America/New_York", region: "Southeast" },
  { id: "dallas",       name: "Dallas, TX",        lat: 32.7767, lon: -96.7970, tz: "America/Chicago", region: "South" },
  { id: "houston",      name: "Houston, TX",       lat: 29.7604, lon: -95.3698, tz: "America/Chicago", region: "South" },
  { id: "denver",       name: "Denver, CO",        lat: 39.7392, lon: -104.9903, tz: "America/Denver", region: "Mountain West" },
  { id: "phoenix",      name: "Phoenix, AZ",       lat: 33.4484, lon: -112.0740, tz: "America/Phoenix", region: "Southwest" },
  { id: "seattle",      name: "Seattle, WA",       lat: 47.6062, lon: -122.3321, tz: "America/Los_Angeles", region: "Pacific Northwest" },
  { id: "losangeles",   name: "Los Angeles, CA",   lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles", region: "West Coast" },
];

const HOME_LOCATION = MIDWEST_LOCATIONS[0];

function getLocationById(id) {
  return MIDWEST_LOCATIONS.find((l) => l.id === id) || MIDWEST_LOCATIONS[0];
}

/** Returns the current location object: a searched town/city if one is
 * saved, otherwise the selected (or default) curated hub. Every location
 * object has at least {name, lat, lon}; newer ones also carry {tz}. */
function getCurrentLocation() {
  try {
    const custom = localStorage.getItem("lpwn_custom_location");
    if (custom) {
      const loc = JSON.parse(custom);
      if (loc && typeof loc.lat === "number" && typeof loc.lon === "number") return loc;
    }
  } catch (e) {
    /* fall through to curated */
  }
  return getLocationById(getSavedLocationId());
}

function getSavedLocationId() {
  try {
    return localStorage.getItem("lpwn_location") || MIDWEST_LOCATIONS[0].id;
  } catch (e) {
    return MIDWEST_LOCATIONS[0].id;
  }
}

function saveLocationId(id) {
  try {
    localStorage.removeItem("lpwn_custom_location");
    localStorage.setItem("lpwn_location", id);
  } catch (e) {
    /* ignore — non-critical */
  }
}

/** Saves an arbitrary searched town/city as the active location. */
function saveCustomLocation(loc) {
  try {
    localStorage.setItem("lpwn_custom_location", JSON.stringify(loc));
  } catch (e) {
    /* ignore — non-critical */
  }
}

/** Best-known IANA time zone for a place (its own tz, then the NWS point's, then the visitor's). */
function locationTimeZone(loc, fallbackTz) {
  return (loc && loc.tz) || fallbackTz || (typeof LOCAL_TZ !== "undefined" ? LOCAL_TZ : undefined);
}

/** Looks up a place's IANA time zone when none is stored (towns saved on the
 * older site, shared links). Uses Open-Meteo's free API; returns null on failure. */
async function lookupTimeZone(lat, lon) {
  try {
    const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=temperature_2m&timezone=auto&forecast_days=1`, {}, 8000);
    return validTimeZone(data && data.timezone) || null;
  } catch (e) {
    return null;
  }
}

/** The trip a visitor saved in the Trip Planner (kept on their device only). */
function getSavedTrip() {
  try {
    const raw = localStorage.getItem("lpwn_saved_trip");
    const trip = raw ? JSON.parse(raw) : null;
    return trip && trip.from && trip.to ? trip : null;
  } catch (e) {
    return null;
  }
}

function groupLocationsByRegion() {
  const groups = {};
  MIDWEST_LOCATIONS.forEach((l) => {
    const key = l.region || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });
  return groups;
}

function populateLocationSwitcher(selectEl) {
  if (!selectEl) return;
  const current = getCurrentLocation();
  const groups = groupLocationsByRegion();
  const customOption = current.id ? "" : `<option value="__custom__" selected>${escapeText(current.name)} (searched)</option>`;
  selectEl.innerHTML = customOption + Object.keys(groups).map((region) => `
    <optgroup label="${region}">
      ${groups[region].map((l) => `<option value="${l.id}" ${l.id === current.id ? "selected" : ""}>${l.name}</option>`).join("")}
    </optgroup>`).join("");
  selectEl.addEventListener("change", () => {
    if (selectEl.value === "__custom__") return;
    saveLocationId(selectEl.value);
    reloadToSection("radar");
  });
}

/** Reloads the page and lands on a section (say, the radar) instead of wherever the
 * visitor had scrolled, since browsers restore the old scroll spot on a reload. */
function reloadToSection(id) {
  try { sessionStorage.setItem("lpwn_jump", id); } catch (e) { /* ignore */ }
  window.location.reload();
}

/** Called once on page load: if the last action asked to land on a section, go there. */
function applyPendingJump() {
  let id = null;
  try { id = sessionStorage.getItem("lpwn_jump"); sessionStorage.removeItem("lpwn_jump"); } catch (e) { return; }
  const el = id && document.getElementById(id);
  if (!el) return;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  // Jump straight there. The site's smooth scrolling is switched off for the jump, because a
  // smooth scroll started while the page is still loading can stall and leave the visitor at the top.
  const go = () => {
    const els = [document.documentElement, document.body];
    const before = els.map((e) => e.style.scrollBehavior);
    els.forEach((e) => { e.style.scrollBehavior = "auto"; });
    window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 8));
    els.forEach((e, i) => { e.style.scrollBehavior = before[i]; });
  };
  go();
  // Forecast cards above can change height once the weather arrives; re-aim unless the visitor has scrolled.
  let moved = false;
  const stop = () => { moved = true; };
  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
  [400, 1200, 2500].forEach((ms) => setTimeout(() => { if (!moved) go(); }, ms));
  setTimeout(() => { if ("scrollRestoration" in history) history.scrollRestoration = "auto"; }, 3000);
}

function escapeText(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Nationwide US town/city search via Open-Meteo's free geocoding API
 * (no key required) — returns exact lat/lon and time zone for any match. */
/** Spellings people type for the same town: "st louis" / "saint louis", "ft wayne" /
 * "fort wayne", "mt pleasant" / "mount pleasant", "laporte" / "la porte". */
function nameVariants(name) {
  const base = name.replace(/\./g, "").replace(/\s+/g, " ").trim();
  const v = new Set([base]);
  const swaps = [[/^st /i, "Saint "], [/^saint /i, "St "], [/^ste /i, "Sainte "], [/^ft /i, "Fort "], [/^fort /i, "Ft "],
    [/^mt /i, "Mount "], [/^mount /i, "Mt "], [/^laporte$/i, "La Porte"], [/^la porte$/i, "LaPorte"]];
  swaps.forEach(([re, to]) => { if (re.test(base)) v.add(base.replace(re, to)); });
  return [...v].slice(0, 3);
}

// Home region first when two towns share a name (La Porte, IN before La Porte, TX).
const HOME_REGION_STATES = { IN: 2, MI: 2, IL: 2 };

// A state typed after the town without a comma: "Salem WV", "Springfield Illinois".
// Returns [town, "WV"] or null. Longest state names first, so "West Virginia" wins over "Virginia".
function trailingState(q) {
  const names = Object.keys(STATE_ABBREVS).sort((a, b) => b.length - a.length);
  for (const n of names) {
    const m = new RegExp(`^(.+?)\\s+${n.replace(/ /g, "\\s+")}$`, "i").exec(q);
    if (m) return [m[1], STATE_ABBREVS[n]];
  }
  const ab = /^(.+?)\s+([A-Za-z]{2})$/.exec(q);
  return ab && Object.values(STATE_ABBREVS).includes(ab[2].toUpperCase()) ? [ab[1], ab[2].toUpperCase()] : null;
}

async function searchUSLocations(query) {
  if (!query || query.trim().length < 2) return [];
  const geo = (n, count) => fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(n)}&count=${count}&language=en&format=json&countryCode=US`, {}, 10000)
    .then((d) => d.results || []).catch(() => null);
  // "Traverse City, MI" -> search "Traverse City", then prefer matches in MI. Common names
  // (Salem, Clinton, Washington) have dozens of towns, so ask for the most the API allows (100).
  const [namePart, statePart] = query.split(",").map((s) => s.trim());
  const usable = (l) => (l || []).filter((r) => r.country_code === "US" &&
    // Towns and cities only: skip airports, parks and other landmarks with the same name.
    (!r.feature_code || /^PPL/.test(r.feature_code)));
  const variantsOf = (n) => new Set(nameVariants(n).map(townKey));
  const stOf = (r) => stateAbbrev(r.admin1 || "");
  let results, exactNames, want = statePart ? statePart.toUpperCase() : null;
  const split = !statePart && trailingState(namePart);
  if (split) {
    // "Salem WV": look for "Salem" in WV. Also look for the whole phrase, since some towns end
    // in a state's name ("Mount Washington", "Port Washington"). Only exact names count here.
    const [town, st] = split;
    const [townLists, whole] = await Promise.all([Promise.all(nameVariants(town).map((n) => geo(n, 100))), geo(namePart, 20)]);
    if (townLists.every((l) => l === null) && whole === null) throw new Error("Town search failed");
    const townNames = variantsOf(town), wholeNames = variantsOf(namePart);
    const inState = usable([].concat(...townLists.filter(Boolean))).filter((r) => stOf(r) === st);
    const exactInState = inState.filter((r) => townNames.has(townKey(r.name)));
    const exactWhole = usable(whole).filter((r) => wholeNames.has(townKey(r.name)));
    results = exactInState.length || exactWhole.length ? exactInState.concat(exactWhole) : inState;
    exactNames = new Set([...townNames, ...wholeNames]);
    want = null;
  } else {
    const lists = await Promise.all(nameVariants(namePart).map((n) => geo(n, 100)));
    if (lists.every((l) => l === null)) throw new Error("Town search failed");
    results = usable([].concat(...lists.filter(Boolean)));
    exactNames = variantsOf(namePart);
  }
  const seen = new Set();
  results = results.filter((r) => {
    const key = `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (want) {
    const inState = results.filter((r) => stOf(r) === want || (r.admin1 || "").toUpperCase() === want);
    if (inState.length) results = inState;
  }
  // Exact names first ("New York" before "York"), then the biggest towns, home region counted double.
  const weight = (r) => (r.population || 0) * (HOME_REGION_STATES[stOf(r)] || 1);
  const exact = (r) => (exactNames.has(townKey(r.name)) ? 1 : 0);
  results.sort((a, b) => exact(b) - exact(a) || weight(b) - weight(a));
  const top = results.slice(0, 8);
  // Two towns with the same name in one state (three Salems in West Virginia): add the county.
  const count = {};
  top.forEach((r) => { const k = `${r.name}|${stOf(r)}`; count[k] = (count[k] || 0) + 1; });
  const county = (r) => /(County|Parish|Borough|Area|City|Municipality)$/i.test(r.admin2)
    ? r.admin2 : `${r.admin2} ${stOf(r) === "LA" ? "Parish" : "County"}`;
  const out = top.map((r) => ({
    name: r.admin1
      ? `${r.name}${count[`${r.name}|${stOf(r)}`] > 1 && r.admin2 ? ` (${county(r)})` : ""}, ${stOf(r)}`
      : r.name,
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone || undefined,
    state: r.admin1 ? stOf(r) : undefined,
  }));
  out.more = !statePart && !split && results.length > 8;   // more towns share this name than we can show
  return out;
}
// "St. Louis", "Saint Louis" and "st louis" compare equal.
function townKey(s) {
  return String(s || "").toLowerCase().replace(/\./g, "").replace(/^saint /, "st ").replace(/^sainte /, "ste ")
    .replace(/^fort /, "ft ").replace(/^mount /, "mt ").replace(/\s+/g, " ").trim().replace(/^laporte$/, "la porte");
}

const STATE_ABBREVS = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH",
  Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
  "District of Columbia": "DC", "Puerto Rico": "PR",
};
function stateAbbrev(name) {
  return STATE_ABBREVS[name] || name;
}

/** Wires a text input + results list into live nationwide search. Calling
 * onSelect(loc) with the chosen location is the caller's responsibility
 * (usually: save it and reload). Only the newest search can show results or
 * be picked, so a slow answer to an old query never selects the wrong town. */
function wireLocationSearch(inputEl, resultsEl, onSelect) {
  if (!inputEl || !resultsEl) return;
  let debounceTimer = null;
  let seq = 0;                             // bumps with every new search
  let shown = { query: null, results: [] }; // the list on screen and the query it answers
  let dirty = false;                       // typed since the last pick?

  const choose = (m) => {
    if (!m) return;
    dirty = false;
    seq++;
    shown = { query: null, results: [] };
    resultsEl.innerHTML = "";
    if (typeof lpwnTrack === "function") lpwnTrack("city-search");
    onSelect(m);
  };

  async function search(query) {
    const mine = ++seq;
    let results;
    try {
      results = await searchUSLocations(query);
    } catch (e) {
      if (mine === seq) resultsEl.innerHTML = `<div class="search-result-empty">Search failed &mdash; try again</div>`;
      return null;
    }
    if (mine !== seq || inputEl.value !== query) return null; // a newer search replaced this one
    shown = { query, results };
    if (!results.length) {
      resultsEl.innerHTML = `<div class="search-result-empty">No US towns found for "${escapeText(query)}"</div>`;
      return results;
    }
    resultsEl.innerHTML = results.map((m, i) =>
      `<button type="button" class="search-result-item" data-idx="${i}">${escapeText(m.name)}</button>`
    ).join("") + (results.more
      ? `<div class="search-result-empty">Not there? Add the state, like "${escapeText(query.trim())}, OH".</div>` : "");
    [...resultsEl.querySelectorAll(".search-result-item")].forEach((btn, i) => {
      btn.addEventListener("click", () => choose(results[i]));
    });
    return results;
  }

  inputEl.addEventListener("input", () => {
    dirty = true;
    clearTimeout(debounceTimer);
    const query = inputEl.value;
    if (query.trim().length < 2) { seq++; shown = { query: null, results: [] }; resultsEl.innerHTML = ""; return; }
    debounceTimer = setTimeout(() => search(query), 350);
  });
  inputEl.addEventListener("keydown", async (e) => {
    if (e.key === "Escape") { resultsEl.innerHTML = ""; return; }
    if (e.key !== "Enter" || !dirty) return;   // nothing typed since the last pick: let the form submit
    const query = inputEl.value;
    if (query.trim().length < 2) return;
    e.preventDefault();
    if (shown.query === query && shown.results.length) { choose(shown.results[0]); return; }
    clearTimeout(debounceTimer);
    const results = await search(query);
    if (results && results.length && inputEl.value === query) choose(results[0]);
  });
}
