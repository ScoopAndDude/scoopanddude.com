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

// animated state counter
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const dur = 1200;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const statesEl = document.querySelector('.mileage dd.states');
if (statesEl && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateCount(statesEl);
      io.disconnect();
    }
  }, { threshold: 0.5 });
  io.observe(statesEl);
}

// scroll progress
const bar = document.createElement('div');
bar.className = 'scroll-progress';
document.body.prepend(bar);
window.addEventListener('scroll', () => {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = (window.scrollY / h * 100) + '%';
});

// dark mode toggle
const toggle = document.createElement('button');
toggle.className = 'theme-toggle';
toggle.textContent = '🌙';
toggle.setAttribute('aria-label', 'Toggle dark mode');
toggle.onclick = () => {
  document.documentElement.classList.toggle('dark');
  toggle.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
};
document.querySelector('.top-in').appendChild(toggle);
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
  toggle.textContent = '☀️';
}

// mileage pulse when done
const statesEl = document.querySelector('.mileage dd.states');
if (statesEl) {
  const obs = new MutationObserver(() => {
    if (statesEl.textContent === statesEl.dataset.count) {
      statesEl.classList.add('done');
      obs.disconnect();
    }
  });
  obs.observe(statesEl, { childList: true, characterData: true, subtree: true });
}

// next trip progress (92% = 46/50)
const nextSign = document.querySelector('.sign-next .sign-in');
if (nextSign) {
  const prog = document.createElement('div');
  prog.className = 'next-progress';
  prog.innerHTML = '<span></span>';
  nextSign.appendChild(prog);
}

// sound toggle (placeholder - plays nothing by default)
const soundBtn = document.createElement('button');
soundBtn.className = 'theme-toggle';
soundBtn.textContent = '🔇';
soundBtn.setAttribute('aria-label', 'Toggle sound');
soundBtn.onclick = () => {
  soundBtn.textContent = soundBtn.textContent === '🔇' ? '🔊' : '🔇';
  // Hook for future ambient audio
};
document.querySelector('.top-in').appendChild(soundBtn);

// video pause button
const heroVideo = document.querySelector('.hero-photo video');
if (heroVideo) {
  const btn = document.createElement('button');
  btn.className = 'video-pause';
  btn.textContent = '⏸';
  btn.setAttribute('aria-label', 'Pause video');
  btn.onclick = () => {
    if (heroVideo.paused) { heroVideo.play(); btn.textContent = '⏸'; }
    else { heroVideo.pause(); btn.textContent = '▶'; }
  };
  document.querySelector('.hero-photo').appendChild(btn);
}

// back to top button
const topBtn = document.createElement('button');
topBtn.textContent = '↑';
topBtn.setAttribute('aria-label', 'Back to top');
topBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:44px;height:44px;border-radius:50%;background:var(--sign);color:#fff;border:0;font-size:1.4rem;cursor:pointer;opacity:0;transition:opacity .2s;z-index:30;';
topBtn.onclick = () => window.scrollTo({top:0,behavior:'smooth'});
document.body.appendChild(topBtn);
window.addEventListener('scroll', () => {
  topBtn.style.opacity = window.scrollY > 400 ? '1' : '0';
});

// keyboard shortcut: press "t" for top
document.addEventListener('keydown', (e) => {
  if (e.key === 't' && !e.target.matches('input, textarea')) {
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
});
