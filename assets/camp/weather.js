// Live weather engine — pulls directly from api.weather.gov (NWS), free and
// keyless. NWS asks clients to identify themselves via a User-Agent header,
// but browsers block scripts from setting that header on fetch(); public
// GET endpoints still work without it.

const NWS_BASE = "https://api.weather.gov";

/** GET from api.weather.gov with a time limit (default 15 s). Errors keep
 * `.status` (404 = NWS has no data for that spot) and `.timeout`. */
async function nwsGet(url, ms) {
  try {
    return await fetchJson(url, { headers: { Accept: "application/geo+json" } }, ms || 15000);
  } catch (e) {
    const err = new Error(e.timeout ? `NWS didn't answer in time: ${url}` : e.status ? `NWS request failed (${e.status}): ${url}` : `Couldn't reach NWS: ${url}`);
    err.status = e.status;
    err.timeout = !!e.timeout;
    throw err;
  }
}

function cToF(c) {
  if (c === null || c === undefined) return null;
  return Math.round((c * 9) / 5 + 32);
}

function mpsToMph(mps) {
  if (mps === null || mps === undefined) return null;
  return Math.round(mps * 2.237);
}

/** NWS observations report wind in km/h ("wmoUnit:km_h-1"); older code assumed m/s. */
function windToMph(q) {
  if (!q || q.value === null || q.value === undefined) return null;
  const unit = q.unitCode || "";
  if (/km_h/.test(unit)) return Math.round(q.value * 0.621371);
  if (/m_s/.test(unit)) return Math.round(q.value * 2.237);
  return Math.round(q.value);
}

// Rough condition -> emoji mapping, keyword-matched against NWS text. Pass a forecast period's
// isDaytime so a daytime "Chance" or "Slight Chance" of showers gets the sun-and-rain icon (it may
// not rain at all, and a plain rain cloud read as "it's raining", Oct. 1, 2026), and a clear night
// gets a moon instead of a sun.
function conditionIcon(text, isDaytime) {
  const t = (text || "").toLowerCase();
  if (t.includes("thunder")) return "⛈️";
  if (t.includes("snow") || t.includes("flurr") || t.includes("blizzard")) return "❄️";
  if (t.includes("sleet") || t.includes("ice")) return "🧊";
  if (t.includes("rain") || t.includes("shower") || t.includes("drizzle")) {
    return isDaytime === true && t.includes("chance") && !t.includes("likely") ? "🌦️" : "🌧️";
  }
  if (t.includes("fog") || t.includes("haze") || t.includes("mist")) return "🌫️";
  if (t.includes("wind")) return "💨";
  if (t.includes("cloud") && t.includes("partly")) return "⛅";
  if (t.includes("cloud") || t.includes("overcast")) return "☁️";
  if (t.includes("clear") || t.includes("sunny")) return isDaytime === false ? "🌙" : "☀️";
  return "🌤️";
}

const ALERT_SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };

/** Warnings first, then by severity, then soonest onset. */
function sortAlerts(features) {
  return (features || []).slice().sort((a, b) => {
    const pa = a.properties || {}, pb = b.properties || {};
    const wa = /warning/i.test(pa.event) ? 1 : 0, wb = /warning/i.test(pb.event) ? 1 : 0;
    if (wa !== wb) return wb - wa;
    const sa = ALERT_SEVERITY_RANK[pa.severity] || 0, sb = ALERT_SEVERITY_RANK[pb.severity] || 0;
    if (sa !== sb) return sb - sa;
    return new Date(pa.onset || pa.effective) - new Date(pb.onset || pb.effective);
  });
}

/** Drops test/exercise messages and cancellation notices, which aren't active hazards. */
function liveAlerts(features) {
  return (features || []).filter((f) => {
    const p = f && f.properties;
    if (!p || !p.event) return false;
    if (p.status && p.status !== "Actual") return false;
    if (p.messageType === "Cancel") return false;
    return true;
  });
}

async function fetchAlertsForPoint(lat, lon) {
  const data = await nwsGet(`${NWS_BASE}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`);
  return sortAlerts(liveAlerts(data.features));
}

/** "until Sat 4:00 PM CDT" in the place's time zone. Warnings with no end time
 * (river floods, for example) say "until further notice" instead of showing
 * when the message itself is due to be updated. */
function alertUntilText(p, tz) {
  const when = (t) => `${fmtInZone(t, tz, { weekday: "short", hour: "numeric", minute: "2-digit" })} ${zoneAbbrev(t, tz)}`;
  if (p.ends) return `until ${when(p.ends)}`;
  if (alertHasOpenEnd(p)) return "until further notice";
  if (p.expires) return `until ${when(p.expires)}`;
  return "";
}

/** A watch/warning with no end time (e.g. a river Flood Warning "until further notice"). */
function alertHasOpenEnd(p) {
  const vtec = p && p.parameters && p.parameters.VTEC;
  return !p.ends && Array.isArray(vtec) && vtec.length > 0;
}

/** When an alert stops applying, in ms. Open-ended warnings count as ongoing. */
function alertEndMs(p) {
  if (p.ends) return new Date(p.ends).getTime();
  if (alertHasOpenEnd(p)) return Infinity;
  return p.expires ? new Date(p.expires).getTime() : Infinity;
}

/** Official NWS forecast page for a point (shows the same hazards, in NWS's own words). */
function nwsPointPageUrl(lat, lon) {
  return `https://forecast.weather.gov/MapClick.php?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
}

/**
 * Loads everything needed for a location: active alerts, point metadata,
 * hourly forecast, and the 7-day forecast. Current conditions come from the
 * nearest observation station for that point.
 *
 * Alerts are checked on their own, so a failed forecast request never hides
 * them. `alerts` is null (and `alertsError` true) when NWS couldn't be asked,
 * which is NOT the same as "no alerts". `forecastError` flags a missing forecast.
 */
async function loadWeatherForLocation(loc, opts) {
  const ll = `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`;
  const alertsP = nwsGet(`${NWS_BASE}/alerts/active?point=${ll}`).then((d) => sortAlerts(liveAlerts(d.features)), () => null);
  // Let the page show alerts the moment they arrive, without waiting on forecasts.
  if (opts && typeof opts.onAlerts === "function") alertsP.then((a) => { try { opts.onAlerts(a); } catch (e) { console.error(e); } });
  const [alerts, pointR] = await Promise.all([
    alertsP,
    nwsGet(`${NWS_BASE}/points/${ll}`).then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason })),
  ]);

  if (pointR.status !== "fulfilled") {
    if (alerts === null) throw pointR.reason;
    return {
      location: loc, office: null, nwsTimeZone: null, timeZone: locationTimeZone(loc),
      place: null, radarStation: null, alerts, alertsError: false,
      hourly: [], hourlyAll: [], daily: [], forecastError: true, current: null,
    };
  }
  const props = pointR.value.properties;

  const [hourlyR, dailyR, stationsR] = await Promise.allSettled([
    nwsGet(props.forecastHourly),
    nwsGet(props.forecast),
    nwsGet(props.observationStations, 10000),
  ]);
  const hourlyAll = hourlyR.status === "fulfilled" ? (hourlyR.value.properties.periods || []) : [];
  const daily = dailyR.status === "fulfilled" ? nwsPeriodsInZone(dailyR.value.properties.periods, props).slice(0, 14) : [];

  let current = null;
  const stationFeatures = stationsR.status === "fulfilled" ? (stationsR.value.features || []) : [];
  for (let i = 0; i < Math.min(stationFeatures.length, 3) && !current; i++) {
    try {
      const stationId = stationFeatures[i].properties.stationIdentifier;
      const obs = await nwsGet(`${NWS_BASE}/stations/${stationId}/observations/latest`, 8000);
      if (obs.properties && obs.properties.temperature && obs.properties.temperature.value !== null) {
        current = {
          stationId,
          stationName: stationFeatures[i].properties.name,
          tempF: cToF(obs.properties.temperature.value),
          text: obs.properties.textDescription,
          windMph: windToMph(obs.properties.windSpeed),
          humidity: obs.properties.relativeHumidity && obs.properties.relativeHumidity.value
            ? Math.round(obs.properties.relativeHumidity.value)
            : null,
          gustMph: windToMph(obs.properties.windGust),
          timestamp: obs.properties.timestamp,
        };
      }
    } catch (e) {
      // try next station
    }
  }

  const rel = props.relativeLocation && props.relativeLocation.properties;
  return {
    location: loc,
    office: props.cwa,
    nwsTimeZone: nwsPointTimeZone(props),
    timeZone: locationTimeZone(loc, nwsPointTimeZone(props)),
    place: rel ? { city: rel.city, state: rel.state } : null,
    radarStation: props.radarStation || null,
    alerts,
    alertsError: alerts === null,
    hourly: hourlyAll.slice(0, 8),
    hourlyAll,
    daily,
    forecastError: hourlyR.status !== "fulfilled" || dailyR.status !== "fulfilled",
    current,
  };
}

/** Picks the best upcoming travel window from hourly periods: lowest rain
 * chance and calmest wind in the next stretch of daylight hours. */
function pickBestDrivingWindow(hourlyPeriods) {
  const upcoming = hourlyPeriods.slice(0, 8);
  if (!upcoming.length) return null;
  let best = upcoming[0];
  for (const p of upcoming) {
    const pop = p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value != null
      ? p.probabilityOfPrecipitation.value
      : 0;
    const bestPop = best.probabilityOfPrecipitation && best.probabilityOfPrecipitation.value != null
      ? best.probabilityOfPrecipitation.value
      : 0;
    if (pop < bestPop || (pop === bestPop && windMphFromText(p.windSpeed) < windMphFromText(best.windSpeed))) {
      best = p;
    }
  }
  return best;
}

/** "10 to 15 mph" -> 15 (the top of the range). */
function windMphFromText(text) {
  const nums = String(text || "").match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : 0;
}

/** Highest precipitation-chance hour in the next stretch — the storm risk to plan around. */
function pickStormRisk(hourlyPeriods) {
  const upcoming = hourlyPeriods.slice(0, 12);
  if (!upcoming.length) return null;
  let worst = upcoming[0];
  for (const p of upcoming) {
    const pop = p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value != null ? p.probabilityOfPrecipitation.value : 0;
    const worstPop = worst.probabilityOfPrecipitation && worst.probabilityOfPrecipitation.value != null ? worst.probabilityOfPrecipitation.value : 0;
    if (pop > worstPop) worst = p;
  }
  return worst;
}

/** Overnight comfort rating for boondocking/tent camping based on the
 * coming night's forecast period (temp + wind). */
function pickOvernightComfort(dailyPeriods) {
  const night = dailyPeriods.find((p) => !p.isDaytime) || dailyPeriods[1] || dailyPeriods[0];
  if (!night) return null;
  const temp = night.temperature;
  const wind = windMphFromText(night.windSpeed);
  let rating = "good";
  if (temp < 25 || temp > 90 || wind > 25) rating = "bad";
  else if (temp < 40 || temp > 82 || wind > 15) rating = "warn";
  return { period: night, rating, wind };
}

function ratingLabel(rating) {
  if (rating === "good") return "GOOD";
  if (rating === "warn") return "CAUTION";
  return "POOR";
}

/* ---------- Storm Prediction Center outlooks (NOAA map service, CORS-friendly) ---------- */

const SPC_MAPSERVER = "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer";
const SPC_CATEGORICAL_LAYERS = { 1: 1, 2: 9, 3: 17 }; // day -> layer id
const SPC_RISK_TEXT = {
  2: { short: "Thunder", long: "General thunderstorms (non-severe)", level: 0 },
  3: { short: "Marginal", long: "Marginal risk of severe storms (level 1 of 5)", level: 1 },
  4: { short: "Slight", long: "Slight risk of severe storms (level 2 of 5)", level: 2 },
  5: { short: "Enhanced", long: "Enhanced risk of severe storms (level 3 of 5)", level: 3 },
  6: { short: "Moderate", long: "Moderate risk of severe storms (level 4 of 5)", level: 4 },
  8: { short: "High", long: "High risk of severe storms (level 5 of 5)", level: 5 },
};

/** SPC categorical outlook at a point for day 1-3. Returns {day, dn, short, long, level, valid, expire} or a "none" result. */
async function fetchSpcRisk(lat, lon, day) {
  const layer = SPC_CATEGORICAL_LAYERS[day || 1];
  const url = `${SPC_MAPSERVER}/${layer}/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=dn,label,label2,valid,expire,issue&returnGeometry=false&f=json`;
  const data = await fetchJson(url, {}, 12000);
  if (data.error) throw new Error("SPC outlook service error");
  const feats = (data.features || []).map((f) => f.attributes).filter((a) => a && a.dn != null);
  if (!feats.length) return { day, dn: 0, short: "None", long: "No thunderstorm or severe risk outlined", level: -1 };
  const top = feats.reduce((a, b) => (b.dn > a.dn ? b : a));
  const t = SPC_RISK_TEXT[top.dn] || { short: top.label || "Risk", long: top.label2 || "Risk outlined", level: 0 };
  return Object.assign({ day, dn: top.dn, valid: top.valid, expire: top.expire }, t);
}

function spcOutlookPageUrl(day) {
  return `https://www.spc.noaa.gov/products/outlook/day${day || 1}otlk.html`;
}

/* ---------- Area Forecast Discussion (what local NWS forecasters are thinking) ---------- */

async function fetchLatestAfd(office) {
  const ld = { headers: { Accept: "application/ld+json" } };
  const listData = await fetchJson(`${NWS_BASE}/products/types/AFD/locations/${office}`, ld, 15000);
  const latest = (listData["@graph"] || [])[0];
  if (!latest) throw new Error("No recent forecast discussion");
  const product = await fetchJson(latest["@id"], ld, 15000);
  return { office, issuanceTime: product.issuanceTime, text: product.productText || "" };
}

/** Pulls a named section (e.g. "KEY MESSAGES", "SYNOPSIS") out of an AFD. */
function afdSection(text, name) {
  const re = new RegExp("\\n\\." + name.replace(/ /g, "\\s+") + "[^\\n]*\\.\\.\\.\\s*\\n([\\s\\S]*?)(?:\\n&&|\\n\\.[A-Z][A-Z /]+\\.\\.\\.)", "i");
  const m = String(text).match(re);
  if (!m) return "";
  return m[1].replace(/^Issued at .*$/im, "").trim();
}

/** Turns the "- bullet" lines of a Key Messages section into clean sentences. */
function afdBullets(section) {
  const bullets = [];
  let cur = null;
  String(section).split("\n").forEach((line) => {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m) { if (cur) bullets.push(cur); cur = m[1].trim(); }
    else if (cur && line.trim()) cur += " " + line.trim();
    else if (!line.trim() && cur) { bullets.push(cur); cur = null; }
  });
  if (cur) bullets.push(cur);
  return bullets.map((b) => b.replace(/\s+/g, " "));
}

function afdPageUrl(office) {
  return `https://forecast.weather.gov/product.php?site=${office}&issuedby=${office}&product=AFD`;
}
