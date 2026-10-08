// Markets & Economy: plain-words economy numbers from the U.S. Bureau of Labor Statistics.
// Live market prices come from the TradingView widgets on the page; this file handles the BLS part.
(function () {
  const $ = (id) => document.getElementById(id);
  if (!$("econCards")) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // BLS series (free public API, no key). Each is monthly.
  const SERIES = {
    us: "LNS14000000",            // U.S. unemployment rate, seasonally adjusted
    in: "LASST180000000000003",   // Indiana unemployment rate, seasonally adjusted
    lp: "LAUCN180910000000003",   // La Porte County unemployment rate, not seasonally adjusted
    cpi: "CUUR0000SA0",           // Consumer prices, all items (CPI-U)
    gas: "CUUR0000SETB01",        // Consumer prices, gasoline (all types)
    food: "CUUR0000SAF11",        // Consumer prices, food at home (groceries)
    power: "CUUR0000SEHF",        // Consumer prices, household energy (electricity + utility gas)
  };
  // Saved copy of these numbers: a small job in the site's public GitHub repo asks BLS twice a day
  // and saves any new numbers there, so visitors don't each use up BLS's daily limit (about 25
  // requests per internet address). If the saved copy can't be read, the page asks BLS itself.
  const SAVED = "https://scoopanddude.github.io/laporteweathernow-posts/markets-data.json";
  const API = "https://api.bls.gov/publicAPI/v1/timeseries/data/";
  const CACHE = "lpwn_bls_v1";
  const MAX_AGE = 12 * 3600e3;

  const rows = (series) => ((series && series.data) || [])
    .filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period) && d.value !== "-" && isFinite(Number(d.value)))
    .map((d) => ({ y: Number(d.year), m: Number(d.period.slice(1)), v: Number(d.value), label: `${d.periodName} ${d.year}` }))
    .sort((a, b) => b.y - a.y || b.m - a.m);
  const yearAgo = (list) => list[0] && list.find((d) => d.y === list[0].y - 1 && d.m === list[0].m);
  const pct = (now, then) => (then ? ((now - then) / then) * 100 : null);
  const sign = (n, digits) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(digits == null ? 1 : digits);

  async function fetchAll() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (c && Date.now() - c.t < MAX_AGE && c.data) return c.data;
    } catch (e) { /* no cache */ }
    try {
      const r = await fetch(SAVED, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const saved = ((await r.json()) || {}).series || {};
      const data = {};
      Object.keys(SERIES).forEach((k) => { if (saved[k] && Array.isArray(saved[k].data) && saved[k].data.length) data[k] = saved[k]; });
      if (Object.keys(data).length >= 4) {
        try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), data })); } catch (e) {}
        return data;
      }
    } catch (e) { /* no saved copy: ask BLS directly */ }
    const data = {};
    await Promise.all(Object.keys(SERIES).map(async (k) => {
      try {
        const r = await fetch(API + SERIES[k], { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        const j = await r.json();
        const s = j && j.Results && j.Results.series && j.Results.series[0];
        if (s && s.data && s.data.length) data[k] = s;
      } catch (e) { /* this one didn't answer */ }
    }));
    if (Object.keys(data).length >= 4) { try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), data })); } catch (e) {} }
    return data;
  }

  function jobCard(title, list, where) {
    if (!list.length) return "";
    const now = list[0], prev = list[1], ago = yearAgo(list);
    const move = prev ? now.v - prev.v : 0;
    const trend = !prev || Math.abs(move) < 0.05 ? "about the same as the month before" : move > 0 ? `up ${Math.abs(move).toFixed(1)} from ${prev.label.split(" ")[0]}` : `down ${Math.abs(move).toFixed(1)} from ${prev.label.split(" ")[0]}`;
    return `<article class="mk-card">
      <div class="mk-kicker">${esc(title)}</div>
      <div class="mk-num">${now.v.toFixed(1)}%</div>
      <p>${esc(where)} unemployment in ${esc(now.label)}, ${esc(trend)}.${ago ? ` A year earlier it was ${ago.v.toFixed(1)}%.` : ""}</p>
    </article>`;
  }
  function priceCard(title, list, plain) {
    if (!list.length) return "";
    const now = list[0], ago = yearAgo(list);
    const yoy = ago ? pct(now.v, ago.v) : null;
    if (yoy == null) return "";
    const word = yoy > 0.05 ? "higher" : yoy < -0.05 ? "lower" : "about the same";
    return `<article class="mk-card">
      <div class="mk-kicker">${esc(title)}</div>
      <div class="mk-num ${yoy > 0.05 ? "up" : yoy < -0.05 ? "down" : ""}">${sign(yoy)}%</div>
      <p>${esc(plain)} cost ${Math.abs(yoy) < 0.05 ? "about the same as" : `${Math.abs(yoy).toFixed(1)}% ${word} than`} a year ago, as of ${esc(now.label)}.</p>
    </article>`;
  }

  fetchAll().then((d) => {
    const cards = [
      jobCard("La Porte County jobs", rows(d.lp), "La Porte County"),
      jobCard("Indiana jobs", rows(d.in), "Indiana's"),
      jobCard("U.S. jobs", rows(d.us), "The U.S."),
      priceCard("Inflation", rows(d.cpi), "Everyday prices overall"),
      priceCard("Gas at the pump", rows(d.gas), "Gasoline"),
      priceCard("Groceries", rows(d.food), "Groceries"),
      priceCard("Home energy", rows(d.power), "Electricity and natural gas at home"),
    ].filter(Boolean);
    if (!cards.length) {
      $("econCards").innerHTML = `<p class="mk-fine">The Bureau of Labor Statistics didn't answer just now. You can see the numbers at <a href="https://www.bls.gov/" target="_blank" rel="noopener">bls.gov</a>.</p>`;
      return;
    }
    $("econCards").innerHTML = cards.join("");
    $("econNote").textContent = "From the U.S. Bureau of Labor Statistics, updated monthly. County numbers come out about a month after the state and national ones.";
  });
})();
