/* Scoop & Dude camp map: which way the good weather is (copied from La Porte Weather Now's camp map, Oct. 7, 2026). */
/* ---------- Follow the good weather: a weather compass for full-time travelers (Oct. 1, 2026) ----------
   The NWS forecast for the next 3 days where the camp map is centered, and at 8 spots a day's drive away,
   each rated for camping weather by our own rule of thumb. Runs when you scroll to it. */
(function () {
  const NWS = "https://api.weather.gov";
  const $ = (id) => document.getElementById(id);
  // Grid order, north at the top. null is "you are here".
  const DIRS = [["NW", 315, "northwest"], ["N", 0, "north"], ["NE", 45, "northeast"], ["W", 270, "west"], null,
    ["E", 90, "east"], ["SW", 225, "southwest"], ["S", 180, "south"], ["SE", 135, "southeast"]];
  const cache = new Map();
  let seq = 0, seen = false, ran = null, cells = null, picked = -1;

  function milesBetween(a, b) {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 7917.6 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function destination(lat, lon, bearing, miles) {
    const r = Math.PI / 180, d = miles / 3958.8, br = bearing * r, p1 = lat * r, l1 = lon * r;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(br));
    const l2 = l1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lat: p2 / r, lon: ((l2 / r + 540) % 360) - 180 };
  }
  const popOf = (p) => (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value) || 0;
  const windOf = (p) => { const n = String(p.windSpeed || "").match(/\d+/g); return n ? Math.max.apply(null, n.map(Number)) : 0; };
  const STORM = /thunder/i, WINTRY = /snow|sleet|freezing|ice|blizzard/i;

  /* One spot: its NWS point, 7-day forecast and active alerts. */
  function spotAt(lat, lon) {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (cache.has(key)) return cache.get(key);
    const job = (async () => {
      const pt = await nwsGet(`${NWS}/points/${lat.toFixed(4)},${lon.toFixed(4)}`, 12000);
      const pp = pt.properties || {};
      if (!pp.forecast) { const e = new Error("no forecast here"); e.status = 404; throw e; }
      const [fc, alerts] = await Promise.all([
        nwsGet(pp.forecast, 15000).catch(() => nwsGet(pp.forecast, 15000)),   // NWS sometimes needs a second try
        nwsGet(`${NWS}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, 12000).then((d) => liveAlerts(d.features), () => []),
      ]);
      const rel = pp.relativeLocation && pp.relativeLocation.properties;
      return { lat, lon, town: rel && rel.city ? `${rel.city}, ${rel.state}` : null, tz: nwsPointTimeZone(pp) || pp.timeZone,
        periods: nwsPeriodsInZone(fc.properties.periods || [], pp), alerts };
    })();
    cache.set(key, job);
    job.catch(() => cache.delete(key));
    return job;
  }
  /* A spot about `miles` away in one direction. Over water or outside the US there's no forecast, so try closer, then a little to each side. */
  async function spotToward(c, dir, miles) {
    const tries = [[0, 1], [0, 0.8], [0, 0.6], [-20, 1], [20, 1], [-35, 0.8], [35, 0.8]];
    for (const [turn, part] of tries) {
      const p = destination(c.lat, c.lon, dir[1] + turn, miles * part);
      try {
        const s = await spotAt(p.lat, p.lon);
        return Object.assign({ dir: dir, miles: Math.round(milesBetween(c, s) / 10) * 10 }, s);
      } catch (e) {
        if (e.status !== 404) break;   // a slow or broken answer won't get better somewhere else
      }
    }
    return { dir: dir, failed: true };
  }

  /* Our camping-weather rating for the next 3 days (about 6 forecast periods). */
  function summarize(spot) {
    const now = Date.now();
    const ps = spot.periods.filter((p) => Date.parse(p.endTime) > now && Date.parse(p.startTime) < now + 72 * 3600 * 1000).slice(0, 6);
    const days = ps.filter((p) => p.isDaytime), nights = ps.filter((p) => !p.isDaytime);
    const weights = [1.5, 1.3, 1, 1, 0.8, 0.8];
    let pen = 0, wsum = 0;
    ps.forEach((p, i) => {
      const t = p.temperature, w = windOf(p), f = p.shortForecast || "";
      let x = 0;
      if (p.isDaytime) { if (t > 82) x += (t - 82) * 1.5; if (t < 60) x += (60 - t) * 1.2; }
      else { if (t < 40) x += 40 - t; if (t <= 32) x += 6; if (t > 68) x += (t - 68) * 1.5; }
      x += popOf(p) * 0.35;
      if (STORM.test(f)) x += 8;
      if (WINTRY.test(f)) x += 12;
      if (w > 15) x += (w - 15) * 0.8;
      if (w >= 30) x += 8;
      pen += x * (weights[i] || 0.8);
      wsum += weights[i] || 0.8;
    });
    let alertPen = 0;
    const warnings = [], others = [];
    spot.alerts.forEach((a) => {
      const e = a.properties.event;
      if (/Warning/i.test(e)) { alertPen = Math.max(alertPen, 25); if (warnings.indexOf(e) < 0) warnings.push(e); }
      else { alertPen = Math.max(alertPen, /Watch/i.test(e) ? 10 : 4); if (others.indexOf(e) < 0) others.push(e); }
    });
    const temps = (list) => list.map((p) => p.temperature);
    return {
      score: ps.length ? Math.max(0, Math.min(100, Math.round(100 - (pen / wsum) * 2.5 - alertPen))) : null,
      ps, days, nights, warnings, others,
      hi: days.length ? Math.max.apply(null, temps(days)) : null,
      lo: nights.length ? Math.min.apply(null, temps(nights)) : null,
      rain: ps.length ? Math.max.apply(null, ps.map(popOf)) : 0,
      wind: ps.length ? Math.max.apply(null, ps.map(windOf)) : 0,
      storms: ps.some((p) => STORM.test(p.shortForecast || "")),
      wintry: ps.some((p) => WINTRY.test(p.shortForecast || "")),
      icon: conditionIcon(((days[0] || ps[0]) || {}).shortForecast || "", ((days[0] || ps[0]) || {}).isDaytime),
    };
  }
  function rating(score) {
    if (score === null || score === undefined) return { key: "none", word: "No forecast" };
    if (score >= 80) return { key: "great", word: "Great" };
    if (score >= 65) return { key: "good", word: "Good" };
    if (score >= 45) return { key: "fair", word: "Fair" };
    return { key: "rough", word: "Rough" };
  }
  /* Why a spot beats where you are, in plain words. */
  function reasons(d, h) {
    const out = [];
    if (h.warnings.length && !d.warnings.length) out.push(`No warnings in effect (here: ${h.warnings[0]})`);
    if (d.rain + 25 <= h.rain) out.push(`Drier: rain chances up to ${d.rain}%, vs. ${h.rain}% here`);
    if (h.storms && !d.storms) out.push("No thunderstorms in the forecast");
    if (h.wintry && !d.wintry) out.push("No snow or ice in the forecast");
    if (h.lo !== null && d.lo !== null && h.lo < 40 && d.lo - h.lo >= 6) out.push(`Warmer nights: lows near ${d.lo}°, vs. ${h.lo}° here`);
    if (h.hi !== null && d.hi !== null && h.hi > 85 && h.hi - d.hi >= 6) out.push(`Cooler days: highs near ${d.hi}°, vs. ${h.hi}° here`);
    if (h.hi !== null && d.hi !== null && h.hi < 60 && d.hi - h.hi >= 6) out.push(`Warmer days: highs near ${d.hi}°, vs. ${h.hi}° here`);
    if (h.wind >= 20 && d.wind <= h.wind - 8) out.push(`Calmer: wind up to ${d.wind} mph, vs. ${h.wind} mph here`);
    return out.slice(0, 3);
  }
  /* What to watch for at a spot. */
  function watchOuts(s) {
    const out = s.warnings.map((w) => `${w} in effect`);
    const freeze = s.nights.find((p) => p.temperature <= 32);
    if (freeze) out.push(`Freezing ${freeze.name} (low ${freeze.temperature}°): protect your water lines`);
    const storm = s.ps.find((p) => STORM.test(p.shortForecast || ""));
    if (storm) out.push(`Thunderstorms possible ${storm.name}`);
    const windy = s.ps.find((p) => windOf(p) >= 25);
    if (windy) out.push(`Windy ${windy.name}: up to ${windOf(windy)} mph, rough for tall vans and trailers`);
    const hot = s.days.find((p) => p.temperature >= 90);
    if (hot) out.push(`Hot ${hot.name}: high near ${hot.temperature}°`);
    if (!s.warnings.length && s.others.length) out.push(`${s.others[0]} in effect`);
    return out.slice(0, 3);
  }

  function centerNow() {
    const c = typeof state === "object" && state && state.center;
    return c && isFinite(c.lat) && isFinite(c.lon) ? { name: c.name, lat: Number(c.lat), lon: Number(c.lon) } : null;
  }
  const keyOf = (c, miles) => `${c.lat.toFixed(3)},${c.lon.toFixed(3)}|${miles}`;
  function placeName(c) { return /^your /i.test(c.name) ? "your spot" : c.name; }

  function cellHtml(cell, i) {
    const here = DIRS[i] === null;
    const label = here ? "You&rsquo;re here" : `${cell.dir[0]} &middot; ${cell.miles ? cell.miles : "?"} mi`;
    if (cell.loading) return `<button type="button" class="fw-cell none${here ? " here" : ""}" disabled><span class="fw-dir">${label}</span><span class="fw-town">Checking&hellip;</span></button>`;
    if (cell.failed) return `<button type="button" class="fw-cell none${here ? " here" : ""}" disabled><span class="fw-dir">${here ? label : cell.dir[0]}</span><span class="fw-town">${here ? "Forecast not available right now" : "No NWS forecast this way (water or outside the U.S.)"}</span></button>`;
    const r = rating(cell.sum.score);
    const town = here ? escapeHtml(placeName(cell.center)) : cell.town ? `near ${escapeHtml(cell.town)}` : "Open country";
    const temps = `${cell.sum.hi !== null ? cell.sum.hi + "°" : "–"} / ${cell.sum.lo !== null ? cell.sum.lo + "°" : "–"}`;
    return `<button type="button" class="fw-cell ${r.key}${here ? " here" : ""}" data-i="${i}" aria-pressed="${i === picked}"
      aria-label="${here ? "Where you are" : cell.dir[2] + ", about " + cell.miles + " miles"}: ${r.word} camping weather">
      <span class="fw-dir">${label}</span><span class="fw-town">${town}</span>
      <span class="fw-wx"><span class="ic" aria-hidden="true">${cell.sum.icon}</span>${temps}</span>
      <span class="fw-rain">Rain up to ${cell.sum.rain}%</span>
      <span class="fw-badge ${r.key}">${r.word}</span></button>`;
  }
  function tripLink(from, to) {
    const part = (p) => [p.lat.toFixed(4), p.lon.toFixed(4), p.tz || "", p.name].join(",");
    const q = new URLSearchParams();
    q.set("from", part(from)); q.set("to", part(to));
    return "https://laporteweathernow.com/trip-planner?" + q.toString();   // the Trip Planner lives on La Porte Weather Now
  }
  function detailHtml(i) {
    const cell = cells[i], here = cells[4];
    if (!cell || cell.failed || cell.loading) return "";
    const s = cell.sum, r = rating(s.score), isHere = DIRS[i] === null;
    const title = isHere ? `${escapeHtml(cell.center.name)} (where you are)` : cell.town ? `Near ${escapeHtml(cell.town)}` : `About ${cell.miles} miles ${cell.dir[2]}`;
    const sub = isHere ? "The next 3 days where your map is centered." : `About ${cell.miles} miles ${cell.dir[2]} of ${escapeHtml(placeName(cell.center))}, straight-line.`;
    const good = !isHere && here && !here.failed ? reasons(s, here.sum) : [];
    const watch = watchOuts(s);
    const byDay = [];
    s.ps.forEach((p) => {
      if (p.isDaytime || !byDay.length) byDay.push({ day: p.isDaytime ? p : null, night: p.isDaytime ? null : p });
      else if (!byDay[byDay.length - 1].night) byDay[byDay.length - 1].night = p;
      else byDay.push({ day: null, night: p });
    });
    const days = byDay.slice(0, 3).map((d) => {
      const main = d.day || d.night;
      const line = d.day ? `<span class="t">${d.day.temperature}°</span> ${escapeHtml(d.day.shortForecast)}${popOf(d.day) >= 20 ? `, ${popOf(d.day)}% rain` : ""}` : "";
      const night = d.night ? `${d.day ? "Night: " : ""}low <span class="t">${d.night.temperature}°</span>, ${escapeHtml(String(d.night.shortForecast).toLowerCase())}${popOf(d.night) >= 20 ? `, ${popOf(d.night)}% rain` : ""}` : "";
      return `<div class="fw-day"><strong>${escapeHtml(main.name)}</strong><span class="ic" aria-hidden="true">${conditionIcon(main.shortForecast, main.isDaytime)}</span><span>${line || night}</span>${line && night ? `<span class="n">${night}</span>` : ""}</div>`;
    }).join("");
    const actions = isHere
      ? `<a class="btn btn-plain" href="${nwsPointPageUrl(cell.lat, cell.lon)}" target="_blank" rel="noopener">Full NWS forecast &#8599;</a>`
      : `<button type="button" class="btn btn-dark" data-camp="${i}">Find camping near here</button>` +
        `<a class="btn btn-plain" href="${tripLink({ lat: here.lat, lon: here.lon, tz: here.tz, name: here.center.name }, { lat: cell.lat, lon: cell.lon, tz: cell.tz, name: cell.town || cell.dir[2] + " spot" })}" data-track="fw-trip" target="_blank" rel="noopener">Check the drive &#8599;</a>` +
        `<a class="btn btn-plain" href="${nwsPointPageUrl(cell.lat, cell.lon)}" target="_blank" rel="noopener">NWS forecast &#8599;</a>`;
    return `<span class="fw-badge ${r.key}">${r.word} camping weather</span><h3>${title}</h3><p class="fw-dsub">${sub}</p>` +
      (good.length ? `<ul class="fw-list good">${good.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "") +
      (watch.length ? `<ul class="fw-list watch">${watch.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "") +
      `<div class="fw-days">${days}</div><div class="fw-actions">${actions}</div>`;
  }
  function paint() {
    $("fwGrid").innerHTML = cells.map(cellHtml).join("");
    $("fwDetail").innerHTML = picked >= 0 ? detailHtml(picked) : "";
  }
  function verdictHtml(miles) {
    const here = cells[4];
    // Spots can answer before the center does: keep saying "checking" until it has (Oct. 7, 2026 fix).
    if (!here || here.loading) return `<div class="k">Which way to go &middot; still checking</div><p class="big">Checking the Weather Service forecast around ${escapeHtml(placeName(ran.center))}&hellip;</p>`;
    const ok = cells.filter((c, i) => i !== 4 && !c.failed && !c.loading && c.sum && c.sum.score !== null);
    let text, best = null;
    if (!here || here.failed || here.sum.score === null) {
      text = `We couldn&rsquo;t get the Weather Service forecast for ${escapeHtml(ran.center.name)} just now. Try again in a minute.`;
    } else {
      ok.sort((a, b) => b.sum.score - a.sum.score || a.sum.rain - b.sum.rain);
      best = ok[0] || null;
      const hr = rating(here.sum.score);
      if (best && best.sum.score >= here.sum.score + 10) {
        const why = reasons(best.sum, here.sum)[0];
        text = `Head ${best.dir[2]}. About ${best.miles} miles away${best.town ? `, near ${escapeHtml(best.town)}` : ""}, the next 3 days look ${rating(best.sum.score).word.toLowerCase()}.` +
          (why ? ` ${escapeHtml(why)}.` : "");
      } else if (here.sum.score >= 65) {
        best = null;
        text = `Stay put, or go any way you like. The weather around ${escapeHtml(placeName(here.center))} looks as good as anything within about ${miles} miles for the next 3 days.`;
      } else {
        best = null;
        text = `It&rsquo;s ${hr.word.toLowerCase()} weather all around. Nothing within about ${miles} miles looks much better for the next 3 days. Try a longer drive, or plan to ride it out somewhere sturdy.`;
      }
    }
    const pending = cells.some((c) => c.loading);
    return `<div class="k">Which way to go${pending ? " &middot; still checking" : ""}</div><p class="big">${text}</p>` +
      (best ? `<div class="fw-actions"><button type="button" class="btn btn-dark" data-camp="${cells.indexOf(best)}">Find camping near ${escapeHtml(best.town || "there")}</button><button type="button" class="btn btn-plain" data-pick="${cells.indexOf(best)}">See the forecast there</button></div>` : "");
  }

  async function run() {
    const c = centerNow();
    if (!c || typeof nwsGet !== "function") return;
    const miles = Number($("fwDist").value) || 200;
    const mine = ++seq;
    ran = { key: keyOf(c, miles), center: c, miles };
    $("fwMoved").hidden = true;
    $("fwCenter").textContent = c.name;
    picked = -1;
    cells = DIRS.map((d) => (d ? { dir: d, loading: true } : { loading: true, center: c }));
    paint();
    $("fwVerdict").innerHTML = `<div class="k">Which way to go</div><p class="big">Checking the Weather Service forecast around ${escapeHtml(placeName(c))}&hellip;</p>`;
    const finish = (i, cell) => {
      if (mine !== seq) return;
      if (!cell.failed) { cell.sum = summarize(cell); cell.center = c; }
      cells[i] = cell;
      if (!cells.some((x) => x.loading)) {
        const order = cells.map((x, k) => k).filter((k) => k !== 4 && !cells[k].failed && cells[k].sum.score !== null).sort((a, b) => cells[b].sum.score - cells[a].sum.score);
        const here = cells[4];
        picked = order.length && (here.failed || cells[order[0]].sum.score >= here.sum.score + 10) ? order[0] : (here.failed ? -1 : 4);
      }
      paint();
      $("fwVerdict").innerHTML = verdictHtml(miles);
    };
    spotAt(c.lat, c.lon).then((s) => finish(4, Object.assign({ center: c }, s)), () => finish(4, { failed: true, center: c }));
    DIRS.forEach((d, i) => { if (d) spotToward(c, d, miles).then((cell) => finish(i, cell)); });
    if (typeof lpwnTrack === "function") lpwnTrack("fw-compass", `${miles} mi`);
  }

  function campNear(i) {
    const cell = cells && cells[i];
    if (!cell || cell.failed) return;
    const name = cell.town ? `near ${cell.town}` : `${cell.dir[2]} spot`;
    if (typeof lpwnTrack === "function") lpwnTrack("fw-camp-there");
    if (typeof state === "object" && typeof load === "function" && typeof addCustomOption === "function") {
      customCenter = { name: name, lat: cell.lat, lon: cell.lon };
      addCustomOption(customCenter, name);
      state.center = customCenter;
      load();
      $("campMap").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      location.href = `/camp-map/?lat=${cell.lat.toFixed(4)}&lon=${cell.lon.toFixed(4)}&name=${encodeURIComponent(name)}`;
    }
  }
  function pick(i) {
    if (!cells || !cells[i] || cells[i].failed || cells[i].loading) return;
    picked = i;
    paint();
    if (window.matchMedia("(max-width: 860px)").matches) $("fwDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  $("fwGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) pick(Number(b.dataset.i)); });
  $("weather").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-track]");
    if (a && typeof lpwnTrack === "function") lpwnTrack(a.dataset.track);
    const camp = e.target.closest("[data-camp]");
    if (camp) { campNear(Number(camp.dataset.camp)); return; }
    const p = e.target.closest("[data-pick]");
    if (p) pick(Number(p.dataset.pick));
  });
  $("fwDist").addEventListener("change", () => { if (seen) run(); });
  $("fwMoved").addEventListener("click", () => run());
  // When the map moves to a new town, offer to compare the weather there (it doesn't re-run by itself).
  setInterval(() => {
    const c = centerNow();
    if (!c) return;
    if (!ran) { $("fwCenter").textContent = c.name; return; }
    if (keyOf(c, ran.miles) !== ran.key) {
      $("fwMoved").hidden = false;
      $("fwMoved").textContent = `Compare the weather around ${c.name}`;
    } else {
      $("fwMoved").hidden = true;
    }
  }, 1500);
  const sec = $("weather");
  const go = () => { if (!seen) { seen = true; run(); } };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "200px 0px" });
    io.observe(sec);
  } else {
    go();
  }
})();
