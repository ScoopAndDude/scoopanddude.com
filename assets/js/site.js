/* Scoop & Dude: the sticker map's labels and the video player. Nothing loads from YouTube until someone presses play. */
(function () {
  "use strict";

  // ---- the map: tap or hover a state to see its name ----
  var map = document.getElementById("usmap"), tip = document.getElementById("maptip");
  if (map) {   // press the stickers on when the map comes into view (just once); without this script they just show
    document.documentElement.classList.add("js");
    var mw = map.parentNode;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { mw.classList.add("map-on"); io.disconnect(); } }); }, { threshold: 0.3 });
      io.observe(mw);
    } else { mw.classList.add("map-on"); }
  }
  if (map && tip) {
    var wrap = map.parentNode, current = null;
    function show(el, evt) {
      if (current) current.classList.remove("on");
      current = el; el.classList.add("on");
      var name = el.getAttribute("data-name"), been = !el.classList.contains("no");
      tip.innerHTML = "";
      tip.appendChild(document.createTextNode(name));
      var s = document.createElement("small"); s.textContent = been ? "been there" : "not yet"; tip.appendChild(s);
      var r = wrap.getBoundingClientRect(), x, y;
      if (evt && evt.clientX) { x = evt.clientX - r.left; y = evt.clientY - r.top; }
      else { var b = el.getBoundingClientRect(); x = b.left + b.width / 2 - r.left; y = b.top + b.height / 2 - r.top; }
      tip.style.left = Math.max(60, Math.min(r.width - 60, x)) + "px"; tip.style.top = y + "px";
      tip.hidden = false;
    }
    function hide() { if (current) current.classList.remove("on"); current = null; tip.hidden = true; }
    map.addEventListener("mousemove", function (e) { if (e.target.classList && e.target.classList.contains("st")) show(e.target, e); });
    map.addEventListener("mouseleave", hide);
    map.addEventListener("click", function (e) { if (e.target.classList && e.target.classList.contains("st")) show(e.target, e); else hide(); });
    document.addEventListener("click", function (e) { if (!map.contains(e.target)) hide(); });
  }

  // ---- the video player ----
  var dlg = document.getElementById("player");
  if (!dlg) return;
  var frame = dlg.querySelector(".player-frame"), title = dlg.querySelector(".player-t"), opener = null;
  function close() {
    frame.innerHTML = "";
    if (dlg.open) dlg.close();
    if (opener) opener.focus();
  }
  document.querySelectorAll("[data-yt]").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-yt");
      if (typeof dlg.showModal !== "function") { location.href = "https://www.youtube.com/watch?v=" + id; return; }
      opener = b;
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0&playsinline=1";
      f.title = b.getAttribute("data-title") || "Video";
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      frame.innerHTML = ""; frame.appendChild(f);
      title.textContent = b.getAttribute("data-title") || "";
      dlg.showModal();
    });
  });
  dlg.querySelector(".player-x").addEventListener("click", close);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
})();
