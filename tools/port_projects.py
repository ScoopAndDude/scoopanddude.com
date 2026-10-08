#!/usr/bin/env python3
"""Moves Scoop's non-weather pages from laporteweathernow.com onto scoopanddude.com (Oct. 7, 2026).

    python3 tools/port_projects.py /path/to/laporteweathernow-site/site     (from this repo's root)

Scoop, Oct. 7, 6:28 PM: "we can move anything not weather related to ScoopAndDude.com". The source is
the weather site's files as published Oct. 7, 2026, 9:03 AM (ScoopAndDude/laporteweathernow-site,
commit 3a1123e, folder site/). Each page keeps its content and its own scripts and gets the Scoop & Dude
top bar, footer, font and colors. Links to the weather site's own pages become full laporteweathernow.com
addresses; links between the moved pages stay on this site.

From now on, edit the pages here directly (faith/, amazon/, markets/, ai-survival-guide/, world-art/,
friends/, space-lab/, english/, printables/). Running this again rebuilds them from the source folder
and overwrites any edits made here since.
"""
import html
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://scoopanddude.com"
LPWN = "https://laporteweathernow.com"

# old weather-site path -> (folder here, nav label for aria-current or None)
PAGES = {
    "faith": "faith", "amazon": "amazon", "markets": "markets", "ai-survival-guide": "ai-survival-guide",
    "world-art": "world-art", "friends": "friends", "space-lab": "space-lab", "english": "english",
    "travel-guides": "printables",
}
MOVED = dict(PAGES, **{"more-from-scoop": "projects", "camp-map": "camp-map"})
# The page scripts each page loads, and where they live here.
SCRIPT_HOME = {
    "leaflet.js": "../assets/camp/leaflet.js", "timeutil.js": "../assets/camp/timeutil.js",
    "locations.js": "../assets/camp/locations.js",
    "amazon.js": "../assets/projects/amazon.js", "markets.js": "../assets/projects/markets.js",
    "ai-guide.js": "../assets/projects/ai-guide.js", "faith.js": "../assets/projects/faith.js",
    "faith-data.js": "../assets/projects/faith-data.js", "disasters.js": "../assets/projects/disasters.js",
    "astronomy.min.js": "../assets/projects/astronomy.min.js",
}
DROP_SCRIPTS = {"i18n.js", "seasonal.js", "pwa.js", "track.js", "newsletter.js"}   # weather-site only
COPY = ["amazon.js", "markets.js", "ai-guide.js", "faith.js", "faith-data.js", "disasters.js", "astronomy.min.js"]

e = lambda s: html.escape(s, quote=True)

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
%ROBOTS%<title>%TITLE%</title>
<meta name="description" content="%DESC%">
<link rel="canonical" href="%URL%">
<meta property="og:type" content="website">
<meta property="og:url" content="%URL%">
<meta property="og:title" content="%OGTITLE%">
<meta property="og:description" content="%DESC%">
<meta property="og:image" content="https://scoopanddude.com/assets/img/og-badge-1200x630.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@scoopanddude">
<meta name="theme-color" content="#00663f">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/overpass-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/projects/lpwn-base.css">
<link rel="stylesheet" href="../assets/projects/theme.css">
%EXTRA_CSS%%PAGE_STYLES%
</head>
<body class="sad-project">
<a class="skip" href="#main">Skip to the page</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="../"><img src="../assets/img/scoop-dude-96.jpg" srcset="../assets/img/scoop-dude-160.jpg 3x" width="40" height="40" alt=""><span class="mark">Scoop &amp; Dude</span></a>
    <nav aria-label="Sections">
      <a class="opt2" href="../#crew">The crew</a>
      <a class="opt3" href="../#map">The map</a>
      <a href="../camp-map/">Camp map</a>
      <a href="../projects/">Projects</a>
      <a class="opt" href="../#clips">Clips</a>
      <a class="opt" href="../#follow">Follow</a>
    </nav>
  </div>
</header>
<main id="main">
"""
FOOT = """</main>

<footer class="foot">
  <div class="wrap">
    <p>Home base: La Porte, Indiana. When I'm home, I run <a href="https://laporteweathernow.com">La Porte Weather Now</a>, where this page started.</p>
    <p class="motto">Love God. Love people. Care for all that lives.</p>
    <p class="small"><a href="../projects/">More of Scoop's projects</a> &middot; &copy; 2026 Scoop &amp; Dude.</p>
  </div>
</footer>
<script>window.lpwnTrack = window.lpwnTrack || function () {};   /* the weather site counted visits; this site doesn't */</script>
%SCRIPTS%
</body>
</html>
"""


def rewrite_paths(text):
    """Site-relative addresses from the weather site: moved pages stay here, everything else goes there."""
    def one(p, tail):
        first = p.strip("/").split("/")[0].replace(".html", "")
        if first in MOVED:
            return f"../{MOVED[first]}/{tail}"
        return f"{LPWN}{p}{tail}"

    def attr(m):
        a, p, tail = m.group(1), m.group(2), m.group(3) or ""
        return f'{a}="{one(p, tail)}"'
    text = re.sub(r'\b(href|src|action)="(/(?!/)[^"#?]*)([#?][^"]*)?"', attr, text)

    def quoted(m):
        q, p, tail = m.group(1), m.group(2), m.group(3) or ""
        return f"{q}{one(p, tail)}{q}"
    # In scripts: "/emergency", '/space-lab', `/disasters` and the like (whole quoted paths only).
    return re.sub(r'(["\'`])(/(?:emergency|disasters|sky-devotion|contact|privacy|sources|daily-scoop|forecast-race|track-record|weekend|radar|'
                  r'faith|amazon|markets|ai-survival-guide|world-art|friends|space-lab|english|more-from-scoop|travel-guides|camp-map)(?:\.html)?)'
                  r'([#?][^"\'`]*)?\1', quoted, text)


def page(old, folder, src):
    h = open(os.path.join(src, old + ".html"), encoding="utf-8").read()
    head = h[:h.index("</head>")]
    body = h[h.index("<body"):]
    title = html.unescape(re.search(r"<title>(.*?)</title>", head, re.S).group(1)).replace(" | La Porte Weather Now", "").strip()
    desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', head).group(1))
    robots = '<meta name="robots" content="noindex, follow">\n' if re.search(r'name="robots" content="[^"]*noindex', head) else ""
    styles = "\n".join(re.findall(r"<style[^>]*>.*?</style>", head, re.S))
    extra = '<link rel="stylesheet" href="../assets/camp/leaflet.css">\n' if "leaflet.css" in head else ""
    main = re.search(r'<main id="main">(.*?)</main>', body, re.S).group(1)
    after = body[body.index("</main>"):]
    scripts = []
    for m in re.finditer(r'<script(?P<attrs>[^>]*)>(?P<code>.*?)</script>', after, re.S):
        srcm = re.search(r'src="([^"]+)"', m.group("attrs"))
        if srcm:
            name = srcm.group(1).split("?")[0].lstrip("/")
            if name in DROP_SCRIPTS:
                continue
            if name in SCRIPT_HOME:
                scripts.append(f'<script src="{SCRIPT_HOME[name]}"></script>')
            elif srcm.group(1).startswith("http"):
                scripts.append(f'<script src="{srcm.group(1)}"></script>')
            else:
                sys.exit(f"{old}: no home for script {name}")
        else:
            code = m.group("code")
            if "lpwnTrack = window.lpwnTrack" in code and len(code) < 300:
                continue
            scripts.append("<script>" + rewrite_paths(code) + "</script>")
    main = rewrite_paths(main)
    styles = rewrite_paths(styles)
    url = f"{SITE}/{folder}/"
    out = (HEAD.replace("%ROBOTS%", robots).replace("%TITLE%", e(title + " | Scoop & Dude")).replace("%DESC%", e(desc))
           .replace("%URL%", url).replace("%OGTITLE%", e(title)).replace("%EXTRA_CSS%", extra).replace("%PAGE_STYLES%", styles)
           + main.strip("\n") + "\n" + FOOT.replace("%SCRIPTS%", "\n".join(scripts)))
    out = out.replace('<a href="../projects/">Projects</a>', '<a href="../projects/">Projects</a>', 1)
    return out, title


def fix_page(folder, t):
    """Page-by-page changes for life on this site."""
    if folder == "faith":
        # The daily-verse notification ran on the weather site's notification service, which can't follow the page here.
        t = re.sub(r'\s*<div class="f-push">.*?</div>', "", t, count=1, flags=re.S)
        t = t.replace("It comes privately to Scoop, never posted anywhere, and we'll pray for you by name.",
                      "It comes privately to Scoop (through La Porte Weather Now's form service), never posted anywhere, and we'll pray for you by name.")
    if folder == "printables":
        t = re.sub(r'\s*<section class="newsletter" id="newsletter">.*?</section>', "", t, count=1, flags=re.S)
        t = t.replace('href="#newsletter">Get an email when it launches &rarr;</a>',
                      'href="https://www.etsy.com/shop/ScoopAndDude">Watch the Etsy shop for it &rarr;</a>')
        t = t.replace("<title>Travel &amp; Survival Guides | Scoop &amp; Dude</title>", "<title>Printables from the road | Scoop &amp; Dude</title>")
    if folder in ("markets", "ai-survival-guide", "printables"):
        t = re.sub(r'\s*<form [^>]*data-newsletter.*?</form>', "", t, flags=re.S)
    return t


def fix_scripts(dst):
    p = os.path.join(dst, "faith.js")
    t = open(p, encoding="utf-8").read()
    start = t.index("  // Daily verse on your phone:")
    end = t.index("  if (on()) loadSdk().catch(() => {});\n") + len("  if (on()) loadSdk().catch(() => {});\n")
    t = t[:start] + "  // (The daily-verse phone notification stayed with La Porte Weather Now's notification service, Oct. 7, 2026.)\n" + t[end:]
    t = t.replace("From La Porte Weather Now: https://laporteweathernow.com/faith", "From Scoop & Dude: https://scoopanddude.com/faith/")
    t = t.replace('`<a href="/disasters">', '`<a href="https://laporteweathernow.com/disasters">')
    # Prayer requests still go to La Porte Weather Now's form (Netlify form "prayer-request"); a page on another
    # site can't read the answer, so a sent request counts as sent unless the network fails.
    t = t.replace('const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });\n      if (!res.ok) throw new Error(String(res.status));',
                  'await fetch("https://laporteweathernow.com/", { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });')
    assert 'mode: "no-cors"' in t and "OneSignal" not in t and 'href="/' not in t, "faith.js not patched"
    open(p, "w", encoding="utf-8").write(t)

    p = os.path.join(dst, "ai-guide.js")
    t = open(p, encoding="utf-8").read()
    for f in ("npr-tech", "ars-ai", "ftc-alerts"):
        t = t.replace(f'"/feeds/{f}"', f'"https://laporteweathernow.com/feeds/{f}"')
    t = t.replace('<a href="/markets">', '<a href="../markets/">')
    t = t.replace("`<p class=\"ai-fine\">The news feeds didn't answer just now. Try again in a few minutes.</p>`",
                  "`<p class=\"ai-fine\">The news feeds didn't answer just now. Read the latest at <a href=\"https://www.npr.org/sections/technology/\" target=\"_blank\" rel=\"noopener\">NPR Technology</a> and <a href=\"https://arstechnica.com/ai/\" target=\"_blank\" rel=\"noopener\">Ars Technica AI</a>.</p>`")
    t = t.replace('["Netlify (runs this site)",', '["Netlify (runs La Porte Weather Now)",').replace('["GitHub", "https://www.githubstatus.com', '["GitHub (runs this site)", "https://www.githubstatus.com')
    assert '"/feeds/' not in t and 'href="/markets"' not in t and "runs this site)\"" not in t.replace('GitHub (runs this site)"', ''), "ai-guide.js not patched"
    open(p, "w", encoding="utf-8").write(t)


THEME = """/* Scoop & Dude look for the pages that moved from La Porte Weather Now (Oct. 7, 2026).
   Loads after lpwn-base.css (the weather site's stylesheet the pages were built on) and swaps its
   tactical black and orange for Scoop & Dude's road-sign green, sunset and Overpass. */
@font-face { font-family: "Overpass"; font-style: normal; font-weight: 400; font-display: swap; src: url("../fonts/overpass-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Overpass"; font-style: normal; font-weight: 500; font-display: swap; src: url("../fonts/overpass-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Overpass"; font-style: normal; font-weight: 800; font-display: swap; src: url("../fonts/overpass-latin-800-normal.woff2") format("woff2"); }
@font-face { font-family: "Overpass"; font-style: normal; font-weight: 900; font-display: swap; src: url("../fonts/overpass-latin-900-normal.woff2") format("woff2"); }
:root {
  --forest: #00663f; --forest-dark: #004d30; --forest-soft: #0b5a3b;
  --amber: #f08a24; --amber-bright: #f1bf2c; --amber-dark: #c96d12; --amber-text: #8a4a07;
  --dusk: #2e2340;
  --serif: "Overpass", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --sans: "Overpass", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --sign: #00663f; --sign-deep: #004d30; --line-sad: #d6dbd7; --concrete: #eef0ed;
}
html, body { background: #fff; }
body.sad-project { font-family: var(--sans); color: #2c3034; }
.sad-project .hero { background: linear-gradient(160deg, #2e2340 0%, #4f3150 55%, #7a4a5e 100%); }
.sad-project .hero h1, .sad-project .section h2 { font-weight: 900; letter-spacing: -0.01em; }
.sad-project .btn-amber { background: var(--amber-bright); color: #2e2340; }
.sad-project .btn-amber:hover { background: #ffd35a; }
.skip { position: absolute; left: -9999px; top: 8px; background: #fff; padding: 8px 12px; z-index: 50; }
.skip:focus { left: 8px; }

/* the Scoop & Dude top bar (same as the home page) */
.top { position: sticky; top: 0; z-index: 40; background: rgba(255,255,255,.96); backdrop-filter: saturate(1.4) blur(8px); border-bottom: 1px solid var(--line-sad); }
.top .top-in { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 60px; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.top .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; flex: none; }
.top .brand img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px var(--sign); }
.top .mark { display: inline-block; background: var(--sign); color: #fff; font-weight: 900; font-size: 1.02rem; line-height: 1; padding: 9px 13px 7px; border-radius: 7px; box-shadow: inset 0 0 0 2px var(--sign), inset 0 0 0 4px #fff; white-space: nowrap; }
.top nav { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.top nav::-webkit-scrollbar { display: none; }
.top nav a { color: #2c3034; text-decoration: none; font-weight: 500; padding: 8px 10px; border-radius: 8px; white-space: nowrap; font-size: 1rem; }
.top nav a:hover { background: var(--concrete); }
@media (max-width: 800px) { .top nav a.opt { display: none; } }
@media (max-width: 600px) { .top nav a.opt2 { display: none; } }
@media (max-width: 430px) { .top nav a.opt3 { display: none; } }
@media (max-width: 430px) { .top nav a { padding: 8px 6px; } }
@media (max-width: 400px) { .top .brand { gap: 8px; } .top .brand img { width: 34px; height: 34px; } .top .mark { font-size: .95rem; padding: 8px 11px 6px; } }

/* the Scoop & Dude footer */
footer.foot { background: var(--sign); color: #fff; padding: 36px 0 30px; font-size: 1rem; }
footer.foot .wrap { display: block; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
footer.foot a { color: #fff; text-decoration: underline; text-underline-offset: 3px; }
footer.foot p { margin: 0 0 8px; }
footer.foot .motto { font-weight: 800; font-size: 1.15rem; margin: 10px 0 12px; }
footer.foot .small { color: #cfe7da; font-size: .9rem; }
"""


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    dst = os.path.join(ROOT, "assets", "projects")
    os.makedirs(dst, exist_ok=True)
    shutil.copyfile(os.path.join(src, "style.css"), os.path.join(dst, "lpwn-base.css"))
    for f in COPY:
        shutil.copyfile(os.path.join(src, f), os.path.join(dst, f))
    fix_scripts(dst)
    with open(os.path.join(dst, "theme.css"), "w", encoding="utf-8") as fh:
        fh.write(THEME)
    # Leaflet's marker pictures (leaflet.css looks for images/ next to itself).
    os.makedirs(os.path.join(ROOT, "assets", "camp", "images"), exist_ok=True)
    for f in os.listdir(os.path.join(src, "images")):
        shutil.copyfile(os.path.join(src, "images", f), os.path.join(ROOT, "assets", "camp", "images", f))
    made = []
    for old, folder in PAGES.items():
        out, title = page(old, folder, src)
        out = fix_page(folder, out)
        left = re.findall(r'(?:href|src)="/(?!/)[^"]*"', out)
        if left:
            sys.exit(f"{folder}: site-relative links left: {left[:5]}")
        os.makedirs(os.path.join(ROOT, folder), exist_ok=True)
        with open(os.path.join(ROOT, folder, "index.html"), "w", encoding="utf-8") as fh:
            fh.write(out)
        made.append(f"{folder}/ ({title})")
    print("Built " + "; ".join(made))


if __name__ == "__main__":
    main()
