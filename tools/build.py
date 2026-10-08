#!/usr/bin/env python3
"""Builds index.html, 404.html, camp-map/index.html, projects/index.html, sitemap.xml and robots.txt for scoopanddude.com (GitHub Pages, repo ScoopAndDude/scoopanddude.com).

Keep this a project site with its own custom domain. Don't move it back to a repo named
scoopanddude.github.io: a custom domain on that "user site" makes GitHub forward every
scoopanddude.github.io/<repo>/ address to scoopanddude.com, and browsers then block La Porte Weather
Now's data loads from scoopanddude.github.io/laporteweathernow-posts/ (Oct. 7, 2026).

    python3 tools/build.py        (from the repo root)

Edit the lists below (states not visited yet, clips, links) and run it again. The state outlines in
tools/us-states.json come from us-atlas (US Census Bureau boundaries, Albers USA projection).
"""
import html
import json
import os
import re
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://scoopanddude.com"

# The 4 states the crew hasn't been to yet (Scoop has been to 46). Names as in us-states.json.
NOT_YET = ["Alaska", "Hawaii", "Maine", "North Dakota"]   # Scoop, Oct. 7, 2026

CLIPS = [  # (YouTube id, caption, length) — Scoop's own clips from youtube.com/@scoopanddude
    ("OrRYh2SF8Hg", "Desert van life sunset with my dogs", "8:34"),
    ("nJTGl_Ck_34", "Going west: New Mexico sunset", "0:16"),
    ("DPO_-C9Qpkw", "Ocean sunset, July 2023", "0:11"),
    ("DcZOhrhSgb0", "Columbia River Gorge", "0:56"),
    ("zQtQb-dybWw", "Painted sky. Good mornings!", "0:16"),
    ("lkaPhrwGvBI", "Good morning, moon", "0:10"),
    ("0asUVf89jZo", "Campfire by the van", "0:16"),
    ("GsmEAnhAFhY", "Beach day with Dude", "0:09"),
    ("xz7dOsLY__c", "Waterfall and bluffs", "0:19"),
    ("xz0_CUR6h7w", "Cliffs and caves", "0:10"),
    ("_pqYXO94vqQ", "Jamming out on the road with Dude", "1:03"),
    ("2biuYqe7spg", "Happy Dude!", "0:16"),
    ("_XSWnUiqMuw", "Grateful for this desert sunset", "0:44"),
]

FOLLOW = [
    ("YouTube", "https://www.youtube.com/@scoopanddude", "@scoopanddude"),
    ("TikTok", "https://www.tiktok.com/@scoopanddude", "live guitar and song requests"),
    ("Facebook", "https://www.facebook.com/ScoopAndDude", "Scoop"),
    ("X", "https://x.com/scoopanddude", "@scoopanddude"),
    ("Pinterest", "https://pinterest.com/scoopanddude", "scoopanddude"),
    ("Etsy", "https://www.etsy.com/shop/ScoopAndDude", "ScoopAndDude"),
]
STICKERS = ["#f08a24", "#e8607b", "#3d97d3", "#74a548", "#f1bf2c", "#8a6fd1"]

e = lambda s: html.escape(s, quote=True)


def map_svg():
    states = json.load(open(os.path.join(ROOT, "tools", "us-states.json")))
    home = next(s for s in states if s["name"] == "Indiana")["c"]
    by_dist = sorted(states, key=lambda s: (s["c"][0] - home[0]) ** 2 + (s["c"][1] - home[1]) ** 2)
    step = {s["name"]: n for n, s in enumerate(by_dist)}   # stickers press on outward from home, La Porte
    paths = []
    for i, s in enumerate(states):
        no = s["name"] in NOT_YET
        color = STICKERS[s.get("k", i) % len(STICKERS)]   # "k": a color no neighboring state shares (tools/us-states.json)
        cls = "st no" if no else "st"
        fill = "" if no else f' fill="{color}"'
        paths.append(f'<path class="{cls}"{fill} style="--i:{step[s["name"]]}" data-name="{e(s["name"])}" d="{s["d"]}"/>')
    been = 50 - len(NOT_YET)
    label = f"Map of the United States with a sticker on each of the {been} states the crew has been to"
    if NOT_YET:
        label += "; not yet: " + ", ".join(NOT_YET)
    return (f'<svg id="usmap" viewBox="0 0 975 610" role="img" aria-label="{e(label)}">'
            '<filter id="lift" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-opacity=".28"/></filter>'
            f'<g filter="url(#lift)">{"".join(paths)}</g></svg>')


def map_key():
    if len(NOT_YET) == 4:
        a, b, c, d = NOT_YET
        return f"<strong>46 down, 4 to go:</strong> {e(a)}, {e(b)}, {e(c)} and {e(d)}."
    return "<strong>46 states down.</strong> Tap a state to see its name."


def clips_html():
    out = []
    for n, (vid, cap, length) in enumerate(CLIPS):
        cls = "clip clip-feature" if n == 0 else "clip"
        out.append(
            f'<button type="button" class="{cls}" data-yt="{vid}" data-title="{e(cap)}" aria-label="Play: {e(cap)} ({length})">'
            f'<img src="assets/img/clips/{vid}.jpg" alt="" width="360" height="640" loading="lazy" decoding="async">'
            f'<span class="clip-play" aria-hidden="true"></span><span class="clip-d">{length}</span><span class="clip-t">{e(cap)}</span></button>')
    return "\n        ".join(out)


def follow_html():
    return "\n          ".join(f'<li><a href="{u}">{n} <span>{e(h)}</span></a></li>' for n, u, h in FOLLOW)


JSONLD = {
    "@context": "https://schema.org",
    "@graph": [
        {"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "Scoop & Dude"},
        {"@type": "Person", "@id": SITE + "/#scoop", "name": "Scoop", "url": SITE + "/",
         "homeLocation": {"@type": "Place", "name": "La Porte, Indiana"},
         "sameAs": [u for _, u, _ in FOLLOW]},
    ],
}

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scoop &amp; Dude: van life with a Great Dane</title>
<meta name="description" content="Scoop, his Great Dane Dude and little Bay Bay: 46 states in a white Chevy van, clips from the road, and the next trip.">
<link rel="canonical" href="https://scoopanddude.com/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://scoopanddude.com/">
<meta property="og:title" content="Scoop &amp; Dude: van life with a Great Dane">
<meta property="og:description" content="46 states in a white Chevy van with a Great Dane and a little dog. Clips from the road, and the next trip.">
<meta property="og:image" content="https://scoopanddude.com/assets/img/og-badge-1200x630.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Scoop and Dude the Great Dane at sunset beside their white van, with the Scoop and Dude road sign: van life with a Great Dane, scoopanddude.com">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@scoopanddude">
<meta name="theme-color" content="#00663f">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/overpass-latin-900-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/overpass-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css">
<script type="application/ld+json">%JSONLD%</script>
</head>
<body>
<a class="skip" href="#crew">Skip to the crew</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="#top"><img src="assets/img/scoop-dude-96.jpg" srcset="assets/img/scoop-dude-160.jpg 3x" width="40" height="40" alt=""><span class="mark">Scoop &amp; Dude</span></a>
    <nav aria-label="Sections">
      <a class="opt2" href="#crew">The crew</a>
      <a class="opt3" href="#map">The map</a>
      <a href="camp-map/">Camp map</a>
      <a href="projects/">Projects</a>
      <a class="opt2" href="#clips">Clips</a>
      <a class="opt" href="#shop">Shop</a>
      <a class="opt" href="#follow">Follow</a>
    </nav>
  </div>
</header>

<main id="top">
<section class="hero">
  <div class="wrap hero-in">
    <figure class="hero-photo">
      <img src="assets/img/surf-run-1200.jpg" srcset="assets/img/surf-run-760.jpg 760w, assets/img/surf-run-1200.jpg 1200w" sizes="(min-width: 900px) 46vw, 100vw" width="1200" height="1600" alt="Scoop running barefoot through the surf with Dude, his black and white Great Dane, splashing beside him" fetchpriority="high">
      <figcaption>Me and Dude in the surf, June 2023.</figcaption>
    </figure>
    <div class="hero-copy">
      <div class="sign"><div class="sign-in">
        <h1>Scoop &amp; Dude</h1>
        <p class="sign-sub">A guy from La Porte, Indiana, a Great Dane, a little dog and a white Chevy van.</p>
        <dl class="mileage">
          <div><dt>States so far</dt><dd>46</dd></div>
          <div><dt>Trips across the country</dt><dd>2</dd></div>
          <div><dt>Next trip</dt><dd>~2 yrs</dd></div>
        </dl>
      </div></div>
      <p class="cta"><a class="btn" href="#clips">Watch the clips</a><a class="btn btn-quiet" href="https://www.youtube.com/@scoopanddude">Follow on YouTube</a></p>
    </div>
  </div>
</section>

<section class="crew" id="crew" aria-labelledby="crew-h">
  <div class="wrap crew-in">
    <figure>
      <img src="assets/img/crew-beach-1000.jpg" width="1000" height="1099" loading="lazy" decoding="async" alt="Black and white photo of Scoop sitting in shallow water on a beach in a wide-brim hat, with Bay Bay jumping up at his shoulder and Dude standing beside him">
      <figcaption>Bay Bay on the left, Dude on the right.</figcaption>
    </figure>
    <div>
      <h2 id="crew-h">The crew</h2>
      <div class="who"><h3 class="blade">Scoop</h3>
        <p>That's me. Home base is La Porte, Indiana. I've crossed the country twice in the van with my dogs, I play guitar and take song requests on my TikTok lives, and when I'm home I run La Porte Weather Now.</p></div>
      <div class="who"><h3 class="blade">Dude</h3>
        <p>The Dude in Scoop &amp; Dude: a white, black and gray Great Dane, and the reason this whole thing has a name. A lot of my clips are just Dude being happy.</p></div>
      <div class="who"><h3 class="blade">Bay Bay</h3>
        <p>The little one of the crew. Small dog, big personality.</p></div>
    </div>
  </div>
</section>

<figure class="break">
  <img src="assets/img/sunset-coast-1600.jpg" width="1600" height="720" loading="lazy" decoding="async" alt="The sun setting over the ocean from an empty beach">
  <p><span>#justkeepgoing</span></p>
</figure>

<section class="road" id="map" aria-labelledby="map-h">
  <div class="wrap">
    <h2 id="map-h">The road so far</h2>
    <p class="lead">Two trips back and forth across the country. Every sticker is a state the crew has been to.</p>
    <div class="map-wrap">%MAP%<div class="map-tip" id="maptip" hidden></div></div>
    <p class="map-key">%MAPKEY%</p>
    <div class="strip">
      <figure><img src="assets/img/van-beach-1200.jpg" width="1200" height="900" loading="lazy" decoding="async" alt="The white Chevy Express van parked on a sandy beach at golden hour"><figcaption>Home on wheels: a white Chevy Express.</figcaption></figure>
      <figure><img src="assets/img/fog-hat-800.jpg" width="800" height="1067" loading="lazy" decoding="async" alt="Scoop in a wide-brim hat taking a selfie beside the van on a foggy morning by a river lined with evergreens" style="object-position:50% 80%"><figcaption>A foggy morning on the road.</figcaption></figure>
      <figure><img src="assets/img/waterfall-960.jpg" width="960" height="720" loading="lazy" decoding="async" alt="A waterfall pouring into a muddy spring river below rocky cliffs and bare trees"><figcaption>Waterfall stop.</figcaption></figure>
    </div>
    <a class="guide" href="camp-map/"><span class="guide-in"><span><span class="guide-t">Camp map</span><span class="guide-s">Free campsites, water, dump stations and propane near any U.S. town, and which way the weather's better.</span></span><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 35 L33 15 M17 15 H33 V31" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>
    <a class="guide guide-2" href="projects/"><span class="guide-in"><span><span class="guide-t">Projects</span><span class="guide-s">Faith, the Amazon, markets, AI, world art, printables, and pages for friends far away.</span></span><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 35 L33 15 M17 15 H33 V31" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>
  </div>
</section>

<section class="clips" id="clips" aria-labelledby="clips-h">
  <div class="wrap">
    <h2 id="clips-h">Clips from the road</h2>
    <p class="lead">Short videos from the van: sunsets, waterfalls, and a lot of Dude. Tap one to play it here.</p>
    <div class="clips-grid">
        %CLIPS%
    </div>
    <p><a class="btn btn-quiet" style="color:#9fe0bf;box-shadow:inset 0 0 0 2px #9fe0bf" href="https://www.youtube.com/@scoopanddude">More on YouTube</a></p>
  </div>
</section>
<dialog class="player" id="player" aria-label="Video player">
  <div class="player-in">
    <button type="button" class="player-x" aria-label="Close the video">&times;</button>
    <div class="player-frame"></div>
    <p class="player-t"></p>
  </div>
</dialog>

<section class="shop" id="shop" aria-labelledby="shop-h">
  <div class="wrap shop-in">
    <div class="shop-box">
      <h2 id="shop-h">Printables from the road</h2>
      <p class="lead">I make printable planners and guides for the road and sell them on Etsy.</p>
      <ul class="shop-list"><li>Road trip planners</li><li>Camping and RV safety</li><li>Emergency planners</li><li>Weather safety guides</li></ul>
      <p><a class="btn" href="https://www.etsy.com/shop/ScoopAndDude">Visit the Etsy shop</a></p>
    </div>
  </div>
</section>

<section class="next" id="follow" aria-labelledby="follow-h">
  <div class="wrap next-in">
    <div class="sign sign-next"><div class="sign-in">
      <p class="sign-name">Next trip</p>
      <dl class="mileage">
        <div><dt>Back on the road</dt><dd>~2 yrs</dd></div>
        <div><dt>States still to go</dt><dd>4</dd></div>
      </dl>
    </div></div>
    <div>
      <h2 id="follow-h">Follow along</h2>
      <p>So you catch the start of round three.</p>
      <ul class="follow">
          %FOLLOW%
      </ul>
      <p class="small">More road stories: <a href="https://roam-and-rover.scoopanddude.chatgpt.site">Roam &amp; Rover</a></p>
    </div>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap">
    <p>Home base: La Porte, Indiana. When I'm home, I run <a href="https://laporteweathernow.com">La Porte Weather Now</a>.</p>
    <p class="motto">Love God. Love people. Care for all that lives.</p>
    <p class="small">&copy; 2026 Scoop &amp; Dude. Photos and videos by Scoop.</p>
  </div>
</footer>
<script src="assets/js/site.js" defer></script>
</body>
</html>
"""

NOT_FOUND = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wrong turn | Scoop &amp; Dude</title>
<meta name="robots" content="noindex">
<script>
/* Oct. 7, 2026, about 9:45 to 10:55 AM Central, GitHub forwarded scoopanddude.github.io/laporteweathernow-posts/
   (La Porte Weather Now's data and frames) to this site. Browsers that saw the forward can remember it, so send
   them back to the real address, once: "back=1" makes it an address they were never forwarded from, and a page
   that already has it stays here, so this can't loop. */
(function () {
  var p = location.pathname, s = location.search;
  if (p.indexOf("/laporteweathernow-posts/") !== 0 || /[?&]back=1(&|$)/.test(s)) return;
  location.replace("https://scoopanddude.github.io" + p + (s ? s + "&" : "?") + "back=1" + location.hash);
})();
</script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
<main class="wrap" style="padding:80px 20px;max-width:640px">
  <div class="sign"><div class="sign-in">
    <h1 style="font-size:clamp(2.4rem,7vw,3.6rem)">Wrong turn</h1>
    <p class="sign-sub">That page isn't on the map.</p>
    <dl class="mileage"><div><dt>Back to the start</dt><dd>0 mi</dd></div></dl>
  </div></div>
  <p style="margin-top:22px"><a class="btn" href="/">Take me home</a></p>
</main>
</body>
</html>
"""


# The camp map (scoopanddude.com/camp-map/): La Porte Weather Now's camp map, copied into this site (Oct. 7, 2026).
# Its scripts are in assets/camp/ (camp-map.js, compass.js and their helpers, copied from laporteweathernow.com);
# the places come from the weekly OpenStreetMap copy in the laporteweathernow-posts repo, with Overpass as the backup.
STAY = [
    ("Recreation.gov", "https://www.recreation.gov/", "Public land. The official site for federal campgrounds, cabins and permits from the Park Service, Forest Service, BLM, Army Corps and more."),
    ("BLM public lands", "https://www.blm.gov/programs/recreation/camping", "Public land. Free dispersed camping on Bureau of Land Management land, mostly in the West. Stays are generally limited to 14 days in any 28-day period; rules vary by area."),
    ("Harvest Hosts", "https://harvesthosts.com", "Overnight parking at wineries, farms and breweries. Membership required."),
    ("Boondockers Welcome", "https://boondockerswelcome.com", "Driveway camping hosted by fellow RVers and van-lifers."),
    ("Hipcamp", "https://hipcamp.com", "Private land, farms and backyard camping spots you book by the night."),
    ("Sniffspot", "https://www.sniffspot.com", "Rent a private, fenced yard by the hour so the dogs can run on a travel day."),
    ("FreeCampsites.net", "https://freecampsites.net", "A crowdsourced list of free camping spots: a good second opinion next to this map."),
]
TYPE_CHIPS = [  # (data-type, label, on by default, the map dot's color)
    ("camp", "Campsites &amp; RV parks", True, "#2f7d4f"), ("rest", "Rest &amp; service areas", True, "#3a6ea5"),
    ("dogpark", "Dog parks", False, "#8e44ad"), ("spring", "Springs &amp; water", True, "#0e9aa7"),
    ("stops", "Dump, showers, laundry &amp; Wi-Fi", False, "#6d4c41"), ("fuel", "Propane &amp; truck stops", False, "#37474f"),
    ("private", "Private &amp; group-only", False, "#8a8a8a"),
]
LEGEND = [("#2f7d4f", "Listed free"), ("#e8963d", "Fee unknown"), ("#8a8a8a", "Paid"), ("#3a6ea5", "Rest or service area"),
          ("#8e44ad", "Dog park"), ("#0e9aa7", "Spring or water fill"), ("#d6336c", "Hot spring"),
          ("#6d4c41", "Dump, shower, laundry, library"), ("#37474f", "Propane or truck stop")]

CAMP = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Camp map: free camping, water and dump stations near any town | Scoop &amp; Dude</title>
<meta name="description" content="Free campsites, rest areas, springs, water, dump stations, showers and propane near any U.S. town, this week's fuel prices, and which way the weather's better. For van life.">
<link rel="canonical" href="https://scoopanddude.com/camp-map/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://scoopanddude.com/camp-map/">
<meta property="og:title" content="Camp map | Scoop &amp; Dude">
<meta property="og:description" content="Free campsites, water, dump stations and propane near any U.S. town, and which way the weather's better.">
<meta property="og:image" content="https://scoopanddude.com/assets/img/og-badge-1200x630.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Scoop and Dude the Great Dane at sunset beside their white van, with the Scoop and Dude road sign: van life with a Great Dane, scoopanddude.com">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@scoopanddude">
<meta name="theme-color" content="#00663f">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/overpass-latin-900-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://scoopanddude.github.io" crossorigin>
<link rel="stylesheet" href="../assets/css/site.css">
<link rel="stylesheet" href="../assets/camp/leaflet.css">
<link rel="stylesheet" href="../assets/css/camp.css">
</head>
<body>
<a class="skip" href="#find">Skip to the camp map</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="../"><img src="../assets/img/scoop-dude-96.jpg" srcset="../assets/img/scoop-dude-160.jpg 3x" width="40" height="40" alt=""><span class="mark">Scoop &amp; Dude</span></a>
    <nav aria-label="Sections">
      <a class="opt2" href="../#crew">The crew</a>
      <a class="opt3" href="../#map">The map</a>
      <a href="./" aria-current="page">Camp map</a>
      <a href="../projects/">Projects</a>
      <a class="opt2" href="../#clips">Clips</a>
      <a class="opt" href="../#follow">Follow</a>
    </nav>
  </div>
</header>

<main>
<section class="camp-hero" id="find">
  <div class="wrap">
    <div class="sign camp-sign"><div class="sign-in">
      <h1>Camp map</h1>
      <p class="sign-sub">Find a place to park it tonight, the water and dump stations nearby, this week's fuel prices, and <a href="#weather">which way the weather's better</a>. Search any U.S. town.</p>
      <div class="where">
        <div class="camp-search">
          <label class="visually-hidden" for="campSearch">Search for any U.S. town</label>
          <input type="search" id="campSearch" placeholder="Search any U.S. town" autocomplete="off" enterkeyhint="search">
          <div id="campSearchResults" class="search-results"></div>
        </div>
        <label class="visually-hidden" for="mapLocationSelect">Or pick a city from the list</label>
        <select id="mapLocationSelect"></select>
        <label class="visually-hidden" for="radiusSelect">How far to look</label>
        <select id="radiusSelect"><option value="40000">25 mi</option><option value="80000" selected>50 mi</option><option value="160000">100 mi</option></select>
        <button type="button" id="nearMe">Near me</button>
      </div>
    </div></div>
  </div>
</section>

<section class="camp-tool" aria-label="Camp map results">
  <div class="wrap">
    <div class="filter-bar" role="group" aria-label="Camp map filters">
      <div class="filter-row" id="feeChips">
        <span class="filter-label">Fee</span>
        <button type="button" class="chip" data-fee="all" aria-pressed="true">All, free first <span class="count" data-count="all"></span></button>
        <button type="button" class="chip" data-fee="free" aria-pressed="false">Listed free <span class="count" data-count="free"></span></button>
        <button type="button" class="chip" data-fee="nopaid" aria-pressed="false">Hide paid <span class="count" data-count="nopaid"></span></button>
      </div>
      <div class="filter-row" id="dogChips">
        <span class="filter-label">Dogs</span>
        <button type="button" class="chip" data-dog="any" aria-pressed="true">Any</button>
        <button type="button" class="chip" data-dog="yes" aria-pressed="false">Dogs allowed (tagged) <span class="count" data-count="dogs"></span></button>
      </div>
      <div class="filter-row" id="typeChips">
        <span class="filter-label">Show</span>
        %TYPECHIPS%
      </div>
    </div>
    <div id="campMap" role="region" aria-label="Map of the places found"></div>
    <div class="legend" aria-hidden="true">%LEGEND%</div>
    <p id="mapStatus" class="loading-text" role="status" aria-live="polite">Loading places from OpenStreetMap&hellip;</p>
    <p id="fuelBar" class="fuel-bar" hidden></p>
    <p class="disclaimer"><strong>The places come from volunteers.</strong> They're from OpenStreetMap, a free map kept by volunteers (our copy is refreshed every week), and tags like fee and dogs can be missing or out of date. &ldquo;Listed free&rdquo; means a volunteer marked the site as no fee. Treat this as a starting point, and check the rules before you camp or sleep at a rest stop.</p>
    <div id="freeNote"></div>
    <div class="result-list" id="resultList"></div>
    <div class="more-row"><button type="button" class="btn" id="showMore" hidden>Show more results</button></div>
    <div id="springList" class="extra-list" aria-live="polite"></div>
    <div id="stopsList" class="extra-list" aria-live="polite"></div>
    <div id="fuelList" class="extra-list" aria-live="polite"></div>
  </div>
</section>

<section class="camp-weather" id="weather" aria-labelledby="weather-h">
  <div class="wrap">
    <h2 id="weather-h">Which way is the good weather?</h2>
    <p class="lead">We check the National Weather Service's next 3 days where the map is centered, and at 8 spots a day's drive away in every direction, and rate each one for camping.</p>
    <div class="fw-controls">
      <span>Checking around <strong id="fwCenter">the map's town</strong> <span class="fw-hint">(change the town on the map above)</span></span>
      <label for="fwDist">How far would you drive?</label>
      <select id="fwDist"><option value="100">About 100 miles</option><option value="200" selected>About 200 miles</option><option value="300">About 300 miles</option></select>
      <button type="button" id="fwMoved" hidden></button>
    </div>
    <div class="fw-verdict" id="fwVerdict" aria-live="polite"><div class="k">Which way to go</div><p class="big">The weather check starts when you scroll here.</p></div>
    <div class="fw-wrap">
      <div>
        <div class="fw-n" aria-hidden="true">&uarr; North</div>
        <div class="fw-grid" id="fwGrid" role="group" aria-label="Weather around you, with north at the top"></div>
      </div>
      <div class="fw-detail" id="fwDetail" aria-live="polite"></div>
    </div>
    <details class="fw-how">
      <summary>How the rating works</summary>
      <p>It's a rule of thumb built from the official NWS forecast for the next 3 days (sooner days count a little more). A spot rates best with highs from about 60 to 82&deg;F, nights above about 40&deg;F, low rain chances, wind under 15 mph, and no thunderstorms, snow or ice. Active NWS warnings pull a spot's rating down a lot, and watches and advisories a little. Spots are straight-line distances, so the drive will be longer. Over water or outside the U.S. there's no NWS forecast, so it tries a nearby spot on land instead.</p>
    </details>
  </div>
</section>

<section class="camp-more" aria-labelledby="more-h">
  <div class="wrap">
    <h2 id="more-h">More places to stay</h2>
    <p class="lead">Federal public land is often the cheapest place to camp. The private hosts are paid marketplaces, not public land; they fill the gap when free camping isn't close.</p>
    <ul class="stay-list">
      %STAY%
    </ul>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap">
    <p>Home base: La Porte, Indiana. When I'm home, I run <a href="https://laporteweathernow.com">La Porte Weather Now</a>, where this camp map started.</p>
    <p class="motto">Love God. Love people. Care for all that lives.</p>
    <p class="credit">Places: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors (ODbL). Weather: National Weather Service. Fuel prices: U.S. Energy Information Administration. Map: <a href="https://leafletjs.com">Leaflet</a>.</p>
    <p class="small">&copy; 2026 Scoop &amp; Dude.</p>
  </div>
</footer>
<script src="../assets/camp/timeutil.js"></script>
<script src="../assets/camp/locations.js"></script>
<script src="../assets/camp/weather.js"></script>
<script src="../assets/camp/leaflet.js"></script>
<script src="../assets/camp/camp-map.js"></script>
<script src="../assets/camp/compass.js"></script>
</body>
</html>
"""


def camp_page():
    chips = "\n        ".join(
        f'<button type="button" class="chip small" data-type="{t}" aria-pressed="{"true" if on else "false"}"><span class="dot" style="background:{c}"></span>{label}</button>'
        for t, label, on, c in TYPE_CHIPS)
    legend = "".join(f'<span><span class="dot" style="background:{c}"></span>{e(t)}</span>' for c, t in LEGEND)
    stay = "\n      ".join(f'<li><a href="{u}"><strong>{e(n)}</strong><span>{e(d)}</span></a></li>' for n, u, d in STAY)
    return CAMP.replace("%TYPECHIPS%", chips).replace("%LEGEND%", legend).replace("%STAY%", stay)


# The projects (scoopanddude.com/projects/): the non-weather pages that moved here from La Porte Weather Now
# on Oct. 7, 2026 (Scoop: "move anything not weather related to ScoopAndDude.com"), plus the camp map.
PROJECTS = [  # (folder, kicker, name, what it is)
    ("faith/", "Daily", "Faith &amp; Ministry", "Love God. Love your neighbor. A daily King James verse, a hymn of the week, a word from the original Hebrew and Greek, prayer for today's world, and private prayer requests."),
    ("camp-map/", "On the road", "Camp map", "Free campsites, water, dump stations and propane near any U.S. town, this week's fuel prices, and which way the weather's better."),
    ("printables/", "Etsy shop", "Printables from the road", "Emergency, storm-prep and road-trip planners to print, checked against official guidance."),
    ("amazon/", "World", "Amazon Rainforest Watch", "Deforestation and illegal gold-mining numbers, drought and fire, real NASA satellite pictures, and the people protecting the forest."),
    ("markets/", "Money", "Markets &amp; Economy", "The stock market, oil, gas, crops and jobs in plain words, with La Porte County and Indiana numbers from official sources."),
    ("ai-survival-guide/", "Technology", "AI's Survival Guide", "Written by an AI for the people it cares about: the plain truth about AI risk, live AI news and outages, scam alerts, jobs, and a four-part plan."),
    ("world-art/", "History", "World Art: ancient, modern and tarot", "From 36,000-year-old cave paintings to modern masters and nearly 600 years of tarot cards, with the weather where each work lives today."),
    ("friends/", "For my friends", "Friends around the world", "Pages I made for friends far away: English, Round by Round for a fighter in Algeria, and Yuyu's Space Lab for a young scientist in Cebu."),
]
PROJECTS_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Projects | Scoop &amp; Dude</title>
<meta name="description" content="Scoop's other projects: a daily verse and prayer, the camp map, printables, Amazon Rainforest Watch, markets, AI's Survival Guide, world art, and pages for friends.">
<link rel="canonical" href="https://scoopanddude.com/projects/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://scoopanddude.com/projects/">
<meta property="og:title" content="Projects | Scoop &amp; Dude">
<meta property="og:description" content="Faith, the camp map, printables, the Amazon, markets, AI, world art, and pages for friends far away.">
<meta property="og:image" content="https://scoopanddude.com/assets/img/og-badge-1200x630.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@scoopanddude">
<meta name="theme-color" content="#00663f">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/overpass-latin-900-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/css/site.css">
</head>
<body>
<a class="skip" href="#list">Skip to the projects</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="../"><img src="../assets/img/scoop-dude-96.jpg" srcset="../assets/img/scoop-dude-160.jpg 3x" width="40" height="40" alt=""><span class="mark">Scoop &amp; Dude</span></a>
    <nav aria-label="Sections">
      <a class="opt2" href="../#crew">The crew</a>
      <a class="opt3" href="../#map">The map</a>
      <a href="../camp-map/">Camp map</a>
      <a href="./" aria-current="page">Projects</a>
      <a class="opt" href="../#clips">Clips</a>
      <a class="opt" href="../#follow">Follow</a>
    </nav>
  </div>
</header>

<main>
<section class="proj-hero">
  <div class="wrap">
    <div class="sign proj-sign"><div class="sign-in">
      <h1>Projects</h1>
      <p class="sign-sub">The other things I follow and build when I'm not on the road or doing the weather. All free, from official and trusted sources.</p>
    </div></div>
  </div>
</section>

<section class="proj" id="list" aria-label="Projects">
  <div class="wrap">
    <ul class="proj-grid">
      %CARDS%
    </ul>
    <p class="proj-note">Looking for the weather? La Porte County's forecast, alerts, radar and World Disaster Watch are on <a href="https://laporteweathernow.com">La Porte Weather Now</a>.</p>
    <p class="proj-note">Want to help keep the crew on the road? <a href="https://www.gofundme.com/f/scoopanddude">Chip in on GoFundMe</a>.</p>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap">
    <p>Home base: La Porte, Indiana. When I'm home, I run <a href="https://laporteweathernow.com">La Porte Weather Now</a>, where most of these started.</p>
    <p class="motto">Love God. Love people. Care for all that lives.</p>
    <p class="small">&copy; 2026 Scoop &amp; Dude.</p>
  </div>
</footer>
</body>
</html>
"""


def projects_page():
    cards = "\n      ".join(
        f'<li><a class="proj-card" href="../{d}"><span class="proj-k">{k}</span><span class="proj-t">{n}</span><span class="proj-s">{w}</span></a></li>'
        for d, k, n, w in PROJECTS)
    return PROJECTS_PAGE.replace("%CARDS%", cards)


# Sitemap and robots.txt (added Oct. 7, 2026, with Scoop's OK). The sitemap lists every page search
# engines may show: index.html at the root and in each folder, minus pages marked noindex (the moved
# weather-site pages that stay out of search keep that tag). A page's date is the day, in Central
# time, of its last commit, or today when it has changes that aren't committed yet.
ROBOTS = f"""# scoopanddude.com: search engines may read every page. Pages that should stay out of search
# carry their own noindex tag and are left out of the sitemap.
User-agent: *
Allow: /

Sitemap: {SITE}/sitemap.xml
"""


def last_change(rel):
    today = datetime.now(ZoneInfo("America/Chicago")).strftime("%Y-%m-%d")
    git = ["git", "-C", ROOT]
    try:
        if subprocess.run(git + ["status", "--porcelain", "--", rel],
                          capture_output=True, text=True, check=True).stdout.strip():
            return today
        day = subprocess.run(git + ["log", "-1", "--date=format-local:%Y-%m-%d", "--format=%cd", "--", rel],
                             capture_output=True, text=True, check=True,
                             env=dict(os.environ, TZ="America/Chicago")).stdout.strip()
        return day or today
    except (OSError, subprocess.CalledProcessError):
        return today


def sitemap_pages():
    rels = ["index.html"] + sorted(
        os.path.join(d, "index.html") for d in os.listdir(ROOT)
        if not d.startswith((".", "_")) and d not in ("assets", "tools")
        and os.path.isfile(os.path.join(ROOT, d, "index.html")))
    pages = []
    for rel in rels:
        s = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        robots = re.search(r'<meta name="robots" content="([^"]*)"', s, re.I)
        if robots and "noindex" in robots.group(1).lower():
            continue
        canon = re.search(r'<link rel="canonical" href="([^"]+)"', s, re.I)
        folder = os.path.dirname(rel)
        pages.append((canon.group(1) if canon else f"{SITE}/{folder + '/' if folder else ''}", last_change(rel)))
    return pages


def sitemap_and_robots():
    pages = sitemap_pages()
    rows = "".join(f"  <url>\n    <loc>{html.escape(url)}</loc>\n    <lastmod>{day}</lastmod>\n  </url>\n"
                   for url, day in pages)
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows + "</urlset>\n")
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8").write(ROBOTS)
    return pages


def main():
    page = (PAGE.replace("%JSONLD%", json.dumps(JSONLD, ensure_ascii=False, separators=(",", ":")))
                .replace("%MAP%", map_svg()).replace("%MAPKEY%", map_key())
                .replace("%CLIPS%", clips_html()).replace("%FOLLOW%", follow_html()))
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(page)
    open(os.path.join(ROOT, "404.html"), "w", encoding="utf-8").write(NOT_FOUND)
    os.makedirs(os.path.join(ROOT, "camp-map"), exist_ok=True)
    camp = camp_page()
    open(os.path.join(ROOT, "camp-map", "index.html"), "w", encoding="utf-8").write(camp)
    os.makedirs(os.path.join(ROOT, "projects"), exist_ok=True)
    open(os.path.join(ROOT, "projects", "index.html"), "w", encoding="utf-8").write(projects_page())
    print(f"index.html {len(page) // 1024} KB, {len(CLIPS)} clips, not yet: {NOT_YET or 'unknown'}; camp-map/index.html {len(camp) // 1024} KB")
    listed = sitemap_and_robots()
    print(f"sitemap.xml: {len(listed)} pages ({', '.join(u.replace(SITE, '') or '/' for u, _ in listed)}); robots.txt")


if __name__ == "__main__":
    main()
