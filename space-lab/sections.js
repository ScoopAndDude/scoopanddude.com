/* Yuyu's Space Lab: Experiment of the week, Solar system, Ocean deep dive, Dinosaurs, Daily quiz, Ask Uncle. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const badge = (k) => { try { if (window.slBadge) window.slBadge(k); } catch (e) {} };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const cebuDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(d || new Date());

  // =============== 7. Experiment of the week ===============
  const EXPS = [
    { ic: "🌋", n: "Baking-soda volcano", m: ["2 big spoons of baking soda", "Half a cup of vinegar", "A few drops of dish soap", "Food coloring (red is best!)", "A cup or small bottle, on a tray"],
      s: ["Put the cup on a tray (it gets messy!).", "Add the baking soda, dish soap and food coloring to the cup.", "Guess first: how high will it foam?", "Pour in the vinegar and stand back!"],
      w: "Baking soda is a <b>base</b> and vinegar is an <b>acid</b>. When they meet, they react and make a gas called <b>carbon dioxide</b>, the same gas that makes soda fizzy. The soap traps the gas in bubbles, so it foams up like lava.", safe: "Ask a grown-up first. Vinegar stings if it gets in your eyes, so don't lean over the cup." },
    { ic: "💎", n: "Grow salt crystals", m: ["Hot water from the tap (a grown-up helps)", "Salt (lots!)", "A clear glass", "A piece of string and a pencil", "A dark piece of paper (optional)"],
      s: ["Stir salt into the warm water, a spoon at a time, until no more will dissolve.", "Tie the string to the pencil and lay the pencil across the glass so the string hangs in the water.", "Put the glass somewhere it won't be bumped.", "Check every day for a week. Draw what you see!"],
      w: "Warm water can hold lots of dissolved salt. As the water slowly evaporates, there isn't enough water left to hold all the salt, so the salt comes back out and its tiny pieces stack up in neat cube shapes. Those are <b>crystals</b>. Look closely: salt crystals are tiny cubes!", safe: "A grown-up should handle the hot water. Don't drink the salty water." },
    { ic: "🌈", n: "Make a rainbow", m: ["A clear glass of water", "Sunshine (or a bright flashlight)", "A sheet of white paper"],
      s: ["Fill the glass with water and set it on a sunny windowsill or table.", "Put the white paper on the floor or table where the light shines through the glass.", "Move the paper and glass around until you see a rainbow.", "Can you name all the colors? Red, orange, yellow, green, blue, violet."],
      w: "Sunlight looks white, but it's really all the colors mixed together. When light goes from air into water and back out, it bends, and each color bends a different amount. So the colors spread apart into a rainbow! Raindrops do the same thing in the sky.", safe: "Never look straight at the Sun." },
    { ic: "🧻", n: "Walking water", m: ["3 clear cups", "2 paper towels", "Water", "Red and blue food coloring"],
      s: ["Line up the cups. Fill the first and third with water.", "Add red coloring to one and blue to the other.", "Fold each paper towel into a strip. Put one end in a full cup and the other in the empty middle cup.", "Wait an hour. What color appears in the middle cup?"],
      w: "Paper towels are full of tiny gaps between their fibers. Water creeps up into the gaps, even upward against gravity! This is called <b>capillary action</b>, and it's how plants pull water up from their roots. Red and blue mix to make purple.", safe: "Food coloring stains, so wear old clothes." },
    { ic: "🥚", n: "Floating egg", m: ["An uncooked egg", "A tall glass of water", "Salt (about 6 big spoons)", "A spoon"],
      s: ["Gently put the egg in plain water. Does it sink or float?", "Take the egg out. Stir in salt until it dissolves.", "Guess first, then put the egg back in.", "Try adding plain water slowly on top. Can you make the egg float in the middle?"],
      w: "An egg is a little heavier than the same amount of plain water, so it sinks. Salt makes water <b>denser</b> (more stuff packed in the same space). When the water is denser than the egg, the egg floats! That's why people float more easily in the very salty Dead Sea.", safe: "Wash your hands after touching raw eggs." },
    { ic: "🎈", n: "Balloon static magic", m: ["A balloon", "Your hair (or a wool sweater)", "Tiny bits of paper", "A thin stream of water from a tap"],
      s: ["Blow up the balloon and tie it.", "Rub it on your hair for about 10 seconds.", "Hold it just above the paper bits. What happens?", "Now hold it near a thin stream of tap water, without touching. Watch the water bend!"],
      w: "Everything is made of tiny particles, some with electric charges. Rubbing moves tiny charged particles called <b>electrons</b> from your hair onto the balloon. The charged balloon pulls on the paper and the water. It's the same kind of electricity as lightning, just much, much smaller!", safe: "Balloon pieces can choke you: a grown-up should clean up any popped balloon." },
    { ic: "🚁", n: "Paper helicopter", m: ["A strip of paper (about 4 cm by 20 cm)", "Scissors (ask a grown-up)", "A paper clip"],
      s: ["Cut down the middle of the top half of the strip to make two wings.", "Fold one wing forward and one backward.", "Fold up the bottom and add a paper clip.", "Drop it from up high. Then try longer or shorter wings: which falls slowest?"],
      w: "As it falls, air pushes up against the wings. Because the wings are tilted, the push makes the helicopter spin, and spinning slows its fall. That push is called <b>air resistance</b>. Maple seeds spin the same way so the wind can carry them far!", safe: "Ask a grown-up to help with scissors, and don't climb anything unsafe to drop it." },
    { ic: "🫧", n: "Homemade lava lamp", m: ["A clear bottle or tall glass", "Water (fill a quarter)", "Cooking oil (fill the rest)", "Food coloring", "A fizzy tablet (like an antacid) or a pinch of salt"],
      s: ["Pour water into the bottle, then the oil on top. Wait for them to separate.", "Add a few drops of food coloring and watch them sink through the oil.", "Drop in a piece of fizzy tablet (or sprinkle salt).", "Watch the colored blobs go up and down!"],
      w: "Oil and water don't mix, and oil is less dense, so it floats on top. The fizzy tablet makes gas bubbles that grab colored water and carry it up. At the top the bubbles pop and the heavier water sinks back down.", safe: "A grown-up should keep the tablets. Don't drink anything you used." }
  ];
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); }
  const thisWeek = isoWeek(new Date()) % EXPS.length;
  function expCard(i) {
    const x = EXPS[i];
    $("eowCard").innerHTML = `<div class="xs-exp"><div class="xs-big" aria-hidden="true">${x.ic}</div><h3>${i === thisWeek ? "This week: " : ""}${x.n}</h3>
      <div class="xs-cols"><div><b>You need</b><ul>${x.m.map((m) => `<li>${m}</li>`).join("")}</ul></div><div><b>Steps</b><ol>${x.s.map((m) => `<li>${m}</li>`).join("")}</ol></div></div>
      <p class="xs-why"><b>What's happening?</b> ${x.w}</p><p class="xs-safe">⚠️ <b>Ask a grown-up:</b> ${x.safe}</p>
      <button class="btn btn-amber sl-btn" type="button" id="eowDid">I did it! 🧪</button></div>`;
    $("eowDid").onclick = () => { badge("eow"); $("eowDid").textContent = "Great science! ✅"; };
    [...$("eowList").children].forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
  }
  $("eowList").innerHTML = EXPS.map((x, i) => `<button type="button" data-i="${i}">${x.ic} ${x.n}${i === thisWeek ? " ⭐" : ""}</button>`).join("");
  $("eowList").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) expCard(+b.dataset.i); });
  expCard(thisWeek);

  // =============== 8. Solar system explorer ===============
  const PL = [
    { n: "Sun", c: "#ffb703", r: 26, o: 0, p: 0, f: "A star! It's so big that about 1.3 million Earths could fit inside. Its light takes about 8 minutes and 20 seconds to reach us.", g: null },
    { n: "Mercury", c: "#9a8f86", r: 4, o: 42, p: 6, f: "The smallest planet and the closest to the Sun. A year there is just 88 Earth days. It has almost no air, so days are hotter than an oven and nights are colder than a freezer.", g: 0.38 },
    { n: "Venus", c: "#e3c07a", r: 6.5, o: 60, p: 10, f: "The hottest planet, about 465 °C, because its thick clouds trap heat like a blanket. It spins backward, and one day on Venus is longer than its whole year!", g: 0.91 },
    { n: "Earth", c: "#3d7bd9", r: 7, o: 80, p: 14, f: "Home! The only planet we know of with life and with oceans of liquid water on top. Right now, in Cebu, you're spinning around with it at about 1,600 km per hour, and you don't even feel it!", g: 1 },
    { n: "Mars", c: "#c1440e", r: 5, o: 100, p: 20, f: "The red planet gets its color from rusty dust. It has Olympus Mons, a volcano about two and a half times taller than Mount Everest. Robots are driving around on Mars today!", g: 0.38 },
    { n: "Jupiter", c: "#d8a46b", r: 15, o: 130, p: 40, f: "The biggest planet: more than 1,300 Earths could fit inside. Its Great Red Spot is a storm bigger than the whole Earth, and it has more than 90 moons.", g: 2.53 },
    { n: "Saturn", c: "#e6cf8f", r: 12.5, o: 165, p: 60, f: "Its beautiful rings are made of billions of chunks of ice and rock. Saturn is so light for its size that it would float in a giant bathtub!", g: 1.07 },
    { n: "Uranus", c: "#7fd1d8", r: 9, o: 195, p: 85, f: "It rolls around the Sun tipped on its side. That makes its seasons extreme: each pole gets about 42 years of sunlight, then 42 years of darkness.", g: 0.89 },
    { n: "Neptune", c: "#3f5bd6", r: 8.5, o: 222, p: 110, f: "The windiest planet, with winds about 2,000 km per hour. One year on Neptune takes 165 Earth years!", g: 1.14 }
  ];
  const svgNS = "http://www.w3.org/2000/svg";
  const ss = $("ssSvg"); let tapped = {};
  ss.innerHTML = PL.map((p, i) => i === 0 ? "" : `<circle cx="250" cy="250" r="${p.o}" fill="none" stroke="rgba(143,211,255,.25)" stroke-width="1"/>`).join("") +
    PL.map((p, i) => `<g class="xs-orbit" style="animation-duration:${p.p || 1}s"><g class="xs-planet" data-i="${i}" tabindex="0" role="button" aria-label="${p.n}" transform="translate(${250 + p.o} 250)">${p.n === "Saturn" ? `<ellipse rx="${p.r * 1.9}" ry="${p.r * 0.55}" fill="none" stroke="#cdb77a" stroke-width="3"/>` : ""}<circle r="${p.r}" fill="${p.c}"/><circle r="${Math.max(p.r, 14)}" fill="transparent"/></g></g>`).join("");
  function planet(i) {
    const p = PL[i];
    $("ssCard").innerHTML = `<b class="t"><span class="xs-dot" style="background:${p.c}"></span>${p.n}</b>${p.f}` + (p.g ? `<br><span class="sl-note">Gravity: ${p.g === 1 ? "Earth normal" : p.g > 1 ? p.g + "× Earth's" : Math.round(p.g * 100) + "% of Earth's"}${/Jupiter|Saturn|Uranus|Neptune/.test(p.n) ? " (at the cloud tops: there's no ground to stand on!)" : ""}.</span>` : "");
    tapped[i] = 1; if (Object.keys(tapped).length >= 9) badge("planets");
    if (p.g && p.n !== "Earth") { $("ssWorld").value = p.n; calc(); }
  }
  ss.addEventListener("click", (e) => { const g = e.target.closest(".xs-planet"); if (g) planet(+g.dataset.i); });
  ss.addEventListener("keydown", (e) => { const g = e.target.closest(".xs-planet"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); planet(+g.dataset.i); } });
  $("ssPause").onclick = () => { const p = ss.classList.toggle("paused"); $("ssPause").textContent = p ? "Start the planets ▶️" : "Pause the planets ⏸️"; };
  $("ssWorld").innerHTML = PL.filter((p) => p.g && p.n !== "Earth").map((p) => `<option${p.n === "Mars" ? " selected" : ""}>${p.n}</option>`).join("") + `<option value="Moon">The Moon</option>`;
  function calc() {
    const v = Math.max(0, Math.min(500, parseFloat($("ssW").value) || 0)), u = $("ssU").value, w = $("ssWorld").value;
    const g = w === "Moon" ? 0.166 : PL.find((p) => p.n === w).g;
    $("ssOut").innerHTML = `On ${w === "Moon" ? "the Moon" : w} you'd weigh <b>${(v * g).toFixed(1)} ${u}</b>. ${g < 1 ? "You'd feel super light: try jumping!" : "Gravity would squish you down. Heavy!"}`;
  }
  ["ssW", "ssU", "ssWorld"].forEach((id) => $(id).addEventListener("input", () => { calc(); badge("planets-weigh"); }));
  calc();

  // =============== 9. Ocean deep dive ===============
  const DEEP = 10935;
  const STOPS = [
    [0, "🏖️", "The surface", "Waves, sunshine and warm water. In Cebu the sea is about 28 °C, warm like a bath."],
    [10, "🤿", "Coral reefs", "Most coral reefs live in shallow, sunny water, because the corals need sunlight. Every 10 meters down, the water pushes on you as hard as the whole sky of air above!"],
    [40, "🫧", "Scuba-diving limit", "Most scuba divers stay above about 40 meters. Deeper is dangerous without special training and gas."],
    [200, "🌘", "Twilight zone begins", "Only a tiny bit of blue sunlight reaches here. Plants can't grow, because there isn't enough light."],
    [500, "🐧", "Emperor penguin dives", "Emperor penguins can dive about 500 meters deep to catch fish, deeper than any other bird."],
    [700, "🦑", "Vampire squid", "It lives in water with very little oxygen and can glow. Despite its name, it eats bits of floating 'marine snow', not blood!"],
    [1000, "🌑", "Midnight zone begins", "No sunlight at all from here down. It's pitch black and cold, about 4 °C. Many animals make their own light, called bioluminescence."],
    [1500, "🎣", "Anglerfish", "The female anglerfish has a glowing lure on her head, like a fishing rod with a light, to trick little fish into swimming close."],
    [2000, "🐋", "Sperm whale dives", "Sperm whales dive about 2,000 meters to hunt giant squid, holding their breath for over an hour."],
    [3700, "📏", "Average ocean depth", "If you drained the oceans, most of the sea floor would be about this deep."],
    [3800, "🚢", "The Titanic", "The famous ship has rested here since it sank in 1912 in the North Atlantic."],
    [4000, "🌌", "The abyss begins", "Huge flat plains of mud, almost freezing cold. Sea cucumbers and glass sponges live here."],
    [6000, "🕳️", "The hadal zone begins", "Named after Hades, the Greek underworld. This zone exists only in deep trenches, like cracks in the sea floor."],
    [7000, "🐙", "Dumbo octopus", "The deepest-living octopus. It flaps ear-like fins to swim, like the elephant Dumbo!"],
    [8336, "🐟", "Deepest fish ever filmed", "A little snailfish was filmed here in 2022, near Japan. The water pushes on it about 800 times harder than air does on you."],
    [8849, "🏔️", "Mount Everest would fit!", "If you put Mount Everest at the bottom of the Mariana Trench, its peak would still be about 2 km underwater."],
    [10540, "🇵🇭", "Philippine Trench", "The Emden Deep, east of the Philippines, is about this deep: one of the deepest places on Earth, close to home!"],
    [DEEP, "🏁", "Challenger Deep", "The deepest known place in the ocean, in the Mariana Trench. The pressure is more than 1,000 times the air pressure at the surface. Tiny shrimp-like animals called amphipods live even here!"]
  ];
  // Spread stops out with a square-root scale so the top doesn't get squished
  const PX = 3000, y = (m) => 60 + Math.sqrt(m / DEEP) * PX, m = (px) => Math.max(0, Math.min(DEEP, ((px - 60) / PX) ** 2 * DEEP));
  const dive = $("odBox"), inner = $("odInner");
  // keep cards from overlapping: each sits at least 150 px below the one above
  const POS = []; STOPS.forEach(([d], i) => POS.push(Math.max(y(d), i ? POS[i - 1] + 150 : 0)));
  inner.style.height = (POS[POS.length - 1] + Math.max(560, dive.clientHeight) + 80) + "px";
  const depthAt = (px) => { if (px <= POS[0]) return 0; for (let i = 1; i < POS.length; i++) if (px <= POS[i]) return STOPS[i - 1][0] + (STOPS[i][0] - STOPS[i - 1][0]) * (px - POS[i - 1]) / (POS[i] - POS[i - 1]); return DEEP; };
  inner.innerHTML = STOPS.map(([d, ic, n, f], i) => `<div class="xs-stop" style="top:${POS[i]}px"><span class="xs-depth">${d.toLocaleString("en-US")} m</span><b>${ic} ${n}</b><span>${f}</span></div>`).join("");
  function zone(d) { return d < 200 ? "Sunlight zone" : d < 1000 ? "Twilight zone" : d < 4000 ? "Midnight zone" : d < 6000 ? "The abyss" : "Hadal zone"; }
  dive.addEventListener("scroll", () => {
    const d = Math.round(depthAt(dive.scrollTop + 60));
    $("odM").textContent = d.toLocaleString("en-US") + " m";
    $("odZ").textContent = zone(d);
    const light = Math.max(0, 1 - Math.sqrt(d / 1000));
    dive.style.background = `linear-gradient(rgba(${Math.round(20 + 60 * light)},${Math.round(40 + 120 * light)},${Math.round(70 + 150 * light)},1), rgba(${Math.round(10 + 50 * light)},${Math.round(20 + 90 * light)},${Math.round(40 + 120 * light)},1))`;
    if (d >= DEEP - 50) badge("ocean");
  }, { passive: true });
  $("odDown").onclick = () => dive.scrollBy({ top: dive.clientHeight * 0.8, behavior: "smooth" });
  $("odTop").onclick = () => dive.scrollTo({ top: 0, behavior: "smooth" });

  // =============== 10. Dinosaurs ===============
  const DINO = [
    ["Triassic", "Eoraptor", 231, "🦎", "One of the very first dinosaurs, from Argentina. It was only about 1 meter long and ran on two legs."],
    ["Triassic", "Coelophysis", 210, "🦖", "A skinny, speedy hunter about 3 meters long, with hollow bones like a bird's. Scientists have found hundreds of its skeletons in one place."],
    ["Triassic", "Plateosaurus", 214, "🦕", "An early plant-eater, up to about 8 meters long. It was a cousin of the later giant long-necks."],
    ["Jurassic", "Stegosaurus", 150, "🦕", "Had big plates along its back and four spikes on its tail. Its brain was very small for such a huge body."],
    ["Jurassic", "Brachiosaurus", 154, "🦕", "A giant long-neck about as tall as a 4-story building. Its front legs were longer than its back legs, like a giraffe."],
    ["Jurassic", "Allosaurus", 150, "🦖", "The top hunter of the Jurassic, about 9 meters long, with a mouth full of saw-edged teeth."],
    ["Jurassic", "Archaeopteryx", 150, "🪶", "Part dinosaur, part bird! It had feathers and wings, but also teeth and a long bony tail. It helped scientists discover that birds came from dinosaurs."],
    ["Cretaceous", "Spinosaurus", 95, "🐊", "Had a huge sail on its back and a long snout like a crocodile's. It ate fish and probably spent lots of time in water."],
    ["Cretaceous", "Velociraptor", 75, "🦃", "Much smaller than in the movies: about the size of a turkey! It had feathers and a big curved claw on each foot."],
    ["Cretaceous", "Ankylosaurus", 67, "🛡️", "Covered in bony armor like a tank, with a heavy club on its tail to swing at attackers."],
    ["Cretaceous", "Triceratops", 67, "🦏", "Had three horns and a giant bony frill. It lived at the same time and place as T. rex."],
    ["Cretaceous", "Tyrannosaurus rex", 67, "🦖", "About 12 meters long, with one of the strongest bites of any land animal ever. T. rex lived closer in time to you than to Stegosaurus!"]
  ];
  const ERAS = { Triassic: ["252–201 million years ago", "Dinosaurs first appear. All the land is one supercontinent, Pangaea. It's hot and dry."], Jurassic: ["201–145 million years ago", "Giant long-necked dinosaurs and the first birds. Pangaea splits apart and forests spread."], Cretaceous: ["145–66 million years ago", "T. rex, Triceratops and the first flowers! It ends when a giant asteroid hits the Earth."] };
  function era(e) {
    document.querySelectorAll("#dnEras button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.e === e)));
    $("dnEra").innerHTML = `<b>${e}: ${ERAS[e][0]}.</b> ${ERAS[e][1]}`;
    $("dnGrid").innerHTML = DINO.filter((d) => d[0] === e).map((d) => `<div class="bn-organ"><div class="ic" aria-hidden="true">${d[3]}</div><b>${d[1]}</b><span class="sl-note">about ${d[2]} million years ago</span><br>${d[4]}</div>`).join("");
    seenEra[e] = 1; if (Object.keys(seenEra).length === 3) badge("dinos");
  }
  const seenEra = {};
  $("dnEras").addEventListener("click", (e) => { const b = e.target.closest("[data-e]"); if (b) era(b.dataset.e); });
  era("Triassic");
  $("dnBoom").onclick = () => { $("dnBoomOut").hidden = false; $("dnBoom").hidden = true; seenEra.boom = 1; badge("dinos-boom"); };

  // =============== 12. Daily science quiz ===============
  const Q = [
    ["How many bones does a grown-up have?", ["106", "206", "306"], 1],
    ["Which planet is the biggest?", ["Saturn", "Jupiter", "Neptune"], 1],
    ["What is the closest star to the Earth?", ["The Sun", "The North Star", "Sirius"], 0],
    ["What gas do plants take in to make food?", ["Oxygen", "Carbon dioxide", "Helium"], 1],
    ["What is the smallest bone in your body?", ["Stapes, in the ear", "Kneecap", "Little toe bone"], 0],
    ["Which planet is called the red planet?", ["Venus", "Mars", "Mercury"], 1],
    ["How long does sunlight take to reach Earth?", ["About 8 seconds", "About 8 minutes", "About 8 hours"], 1],
    ["What is the longest bone in your body?", ["Femur (thigh bone)", "Spine", "Humerus"], 0],
    ["Water freezes at what temperature?", ["0 °C", "10 °C", "100 °C"], 0],
    ["Water boils (at sea level) at what temperature?", ["50 °C", "100 °C", "200 °C"], 1],
    ["Which is the hottest planet?", ["Mercury", "Venus", "Mars"], 1],
    ["What do we call a scientist who studies dinosaurs and fossils?", ["Astronomer", "Paleontologist", "Botanist"], 1],
    ["About how many islands make up the Philippines?", ["About 76", "About 760", "More than 7,600"], 2],
    ["What is the deepest place in the ocean?", ["Challenger Deep", "Grand Canyon", "Great Barrier Reef"], 0],
    ["Which animal is the biggest that has ever lived?", ["T. rex", "Blue whale", "African elephant"], 1],
    ["What pulls things down toward the ground?", ["Magnetism", "Gravity", "Wind"], 1],
    ["How many hearts does an octopus have?", ["One", "Two", "Three"], 2],
    ["What is the center of an atom called?", ["The nucleus", "The shell", "The orbit"], 0],
    ["The Moon shines because…", ["It's on fire", "It reflects sunlight", "It has lights"], 1],
    ["How long does the Earth take to go around the Sun?", ["A day", "A month", "A year"], 2],
    ["How long does the Earth take to spin around once?", ["About 24 hours", "About 12 hours", "About a week"], 0],
    ["Which organ pumps blood around your body?", ["Lungs", "Heart", "Stomach"], 1],
    ["What do your lungs take from the air?", ["Oxygen", "Water", "Salt"], 0],
    ["Which planet has the most famous rings?", ["Saturn", "Mars", "Earth"], 0],
    ["What kind of animal is a whale shark?", ["A whale", "A fish", "A dolphin"], 1],
    ["Where do Philippine tarsiers famously live, near Cebu?", ["Bohol", "Antarctica", "The Sahara"], 0],
    ["What made the big dinosaurs die out 66 million years ago?", ["A giant asteroid hit Earth", "They got too cold one winter", "People hunted them"], 0],
    ["Which living animals are actually dinosaurs?", ["Birds", "Lizards", "Frogs"], 0],
    ["A rainbow happens when sunlight is split by…", ["Raindrops", "Clouds' shadows", "Thunder"], 0],
    ["What do we call melted rock that comes out of a volcano?", ["Lava", "Granite", "Sand"], 0],
    ["The Pacific Ring of Fire has lots of…", ["Volcanoes and earthquakes", "Deserts", "Glaciers only"], 0],
    ["What makes a typhoon spin and grow?", ["Warm ocean water", "Cold mountains", "The Moon"], 0],
    ["How fast does light travel?", ["About 300 km a second", "About 300,000 km a second", "About 3 km a second"], 1],
    ["Who were the first people to walk on the Moon (1969)?", ["Neil Armstrong and Buzz Aldrin", "Isaac Newton and Galileo", "The Wright brothers"], 0],
    ["What is the name of the first Filipino-built satellite?", ["Diwata-1", "Sputnik", "Hubble"], 0],
    ["What do bees collect from flowers to make honey?", ["Nectar", "Leaves", "Seeds"], 0],
    ["Which is NOT a state of matter?", ["Solid", "Liquid", "Energy drink"], 2],
    ["Ice floats on water because ice is…", ["Heavier than water", "Less dense than water", "Magnetic"], 1],
    ["What does a thermometer measure?", ["Temperature", "Weight", "Speed"], 0],
    ["What's the largest organ of your body?", ["Your brain", "Your skin", "Your heart"], 1],
    ["What do you call an animal that eats only plants?", ["Herbivore", "Carnivore", "Omnivore"], 0],
    ["Which planet is farthest from the Sun?", ["Uranus", "Neptune", "Saturn"], 1],
    ["What protects your brain?", ["Your ribs", "Your skull", "Your kneecap"], 1],
    ["About how much of Earth's surface is covered by ocean?", ["About a quarter", "About half", "About 70%"], 2],
    ["Babies are born with about how many bones?", ["About 100", "About 300", "About 1,000"], 1]
  ];
  // Deterministic pick by Cebu date: same 5 questions all day, new ones tomorrow
  const today = cebuDate();
  function seeded(seed) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const rnd = seeded("yuyu" + today), idx = Q.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const todays = idx.slice(0, 5);
  let st = {}; try { st = JSON.parse(store.get("sl_daily") || "{}") || {}; } catch (e) { st = {}; }
  const done = st.day === today;
  let ans = done ? (st.ans || []) : [], score = 0;
  function dq() {
    $("dqDate").textContent = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" });
    $("dqStreak").textContent = `🔥 Streak: ${st.streak || 0} day${(st.streak || 0) === 1 ? "" : "s"}` + (st.best ? ` · best ${st.best}` : "");
    $("dqList").innerHTML = todays.map((qi, n) => { const [q, opts, r] = Q[qi], a = ans[n];
      return `<div class="xs-q"><b>${n + 1}. ${esc(q)}</b><div class="sl-quiz" data-n="${n}">${opts.map((o, k) => `<button type="button" data-k="${k}" ${a != null ? "disabled" : ""} class="${a != null && k === r ? "right" : a === k && k !== r ? "wrong" : ""}">${esc(o)}</button>`).join("")}</div></div>`; }).join("");
    score = ans.filter((a, n) => a === Q[todays[n]][2]).length;
    $("dqScore").textContent = ans.length === 5 ? `You got ${score} out of 5 today! ${score === 5 ? "Perfect! 🏆" : score >= 3 ? "Great thinking! ⭐" : "Every scientist learns by trying. Come back tomorrow!"} New questions tomorrow.` : `${ans.filter((a) => a != null).length} of 5 answered`;
  }
  $("dqList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]"); if (!b || b.disabled) return;
    const n = +b.parentElement.dataset.n; if (ans[n] != null) return;
    ans[n] = +b.dataset.k;
    if (ans.filter((a) => a != null).length === 5) {
      const y = cebuDate(new Date(Date.now() - 864e5));
      st.streak = st.last === y ? (st.streak || 0) + 1 : st.last === today ? st.streak : 1;
      st.best = Math.max(st.best || 0, st.streak); st.last = today;
      badge("daily"); if (st.streak >= 3) badge("streak");
    }
    st.day = today; st.ans = ans; store.set("sl_daily", JSON.stringify(st));
    dq();
  });
  dq();

  // =============== 11. Ask Uncle ===============
  // Netlify form "yuyu-question" on laporteweathernow.com; questions land as private issues for Uncle Scoop.
  const ASK = window.SL_ASK_URL || "https://laporteweathernow.com/contact";
  const form = $("askForm");
  if (form) {
    const box = $("askQ");
    if (!ASK) { $("askSend").disabled = true; $("askOut").textContent = "Coming soon! Uncle Scoop is still setting up this mailbox. Until then, ask a grown-up to send him your question."; }
    box.addEventListener("input", () => { $("askLeft").textContent = `${500 - box.value.length} letters left`; });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = box.value.trim();
      if (q.length < 5) { $("askOut").textContent = "Write a little more so Uncle Scoop knows what you're wondering!"; return; }
      if (/\b\d{7,}\b|@\w+\.\w+/.test(q)) { $("askOut").textContent = "Please don't put phone numbers or email addresses in your question. Just the question!"; return; }
      const last = +store.get("sl_ask_last") || 0;
      if (Date.now() - last < 60000) { $("askOut").textContent = "Great questions! Wait a minute before sending the next one."; return; }
      if (!ASK) { $("askOut").textContent = "Uncle Scoop is still setting up this mailbox. Ask a grown-up to send him your question for now!"; return; }
      $("askSend").disabled = true; $("askOut").textContent = "Sending…";
      try {
        const body = new URLSearchParams({ "form-name": "yuyu-question", question: q.slice(0, 500), "bot-field": $("askHp").value });
        await fetch(ASK, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
        store.set("sl_ask_last", String(Date.now()));
        box.value = ""; $("askOut").textContent = "Sent to Uncle! 📬 Uncle Scoop will read your question. Keep wondering!"; badge("ask");
      } catch (err) { $("askOut").textContent = "It didn't send. Check the internet and try again."; }
      $("askSend").disabled = false;
    });
  }
})();
