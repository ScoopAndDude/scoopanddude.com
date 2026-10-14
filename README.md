# scoopanddude.com

The homepage is **The Dinner Scoop**, Scoop's what's-for-dinner app (since Oct. 14, 2026: "scoopanddude.com
should be the app and everything else just live inside it"). Everything else is reached from the app's Menu:
the van-life page (Scoop, Dude the Great Dane and Bay Bay, the states-visited sticker map, clips from the road
and the next trip) at `van-life/`, the camp map, the projects, the shop and the social links. Hosted free on
GitHub Pages; the domain is registered at Porkbun.

Old homepage links like scoopanddude.com/#crew, #map, #clips, #shop or #follow forward to the same spot on
`van-life/`, and the app's first address, `dinner/`, forwards to the homepage.

## Changing the van-life page

Edit `tools/build.py` (the four states not visited yet, the clips, the links, the words), then run

    python3 tools/build.py

from this folder. It writes `van-life/index.html` (with links and files pointed at the site root), `404.html`,
`camp-map/index.html`, `projects/index.html`, `sitemap.xml` and `robots.txt`. It never writes the homepage,
which is The Dinner Scoop. The sitemap lists every page that has no noindex tag, dated by its last commit (Central time);
the moved pages that still carry noindex stay out of it until that tag comes off. Styles are in `assets/css/site.css`; the map
labels and the video player are in `assets/js/site.js`. Videos play from YouTube only when someone presses
play (youtube-nocookie.com), so the page itself loads nothing from YouTube.

## Projects (moved from La Porte Weather Now, Oct. 7, 2026)

Scoop moved his non-weather pages here: `faith/`, `amazon/`, `markets/`, `ai-survival-guide/`, `world-art/`,
`friends/`, `space-lab/`, `english/` and `printables/` (the old Travel Guides), with `projects/` listing them
(built by `tools/build.py`). laporteweathernow.com answers the old addresses with a 301 to these.

- They were ported once by `tools/port_projects.py` from the weather site's files (ScoopAndDude/laporteweathernow-site,
  commit 3a1123e, `site/`). Edit the pages here directly from now on; running the port again overwrites them.
- Their look: `assets/projects/lpwn-base.css` (the weather site's stylesheet they were built on) plus
  `assets/projects/theme.css` (Scoop & Dude's green, sunset colors, Overpass, top bar and footer).
  Their scripts are in `assets/projects/`; Leaflet and the time helpers are shared with the camp map in `assets/camp/`.
- Data still comes from the laporteweathernow-posts repo on GitHub Pages (Amazon numbers, markets, the Sky Devotion),
  which the weekly jobs keep fresh.
- Prayer requests on `faith/` still go to La Porte Weather Now's Netlify form "prayer-request" (the weather site
  keeps a hidden copy of that form on its Contact page so Netlify keeps it). AI's Survival Guide reads its three news
  feeds through laporteweathernow.com/feeds/; if those don't answer here, the page links to the sources instead.
- The daily-verse phone notification stayed with La Porte Weather Now's notification service and isn't on `faith/`.

## The Dinner Scoop (the homepage, `index.html`)

A what's-for-dinner app: tonight's pick with what it costs, a week planner with the food cost and a
"Make it cheaper" button, a grocery list that builds itself, a what's-in-my-fridge finder, and 51 recipes
with timers and a step-by-step cook mode. Everything is in the one file `index.html` (recipes, prices,
styles and script); there's no build step and nothing loads from other sites. The Menu's links are the
`window.SCOOP_SITE` list near the bottom of the file. Visitors' plans, lists and favorites stay in their own
browser (localStorage). The fonts, Big Shoulders and Atkinson Hyperlegible Next, are in `assets/fonts/`. It
started as a Claude artifact; Ask the chef and account sync only work inside Claude, so on this site the page
runs without them. Recipe costs are estimates from typical U.S. grocery prices (Oct. 2026).

Heads-up (Oct. 14, 2026): `van-life/index.html` (the old homepage), `404.html`, `camp-map/index.html` and
`projects/index.html` have hand edits newer than `tools/build.py` (the hero video, the ambient sound, the 404
forward fix and more). Running the build now would undo them, so carry those edits into `tools/build.py`
before running it again.

`assets/js/site.js` declared `statesEl` twice, which stopped the whole script from running (no video
player, no map labels, the states counter stuck at 0, the hero video hidden). Fixed Oct. 14, 2026, which
also turned on the extras added Oct. 10 and 11 (dark mode and sound buttons, back-to-top, clip share buttons
and more) for the first time.

## Keep it a project site

This repo is named `scoopanddude.com`, not `scoopanddude.github.io`, on purpose. A custom domain on a
`scoopanddude.github.io` repo (a GitHub "user site") makes GitHub forward every
`scoopanddude.github.io/<repo>/` address to scoopanddude.com, which broke La Porte Weather Now's data
loads from `scoopanddude.github.io/laporteweathernow-posts/` on Oct. 7, 2026. As a project site with its
own domain, only this site moves to scoopanddude.com.

## Credits

- Photos and videos: Scoop.
- State outlines: [us-atlas](https://github.com/topojson/us-atlas) (U.S. Census Bureau boundaries).
- Font: [Overpass](https://github.com/RedHatOfficial/Overpass), SIL Open Font License (`assets/fonts/OFL.txt`).
- The Dinner Scoop fonts: [Big Shoulders](https://github.com/xotypeco/big_shoulders) and
  [Atkinson Hyperlegible Next](https://github.com/googlefonts/atkinson-hyperlegible-next), SIL Open Font License
  (`assets/fonts/OFL-BigShoulders.txt`, `assets/fonts/OFL-AtkinsonHyperlegibleNext.txt`).
