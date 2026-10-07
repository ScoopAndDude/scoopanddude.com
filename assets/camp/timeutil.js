// Time-zone-safe date helpers.
//
// Rule of thumb for this site: every date or time we show belongs to the
// PLACE being described (the selected town, city, or checkpoint), never to
// the visitor's own clock. A London forecast shows London's days; a Denver
// checkpoint shows Denver's time.

const LOCAL_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; }
})();

function validTimeZone(tz) {
  if (!tz) return null;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch (e) { return null; }
}

// Indiana's 12 Central-time counties, by NWS county code. The NWS lists La Porte
// County (INC091) as Eastern time, which is wrong: it keeps Central time like the rest.
const CENTRAL_TIME_INDIANA_COUNTIES = [
  "INC051", // Gibson
  "INC073", // Jasper
  "INC089", // Lake
  "INC091", // La Porte
  "INC111", // Newton
  "INC123", // Perry
  "INC127", // Porter
  "INC129", // Posey
  "INC147", // Spencer
  "INC149", // Starke
  "INC163", // Vanderburgh
  "INC173", // Warrick
];

/** The time zone for an NWS point (the properties of /points/lat,lon), with the NWS's
 * known mistakes fixed. Null when the NWS didn't say. */
function nwsPointTimeZone(props) {
  const p = props || {};
  const county = String(p.county || "").split("/").pop();
  if (CENTRAL_TIME_INDIANA_COUNTIES.indexOf(county) >= 0) return "America/Chicago";
  return validTimeZone(p.timeZone);
}

/**
 * NWS forecast wording spells out clock times ("Patchy fog before 8am", "after 1am") in
 * the time zone the NWS has on file for the point. Where that zone is wrong (Indiana's
 * Central-time counties are filed as Eastern), every one of those times reads an hour
 * late. This moves the times in one period's wording into the place's real zone.
 * `when` is the period's startTime; nwsTz is the NWS's zone, realTz the place's.
 */
function nwsTextInZone(text, when, nwsTz, realTz) {
  const s = String(text == null ? "" : text);
  const from = validTimeZone(nwsTz);
  const to = validTimeZone(realTz);
  const d = when instanceof Date ? when : new Date(when);
  if (!s || !from || !to || from === to || isNaN(d)) return s;
  const shift = tzOffsetMinutes(d, to) - tzOffsetMinutes(d, from);
  if (!shift) return s;
  return s.replace(/\b(?:(1[0-2]|[1-9])(?::([0-5]\d))?\s?(am|pm)|(noon|midnight))\b/gi, (m, h, mm, ap, word) => {
    let mins = word
      ? (word.toLowerCase() === "noon" ? 720 : 0)
      : ((Number(h) % 12) + (ap.toLowerCase() === "pm" ? 12 : 0)) * 60 + Number(mm || 0);
    mins = (((mins + shift) % 1440) + 1440) % 1440;
    const hh = Math.floor(mins / 60);
    const mn = mins % 60;
    const out = mins === 0 ? "midnight" : mins === 720 ? "noon"
      : `${hh % 12 || 12}${mn ? ":" + String(mn).padStart(2, "0") : ""}${hh < 12 ? "am" : "pm"}`;
    return /^[A-Z]/.test(m) ? out.charAt(0).toUpperCase() + out.slice(1) : out;
  });
}

/** NWS forecast periods with the clock times in their wording moved into the place's real
 * time zone (see nwsTextInZone). `props` is the NWS point's properties (/points/lat,lon). */
function nwsPeriodsInZone(periods, props) {
  const list = Array.isArray(periods) ? periods : [];
  const p = props || {};
  const nwsTz = validTimeZone(p.timeZone);
  const realTz = nwsPointTimeZone(p);
  if (!nwsTz || !realTz || nwsTz === realTz) return list;
  const fix = (v, when) => (typeof v === "string" ? nwsTextInZone(v, when, nwsTz, realTz) : v);
  return list.map((per) => Object.assign({}, per, {
    shortForecast: fix(per.shortForecast, per.startTime),
    detailedForecast: fix(per.detailedForecast, per.startTime),
  }));
}

/** Format an instant (Date or ISO string with offset) in a place's time zone. */
function fmtInZone(when, tz, opts) {
  const d = when instanceof Date ? when : new Date(when);
  if (isNaN(d)) return "";
  const zone = validTimeZone(tz) || LOCAL_TZ;
  return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: zone }, opts)).format(d);
}

function fmtClock(when, tz) {
  return fmtInZone(when, tz, { hour: "numeric", minute: "2-digit" });
}

function fmtHour(when, tz) {
  return fmtInZone(when, tz, { hour: "numeric" });
}

/** Short zone label for a place, e.g. "CDT" or "GMT+1". */
function zoneAbbrev(when, tz) {
  const d = when instanceof Date ? when : new Date(when);
  const zone = validTimeZone(tz) || LOCAL_TZ;
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
      .formatToParts(d).find((p) => p.type === "timeZoneName");
    return part ? part.value : "";
  } catch (e) { return ""; }
}

/** Calendar date ("YYYY-MM-DD") of an instant as seen in a place's time zone. */
function ymdInZone(when, tz) {
  const d = when instanceof Date ? when : new Date(when);
  const zone = validTimeZone(tz) || LOCAL_TZ;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Treat a plain "YYYY-MM-DD" as a calendar date (never shift it through a time zone). */
function ymdToUTCDate(ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
}

function addDaysYmd(ymd, n) {
  const d = ymdToUTCDate(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekdayOfYmd(ymd, style) {
  return ymdToUTCDate(ymd).toLocaleDateString("en-US", { weekday: style || "short", timeZone: "UTC" });
}

function monthDayOfYmd(ymd) {
  return ymdToUTCDate(ymd).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function longDateOfYmd(ymd) {
  return ymdToUTCDate(ymd).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Today", "Tomorrow", or a weekday name, relative to the place's own today. */
function dayLabel(ymd, todayYmd, style) {
  if (ymd === todayYmd) return "Today";
  if (ymd === addDaysYmd(todayYmd, 1)) return "Tomorrow";
  return weekdayOfYmd(ymd, style);
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Accepts "example.com" or "http(s)://..." and returns a safe https/http URL, or "". */
function safeUrl(u) {
  if (!u) return "";
  let s = String(u).trim().split(/[;\s]/)[0];
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  try {
    const url = new URL(s);
    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch (e) { return ""; }
}

/**
 * Fetch JSON, but give up after `ms` milliseconds (default 15 s) so a hung
 * request can never leave a page stuck on "Checking...". Errors carry
 * `.status` (HTTP code) or `.timeout` so callers can say what went wrong.
 */
async function fetchJson(url, opts, ms) {
  const limit = ms || 15000;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), limit) : null;
  try {
    const res = await fetch(url, Object.assign({}, opts || {}, ctrl ? { signal: ctrl.signal } : {}));
    if (!res.ok) {
      const err = new Error(`Request failed (${res.status}): ${url}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } catch (e) {
    if (e && e.name === "AbortError") {
      const err = new Error(`No answer after ${Math.round(limit / 1000)} seconds: ${url}`);
      err.timeout = true;
      throw err;
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Minutes a time zone is ahead of UTC at a given instant (e.g. -300 for CDT). */
function tzOffsetMinutes(date, tz) {
  const zone = validTimeZone(tz) || LOCAL_TZ;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t) => Number((parts.find((p) => p.type === t) || {}).value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** The instant when the clock in `tz` reads `ymd` at `hour`:00 (e.g. 8 AM in Denver). */
function zonedDateTime(ymd, hour, tz) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hour || 0, 0, 0);
  let guess = wall;
  for (let i = 0; i < 3; i++) guess = wall - tzOffsetMinutes(new Date(guess), tz) * 60000;
  return new Date(guess);
}
