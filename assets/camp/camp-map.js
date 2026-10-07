// Scoop & Dude camp map (scoopanddude.com/camp-map/): a copy of La Porte Weather Now's camp map script, Oct. 7, 2026.
// Camp map: free campsites, rest/service areas, dog parks, and springs from OpenStreetMap.
// Campsites a mapper has tagged free (fee=no) always list first; every result
// links to its map source and to a place to check the overnight rules.
// The extras for travelers (Oct. 1, 2026) load only when their button is on and list separately:
// springs & water (with a water-safety note), dump stations, showers, laundry & library Wi-Fi,
// and propane & truck stops. This week's official gas and diesel average shows for the area too.

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];
const PAGE_SIZE = 25;
const COLORS = { free: "#2f7d4f", unknown: "#e8963d", paid: "#8a8a8a", rest: "#3a6ea5", dogpark: "#8e44ad", spring: "#0e9aa7", hot: "#d6336c", stops: "#6d4c41", fuel: "#37474f" };
const EXTRA_PAGE = 15;
// Each extra is one map search inside a box around the map's center (much faster than a radius
// search for common things like springs); anything in the box's corners beyond the radius is dropped.
const EXTRAS = {
  spring: {
    list: "springList", title: "&#128167; Springs &amp; water",
    query: () => `node["natural"="spring"]["name"];
  node["natural"="spring"]["drinking_water"];
  nwr["natural"="hot_spring"];
  nwr["amenity"="public_bath"]["bath:type"="hot_spring"];
  nwr["amenity"="water_point"];`,
    note: `<strong>Before you fill up or soak:</strong> spring water isn&rsquo;t tested, and clear, cold water can still carry germs. Boiling is the surest way to make it safe. Hot springs can be scalding, so test the water first, and always keep your head above water in hot springs. Many springs are on private land or have posted rules, so check access before you go. <span class="src">Sources: <a href="https://wwwnc.cdc.gov/travel/page/water-disinfection" target="_blank" rel="noopener">CDC: making water safe</a> &middot; <a href="https://www.cdc.gov/naegleria/prevention/swimming.html" target="_blank" rel="noopener">CDC: hot springs</a></span>`,
  },
  stops: {
    list: "stopsList", title: "&#128656; Dump stations, showers, laundry &amp; Wi-Fi",
    query: () => `nwr["amenity"="sanitary_dump_station"];
  nwr["amenity"="shower"];
  nwr["shop"="laundry"];
  nwr["amenity"="library"];`,
    note: `<strong>Call ahead:</strong> hours and fees change, and some showers and dump stations are only for paying campers or customers. Most public libraries have free Wi-Fi and a place to charge; ask about time limits.`,
  },
  fuel: {
    list: "fuelList", title: "&#9981; Propane &amp; truck stops",
    query: () => `nwr["shop"="gas"];
  nwr["amenity"="fuel"]["hgv"="yes"];
  nwr["amenity"="fuel"]["fuel:lpg"="yes"];
  nwr["amenity"="fuel"]["fuel:propane"="yes"];`,
    note: `<strong>Propane and big-rig fuel:</strong> refill hours vary, so call ahead. Truck stops are listed when a mapper marked them for big trucks; many also have showers, laundry and overnight parking.`,
  },
};

const state = {
  center: null,          // {name, lat, lon}
  radius: 80000,
  places: [],            // normalized results for the current center/radius
  fee: "all",            // all | free | nopaid
  dog: "any",            // any | yes
  types: { camp: true, rest: true, dogpark: false, private: false, spring: true, stops: false, fuel: false },   // springs on by default (a request from a van-life group)
  shown: PAGE_SIZE,
  extras: { spring: "off", stops: "off", fuel: "off" },   // off | loading | ready | failed (for the current center and radius)
  extraShown: { spring: EXTRA_PAGE, stops: EXTRA_PAGE, fuel: EXTRA_PAGE },
  cache: new Map(),
};

let map, markerLayer;
const markers = new Map();

function initMap(lat, lon) {
  // Drawn on a canvas: hundreds of places near a big public-land area stay smooth on phones.
  map = L.map("campMap", { scrollWheelZoom: false, preferCanvas: true }).setView([lat, lon], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

async function fetchOverpass(query) {
  let lastError;
  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      // The query gives the server 25 s, so the browser waits a little longer than that.
      const data = await fetchJson(endpoint, { method: "POST", body: "data=" + encodeURIComponent(query), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 32000);
      // A busy server can answer "200 OK" with a timeout note and no results. That's a failure, not "nothing here".
      if (data && data.remark && /runtime error|timed out|out of memory|too many/i.test(data.remark)) throw new Error(`${endpoint}: ${data.remark}`);
      return data;
    } catch (err) {
      lastError = err;
      console.warn(`Overpass mirror failed, trying next: ${endpoint}`, err);
    }
  }
  throw lastError || new Error("All Overpass mirrors failed");
}

// ---------- map squares (Oct. 1, 2026) ----------
// A weekly job saves everything this page shows for the whole U.S. as small files, one per 1-degree
// square and layer (main, spring, stops, fuel). GitHub Pages serves them, with raw.githubusercontent.com
// as the backup copy. The page reads only the squares around the town on screen, so results show in
// about a second, even when the volunteer Overpass servers are busy. Outside the U.S. data, or if
// neither copy can be read, the page asks Overpass directly, as before.
const TILE_HOSTS = [
  "https://scoopanddude.github.io/laporteweathernow-posts/tiles",
  "https://raw.githubusercontent.com/ScoopAndDude/laporteweathernow-posts/main/tiles",
];
const TILE_TYPES = { n: "node", w: "way", r: "relation" };
let tileIndexJob = null;
const tileCache = new Map();
async function readTileIndex() {
  let lastErr;
  for (let i = 0; i < TILE_HOSTS.length; i++) {
    try {
      const d = await fetchJson(`${TILE_HOSTS[i]}/index.json`, { cache: "no-cache" }, 8000);
      if (!d || !d.tiles || !d.tiles.main) throw new Error("No map squares yet");
      d.host = i;
      d.cover = new Set(d.cover || []);
      d.have = {};
      Object.keys(d.tiles).forEach((k) => { d.have[k] = new Set(d.tiles[k]); });
      return d;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
function tileIndex() {
  if (!tileIndexJob) {
    tileIndexJob = readTileIndex();
    tileIndexJob.catch(() => { tileIndexJob = null; });   // try again on the next search
  }
  return tileIndexJob;
}
/** One square: from the copy the index came from, then the other copy. */
async function fetchTile(idx, path) {
  const order = [idx.host].concat(TILE_HOSTS.map((_, i) => i).filter((i) => i !== idx.host));
  let lastErr;
  for (const i of order) {
    try {
      return await fetchJson(`${TILE_HOSTS[i]}/${path}`, {}, 12000);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
async function tileElements(layer, lat, lon, R) {
  const idx = await tileIndex();
  // Canada, Mexico or open water: the saved squares only cover the U.S., so ask Overpass instead.
  if (idx.cover.size && !idx.cover.has(`${Math.floor(lat)}_${Math.floor(lon)}`)) throw new Error("Outside the saved U.S. map squares");
  const have = idx.have[layer] || new Set();
  const dLat = R / 111320, dLon = R / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
  const keys = [];
  for (let a = Math.floor(lat - dLat); a <= Math.floor(lat + dLat); a++) {
    for (let b = Math.floor(lon - dLon); b <= Math.floor(lon + dLon); b++) if (have.has(`${a}_${b}`)) keys.push(`${a}_${b}`);
  }
  const lists = await Promise.all(keys.map((k) => {
    const id = `${layer}/${k}`;
    if (!tileCache.has(id)) {
      const job = fetchTile(idx, `${id}.json`)
        .then((d) => (d.e || []).map((x) => ({ type: TILE_TYPES[x[0]] || "node", id: x[1], lat: x[2], lon: x[3], tags: x[4] || {} })));
      tileCache.set(id, job);
      job.catch(() => tileCache.delete(id));
    }
    return tileCache.get(id);
  }));
  return [].concat(...lists);
}
function mapDataNote(idx) {
  const d = idx && idx.built ? new Date(idx.built) : null;
  return d && !isNaN(d) ? ` Map data from OpenStreetMap, updated ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.` : "";
}

// ---------- helpers ----------
function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function compass(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * rad) * Math.cos(lat2 * rad);
  const x = Math.cos(lat1 * rad) * Math.sin(lat2 * rad) - Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad);
  const deg = (Math.atan2(y, x) / rad + 360) % 360;
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
}

function classify(el, center) {
  const t = el.tags || {};
  const lat = el.lat != null ? el.lat : el.center && el.center.lat;
  const lon = el.lon != null ? el.lon : el.center && el.center.lon;
  if (lat == null || lon == null) return null;

  let type, typeLabel, sub = null;
  if (t.leisure === "dog_park") { type = "dogpark"; typeLabel = "Dog park"; }
  else if (t.natural === "hot_spring" || t["bath:type"] === "hot_spring") { type = "spring"; sub = "hot"; typeLabel = "Hot spring"; }
  else if (t.natural === "spring") { type = "spring"; sub = "spring"; typeLabel = "Spring"; }
  else if (t.amenity === "water_point") { type = "spring"; sub = "fill"; typeLabel = "Water fill station"; }
  else if (t.highway === "rest_area") { type = "rest"; typeLabel = "Rest area"; }
  else if (t.highway === "services") { type = "rest"; typeLabel = "Service plaza"; }
  else if (!t.tourism && t.amenity === "sanitary_dump_station") { type = "stops"; sub = "dump"; typeLabel = "Dump station"; }
  else if (!t.tourism && t.amenity === "shower") { type = "stops"; sub = "shower"; typeLabel = "Shower"; }
  else if (!t.tourism && t.shop === "laundry") { type = "stops"; sub = "laundry"; typeLabel = "Laundromat"; }
  else if (!t.tourism && t.amenity === "library") { type = "stops"; sub = "library"; typeLabel = "Library"; }
  else if (!t.tourism && t.shop === "gas") { type = "fuel"; sub = "propane"; typeLabel = "Propane refill"; }
  else if (!t.tourism && t.amenity === "fuel") { type = "fuel"; sub = t.hgv === "yes" ? "truck" : "station"; typeLabel = t.hgv === "yes" ? "Truck stop" : "Fuel with propane"; }
  else if (t.tourism === "caravan_site") { type = "camp"; typeLabel = "RV park"; }
  else { type = "camp"; typeLabel = "Campsite"; }

  const access = (t.access || "").toLowerCase();
  const isPrivate = ["private", "no"].includes(access) || t.group_only === "yes" || t.camp_site === "private";

  let fee = null; // campsites, hot springs, dump stations and showers
  if (type === "camp" || sub === "hot" || sub === "dump" || sub === "shower") {
    const f = (t.fee || "").toLowerCase().trim();
    if (f === "no" || f === "0" || f === "free") fee = "free";
    else if (f) fee = "paid";
    else fee = "unknown";
  }
  const feeDetail = t.charge || (t.fee && !/^(yes|no)$/i.test(t.fee) ? t.fee : "");

  const d = (t.dog || "").toLowerCase();
  const dogs = d === "yes" || d === "leashed" || d === "unleashed" ? "yes" : d === "no" ? "no" : "unknown";

  const miles = distanceMiles(center.lat, center.lon, lat, lon);
  return {
    id: `${el.type}/${el.id}`, osmType: el.type, osmId: el.id, lat, lon, tags: t,
    name: t.name || `Unnamed ${typeLabel.toLowerCase()}`, named: !!t.name,
    type, typeLabel, sub, isPrivate, fee, feeDetail, dogs, dogTag: d,
    drink: (t.drinking_water || "").toLowerCase(),
    miles, dir: compass(center.lat, center.lon, lat, lon),
    website: safeUrl(t.website || t["contact:website"] || t.url || ""),
    phone: (t.phone || t["contact:phone"] || "").split(";")[0].trim(),
  };
}

function rank(p) {
  if (p.type === "camp") return p.fee === "free" ? 0 : p.fee === "unknown" ? 1 : 2;
  if (p.type === "rest") return 3;
  return 4;
}

function rulesLink(p) {
  if (p.type === "spring") {
    if (p.website) return { href: p.website, label: "Check access on the official site" };
    if (!p.named) return null;
    const q = `"${p.name}" ${p.tags["addr:state"] || ""} ${p.sub === "fill" ? "water fill" : "spring"} access`.replace(/\s+/g, " ").trim();
    return { href: `https://www.google.com/search?q=${encodeURIComponent(q)}`, label: "Check access and conditions (search)" };
  }
  if (p.type === "stops" || p.type === "fuel") {
    if (p.website) return { href: p.website, label: "Hours and fees on the official site" };
    if (!p.named) return null;
    const where = [p.tags["addr:city"], p.tags["addr:state"]].filter(Boolean).join(" ");
    const q = `"${p.name}" ${where} ${p.typeLabel.toLowerCase()} hours`.replace(/\s+/g, " ").trim();
    return { href: `https://www.google.com/search?q=${encodeURIComponent(q)}`, label: "Check hours (search)" };
  }
  if (p.website) return { href: p.website, label: "Check overnight rules on the official site" };
  if (!p.named) return null;
  const where = [p.tags["addr:city"], p.tags["addr:state"]].filter(Boolean).join(" ");
  const what = p.type === "rest" ? "overnight parking rules" : "camping rules fees";
  const q = `"${p.name}" ${where || (p.tags.operator || "")} ${what}`.replace(/\s+/g, " ").trim();
  return { href: `https://www.google.com/search?q=${encodeURIComponent(q)}`, label: "Check overnight rules (search)" };
}

function waterPill(p) {
  if (p.sub === "hot") {
    if (p.fee === "free") return `<span class="pill good">&#10003; Listed free to soak</span>`;
    if (p.fee === "paid") return `<span class="pill neutral">Fee to soak${p.feeDetail ? " &middot; " + escapeHtml(p.feeDetail) : ""}</span>`;
    return `<span class="pill warn">Fee and access unknown</span>`;
  }
  if (p.sub === "fill") return `<span class="pill good">&#128167; Water for tanks${p.tags.fee === "yes" ? " &middot; fee" : ""}</span>`;
  if (p.drink === "yes") return `<span class="pill good">Listed as drinkable &middot; boil it anyway</span>`;
  if (p.drink === "no") return `<span class="pill bad">Not for drinking</span>`;
  return `<span class="pill neutral">Drinkable? Not listed</span>`;
}
function stopPills(p) {
  const t = p.tags, out = [];
  const feeText = p.fee === "free" ? `<span class="pill good">&#10003; Listed free</span>` : p.fee === "paid" ? `<span class="pill neutral">Fee${p.feeDetail ? " &middot; " + escapeHtml(p.feeDetail) : ""}</span>` : `<span class="pill warn">Fee not listed</span>`;
  if (p.sub === "dump") { out.push(feeText); if (t.water_point === "yes" || t.drinking_water === "yes") out.push(`<span class="pill good">&#128167; Water too</span>`); }
  else if (p.sub === "shower") { out.push(feeText); if (t.hot_water === "yes") out.push(`<span class="pill good">Hot water</span>`); }
  else if (p.sub === "library") out.push(/^(wlan|yes|wifi)$/i.test(t.internet_access || "") ? `<span class="pill good">&#128246; Wi-Fi listed</span>` : `<span class="pill neutral">Wi-Fi not listed</span>`);
  else out.push(`<span class="pill neutral">Laundromat</span>`);
  if (t.opening_hours === "24/7") out.push(`<span class="pill good">Open 24 hours</span>`);
  return out.join("");
}
function fuelPills(p) {
  const t = p.tags, out = [];
  if (p.sub === "truck") out.push(`<span class="pill good">Truck stop</span>`);
  if (p.sub === "propane" || t["fuel:lpg"] === "yes" || t["fuel:propane"] === "yes") out.push(`<span class="pill good">Propane</span>`);
  if (t["fuel:diesel"] === "yes" || t["fuel:HGV_diesel"] === "yes") out.push(`<span class="pill neutral">Diesel</span>`);
  if (t["fuel:adblue"] === "yes") out.push(`<span class="pill neutral">DEF</span>`);
  if (t.shower === "yes" || t.showers === "yes") out.push(`<span class="pill neutral">Showers</span>`);
  if (t.opening_hours === "24/7") out.push(`<span class="pill good">Open 24 hours</span>`);
  return out.join("");
}
function feePill(p) {
  if (p.type === "spring") return waterPill(p);
  if (p.type === "stops") return stopPills(p);
  if (p.type === "fuel") return fuelPills(p);
  if (p.type === "rest") return `<span class="pill neutral">Free to stop &middot; overnight rules vary</span>`;
  if (p.type === "dogpark") return `<span class="pill neutral">Dog park</span>`;
  if (p.fee === "free") return `<span class="pill good">&#10003; Listed free</span>`;
  if (p.fee === "paid") return `<span class="pill neutral">Paid${p.feeDetail ? " &middot; " + escapeHtml(p.feeDetail) : ""}</span>`;
  return `<span class="pill warn">Fee unknown &middot; call ahead</span>`;
}
function dogPill(p) {
  if (EXTRAS[p.type]) return "";
  if (p.type === "dogpark") return `<span class="pill good">&#128021; Off-leash area</span>`;
  if (p.dogs === "yes") return `<span class="pill good">&#128021; Dogs ${p.dogTag === "leashed" ? "on leash" : "allowed"}</span>`;
  if (p.dogs === "no") return `<span class="pill bad">No dogs</span>`;
  return `<span class="pill neutral">Dog rules not listed</span>`;
}

// ---------- filtering + rendering ----------
function visible(p) {
  if (p.isPrivate && !state.types.private) return false;
  if (EXTRAS[p.type]) return state.types[p.type];   // the camping filters don't apply to water, stops or fuel
  if (!state.types[p.type]) return false;
  if (state.fee === "free" && !(p.type === "camp" && p.fee === "free")) return false;
  if (state.fee === "nopaid" && p.type === "camp" && p.fee === "paid") return false;
  if (state.dog === "yes" && !(p.dogs === "yes" || p.type === "dogpark")) return false;
  return true;
}

function updateCounts() {
  const base = state.places.filter((p) => !EXTRAS[p.type] && (!p.isPrivate || state.types.private) && state.types[p.type]);
  const camps = base.filter((p) => p.type === "camp");
  const set = (k, n) => document.querySelectorAll(`[data-count="${k}"]`).forEach((el) => { el.textContent = `(${n})`; });
  set("all", base.length);
  set("free", camps.filter((p) => p.fee === "free").length);
  set("nopaid", base.filter((p) => !(p.type === "camp" && p.fee === "paid")).length);
  set("dogs", base.filter((p) => p.dogs === "yes" || p.type === "dogpark").length);
}

function springPopup(p) {
  const rules = rulesLink(p);
  const drink = p.type === "stops" ? (p.tags.opening_hours ? "Hours: " + escapeHtml(p.tags.opening_hours) : "Call ahead for hours and fees.")
    : p.type === "fuel" ? (p.sub === "truck" ? "Truck stop." : "Propane.") + " Call ahead for hours."
    : p.sub === "hot" ? "Soak with care: test the temperature first, and keep your head above water."
    : p.sub === "fill" ? "Water fill station for tanks and jugs."
    : p.drink === "no" ? "Mapped as not drinkable." : "Boil spring water before you drink it.";
  return `<strong>${escapeHtml(p.name)}</strong><br/><em>${p.typeLabel}</em> &middot; ${p.miles.toFixed(0)} mi ${p.dir}<br/>${drink}<br/>
    ${rules ? `<a href="${escapeHtml(rules.href)}" target="_blank" rel="noopener">Check access &#8599;</a><br/>` : ""}
    <a href="https://www.openstreetmap.org/${p.osmType}/${p.osmId}" target="_blank" rel="noopener">Source: OpenStreetMap &#8599;</a>`;
}

function popupHtml(p) {
  if (EXTRAS[p.type]) return springPopup(p);
  const rules = rulesLink(p);
  return `<strong>${escapeHtml(p.name)}</strong><br/><em>${p.typeLabel}</em> &middot; ${p.miles.toFixed(0)} mi ${p.dir}<br/>
    ${p.type === "camp" ? (p.fee === "free" ? "Listed free on the map (fee=no)" : p.fee === "paid" ? "Paid" + (p.feeDetail ? ": " + escapeHtml(p.feeDetail) : "") : "Fee unknown &mdash; call ahead") + "<br/>" : ""}
    ${p.type === "dogpark" ? "Off-leash dog area" : p.dogs === "yes" ? "Tagged dog-friendly" : p.dogs === "no" ? "No dogs" : "No dog info on record"}<br/>
    ${rules ? `<a href="${escapeHtml(rules.href)}" target="_blank" rel="noopener">Check overnight rules &#8599;</a><br/>` : ""}
    <a href="https://www.openstreetmap.org/${p.osmType}/${p.osmId}" target="_blank" rel="noopener">Source: OpenStreetMap &#8599;</a>`;
}

function render() {
  const all = state.places.filter(visible).sort((a, b) => rank(a) - rank(b) || a.miles - b.miles);
  const list = all.filter((p) => !EXTRAS[p.type]);
  const extras = {};
  Object.keys(EXTRAS).forEach((k) => { extras[k] = all.filter((p) => p.type === k).sort((a, b) => a.miles - b.miles); });
  updateCounts();

  markerLayer.clearLayers();
  markers.clear();
  // Extras can number in the hundreds near a city, so the map shows the closest 250 of each.
  const onMap = list.concat(...Object.keys(extras).map((k) => extras[k].slice(0, 250)));
  onMap.forEach((p) => {
    const color = p.type === "camp" ? COLORS[p.fee] : p.type === "spring" ? (p.sub === "hot" ? COLORS.hot : COLORS.spring) : COLORS[p.type];
    const m = L.circleMarker([p.lat, p.lon], {
      radius: p.fee === "free" ? 10 : 7, color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 0.95,
    }).bindPopup(popupHtml(p));
    m.addTo(markerLayer);
    markers.set(p.id, m);
  });

  const status = document.getElementById("mapStatus");
  status.classList.remove("loading-text");
  const camps = state.places.filter((p) => p.type === "camp" && (!p.isPrivate || state.types.private));
  const free = camps.filter((p) => p.fee === "free").length;
  const unknown = camps.filter((p) => p.fee === "unknown").length;
  const paid = camps.filter((p) => p.fee === "paid").length;
  const rests = state.places.filter((p) => p.type === "rest").length;
  const dogparks = state.places.filter((p) => p.type === "dogpark").length;
  const NOUNS = { spring: ["spring or water stop", "springs and water stops"], stops: ["dump, shower, laundry or library stop", "dump, shower, laundry and library stops"], fuel: ["propane or truck stop", "propane and truck stops"] };
  const springText = Object.keys(EXTRAS).filter((k) => state.types[k]).map((k) => {
    if (state.extras[k] === "loading" || state.extras[k] === "off") return ` Looking for ${NOUNS[k][1]}…`;
    if (state.extras[k] === "failed") return ` The ${NOUNS[k][1]} couldn't load just now.`;
    const n = extras[k].length;
    return ` ${n} ${NOUNS[k][n === 1 ? 0 : 1]}.`;
  }).join("") + (Object.keys(EXTRAS).some((k) => state.types[k]) ? " (Listed below the campsites.)" : "");
  const hiddenPrivate = state.types.private ? 0 : state.places.filter((p) => p.isPrivate).length;
  status.textContent = `Within ${radiusMiles()} mi of ${state.center.name}: ${camps.length} campsite${camps.length === 1 ? "" : "s"} (${free} listed free, ${unknown} fee unknown, ${paid} paid), ${rests} rest/service area${rests === 1 ? "" : "s"}, ${dogparks} dog park${dogparks === 1 ? "" : "s"}. Showing ${list.length}.` + springText + (state.dataNote || "") + (hiddenPrivate ? ` ${hiddenPrivate} private or group-only site${hiddenPrivate === 1 ? " is" : "s are"} hidden.` : "");

  const note = document.getElementById("freeNote");
  if (state.types.camp && free === 0 && camps.length) {
    note.innerHTML = `<div class="notice" style="margin-top:16px;"><strong>No campsites here are marked free on the map yet.</strong> That usually means nobody has recorded the fee, not that none are free. The sites below are sorted closest first. Call ahead, or check the private-host options further down.</div>`;
  } else note.innerHTML = "";

  Object.keys(EXTRAS).forEach((k) => renderExtra(k, extras[k]));
  showFuelPrice();
  const box = document.getElementById("resultList");
  if (!list.length) {
    box.innerHTML = Object.keys(EXTRAS).some((k) => state.types[k]) && !state.types.camp && !state.types.rest && !state.types.dogpark ? ""
      : `<div class="notice">Nothing matches these filters. Try "All, free first", a wider radius, or turn on more place types.</div>`;
    document.getElementById("showMore").hidden = true;
    return;
  }
  box.innerHTML = list.slice(0, state.shown).map((p) => {
    const rules = rulesLink(p);
    const facts = [
      p.tags.operator ? `Run by ${escapeHtml(p.tags.operator)}` : "",
      p.tags.tents === "yes" ? "Tents OK" : "",
      p.tags.caravans === "yes" || p.tags.motorhome === "yes" ? "RVs OK" : "",
      p.tags.toilets === "yes" ? "Toilets" : "",
      p.tags.drinking_water === "yes" ? "Drinking water" : "",
      p.isPrivate ? "Private or group-only" : "",
    ].filter(Boolean).join(" &middot; ");
    return `<article class="result-card ${p.type === "camp" ? p.fee : ""}" data-id="${p.id}">
      <div class="result-head">
        <h3><button type="button" data-focus="${p.id}">${escapeHtml(p.name)}</button></h3>
        <span class="result-meta">${p.typeLabel} &middot; ${p.miles.toFixed(0)} mi ${p.dir} of ${escapeHtml(state.center.name)}</span>
      </div>
      <div class="result-badges">${feePill(p)}${dogPill(p)}</div>
      ${facts ? `<div class="result-meta">${facts}</div>` : ""}
      <div class="result-links">
        ${rules ? `<a class="rules" href="${escapeHtml(rules.href)}" target="_blank" rel="noopener" data-track="camp-open-rules">${rules.label} &#8599;</a>` : `<span class="result-meta">No name on the map &mdash; ask locally before staying.</span>`}
        ${p.phone ? `<a href="tel:${escapeHtml(p.phone.replace(/[^+\d]/g, ""))}" data-track="camp-call">Call ${escapeHtml(p.phone)}</a>` : ""}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(5)},${p.lon.toFixed(5)}" target="_blank" rel="noopener" data-track="camp-open-directions">Directions &#8599;</a>
        <a href="https://www.openstreetmap.org/${p.osmType}/${p.osmId}" target="_blank" rel="noopener" data-track="camp-open-source">Source: OpenStreetMap &#8599;</a>
      </div>
    </article>`;
  }).join("");
  const more = document.getElementById("showMore");
  more.hidden = list.length <= state.shown;
  more.textContent = `Show more results (${list.length - state.shown} more)`;
}

// ---------- extras for travelers: springs & water, van stops, propane & truck stops (Oct. 1, 2026) ----------
function extraCard(p) {
  const rules = rulesLink(p);
  const t = p.tags;
  const facts = [
    t.brand && t.brand !== p.name ? escapeHtml(t.brand) : "",
    t.operator && t.operator !== p.name ? `Run by ${escapeHtml(t.operator)}` : "",
    t.seasonal === "yes" ? "Seasonal" : "",
    t.opening_hours && t.opening_hours !== "24/7" ? `Hours: ${escapeHtml(t.opening_hours)}` : "",
    p.isPrivate ? "Private" : "",
  ].filter(Boolean).join(" &middot; ");
  const about = String(t.description || t.note || "").trim();
  return `<article class="result-card extra ${p.type} ${p.sub || ""}" data-id="${p.id}">
      <div class="result-head">
        <h3><button type="button" data-focus="${p.id}">${escapeHtml(p.name)}</button></h3>
        <span class="result-meta">${p.typeLabel} &middot; ${p.miles.toFixed(0)} mi ${p.dir} of ${escapeHtml(state.center.name)}</span>
      </div>
      <div class="result-badges">${feePill(p)}</div>
      ${facts ? `<div class="result-meta">${facts}</div>` : ""}
      ${about ? `<div class="result-meta">${escapeHtml(about.length > 200 ? about.slice(0, 197) + "…" : about)}</div>` : ""}
      <div class="result-links">
        ${rules ? `<a class="rules" href="${escapeHtml(rules.href)}" target="_blank" rel="noopener" data-track="${p.type}-open-info">${rules.label} &#8599;</a>` : `<span class="result-meta">No name on the map. Ask locally before you go.</span>`}
        ${p.phone ? `<a href="tel:${escapeHtml(p.phone.replace(/[^+\d]/g, ""))}" data-track="${p.type}-call">Call ${escapeHtml(p.phone)}</a>` : ""}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(5)},${p.lon.toFixed(5)}" target="_blank" rel="noopener" data-track="${p.type}-open-directions">Directions &#8599;</a>
        <a href="https://www.openstreetmap.org/${p.osmType}/${p.osmId}" target="_blank" rel="noopener" data-track="${p.type}-open-source">Source: OpenStreetMap &#8599;</a>
      </div>
    </article>`;
}

function extraSummary(kind, items) {
  const count = (sub) => items.filter((p) => p.sub === sub).length;
  const part = (n, one, many) => (n ? `${n} ${n === 1 ? one : many}` : "");
  if (kind === "spring") return [part(count("spring"), "spring", "springs"), part(count("hot"), "hot spring", "hot springs"), part(count("fill"), "water fill station", "water fill stations")];
  if (kind === "stops") return [part(count("dump"), "dump station", "dump stations"), part(count("shower"), "shower", "showers"), part(count("laundry"), "laundromat", "laundromats"), part(count("library"), "library", "libraries")];
  return [part(count("truck"), "truck stop", "truck stops"), part(count("propane") + count("station"), "propane stop", "propane stops")];
}

function renderExtra(kind, items) {
  const cfg = EXTRAS[kind];
  const box = document.getElementById(cfg.list);
  if (!box) return;
  if (!state.types[kind]) { box.innerHTML = ""; return; }
  const head = `<h2 class="extra-head">${cfg.title} near ${escapeHtml(state.center.name)}</h2>`;
  const note = `<div class="extra-note ${kind}">${cfg.note}</div>`;
  const st = state.extras[kind];
  if (st === "loading" || st === "off") { box.innerHTML = head + `<p class="loading-text">Searching the map within ${radiusMiles()} mi&hellip;</p>`; return; }
  if (st === "failed") { box.innerHTML = head + `<div class="notice">Couldn&rsquo;t load these right now (OpenStreetMap&rsquo;s servers may be busy). Try again in a minute: turn the button off and on.</div>`; return; }
  if (!items.length) { box.innerHTML = head + note + `<div class="notice">None are on the map within ${radiusMiles()} mi of ${escapeHtml(state.center.name)}. Try a wider radius.</div>`; return; }
  const shown = state.extraShown[kind];
  const summary = extraSummary(kind, items).filter(Boolean).join(", ");
  box.innerHTML = head + `<p class="result-meta extra-sum">${summary} within ${radiusMiles()} mi, closest first.</p>` + note +
    `<div class="result-list">${items.slice(0, shown).map(extraCard).join("")}</div>` +
    (items.length > shown ? `<div class="more-row"><button type="button" class="btn btn-dark" data-more-extra="${kind}">Show more (${items.length - shown} more)</button></div>` : "");
}

const extraSeq = { spring: 0, stops: 0, fuel: 0 };
async function loadExtra(kind) {
  const mine = ++extraSeq[kind], forLoad = loadSeq;
  const { lat, lon } = state.center;
  const R = state.radius;
  const key = `${kind}|${lat.toFixed(3)},${lon.toFixed(3)},${R}`;
  state.extras[kind] = "loading";
  render();
  try {
    let elements = state.cache.get(key);
    if (!elements) {
      try {
        elements = await tileElements(kind, lat, lon, R);
      } catch (e) {
        console.warn("Map squares unavailable; asking OpenStreetMap directly", e);
        const dLat = R / 111320, dLon = R / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
        const box = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((x) => x.toFixed(4)).join(",");
        const query = `[out:json][timeout:25][bbox:${box}];
(
  ${EXTRAS[kind].query()}
);
out tags center 2000;`;
        const data = await fetchOverpass(query);
        elements = data.elements || [];
      }
      state.cache.set(key, elements);
    }
    if (mine !== extraSeq[kind] || forLoad !== loadSeq) return;
    const have = new Set(state.places.map((p) => p.id));
    const maxMiles = R / 1609.34;
    elements.forEach((el) => {
      const p = classify(el, state.center);
      if (p && p.type === kind && p.miles <= maxMiles && !have.has(p.id)) { have.add(p.id); state.places.push(p); }
    });
    state.extras[kind] = "ready";
    render();
    if (typeof lpwnTrack === "function") lpwnTrack(`camp-${kind}-search`, `${radiusMiles()} mi`);
  } catch (err) {
    if (mine !== extraSeq[kind] || forLoad !== loadSeq) return;
    console.warn(`${kind} didn't load`, err);
    state.extras[kind] = "failed";
    render();
  }
}

// ---------- this week's official gas and diesel average for the map's area (EIA, saved weekly) ----------
const PADD = {
  CT: "PADD1A", ME: "PADD1A", MA: "PADD1A", NH: "PADD1A", RI: "PADD1A", VT: "PADD1A",
  DE: "PADD1B", DC: "PADD1B", MD: "PADD1B", NJ: "PADD1B", NY: "PADD1B", PA: "PADD1B",
  FL: "PADD1C", GA: "PADD1C", NC: "PADD1C", SC: "PADD1C", VA: "PADD1C", WV: "PADD1C",
  IL: "PADD2", IN: "PADD2", IA: "PADD2", KS: "PADD2", KY: "PADD2", MI: "PADD2", MN: "PADD2", MO: "PADD2",
  NE: "PADD2", ND: "PADD2", SD: "PADD2", OH: "PADD2", OK: "PADD2", TN: "PADD2", WI: "PADD2",
  AL: "PADD3", AR: "PADD3", LA: "PADD3", MS: "PADD3", NM: "PADD3", TX: "PADD3",
  CO: "PADD4", ID: "PADD4", MT: "PADD4", UT: "PADD4", WY: "PADD4",
  AK: "PADD5XCA", AZ: "PADD5XCA", HI: "PADD5XCA", NV: "PADD5XCA", OR: "PADD5XCA", WA: "PADD5XCA", CA: "CA",
};
const PADD_NAMES = { PADD1A: "New England", PADD1B: "Central Atlantic", PADD1C: "Lower Atlantic", PADD2: "Midwest", PADD3: "Gulf Coast",
  PADD4: "Rocky Mountain", PADD5XCA: "West Coast outside California", CA: "California", US: "U.S." };
let fuelData = null, fuelTried = false;
const stateOfPlace = new Map();
function loadFuelPrices() {
  if (fuelTried) return;
  fuelTried = true;
  const url = "https://scoopanddude.github.io/laporteweathernow-posts/fuel-prices.json";
  fetchJson(url, { cache: "no-cache" }, 10000)
    .catch(() => fetchJson("https://raw.githubusercontent.com/ScoopAndDude/laporteweathernow-posts/main/fuel-prices.json", { cache: "no-cache" }, 10000))
    .then((d) => { if (d && d.regular && d.regular.US) { fuelData = d; showFuelPrice(); } })
    .catch(() => { /* no prices this time; the bar stays hidden */ });
}
function centerState() {
  const c = state.center;
  const m = /,\s*([A-Z]{2})(?:\s|$|\))/.exec(c.name || "") || /,\s*([A-Z]{2})$/.exec(c.name || "");
  if (m && PADD[m[1]]) return m[1];
  const key = `${c.lat.toFixed(2)},${c.lon.toFixed(2)}`;
  if (stateOfPlace.has(key)) return stateOfPlace.get(key);
  stateOfPlace.set(key, null);
  if (typeof nwsGet === "function") {
    nwsGet(`https://api.weather.gov/points/${c.lat.toFixed(4)},${c.lon.toFixed(4)}`, 8000).then((pt) => {
      const rel = pt.properties && pt.properties.relativeLocation && pt.properties.relativeLocation.properties;
      if (rel && PADD[rel.state]) { stateOfPlace.set(key, rel.state); showFuelPrice(); }
    }).catch(() => {});
  }
  return null;
}
function showFuelPrice() {
  const bar = document.getElementById("fuelBar");
  if (!bar) return;
  if (!fuelData) { bar.hidden = true; return; }
  const st = centerState();
  const region = st ? PADD[st] : "US";
  const ownState = st && fuelData.regular[st] && st !== "CA";
  const gas = ownState ? fuelData.regular[st] : fuelData.regular[region] || fuelData.regular.US;
  const gasWhere = ownState ? STATE_NAMES_SHORT(st) : PADD_NAMES[fuelData.regular[region] ? region : "US"];
  const diesel = fuelData.diesel[region] || fuelData.diesel.US;
  const dieselWhere = PADD_NAMES[fuelData.diesel[region] ? region : "US"];
  const money = (x) => `$${Number(x).toFixed(2)}`;
  const trend = (x) => (x && x.weekAgo ? (x.price > x.weekAgo + 0.005 ? " &#9650;" : x.price < x.weekAgo - 0.005 ? " &#9660;" : "") : "");
  const [y, mo, d] = String(fuelData.week).split("-").map(Number);
  const week = new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  bar.hidden = false;
  bar.innerHTML = `<strong>&#9981; Fuel this week:</strong> regular ${money(gas.price)}${trend(gas)} (${escapeHtml(gasWhere)} average) &middot; diesel ${money(diesel.price)}${trend(diesel)} (${escapeHtml(dieselWhere)} average). ` +
    `<span class="fuel-src">Official averages from the <a href="${escapeHtml(fuelData.sourceUrl || "https://www.eia.gov/petroleum/gasdiesel/")}" target="_blank" rel="noopener">U.S. Energy Information Administration</a> for the week of ${week}. Prices at the pump vary by station.</span>`;
}
function STATE_NAMES_SHORT(ab) {
  const names = { CO: "Colorado", FL: "Florida", MA: "Massachusetts", MN: "Minnesota", NY: "New York", OH: "Ohio", TX: "Texas", WA: "Washington" };
  return names[ab] || ab;
}

/** The radius as the menu shows it (25, 50, or 100 mi). */
function radiusMiles() {
  return Math.round(state.radius / 1609.34 / 5) * 5;
}

let loadSeq = 0;
async function load() {
  const mine = ++loadSeq;   // a slow earlier search must not overwrite a newer one
  const { lat, lon, name } = state.center;
  Object.keys(EXTRAS).forEach((k) => { state.extras[k] = "off"; state.extraShown[k] = EXTRA_PAGE; });
  const status = document.getElementById("mapStatus");
  status.classList.add("loading-text");
  status.textContent = `Loading places near ${name} from OpenStreetMap…`;
  document.getElementById("resultList").innerHTML = "";
  document.getElementById("freeNote").innerHTML = "";
  Object.keys(EXTRAS).forEach((k) => { const el = document.getElementById(EXTRAS[k].list); if (el) el.innerHTML = ""; });
  map.setView([lat, lon], state.radius > 100000 ? 7 : state.radius > 50000 ? 8 : 9);
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${state.radius}`;
  try {
    let elements = state.cache.get(key);
    if (!elements) {
      const R = state.radius;
      try {
        elements = await tileElements("main", lat, lon, R);
        state.dataNote = mapDataNote(await tileIndex());
      } catch (e) {
        console.warn("Map squares unavailable; asking OpenStreetMap directly", e);
        elements = null;
        state.dataNote = "";
      }
    }
    if (!elements) {
      const R = state.radius;
      const query = `[out:json][timeout:25];
(
  nwr["tourism"="camp_site"](around:${R},${lat},${lon});
  nwr["tourism"="caravan_site"](around:${R},${lat},${lon});
  nwr["highway"="rest_area"](around:${R},${lat},${lon});
  nwr["highway"="services"](around:${R},${lat},${lon});
  nwr["leisure"="dog_park"](around:${R},${lat},${lon});
);
out tags center;`;
      const data = await fetchOverpass(query);
      if (mine !== loadSeq) return;
      elements = data.elements || [];
      state.cache.set(key, elements);
    }
    if (mine !== loadSeq) return;
    const seen = new Set();
    const maxMiles = state.radius / 1609.34;
    state.places = elements.map((el) => classify(el, state.center)).filter((p) => p && p.miles <= maxMiles && !seen.has(p.id) && seen.add(p.id));
    state.shown = PAGE_SIZE;
    render();
    Object.keys(EXTRAS).forEach((k) => { if (state.types[k]) loadExtra(k); });
    const camps = state.places.filter((p) => p.type === "camp");
    if (typeof lpwnTrack === "function") lpwnTrack("camp-map-search", `${radiusMiles()} mi · ${camps.filter((p) => p.fee === "free").length ? "some listed free" : "none listed free"}`);
  } catch (err) {
    if (mine !== loadSeq) return;
    console.error(err);
    status.classList.remove("loading-text");
    status.textContent = "Couldn't load map data right now (OpenStreetMap's servers may be busy). Try again in a minute, or use the private-host links below.";
  }
}

// ---------- controls ----------
function setPressed(groupSel, attr, value) {
  document.querySelectorAll(`${groupSel} [${attr}]`).forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value)));
}

function wireControls() {
  document.querySelectorAll("#feeChips [data-fee]").forEach((b) => b.addEventListener("click", () => {
    state.fee = b.dataset.fee; state.shown = PAGE_SIZE; setPressed("#feeChips", "data-fee", state.fee); render();
    if (typeof lpwnTrack === "function") lpwnTrack("camp-filter-fee-" + state.fee);
  }));
  document.querySelectorAll("#dogChips [data-dog]").forEach((b) => b.addEventListener("click", () => {
    state.dog = b.dataset.dog; state.shown = PAGE_SIZE; setPressed("#dogChips", "data-dog", state.dog); render();
    if (typeof lpwnTrack === "function") lpwnTrack("camp-filter-dogs-" + state.dog);
  }));
  document.querySelectorAll("#typeChips [data-type]").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.type;
    state.types[t] = !state.types[t];
    b.setAttribute("aria-pressed", String(state.types[t]));
    state.shown = PAGE_SIZE;
    if (EXTRAS[t] && state.types[t] && (state.extras[t] === "off" || state.extras[t] === "failed")) loadExtra(t);
    else render();
    if (typeof lpwnTrack === "function") lpwnTrack("camp-filter-type-" + t + (state.types[t] ? "-on" : "-off"));
  }));
  document.getElementById("showMore").addEventListener("click", () => { state.shown += PAGE_SIZE; render(); });
  const onListClick = (e) => {
    const more = e.target.closest("[data-more-extra]");
    if (more) { state.extraShown[more.dataset.moreExtra] += EXTRA_PAGE; render(); return; }
    const btn = e.target.closest("[data-focus]");
    if (btn) {
      const m = markers.get(btn.dataset.focus);
      if (m) {
        map.setView(m.getLatLng(), Math.max(map.getZoom(), 11));
        m.openPopup();
        document.getElementById("campMap").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    const a = e.target.closest("a[data-track]");
    if (a && typeof lpwnTrack === "function") lpwnTrack(a.dataset.track);
  };
  document.getElementById("resultList").addEventListener("click", onListClick);
  Object.keys(EXTRAS).forEach((k) => { const el = document.getElementById(EXTRAS[k].list); if (el) el.addEventListener("click", onListClick); });
  document.getElementById("radiusSelect").addEventListener("change", (e) => { state.radius = Number(e.target.value); load(); });
  // Search any U.S. town by name (Oct. 1, 2026), with the same nationwide search as the homepage.
  const search = document.getElementById("campSearch");
  if (search && typeof wireLocationSearch === "function") {
    wireLocationSearch(search, document.getElementById("campSearchResults"), (m) => {
      customCenter = { name: m.name, lat: m.lat, lon: m.lon };
      addCustomOption(customCenter, m.name);
      state.center = customCenter;
      search.value = "";
      search.blur();
      // Put the town in the address so the page can be shared or bookmarked (towns only, never "Near me").
      try {
        const u = new URL(location.href);
        u.searchParams.set("lat", m.lat.toFixed(4)); u.searchParams.set("lon", m.lon.toFixed(4)); u.searchParams.set("name", m.name);
        history.replaceState(null, "", u);
      } catch (e) { /* the map still works */ }
      load();
    });
  }
  document.getElementById("mapLocationSelect").addEventListener("change", (e) => {
    const v = e.target.value;
    if (v === "__custom__") { state.center = customCenter; }
    else { const l = getLocationById(v); state.center = { name: l.name, lat: l.lat, lon: l.lon }; }
    load();
  });
  document.getElementById("nearMe").addEventListener("click", () => {
    const btn = document.getElementById("nearMe");
    if (!navigator.geolocation) { btn.textContent = "Location unavailable"; return; }
    btn.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition((pos) => {
      btn.innerHTML = "&#128205; Near me";
      customCenter = { name: "your location", lat: pos.coords.latitude, lon: pos.coords.longitude };
      addCustomOption(customCenter, "Your location");
      state.center = customCenter;
      load();
    }, () => { btn.innerHTML = "&#128205; Near me"; document.getElementById("mapStatus").textContent = "We couldn't get your location. Pick a town from the list instead."; },
    { timeout: 10000, maximumAge: 300000 });
  });
}

let customCenter = null;
function addCustomOption(center, label) {
  const sel = document.getElementById("mapLocationSelect");
  let opt = sel.querySelector('option[value="__custom__"]');
  if (!opt) { opt = document.createElement("option"); opt.value = "__custom__"; sel.insertBefore(opt, sel.firstChild); }
  opt.textContent = label || center.name;
  sel.value = "__custom__";
}

(function start() {
  const sel = document.getElementById("mapLocationSelect");
  const groups = groupLocationsByRegion();
  sel.innerHTML = Object.keys(groups).map((region) => `
    <optgroup label="${region}">
      ${groups[region].map((l) => `<option value="${l.id}">${l.name}</option>`).join("")}
    </optgroup>`).join("");

  // Where to start: ?lat=&lon=&name= (from the Trip Planner), else the visitor's town, else La Porte.
  const params = new URLSearchParams(location.search);
  const plat = Number(params.get("lat")), plon = Number(params.get("lon"));
  if (params.get("lat") && isFinite(plat) && isFinite(plon)) {
    customCenter = { name: params.get("name") || "your destination", lat: plat, lon: plon };
    addCustomOption(customCenter, customCenter.name);
    state.center = customCenter;
  } else {
    const cur = getCurrentLocation();
    if (!cur.id) {
      customCenter = { name: cur.name, lat: cur.lat, lon: cur.lon };
      addCustomOption(customCenter, `${cur.name} (your town)`);
      state.center = customCenter;
    } else {
      sel.value = cur.id;
      state.center = { name: cur.name, lat: cur.lat, lon: cur.lon };
    }
  }
  const r = Number(params.get("r"));
  if ([40000, 80000, 160000].includes(r)) { state.radius = r; document.getElementById("radiusSelect").value = String(r); }

  initMap(state.center.lat, state.center.lon);
  wireControls();
  load();
  loadFuelPrices();
})();
