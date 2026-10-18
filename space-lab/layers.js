/* Yuyu's Space Lab: extra layers for the Explore Earth globe. Loaded only after the globe is ready. */
(function () {
  "use strict";
  const G = window.slGlobe, E = window.slEarth;
  if (!G || !E) return;
  const $ = (id) => document.getElementById(id);
  const info = $("exLayerInfo");
  const on = {};
  const cebuTime = (t) => new Date(t).toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: "short", hour: "numeric", minute: "2-digit" }) + " Cebu time";
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} hours ago`; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function pin(ic, label, onTap, cls) {
    return () => {
      const d = document.createElement("div");
      d.className = "ex-pin " + (cls || "small");
      d.innerHTML = ic + (label ? `<span>${esc(label)}</span>` : "");
      d.setAttribute("role", "button"); d.setAttribute("aria-label", label || "pin");
      d.addEventListener("click", (e) => { e.stopPropagation(); onTap(); });
      d.addEventListener("pointerdown", (e) => e.stopPropagation());
      return d;
    };
  }
  function fly(lat, lng, alt) { E.setSpin(false); G.pointOfView({ lat, lng, altitude: alt || 1.6 }, 1400); }
  function setInfo(html) { info.hidden = !html; info.innerHTML = html || ""; }

  // ---------- data ----------
  const VOLCANOES = [
    ["Mayon", 13.257, 123.685, "The Philippines' most active volcano, famous for its almost perfect cone. Its name comes from \"Daragang Magayon\", which means beautiful lady."],
    ["Taal", 14.002, 120.993, "A volcano on an island in a lake, on the island of Luzon. It's small but very active. It erupted in January 2020 and sent ash high into the sky."],
    ["Pinatubo", 15.13, 120.35, "Its 1991 eruption was the second-biggest of the 1900s. It threw so much ash and gas into the sky that the whole planet cooled down a little for about a year!"],
    ["Kanlaon", 10.412, 123.132, "Your neighbor! It's on Negros, the island right next to Cebu. At 2,465 meters it's the highest mountain in the Visayas, and it erupted in December 2024."],
    ["Mount Fuji", 35.36, 138.73, "Japan's tallest mountain, 3,776 meters. It last erupted in 1707, and it's still an active volcano that scientists watch closely."],
    ["Kīlauea", 19.41, -155.29, "One of the most active volcanoes on Earth, in Hawaiʻi. Its runny lava sometimes flows all the way into the ocean and makes brand-new land!"],
    ["Mauna Loa", 19.48, -155.6, "The biggest active volcano on Earth. Measured from its base on the sea floor, it's taller than Mount Everest."],
    ["Mount St. Helens", 46.2, -122.18, "In 1980 its whole top blew off sideways. The mountain lost about 400 meters of height in one morning."],
    ["Krakatoa", -6.1, 105.42, "Its 1883 eruption made one of the loudest sounds in history. People heard it almost 4,800 km away!"],
    ["Mount Vesuvius", 40.82, 14.43, "In the year 79 it buried the Roman town of Pompeii under ash. Scientists dig there today to learn how Romans lived."],
    ["Mount Etna", 37.75, 14.99, "Europe's tallest active volcano, on the island of Sicily. It erupts very often, and farmers grow food on its rich soil."],
    ["Popocatépetl", 19.02, -98.62, "Its name means \"smoking mountain\" in the Aztec language, Nahuatl. It puffs out steam and ash near Mexico City."],
    ["Cotopaxi", -0.68, -78.44, "One of the highest active volcanoes in the world, 5,897 meters, almost on the equator in Ecuador. It has a snowy top!"],
    ["Eyjafjallajökull", 63.63, -19.62, "A volcano under a glacier in Iceland. In 2010 its ash cloud stopped airplanes all over Europe for days. Try saying its name: AY-uh-fyat-luh-YO-kuul!"],
    ["Mount Erebus", -77.53, 167.15, "The southernmost active volcano, in Antarctica. It has a bubbling lake of lava inside it, surrounded by ice!"]
  ];
  // The Pacific Ring of Fire, roughly traced along the trenches and volcano chains
  const RING = [[-55,-70],[-40,-73],[-25,-70],[-10,-78],[0,-80],[8,-84],[14,-91],[19,-104],[32,-117],[40,-124],[49,-126],[58,-137],[60,-152],[55,-162],[52,-175],[52,170],[55,162],[50,157],[45,150],[38,142],[33,135],[27,128],[22,121],[14,120],[10,126],[5,126],[0,127],[-4,128],[-6,105],[-8,115],[-9,124],[-6,140],[-6,150],[-10,160],[-16,168],[-20,175],[-22,-175],[-30,-178],[-38,177],[-46,167]];
  const ANIMALS = [
    { n: "The Philippines", lat: 9.8, lng: 124.2, ic: "🐒", a: [
      ["Philippine tarsier", "Lives in Bohol, near Cebu. It's one of the smallest primates, and each eye is about as big as its whole brain! It can turn its head almost all the way around."],
      ["Philippine eagle", "The national bird and one of the biggest eagles in the world, with wings about 2 meters across. Only a few hundred pairs are left, so people protect them."],
      ["Whale shark", "The biggest fish in the sea, longer than a bus. Visitors swim with them at Oslob in southern Cebu. They eat tiny plankton, not people!"],
      ["Tamaraw", "A small wild buffalo that lives only on the island of Mindoro. It's critically endangered."] ] },
    { n: "Asia", lat: 35, lng: 100, ic: "🐼", a: [
      ["Giant panda", "Eats bamboo for most of the day, often 12 hours or more. A baby panda is about the size of a stick of butter when it's born!"],
      ["Tiger", "The biggest wild cat. No two tigers have the same stripes, just like your fingerprints."],
      ["Komodo dragon", "The biggest lizard in the world, about 3 meters long, found on a few islands in Indonesia."],
      ["Orangutan", "Lives in the treetops of Borneo and Sumatra and builds a new leafy nest to sleep in every night."] ] },
    { n: "Africa", lat: 2, lng: 22, ic: "🐘", a: [
      ["African elephant", "The biggest animal on land. It uses its trunk to drink, smell, hug and even snorkel!"],
      ["Giraffe", "The tallest animal. Its neck has 7 bones, the same number as yours, but each one is huge."],
      ["Cheetah", "The fastest land animal, able to sprint about 100 km per hour for a short burst."],
      ["Gorilla", "The biggest primate. Gorillas live in family groups and can learn to use simple tools."] ] },
    { n: "South America", lat: -8, lng: -60, ic: "🦥", a: [
      ["Sloth", "Moves so slowly that tiny green algae grow in its fur, which helps it hide in the trees."],
      ["Jaguar", "The biggest cat in the Americas, and a great swimmer."],
      ["Poison dart frog", "Tiny and brightly colored. The bright colors warn other animals: don't eat me!"],
      ["Capybara", "The biggest rodent in the world, like a giant guinea pig that loves to swim."] ] },
    { n: "North America", lat: 48, lng: -100, ic: "🦅", a: [
      ["Bald eagle", "The national bird of the USA. Its nest can weigh as much as a small car."],
      ["Grizzly bear", "Sleeps through much of the winter and can smell food from kilometers away."],
      ["Monarch butterfly", "Some fly about 4,000 km from Canada and the USA to Mexico every autumn."] ] },
    { n: "Australia", lat: -25, lng: 134, ic: "🦘", a: [
      ["Kangaroo", "Can't walk backward easily, and a baby (a joey) lives in its mother's pouch."],
      ["Koala", "Sleeps up to about 20 hours a day, because its leafy food gives it little energy."],
      ["Platypus", "A mammal that lays eggs and has a bill like a duck. Scientists first thought it was a joke!"] ] },
    { n: "Europe", lat: 52, lng: 15, ic: "🦔", a: [
      ["Hedgehog", "Has about 5,000 to 7,000 spines and rolls into a prickly ball when scared."],
      ["Red fox", "Can hear a mouse squeak from far away and pounces on it through snow."],
      ["Atlantic puffin", "A seabird with a colorful beak that can carry 10 or more small fish at once."] ] },
    { n: "Antarctica", lat: -75, lng: 0, ic: "🐧", a: [
      ["Emperor penguin", "The biggest penguin. The fathers keep the egg warm on their feet for about two months in the freezing dark."],
      ["Weddell seal", "Can hold its breath for over an hour and stays under the sea ice all winter."] ] },
    { n: "The oceans", lat: -30, lng: -140, ic: "🐋", a: [
      ["Blue whale", "The biggest animal that has ever lived, bigger than any dinosaur. Its heart is the size of a small car."],
      ["Octopus", "Has three hearts and blue blood, and can change color in less than a second."],
      ["Sea turtle", "Some swim thousands of kilometers and come back to the same beach where they hatched."] ] }
  ];

  // ---------- layer state ----------
  let quakes = [], storms = [], iss = null, issTrail = [], issTimer = null, follow = false;
  function redraw() {
    const base = (on.volcanoes || on.animals) ? E.PLACES.filter((p) => p.home || p.uncle) : E.PLACES;
    let els = base.slice();
    if (on.volcanoes) els = els.concat(VOLCANOES.map(([n, lat, lng, f]) => ({ lat, lng, el: pin("🌋", n, () => { E.card(`<b class="t">🌋 ${n}</b>${f}`); fly(lat, lng, 1.2); }) })));
    if (on.animals) els = els.concat(ANIMALS.map((r) => ({ lat: r.lat, lng: r.lng, el: pin(r.ic, r.n, () => showAnimals(r), "home") })));
    if (on.clouds) els = els.concat(storms.map((s) => ({ lat: s.lat, lng: s.lng, el: pin("🌀", s.name.replace("Tropical Cyclone ", ""), () => E.card(`<b class="t">🌀 ${esc(s.name)}</b>${esc(s.desc)}<br>Alert level: <b>${esc(s.level)}</b> (green is the lowest, red the most dangerous). Data from GDACS, last updated ${esc(s.when)}.`)) })));
    if (on.iss && iss) els.push({ lat: iss.latitude, lng: iss.longitude, alt: 0.06, el: pin("🛰️", "ISS", () => E.card(issText()), "home") });
    G.htmlElementsData(els).htmlAltitude((d) => d.alt || 0);
    const paths = [];
    if (on.volcanoes) paths.push({ pts: RING, c: "rgba(255,90,40,.95)" });
    if (on.iss && issTrail.length > 1) {
      // split the trail where it crosses the date line so it doesn't draw a line across the globe
      let seg = [issTrail[0]];
      for (let i = 1; i < issTrail.length; i++) { if (Math.abs(issTrail[i][1] - issTrail[i - 1][1]) > 180) { paths.push({ pts: seg, c: "rgba(255,194,51,.95)" }); seg = []; } seg.push(issTrail[i]); }
      paths.push({ pts: seg, c: "rgba(255,194,51,.95)" });
    }
    G.pathsData(paths).pathPoints("pts").pathPointLat((p) => p[0]).pathPointLng((p) => p[1]).pathColor((d) => d.c).pathStroke(2).pathPointAlt(0.01).pathTransitionDuration(0);
    G.pointsData(on.quakes ? quakes : []).pointLat("lat").pointLng("lng").pointColor("c").pointAltitude((d) => 0.01 + d.mag * 0.025).pointRadius((d) => 0.15 + d.mag * 0.12).pointsMerge(false)
      .pointLabel((d) => `M${d.mag.toFixed(1)} ${esc(d.place)}`)
      .onPointClick((d) => { E.card(`<b class="t">🌐 Magnitude ${d.mag.toFixed(1)} earthquake</b>${esc(d.place)}<br>${cebuTime(d.time)} (${ago(d.time)}). ${magWords(d.mag)}`); });
  }
  function magWords(m) {
    if (m < 2.5) return "Too small for people to feel. Only special machines called seismometers notice it.";
    if (m < 4) return "Some people nearby might feel a little shake, like a big truck driving past.";
    if (m < 5) return "People nearby feel it. Things on shelves might rattle.";
    if (m < 6) return "A strong shake. It can crack walls near the center.";
    if (m < 7) return "A powerful earthquake that can damage buildings near it.";
    return "A major earthquake! These are rare and very strong.";
  }

  // ---------- each layer ----------
  async function loadQuakes() {
    setInfo(`<h3>🌐 Earthquakes in the last 24 hours</h3>Loading the newest list from the U.S. Geological Survey&hellip;`);
    try {
      const r = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
      const j = await r.json();
      quakes = j.features.filter((f) => f.properties.mag != null).map((f) => { const m = Math.max(0, f.properties.mag); return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], mag: m, place: f.properties.place || "Somewhere on Earth", time: f.properties.time, c: m >= 5 ? "#ff3b30" : m >= 4 ? "#ff9500" : m >= 2.5 ? "#ffcc00" : "#7fd1ff" }; });
      const big = quakes.slice().sort((a, b) => b.mag - a.mag)[0];
      setInfo(`<h3>🌐 ${quakes.length} earthquakes in the last 24 hours</h3>The Earth shakes all the time! Each dot is a real earthquake. Taller, redder dots are stronger. Tap one to see where and when.
        <div class="ex-legend" style="margin-top:8px"><span><i style="background:#7fd1ff"></i>under 2.5</span><span><i style="background:#ffcc00"></i>2.5&ndash;4</span><span><i style="background:#ff9500"></i>4&ndash;5</span><span><i style="background:#ff3b30"></i>5 and up</span></div>
        <p style="margin:8px 0 0"><b>What's magnitude?</b> It's a number for how much energy an earthquake lets out. Each step up is about 32 times more energy, so a magnitude 6 is about 1,000 times stronger than a magnitude 4!</p>
        ${big ? `<p style="margin:8px 0 0">Biggest today: <b>M${big.mag.toFixed(1)}</b>, ${esc(big.place)}.</p><div class="row"><button type="button" id="qBig">Fly to the biggest one</button></div>` : ""}
        <p style="margin:8px 0 0;font-size:13px;opacity:.8">Data: USGS, updated every few minutes. Loaded ${cebuTime(Date.now())}.</p>`);
      const b = $("qBig"); if (b) b.onclick = () => { fly(big.lat, big.lng, 1.4); E.card(`<b class="t">🌐 Magnitude ${big.mag.toFixed(1)} earthquake</b>${esc(big.place)}<br>${cebuTime(big.time)} (${ago(big.time)}). ${magWords(big.mag)}`); };
    } catch (e) { setInfo(`<h3>🌐 Earthquakes</h3>The earthquake list couldn't load right now. Try again in a minute.`); }
    redraw();
  }
  function volcanoInfo() {
    setInfo(`<h3>🌋 The Ring of Fire</h3>The red line traces the <b>Ring of Fire</b>, a giant horseshoe around the Pacific Ocean where about 3 out of every 4 of the world's active volcanoes are, and most big earthquakes happen. The Philippines sits right on it!
      <p style="margin:8px 0 0"><b>Why?</b> The Earth's outer shell is cracked into huge pieces called <b>plates</b>, like a broken eggshell. They float on hot, soft rock and move about as fast as your fingernails grow. Where one plate slides under another, rock melts into magma, which pushes up through volcanoes. And when plates get stuck and then slip, we feel an earthquake.</p>
      <p style="margin:8px 0 0">Tap a 🌋 to learn about famous volcanoes.</p>`);
    fly(15, 150, 2.6);
  }
  function showAnimals(r) {
    fly(r.lat, r.lng, 1.8);
    setInfo(`<h3>${r.ic} Animals of ${r.n}</h3><div class="ex-animals">${r.a.map(([n, f]) => `<div><b>${n}</b><br>${f}</div>`).join("")}</div>`);
    E.card(`<b class="t">${r.ic} ${r.n}</b>Look below the globe for the animals that live here!`);
  }
  function issText() {
    if (!iss) return `<b class="t">🛰️ Space station</b>Finding it&hellip;`;
    return `<b class="t">🛰️ The International Space Station, right now</b>Flying <b>${Math.round(iss.velocity).toLocaleString("en-US")} km per hour</b>, <b>${Math.round(iss.altitude)} km</b> above the Earth, over ${iss.latitude.toFixed(1)}°, ${iss.longitude.toFixed(1)}°. It's ${iss.visibility === "daylight" ? "in sunlight" : "in the Earth's shadow (nighttime for the astronauts)"}.`;
  }
  async function issTick() {
    try {
      const r = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
      iss = await r.json();
      issTrail.push([iss.latitude, iss.longitude]); if (issTrail.length > 400) issTrail.shift();
      const s = $("issLive"); if (s) s.innerHTML = `Speed <b>${Math.round(iss.velocity).toLocaleString("en-US")} km/h</b> &middot; height <b>${Math.round(iss.altitude)} km</b> &middot; updated ${new Date(iss.timestamp * 1000).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", second: "2-digit" })} Cebu time`;
      if (follow) G.pointOfView({ lat: iss.latitude, lng: iss.longitude, altitude: 1.8 }, 900);
      redraw();
    } catch (e) { const s = $("issLive"); if (s) s.textContent = "Couldn't reach the space station tracker. Trying again…"; }
  }
  async function issStart() {
    setInfo(`<h3>🛰️ The space station, live</h3>The yellow line is the path it just flew. It goes around the whole Earth in about 90 minutes, so watch it move!
      <p id="issLive" style="margin:8px 0 0">Finding the space station&hellip;</p>
      <div class="row"><button type="button" id="issFollow">Follow the ISS 🎥</button></div>
      <p id="issPass" style="margin:8px 0 0">Working out when it next flies over Cebu&hellip;</p>
      <p style="margin:8px 0 0;font-size:13px;opacity:.8">Position from wheretheiss.at, every 5 seconds. Pass times worked out from the newest orbit data (CelesTrak).</p>`);
    $("issFollow").onclick = () => { follow = !follow; E.setSpin(false); $("issFollow").textContent = follow ? "Stop following" : "Follow the ISS 🎥"; if (follow && iss) G.pointOfView({ lat: iss.latitude, lng: iss.longitude, altitude: 1.8 }, 900); };
    // seed the trail with the last ~45 minutes so there's a line right away
    try {
      const now = Math.floor(Date.now() / 1000), ts = []; for (let i = 45; i >= 1; i -= 1.5) ts.push(Math.round(now - i * 60));
      const r = await fetch("https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=" + ts.join(","));
      issTrail = (await r.json()).map((p) => [p.latitude, p.longitude]);
    } catch (e) {}
    await issTick();
    if (iss) fly(iss.latitude, iss.longitude, 2);
    issTimer = setInterval(issTick, 5000);
    nextPass();
  }
  function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  async function nextPass() {
    const out = $("issPass");
    try {
      if (!window.satellite) await loadScript("https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js");
      const tle = (await (await fetch("https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE")).text()).trim().split("\n").map((x) => x.trim());
      const sat = satellite.twoline2satrec(tle[1], tle[2]);
      const obs = { latitude: satellite.degreesToRadians(10.32), longitude: satellite.degreesToRadians(123.89), height: 0.05 };
      const elev = (t) => { const pv = satellite.propagate(sat, t); if (!pv.position) return -90; const ecf = satellite.eciToEcf(pv.position, satellite.gstime(t)); return satellite.radiansToDegrees(satellite.ecfToLookAngles(obs, ecf).elevation); };
      // Sun direction (low-precision formula, good to a fraction of a degree)
      const sunAt = (t) => { const d = (t - Date.UTC(2000, 0, 1, 12)) / 864e5, r = Math.PI / 180;
        const g = (357.529 + 0.98560028 * d) * r, q = 280.459 + 0.98564736 * d, L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r, e = (23.439 - 0.00000036 * d) * r;
        return [Math.cos(L), Math.cos(e) * Math.sin(L), Math.sin(e) * Math.sin(L)]; };
      const sunElevCebu = (t) => { const s = sunAt(t), dec = Math.asin(s[2]), ra = Math.atan2(s[1], s[0]);
        const lst = satellite.gstime(new Date(t)) + satellite.degreesToRadians(123.89), H = lst - ra, la = satellite.degreesToRadians(10.32);
        return satellite.radiansToDegrees(Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H))); };
      const sunlit = (t) => { const pv = satellite.propagate(sat, new Date(t)); if (!pv.position) return false; const p = pv.position, s = sunAt(t);
        const dot = p.x * s[0] + p.y * s[1] + p.z * s[2]; if (dot > 0) return true; const perp2 = p.x * p.x + p.y * p.y + p.z * p.z - dot * dot; return perp2 > 6371 * 6371; };
      const passes = []; let t = Date.now(), inPass = null;
      for (let i = 0; i < 7 * 24 * 120 && passes.filter((p) => p.vis).length < 3; i++, t += 30000) {
        const e = elev(new Date(t));
        if (e > 10) {
          const v = sunlit(t) && sunElevCebu(t) < -6;
          if (!inPass) inPass = { start: t, max: e, vis: v, visStart: v ? t : 0 };
          else { inPass.max = Math.max(inPass.max, e); if (v && !inPass.vis) { inPass.vis = true; inPass.visStart = t; } }
        } else if (inPass) { inPass.end = t; passes.push(inPass); inPass = null; }
      }
      if (!out) return;
      const vis = passes.filter((p) => p.vis).slice(0, 3);
      out.innerHTML = vis.length ? `<b>When you can see it from Cebu</b> (if the sky is clear):<br>` + vis.map((p) => `• <b>${cebuTime(p.visStart)}</b>, up to ${Math.round(p.max)}° high${p.max > 60 ? " (almost straight overhead!)" : ""}`).join("<br>") + `<br><span style="font-size:14px">Look for a bright, steady dot sliding across the sky, faster than an airplane and with no blinking lights. You can only see it when your sky is dark but the station up high is still in sunlight, so it's always a little after sunset or before sunrise.</span>` : "No good chances to see it from Cebu in the next week. It flies over, but always in daylight or in the Earth's shadow. Check again next week!";
    } catch (e) { if (out) out.textContent = "Couldn't work out the next pass right now. NASA's Spot the Station has the times too."; }
  }
  function yday() { const d = new Date(Date.now() - 864e5); return d.toISOString().slice(0, 10); }
  async function cloudsOn() {
    const day = yday();
    G.globeImageUrl(`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=4096&HEIGHT=2048&FORMAT=image/jpeg&TIME=${day}`);
    setInfo(`<h3>☁️ Real clouds from space</h3>This is a real picture of the whole Earth from <b>${new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</b> (yesterday), stitched together from a NASA satellite that flies over every part of the planet once a day. It's not live: today's picture isn't finished yet! The black stripes are gaps between the satellite's passes, and the big dark circle near a pole is <b>polar night</b>: in winter, the Sun doesn't rise there at all, so the camera sees only darkness.
      <p id="stormList" style="margin:8px 0 0">Looking for tropical storms and typhoons&hellip;</p>
      <p style="margin:8px 0 0;font-size:13px;opacity:.8">Pictures: NASA GIBS / Worldview (VIIRS). Storms: GDACS (Global Disaster Alert and Coordination System). For real warnings in the Philippines, always listen to PAGASA.</p>`);
    try {
      const from = new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10), to = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
      const j = await (await fetch(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC&alertlevel=green;orange;red&fromDate=${from}&toDate=${to}`)).json();
      const seen = {};
      storms = (j.features || []).filter((f) => { const p = f.properties; if (seen[p.eventid]) return false; seen[p.eventid] = 1; return p.iscurrent === "true" || p.iscurrent === true || new Date(p.todate) > Date.now() - 2 * 864e5; })
        .map((f) => ({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: f.properties.name, desc: (f.properties.htmldescription || "").replace(/<[^>]*>/g, ""), level: f.properties.alertlevel, when: f.properties.todate ? new Date(f.properties.todate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "recently" }));
      const s = $("stormList");
      if (s) s.innerHTML = storms.length ? `<b>${storms.length} tropical storm${storms.length > 1 ? "s" : ""} in the last few days</b> (🌀 on the globe): ${storms.map((x) => esc(x.name.replace("Tropical Cyclone ", ""))).join(", ")}. In the Philippines these are called typhoons when they get very strong.` : "No tropical storms anywhere right now. Calm seas!";
    } catch (e) { const s = $("stormList"); if (s) s.textContent = "Couldn't load the storm list right now."; }
    redraw();
  }
  const DRIFT = [["250", "250 million years ago (Permian)", "All the land was stuck together in one giant supercontinent called <b>Pangaea</b>. The very first dinosaurs hadn't appeared yet; they came about 20 million years later."],
    ["200", "200 million years ago (Triassic)", "Pangaea is starting to split into two pieces: <b>Laurasia</b> in the north and <b>Gondwana</b> in the south. Early dinosaurs are running around."],
    ["145", "145 million years ago (Jurassic)", "The Atlantic Ocean is starting to open up. Giant long-necked dinosaurs like Brachiosaurus live now."],
    ["65", "65 million years ago (end of the Cretaceous)", "The continents look almost like today. Around this time, about 66 million years ago, a huge asteroid hit the Earth and the big dinosaurs died out."],
    ["0", "Today", "The plates are still moving, a few centimeters a year! In about 250 million years, the continents may crash together into a new supercontinent."]];
  function dinosOn() {
    setInfo(`<h3>🦖 Dinosaur Earth: watch the continents move</h3>Slide back in time. The land under your feet has been slowly drifting for hundreds of millions of years!
      <div class="ex-drift"><input type="range" id="driftR" min="0" max="4" step="1" value="0" aria-label="Go back in time"><b id="driftT"></b><img id="driftI" alt="" width="312" height="196"><span id="driftF"></span></div>
      <p style="margin:8px 0 0;font-size:13px;opacity:.8">Maps: U.S. Geological Survey, "This Dynamic Earth" (public domain). These are flat maps, so the globe above stays as today's Earth.</p>`);
    const set = () => { const d = DRIFT[+$("driftR").value]; $("driftT").innerHTML = d[1]; $("driftI").src = `/space-lab/img/drift-${d[0]}.png`; $("driftI").alt = "Map of the continents " + d[1]; $("driftF").innerHTML = d[2]; };
    $("driftR").oninput = set; set();
  }

  // ---------- toggles ----------
  const NIGHT = () => document.getElementById("exNight").getAttribute("aria-pressed") === "true";
  function toggle(l, b) {
    const want = b.getAttribute("aria-pressed") !== "true";
    // panels that use the info box are exclusive with each other, data layers can stack
    document.querySelectorAll("#exLayers button").forEach((x) => { if (x !== b && want) { x.setAttribute("aria-pressed", "false"); stop(x.dataset.l); } });
    b.setAttribute("aria-pressed", String(want));
    if (!want) { stop(l); setInfo(""); redraw(); return; }
    on[l] = true;
    if (l === "quakes") loadQuakes();
    if (l === "volcanoes") { volcanoInfo(); redraw(); }
    if (l === "iss") issStart();
    if (l === "clouds") cloudsOn();
    if (l === "animals") { setInfo(`<h3>🐾 Animal map</h3>Tap a big animal pin to meet the animals that live there. Start with the Philippines!`); redraw(); fly(20, 120, 2.6); }
    if (l === "dinos") dinosOn();
    try { if (window.slBadge) window.slBadge("earth-" + l); } catch (e) {}
  }
  function stop(l) {
    if (!on[l]) return; on[l] = false;
    if (l === "iss") { clearInterval(issTimer); follow = false; }
    if (l === "clouds") G.globeImageUrl(E.IMG + (NIGHT() ? "earth-night.jpg" : "earth-blue-marble.jpg"));
  }
  $("exLayers").addEventListener("click", (e) => { const b = e.target.closest("[data-l]"); if (b) toggle(b.dataset.l, b); });
  window.slLayers = { on, toggle };
})();
