#!/usr/bin/env python3
"""Builds index.html and 404.html for scoopanddude.com (GitHub Pages, repo ScoopAndDude/scoopanddude.github.io).

    python3 tools/build.py        (from the repo root)

Edit the lists below (states not visited yet, clips, links) and run it again. The state outlines in
tools/us-states.json come from us-atlas (US Census Bureau boundaries, Albers USA projection).
"""
import html
import json
import os

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
<meta property="og:image" content="https://scoopanddude.com/assets/img/og-1200x630.jpg">
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
    <a class="mark" href="#top">Scoop &amp; Dude</a>
    <nav aria-label="Sections">
      <a class="opt2" href="#crew">The crew</a>
      <a href="#map">The map</a>
      <a href="#clips">Clips</a>
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


def main():
    page = (PAGE.replace("%JSONLD%", json.dumps(JSONLD, ensure_ascii=False, separators=(",", ":")))
                .replace("%MAP%", map_svg()).replace("%MAPKEY%", map_key())
                .replace("%CLIPS%", clips_html()).replace("%FOLLOW%", follow_html()))
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(page)
    open(os.path.join(ROOT, "404.html"), "w", encoding="utf-8").write(NOT_FOUND)
    print(f"index.html {len(page) // 1024} KB, {len(CLIPS)} clips, not yet: {NOT_YET or 'unknown'}")


if __name__ == "__main__":
    main()
