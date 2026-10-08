// Faith page: verse of the day, hymn and word of the week, prayer for today's world, prayer requests.
(function () {
  const D = window.FAITH_DATA;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (!D || !$("fVerse")) return;

  // Today's date in La Porte (Central time), so everyone sees the same verse all day.
  function laPorteDay() {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
    const g = (t) => Number(p.find((x) => x.type === t).value);
    return Math.floor(Date.UTC(g("year"), g("month") - 1, g("day")) / 86400000);
  }
  const day = laPorteDay();
  const week = Math.floor((day + 3) / 7); // weeks start on Monday
  // A stride that shares no factor with the list length walks every verse before repeating, mixing the themes.
  const pick = (n, i, stride) => ((i * stride) % n + n) % n;

  const [ref, text] = D.verses[pick(D.verses.length, day - 20454, 97)];
  $("fVerse").textContent = text;
  $("fVerseRef").textContent = ref + " (KJV)";
  $("fDate").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Chicago" });

  // "Give me another verse": a random one from the same list.
  $("fAnother").addEventListener("click", () => {
    const [r, t] = D.verses[Math.floor(Math.random() * D.verses.length)];
    $("fVerse").textContent = t;
    $("fVerseRef").textContent = r + " (KJV)";
    $("fVerseKind").textContent = "ANOTHER VERSE";
    shown = [r, t];
  });
  let shown = [ref, text];

  // (The daily-verse phone notification stayed with La Porte Weather Now's notification service, Oct. 7, 2026.)

  const shareBtn = $("fShare");
  shareBtn.addEventListener("click", async () => {
    const msg = `"${shown[1]}" ${shown[0]} (KJV)\n\nFrom Scoop & Dude: https://scoopanddude.com/faith/`;
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      shareBtn.textContent = "Copied. Paste it anywhere to share.";
    } catch (e) { /* the visitor closed the share sheet */ }
    if (typeof lpwnTrack === "function") lpwnTrack("faith-share");
  });

  const h = D.hymns[((week % D.hymns.length) + D.hymns.length) % D.hymns.length];
  $("fHymnTitle").textContent = h.title;
  $("fHymnAuthor").textContent = h.author;
  $("fHymn").innerHTML = h.verses.map((v) => {
    const refrain = /^\(Refrain\)\n/.test(v);
    const lines = esc(v.replace(/^\(Refrain\)\n/, "")).replace(/\n/g, "<br>");
    return refrain ? `<p class="f-refrain"><span>Refrain</span><br>${lines}</p>` : `<p>${lines}</p>`;
  }).join("");

  const w = D.words[(((week + 5) % D.words.length) + D.words.length) % D.words.length];
  $("fWord").innerHTML = `<div class="f-orig" lang="${w.lang === "Hebrew" ? "he" : "grc"}" dir="${w.lang === "Hebrew" ? "rtl" : "ltr"}">${esc(w.orig)}</div>
    <h3>${esc(w.word)} <span class="f-lang">${esc(w.lang)}</span></h3>
    <p class="f-kjv">In ${esc(w.ref)}, the King James Version says <strong>&ldquo;${esc(w.kjv)}&rdquo;</strong>.</p>
    <p>${esc(w.meaning)}</p>`;

  // Prayer for today's world, from the same alert system as World Disaster Watch.
  const places = (list) => {
    const out = [];
    list.forEach((e) => { if (e.where && out.indexOf(e.where) < 0) out.push(e.where); });
    return out.slice(0, 4);
  };
  fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const W = window.lpwnDisasters;
      if (!json || !W) return;
      const serious = W.sortEvents(W.fromGdacs(json)).filter((e) => e.level !== "green");
      const where = places(serious);
      if (!where.length) return;
      // "the Philippines", "the United States" read naturally; plain country names don't take "the".
      const the = (n) => (/^(Philippines|Bahamas|Maldives|Netherlands|Gambia|Comoros|Seychelles|Solomon Islands|Marshall Islands|Cayman Islands|Virgin Islands|United |Republic |Democratic Republic|Central African|Dominican Republic|Czech Republic)/.test(n) ? "the " + n : n);
      const named = where.map(the);
      const list = named.length === 1 ? named[0] : named.slice(0, -1).join(", ") + " and " + named[named.length - 1];
      $("fPrayer").innerHTML = `Lord, today we lift up the people of <strong>${esc(list)}</strong>, facing ${serious.length === 1 ? "a disaster" : "disasters"} right now. Shelter them, comfort those who grieve, and strengthen everyone helping. Show us how to love our neighbors near and far. In Jesus' name, amen.`;
      $("fPrayerMore").innerHTML = `<a href="https://laporteweathernow.com/disasters">See what's happening and how to help &rarr;</a>`;
    })
    .catch(() => {});

  // Prayer requests go privately to Scoop's email (Netlify form notification).
  const form = $("fPrayerForm");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const status = $("fPrayerStatus");
    const btn = form.querySelector('button[type="submit"]');
    if (!form.querySelector('[name="request"]').value.trim()) { status.textContent = "Write what you'd like prayer for."; return; }
    btn.disabled = true;
    try {
      await fetch("https://laporteweathernow.com/", { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
      form.reset();
      status.textContent = "Thank you. Your request came through, and we'll be praying for you.";
      if (typeof lpwnTrack === "function") lpwnTrack("prayer-request");
    } catch (e) {
      status.textContent = "Sorry, that didn't go through. Please try again in a minute, or email laporteweathernow@gmail.com.";
    } finally {
      btn.disabled = false;
    }
  });
})();
