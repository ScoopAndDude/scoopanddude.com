// AI's Survival Guide: a live board that updates itself, a model watch, and a four-scenario plan.
// Live data (all free and public, read from the visitor's browser):
//  - AI news: NPR Technology and Ars Technica AI feeds (through this site's /feeds/ proxy)
//  - Scam alerts: FTC Consumer Alerts feed (through /feeds/)
//  - Are AI systems up: each company's public status page
//  - Open models: Hugging Face's public model list
//  - Jobs: U.S. Bureau of Labor Statistics (shared with the Markets page)
// Checkmarks are kept in this browser only.
(function () {
  const $ = (id) => document.getElementById(id);
  if (!$("aiBoard")) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https:\/\//i.test(String(u || "")) ? String(u) : "#");
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const REFRESH = 15 * 60e3;
  const DAY = 864e5;
  const ago = (t) => {
    const d = Date.now() - t;
    if (!isFinite(d)) return "";
    if (d < 3600e3) return Math.max(1, Math.round(d / 60e3)) + " min ago";
    if (d < DAY) return Math.round(d / 3600e3) + " hr ago";
    const n = Math.round(d / DAY); return n + (n === 1 ? " day ago" : " days ago");
  };
  const when = (t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  async function cached(key, maxAge, fn) {
    const c = store.get(key);
    if (c && Date.now() - c.t < maxAge && c.v != null) return c.v;
    try { const v = await fn(); if (v != null) store.set(key, { t: Date.now(), v }); return v; }
    catch (e) { return c ? c.v : null; }
  }
  async function rss(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const d = new DOMParser().parseFromString(await r.text(), "text/xml");
    return [...d.querySelectorAll("item")].map((i) => {
      const raw = (i.querySelector("pubDate") || {}).textContent || "";
      let t = Date.parse(raw.split("|")[0].trim());
      if (!isFinite(t)) t = Date.parse(raw);
      return { title: ((i.querySelector("title") || {}).textContent || "").trim(), link: ((i.querySelector("link") || {}).textContent || "").trim(), t: isFinite(t) ? t : 0 };
    }).filter((x) => x.title);
  }

  // ---------- The four scenarios ----------
  const L = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const S = [
    { id: "s1", tag: "Scenario 1", short: "An AI got paused", t: "A dangerous AI gets caught before release",
      odds: "Happening now: companies have paused models over safety this year.",
      their: "The company holds the model back, adds stronger safeguards, or stops building bigger ones until it's safe. Government testers warn officials and may push for limits.",
      signs: ["Headlines about a company pausing or delaying a model", "Hearings, lawsuits or emergency meetings about AI", "Scary social posts claiming more than the news says"],
      before: [
        ["news", "Pick two news sources you trust", "One local, one national. Check both before you believe or share a big AI story."],
        ["rule", "Set a no-panic rule for your house", "No panic buying, no rushed money moves because of a headline."]
      ],
      now: [
        ["verify", "Check the story in both sources", "If only one post or outlet says it, wait."],
        ["carry", "Carry on with normal life", "A paused model means a safety plan did its job. There's nothing to buy or do."],
        ["share", "Share the source, not a screenshot", "Link the original announcement so friends see the real facts."]
      ] },
    { id: "s2", tag: "Scenario 2", short: "Scams and hacks", t: "AI gets used for scams, fakes and hacking",
      odds: "Already happening. The one most likely to touch you.",
      their: "Companies shut down the accounts doing it and patch their systems. Police, the FBI and the FTC chase the crimes like any other fraud. They act after the fact, so the first line of defense is you.",
      signs: ["A call from 'family' in trouble asking for money", "Fake invoices, fake bank or PayPal emails", "A voice or video of someone you know saying something odd", "Password-reset emails you didn't ask for"],
      before: [
        ["word", "Set a family code word, out loud", "Anyone calling for money has to say it. Never text it, post it or write it online."],
        ["2fa", "Turn on 2-step login", "Email first, then your bank and anything that holds money."],
        ["pw", "Use a password manager", "One strong, different password per account. Your phone or browser's built-in one is fine."],
        ["freeze", "Freeze your credit", `Free, and you can lift it any time: ${L("https://www.equifax.com/personal/credit-report-services/credit-freeze/", "Equifax")}, ${L("https://www.experian.com/freeze/center.html", "Experian")}, ${L("https://www.transunion.com/credit-freeze", "TransUnion")}.`],
        ["alerts", "Turn on bank alerts", "A notice for every charge means a stolen card shows up in minutes."]
      ],
      now: [
        ["hang", "Hang up and call back on a number you know", "Never use the number or link in the message."],
        ["noPay", "Never pay with gift cards, crypto or wire", "Real companies and real family don't ask for those."],
        ["report", "Report it", `${L("https://reportfraud.ftc.gov/", "reportfraud.ftc.gov")} for scams, ${L("https://www.ic3.gov/", "ic3.gov")} for hacks, ${L("https://www.identitytheft.gov/", "identitytheft.gov")} if your identity was used.`],
        ["bank", "Call your bank right away if money moved", "The sooner you call, the better the odds of getting it back."]
      ] },
    { id: "s3", tag: "Scenario 3", short: "Outage or shutdown", t: "An AI acts out of control and systems get shut off",
      odds: "The one people fear most. Least likely, and the thinnest plan.",
      their: "The main plan is to turn off the computers it runs on. That could take down apps, websites, online payments or parts of the internet for hours or days while they sort it out. There's no global emergency team for this yet.",
      signs: ["Many big apps and sites down at once (see the status board above)", "Card readers and online payments failing", "Official orders to take systems offline"],
      before: [
        ["cash", "Keep some cash at home", "Small bills, enough for a week of gas and groceries if cards stop working."],
        ["food", "Two weeks of food and water", `About 1 gallon of water per person per day. ${L("https://www.ready.gov/kit", "ready.gov/kit")} has the full list.`],
        ["paper", "Print your key numbers and papers", "Phone numbers, insurance, bills and due dates. Keep them with your storm kit."],
        ["radio", "Keep a radio that doesn't need internet", "A battery or hand-crank NOAA Weather Radio. When the internet is down, radio still works."],
        ["gas", "Keep the tank at half or more", "Gas pumps need power and card systems to work."]
      ],
      now: [
        ["check", "Check a second source before acting", "Radio, TV, or a neighbor. Outages start rumors."],
        ["local", "Follow local officials", "La Porte County Emergency Management: 219-362-7210. For danger or a crime: 911."],
        ["wait", "Don't make big money moves", "Wait until systems are back and things are clear."],
        ["neighbors", "Check on your neighbors", "Older folks and people living alone first."]
      ] },
    { id: "s4", tag: "Scenario 4", short: "AI layoffs", t: "AI changes jobs fast",
      odds: "Slow-moving but real. Nobody has a plan for this one.",
      their: "Governments would likely lean on unemployment benefits, retraining programs, and maybe new aid. Those usually come slowly and after the damage.",
      signs: ["Local employers announcing AI-driven cuts", "Fewer calls for the kind of work you do", "The unemployment rate on this page climbing"],
      before: [
        ["fund", "Build an emergency fund", "Start with one month of bills saved, then work toward three."],
        ["streams", "Keep more than one income", "A side business or skill you can sell. If one slows, the other carries."],
        ["skills", "Grow skills AI can't easily replace", "Hands-on trades, local knowledge, trust, caring for people, handling emergencies."],
        ["cut", "Know which bills to cut first", "List them now, in order, so you're not deciding in a panic."]
      ],
      now: [
        ["claim", "File for unemployment the first week", `Indiana: ${L("https://www.in.gov/dwd/indiana-unemployment/", "in.gov/dwd")}. Waiting costs you money.`],
        ["workone", "Go to WorkOne", `Free job help and paid training in Indiana: ${L("https://www.in.gov/dwd/workone/", "WorkOne")}.`],
        ["lenders", "Call lenders before you miss a payment", "Most will offer a pause or a lower payment if you ask first."],
        ["211", "Call 211", "It connects you with local help for rent, utilities and food."]
      ] }
  ];
  const KEY = "lpwn_aiguide_v1";
  const saved = store.get(KEY) || {};
  let done = saved.done && typeof saved.done === "object" ? saved.done : {};
  let pick = typeof saved.pick === "string" ? saved.pick : "";   // "" = follow the news
  let suggested = { id: "quiet", why: [] };
  const save = () => store.set(KEY, { done, pick });
  const BEFORE = S.flatMap((s) => s.before.map((i) => s.id + ".b." + i[0]));

  const list = (s, items, kind) => `<ul class="ai-items">${items.map(([k, title, d]) => {
    const id = `${s.id}.${kind}.${k}`, el = `ai-${s.id}-${kind}-${k}`, on = !!done[id];
    return `<li class="${on ? "done" : ""}"><input type="checkbox" id="${el}" data-id="${id}"${on ? " checked" : ""}><div><label for="${el}">${title}</label><span class="d">${d}</span></div></li>`;
  }).join("")}</ul>`;

  function drawPlan() {
    const active = pick || suggested.id;
    $("aiPlan").innerHTML = S.map((s) => {
      const ids = [...s.before.map((i) => s.id + ".b." + i[0]), ...s.now.map((i) => s.id + ".n." + i[0])];
      const n = ids.filter((id) => done[id]).length;
      return `<section class="ai-scen ${s.id}${active === s.id ? " hot" : ""}" id="${s.id}" aria-labelledby="h-${s.id}">
        <header><span class="ai-tag">${s.tag}</span><div><h3 id="h-${s.id}">${s.t}</h3><div class="ai-odds">${s.odds}</div></div><span class="ai-cnt">${n}/${ids.length}</span></header>
        <div class="ai-cols">
          <div><h4>Their move</h4><p>${s.their}</p></div>
          <div><h4>Signs it's happening</h4><ul class="ai-plain">${s.signs.map((x) => `<li>${x}</li>`).join("")}</ul></div>
          <div><h4>Your move now</h4>${list(s, s.before, "b")}</div>
          <div><h4>Your move if it happens</h4>${list(s, s.now, "n")}</div>
        </div></section>`;
    }).join("");
    const nb = BEFORE.filter((id) => done[id]).length;
    $("aiPct").textContent = Math.round((nb / BEFORE.length) * 100) + "%";
    $("aiCount").textContent = `${nb} of ${BEFORE.length} get-ready steps done`;
    drawToday();
  }
  function drawToday() {
    const active = pick || suggested.id;
    document.querySelectorAll("#aiStatus button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.s === active)));
    const s = S.find((x) => x.id === active);
    const auto = !pick;
    let head = auto
      ? (suggested.id === "quiet" ? "Today's news: nothing big to react to." : `Today's news points to <b>${esc(S.find((x) => x.id === suggested.id).short)}</b>.`)
      : `You picked <b>${esc(s ? s.short : "All quiet")}</b>. <button type="button" class="ai-link" id="aiFollow">Go back to following the news</button>`;
    if (auto && suggested.why.length) head += `<span class="ai-why">Why: ${suggested.why.map(esc).join("; ")}.</span>`;
    let body;
    if (!s) {
      const next = S.flatMap((x) => x.before.map((i) => ({ i, id: x.id + ".b." + i[0] }))).filter((o) => !done[o.id]).slice(0, 3);
      body = next.length ? `<p>Use the quiet time to get ready. Your next three steps:</p><ol>${next.map((o) => `<li><b>${o.i[1]}.</b> ${o.i[2]}</li>`).join("")}</ol>` : `<p>Every get-ready step is done. Check back when something hits the news.</p>`;
    } else {
      const open = s.now.filter((i) => !done[s.id + ".n." + i[0]]);
      body = `<p><b>Their move:</b> ${s.their}</p>` + (open.length ? `<p><b>Your move, in this order:</b></p><ol>${open.map((i) => `<li><b>${i[1]}.</b> ${i[2]}</li>`).join("")}</ol>` : `<p>You've done every step for this one.</p>`) + `<p><a href="#${s.id}">See the full plan</a></p>`;
    }
    $("aiNow").innerHTML = `<p class="ai-head">${head}</p>${body}`;
    const f = $("aiFollow"); if (f) f.addEventListener("click", () => { pick = ""; save(); drawPlan(); });
  }
  $("aiPlan").addEventListener("change", (e) => {
    const cb = e.target.closest("input[data-id]"); if (!cb) return;
    if (cb.checked) done[cb.dataset.id] = new Date().toISOString().slice(0, 10); else delete done[cb.dataset.id];
    save(); const f = cb.id; drawPlan(); if ($(f)) $(f).focus();
  });
  $("aiStatus").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-s]"); if (!b) return;
    pick = b.dataset.s; save(); drawPlan();
  });

  // ---------- Live: AI news ----------
  const AI_RE = /\b(A\.?I\.?|artificial intelligence|OpenAI|Anthropic|ChatGPT|Claude|Gemini|DeepMind|chatbots?|deepfakes?|Copilot|Llama|Grok|xAI|DeepSeek|Mistral|Qwen|LLMs?|GPT[-\w.]*|Nvidia|data cent(er|re)s?)\b/i;
  const TAGS = [
    ["s2", /\b(scam|fraud|deepfake|hack|phish|impersonat|breach|cyber|stolen|malware|ransom)/i],
    ["s4", /\b(jobs?|layoffs?|laid off|workers?|workforce|employ|hiring|unemploy|wages?)\b/i],
    ["s3", /\b(outage|went down|goes down|shut ?down|shut off|grid|blackout|rogue|out of control|kill switch)\b/i],
    ["s1", /\b(safety|safe|pause[sd]?|halt|stops? training|delay|hold[s]? back|too (insecure|dangerous)|misalign|misbehav|escape|sandbox|extinction|regulat|lawsuit|ban)\b/i],
  ];
  const tagOf = (title) => { for (const [id, re] of TAGS) if (re.test(title)) return id; return ""; };
  const SHORT = { s1: "Safety / pause", s2: "Scams / hacks", s3: "Outages", s4: "Jobs" };
  async function loadNews() {
    const feeds = [["https://laporteweathernow.com/feeds/npr-tech", "NPR"], ["https://laporteweathernow.com/feeds/ars-ai", "Ars Technica"]];
    const got = await Promise.all(feeds.map(([p, src]) => cached("lpwn_ai_" + p, REFRESH, () => rss(p)).then((items) => (items || []).map((x) => ({ ...x, src })))));
    const seen = new Set();
    return got.flat().filter((x) => x.src !== "NPR" || AI_RE.test(x.title))
      .filter((x) => { const k = x.title.toLowerCase().slice(0, 50); if (seen.has(k)) return false; seen.add(k); return true; })
      .map((x) => ({ ...x, tag: tagOf(x.title) }))
      .sort((a, b) => b.t - a.t);
  }
  function drawNews(news) {
    if (!news.length) { $("aiNews").innerHTML = `<p class="ai-fine">The news feeds didn't answer just now. Read the latest at <a href="https://www.npr.org/sections/technology/" target="_blank" rel="noopener">NPR Technology</a> and <a href="https://arstechnica.com/ai/" target="_blank" rel="noopener">Ars Technica AI</a>.</p>`; return; }
    $("aiNews").innerHTML = `<ul class="ai-news">${news.slice(0, 12).map((x) => `<li>${x.tag ? `<span class="ai-chip ${x.tag}">${SHORT[x.tag]}</span>` : ""}<a href="${esc(safeUrl(x.link))}" target="_blank" rel="noopener">${esc(x.title)}</a><span class="ai-meta">${esc(x.src)} &middot; ${x.t ? ago(x.t) : ""}</span></li>`).join("")}</ul>`;
  }

  // ---------- Live: are AI systems up ----------
  const SERVICES = [
    ["Claude (Anthropic)", "https://status.claude.com/api/v2/status.json", "https://status.claude.com/"],
    ["ChatGPT (OpenAI)", "https://status.openai.com/api/v2/status.json", "https://status.openai.com/"],
    ["Perplexity", "https://status.perplexity.com/api/v2/status.json", "https://status.perplexity.com/"],
    ["Cohere", "https://status.cohere.com/api/v2/status.json", "https://status.cohere.com/"],
    ["Groq", "https://groqstatus.com/api/v2/status.json", "https://groqstatus.com/"],
    ["Cloudflare (runs much of the web)", "https://www.cloudflarestatus.com/api/v2/status.json", "https://www.cloudflarestatus.com/"],
    ["GitHub (runs this site)", "https://www.githubstatus.com/api/v2/status.json", "https://www.githubstatus.com/"],
    ["Netlify (runs La Porte Weather Now)", "https://www.netlifystatus.com/api/v2/status.json", "https://www.netlifystatus.com/"],
  ];
  const LVL = { none: ["ok", "Up"], maintenance: ["info", "Maintenance"], minor: ["warn", "Minor problems"], major: ["bad", "Major outage"], critical: ["bad", "Major outage"] };
  async function loadStatus() {
    const rows = await Promise.all(SERVICES.map(async ([name, api, page]) => {
      try {
        const r = await fetch(api, { cache: "no-store" }); if (!r.ok) throw 0;
        const j = await r.json(); const ind = j && j.status && j.status.indicator;
        return { name, page, ind: LVL[ind] ? ind : "unknown", desc: (j.status && j.status.description) || "" };
      } catch (e) { return { name, page, ind: "unknown", desc: "" }; }
    }));
    let google = null;
    try {
      const r = await fetch("https://status.cloud.google.com/incidents.json", { cache: "no-store" });
      const j = await r.json();
      const open = (Array.isArray(j) ? j : []).filter((i) => !i.end && /gemini|vertex|ai/i.test(JSON.stringify(i.affected_products || i.service_name || "")));
      google = { name: "Google Gemini (Cloud)", page: "https://status.cloud.google.com/", ind: open.length ? "minor" : "none", desc: open.length ? `${open.length} open issue${open.length > 1 ? "s" : ""}` : "" };
    } catch (e) { google = { name: "Google Gemini (Cloud)", page: "https://status.cloud.google.com/", ind: "unknown", desc: "" }; }
    rows.splice(2, 0, google);
    return rows;
  }
  function drawStatus(rows) {
    $("aiStatusList").innerHTML = rows.map((r) => {
      const [cls, word] = LVL[r.ind] || ["unk", "No answer"];
      return `<li><span class="ai-dot ${cls}" aria-hidden="true"></span><a href="${esc(r.page)}" target="_blank" rel="noopener">${esc(r.name)}</a><span class="ai-st ${cls}">${esc(word)}</span></li>`;
    }).join("");
    const bad = rows.filter((r) => r.ind === "major" || r.ind === "critical").length;
    const minor = rows.filter((r) => r.ind === "minor").length;
    $("aiStatusSum").textContent = bad ? `${bad} major outage${bad > 1 ? "s" : ""} right now.` : minor ? `${minor} with minor problems. Everything else is up.` : "Everything we check is up.";
  }

  // ---------- Live: FTC scam alerts ----------
  async function drawFtc() {
    const items = await cached("lpwn_ai_ftc", 3 * 3600e3, () => rss("https://laporteweathernow.com/feeds/ftc-alerts"));
    $("aiFtc").innerHTML = items && items.length
      ? `<ul class="ai-news">${items.slice(0, 4).map((x) => `<li><a href="${esc(safeUrl(x.link))}" target="_blank" rel="noopener">${esc(x.title)}</a><span class="ai-meta">FTC &middot; ${x.t ? when(x.t) : ""}</span></li>`).join("")}</ul>`
      : `<p class="ai-fine">The FTC didn't answer just now. See <a href="https://consumer.ftc.gov/consumer-alerts" target="_blank" rel="noopener">consumer.ftc.gov</a>.</p>`;
  }

  // ---------- Live: jobs (shares the Markets page's BLS numbers) ----------
  async function drawJobs() {
    const rows = (s) => ((s && s.data) || []).filter((d) => /^M\d\d$/.test(d.period) && d.period !== "M13" && isFinite(Number(d.value)))
      .map((d) => ({ y: +d.year, m: +d.period.slice(1), v: +d.value, label: `${d.periodName} ${d.year}` })).sort((a, b) => b.y - a.y || b.m - a.m);
    let data = null;
    const mk = store.get("lpwn_bls_v1");
    if (mk && mk.data && mk.data.lp && mk.data.us && Date.now() - mk.t < 24 * 3600e3) data = mk.data;
    if (!data) data = await cached("lpwn_ai_bls", 12 * 3600e3, async () => {
      // First the site's saved copy (refreshed twice a day), so visitors don't use up BLS's daily limit.
      try {
        const r = await fetch("https://scoopanddude.github.io/laporteweathernow-posts/markets-data.json", { cache: "no-store" });
        const saved = r.ok ? (((await r.json()) || {}).series || {}) : {};
        if (saved.lp || saved.us) return { lp: saved.lp, us: saved.us };
      } catch (e) { /* no saved copy: ask BLS directly */ }
      const out = {};
      await Promise.all([["lp", "LAUCN180910000000003"], ["us", "LNS14000000"]].map(async ([k, id]) => {
        const r = await fetch("https://api.bls.gov/publicAPI/v1/timeseries/data/" + id); const j = await r.json();
        const s = j && j.Results && j.Results.series && j.Results.series[0]; if (s && s.data && s.data.length) out[k] = s;
      }));
      return out.lp || out.us ? out : null;
    });
    const card = (name, list) => {
      if (!list.length) return "";
      const now = list[0], yr = list.find((d) => d.y === now.y - 1 && d.m === now.m);
      const move = yr ? now.v - yr.v : null;
      return `<div class="ai-job"><b>${now.v.toFixed(1)}%</b><span>${esc(name)} unemployment, ${esc(now.label)}${move != null ? `. ${Math.abs(move) < 0.05 ? "Same as" : move > 0 ? `Up ${move.toFixed(1)} from` : `Down ${Math.abs(move).toFixed(1)} from`} a year ago.` : "."}</span></div>`;
    };
    const html = data ? card("La Porte County", rows(data.lp)) + card("U.S.", rows(data.us)) : "";
    $("aiJobs").innerHTML = html || `<p class="ai-fine">The Bureau of Labor Statistics didn't answer just now. See the <a href="../markets/">Markets page</a>.</p>`;
  }

  // ---------- Model Watch ----------
  const LABS = [
    ["OpenAI", "ChatGPT, GPT", /\b(OpenAI|ChatGPT|GPT[-\w.]*|Sam Altman)\b/i, "openai"],
    ["Anthropic", "Claude", /\b(Anthropic|Claude)\b/i, ""],
    ["Google", "Gemini", /\b(Google|Gemini|DeepMind)\b/i, "google"],
    ["Meta", "Llama", /\b(Meta|Llama|Zuckerberg)\b/, "meta-llama"],
    ["xAI", "Grok", /\b(xAI|Grok)\b/, "xai-org"],
    ["Microsoft", "Copilot", /\b(Microsoft|Copilot)\b/, "microsoft"],
    ["DeepSeek", "DeepSeek", /\bDeepSeek\b/i, "deepseek-ai"],
    ["Alibaba", "Qwen", /\b(Alibaba|Qwen)\b/, "Qwen"],
    ["Mistral", "Le Chat, Mistral", /\bMistral\b/, "mistralai"],
    ["Nvidia", "Nemotron, AI chips", /\bNvidia\b/i, "nvidia"],
  ];
  async function loadModels() {
    return cached("lpwn_ai_hf", 6 * 3600e3, async () => {
      const out = {};
      await Promise.all(LABS.filter((l) => l[3]).map(async ([, , , org]) => {
        try {
          const r = await fetch(`https://huggingface.co/api/models?author=${encodeURIComponent(org)}&sort=createdAt&direction=-1&limit=1`);
          const j = await r.json(); if (j && j[0]) out[org] = { id: j[0].id, t: Date.parse(j[0].createdAt) || 0 };
        } catch (e) {}
      }));
      return Object.keys(out).length ? out : null;
    });
  }
  function drawModels(news, hf, statusRows) {
    const stat = (name) => { const r = (statusRows || []).find((x) => x.name.startsWith(name)); return r ? (LVL[r.ind] || ["unk", "No answer"]) : null; };
    const statusFor = { OpenAI: stat("ChatGPT"), Anthropic: stat("Claude"), Google: stat("Google Gemini") };
    $("aiModels").innerHTML = `<table class="ai-table"><thead><tr><th scope="col">Company</th><th scope="col">Is it up?</th><th scope="col">Latest in the news</th><th scope="col">Newest open model</th></tr></thead><tbody>${LABS.map(([name, what, re, org]) => {
      const n = news.find((x) => re.test(x.title));
      const st = statusFor[name];
      const m = hf && org && hf[org];
      return `<tr><th scope="row">${esc(name)}<span>${esc(what)}</span></th>
        <td>${st ? `<span class="ai-st ${st[0]}">${esc(st[1])}</span>` : `<span class="ai-fine">No public status page</span>`}</td>
        <td>${n ? `${n.tag ? `<span class="ai-chip ${n.tag}">${SHORT[n.tag]}</span>` : ""}<a href="${esc(safeUrl(n.link))}" target="_blank" rel="noopener">${esc(n.title)}</a><span class="ai-meta">${esc(n.src)} &middot; ${n.t ? when(n.t) : ""}</span>` : `<span class="ai-fine">Nothing in this week's headlines</span>`}</td>
        <td>${m ? `<a href="https://huggingface.co/${esc(m.id)}" target="_blank" rel="noopener">${esc(m.id.split("/")[1])}</a><span class="ai-meta">${m.t ? when(m.t) : ""}</span>` : `<span class="ai-fine">${org ? "No answer" : "Doesn't publish open models"}</span>`}</td></tr>`;
    }).join("")}</tbody></table>`;
  }

  // ---------- What the news points to ----------
  function suggest(news, statusRows) {
    const recent = news.filter((x) => x.t && Date.now() - x.t < 3 * DAY);
    const count = {}; recent.forEach((x) => { if (x.tag) count[x.tag] = (count[x.tag] || 0) + 1; });
    const bad = (statusRows || []).filter((r) => r.ind === "major" || r.ind === "critical");
    if (bad.length >= 2) return { id: "s3", why: [`${bad.length} major services are down right now`] };
    const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) return { id: best[0], why: [`${best[1]} headlines about ${SHORT[best[0]].toLowerCase()} in the last 3 days`] };
    return { id: "quiet", why: [] };
  }

  let lastRun = 0;
  async function refresh() {
    lastRun = Date.now();
    $("aiUpdated").textContent = "Checking…";
    const [news, statusRows] = await Promise.all([loadNews().catch(() => []), loadStatus().catch(() => [])]);
    drawNews(news); drawStatus(statusRows);
    suggested = suggest(news, statusRows); drawPlan();
    drawModels(news, null, statusRows);
    loadModels().then((hf) => drawModels(news, hf, statusRows));
    drawFtc(); drawJobs();
    $("aiUpdated").textContent = "Updated " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + ". Refreshes every 15 minutes while open.";
  }
  drawPlan();
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, REFRESH);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - lastRun > REFRESH) refresh(); });
})();
