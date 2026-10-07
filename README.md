# scoopanddude.com

Scoop, Dude (the Great Dane) and Bay Bay: van life, the states-visited sticker map, clips from the road,
and the next trip. Hosted free on GitHub Pages; the domain is registered at Porkbun.

## Changing the page

Edit `tools/build.py` (the four states not visited yet, the clips, the links, the words), then run

    python3 tools/build.py

from this folder. It writes `index.html` and `404.html`. Styles are in `assets/css/site.css`; the map
labels and the video player are in `assets/js/site.js`. Videos play from YouTube only when someone presses
play (youtube-nocookie.com), so the page itself loads nothing from YouTube.

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
