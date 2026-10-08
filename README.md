# scoopanddude.com

Scoop, Dude (the Great Dane) and Bay Bay: van life, the states-visited sticker map, clips from the road,
and the next trip. Hosted free on GitHub Pages; the domain is registered at Porkbun.

## Changing the page

Edit `tools/build.py` (the four states not visited yet, the clips, the links, the words), then run

    python3 tools/build.py

from this folder. It writes `index.html`, `404.html`, `camp-map/index.html` and `projects/index.html`. Styles are in `assets/css/site.css`; the map
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
