(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Skill decks: fanned cards, arrows, flip on select, pointer tilt
  document.querySelectorAll('[data-deck]').forEach(function (deck) {
    var slots = [].slice.call(deck.querySelectorAll('.slot')), n = slots.length, active = 0;
    var live = deck.querySelector('.live');
    function render() {
      slots.forEach(function (s, i) {
        var d = ((i - active + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
        s.style.setProperty('--d', d); s.style.setProperty('--abs', Math.abs(d));
        var on = i === active, btn = s.querySelector('.hit');
        s.classList.toggle('active', on);
        btn.tabIndex = on ? 0 : -1;
        btn.setAttribute('aria-pressed', s.classList.contains('flipped'));
        if (!on) { var w = s.querySelector('.wrap3d'); w.style.setProperty('--rx', '0deg'); w.style.setProperty('--ry', '0deg'); }
      });
      var t = slots[active].querySelector('h4').textContent;
      live.textContent = t + ', ' + (active + 1) + ' of ' + n + (slots[active].classList.contains('flipped') ? ', details shown' : '');
    }
    function go(i, flip) {
      active = (i + n) % n;
      slots.forEach(function (s, k) { s.classList.toggle('flipped', k === active && !!flip); });
      render();
    }
    slots.forEach(function (s, i) {
      s.querySelector('.hit').addEventListener('click', function () {
        if (i === active) { s.classList.toggle('flipped'); render(); } else { go(i, true); }
      });
    });
    deck.querySelector('.prev').addEventListener('click', function () { go(active - 1, false); });
    deck.querySelector('.next').addEventListener('click', function () { go(active + 1, false); });
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(active - 1, false); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(active + 1, false); e.preventDefault(); }
    });
    if (!still) {
      deck.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var s = slots[active], r = s.getBoundingClientRect(), w = s.querySelector('.wrap3d');
        var x = clamp((e.clientX - r.left) / r.width - .5, -1, 1), y = clamp((e.clientY - r.top) / r.height - .5, -1, 1);
        w.classList.add('live-tilt');
        w.style.setProperty('--ry', (x * 14).toFixed(1) + 'deg');
        w.style.setProperty('--rx', (-y * 10).toFixed(1) + 'deg');
      });
      deck.addEventListener('pointerleave', function () {
        slots.forEach(function (s) { var w = s.querySelector('.wrap3d'); w.classList.remove('live-tilt'); w.style.setProperty('--rx', '0deg'); w.style.setProperty('--ry', '0deg'); });
      });
    }
    render();
  });

  // Hero and About: scroll-linked reveal + pointer tracking
  var story = document.querySelector('.story'), hero = document.querySelector('.hero-layer'), sraf = 0;
  if (story && !still) {
    var upd = function () {
      sraf = 0;
      var p = clamp(-story.getBoundingClientRect().top / window.innerHeight, 0, 1);
      story.style.setProperty('--p', p.toFixed(4));
      story.style.setProperty('--s', (1 - p * .08).toFixed(4));
      story.style.setProperty('--o', clamp(1 - p * 1.15, 0, 1).toFixed(3));
    };
    window.addEventListener('scroll', function () { if (!sraf) sraf = requestAnimationFrame(upd); }, { passive: true });
    window.addEventListener('resize', upd); upd();

    var tx = 0, ty = 0, cx = 0, cy = 0, px = 0, py = 0, tr = 0;
    var tick = function () {
      cx += (tx - cx) * .1; cy += (ty - cy) * .1;
      hero.style.setProperty('--mx', cx.toFixed(3)); hero.style.setProperty('--my', cy.toFixed(3));
      hero.style.setProperty('--sx', px.toFixed(0) + 'px'); hero.style.setProperty('--sy', py.toFixed(0) + 'px');
      tr = (Math.abs(tx - cx) + Math.abs(ty - cy) > .002) ? requestAnimationFrame(tick) : 0;
    };
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      px = e.clientX - r.left; py = e.clientY - r.top;
      hero.classList.add('tracking'); if (!tr) tr = requestAnimationFrame(tick);
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; hero.classList.remove('tracking'); if (!tr) tr = requestAnimationFrame(tick); });
  }

  // Footer reveal: wordmark rises as the page lifts away (transform only)
  var mark = document.querySelector('.mark'), mainEl = document.querySelector('main'), foot = document.querySelector('.foot'), raf = 0;
  function reveal() {
    raf = 0;
    var p = clamp(1 - (mainEl.getBoundingClientRect().bottom - window.innerHeight) / foot.offsetHeight, 0, 1);
    mark.style.setProperty('--rise', ((1 - p) * 45).toFixed(1) + '%');
  }
  if (!still) {
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(reveal); }, { passive: true });
    window.addEventListener('resize', reveal); reveal();
  }

  // Theme: follows the system, toggle overrides and is remembered
  var tb = document.querySelector('.theme');
  function resolved() { return root.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  function paint() {
    var d = resolved() === 'dark';
    tb.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
    tb.querySelector('use').setAttribute('href', d ? '#i-sun' : '#i-moon');
  }
  tb.addEventListener('click', function () {
    var next = resolved() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    paint();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
  paint();

  // Sections rise over the previous one: lift content in, dim what is being covered
  var sheets = [].slice.call(document.querySelectorAll('.sheet')), shraf = 0;
  function lift() {
    shraf = 0;
    var vh = window.innerHeight;
    sheets.forEach(function (s) {
      var top = s.getBoundingClientRect().top;
      s.style.setProperty('--rp', clamp((vh - top) / (vh * .6), 0, 1).toFixed(3));
      var prev = s.previousElementSibling;
      if (prev) prev.style.setProperty('--dim', (1 - .35 * clamp((vh - top) / vh, 0, 1)).toFixed(3));
    });
  }
  if (!still) {
    window.addEventListener('scroll', function () { if (!shraf) shraf = requestAnimationFrame(lift); }, { passive: true });
    window.addEventListener('resize', lift); lift();
  }

  // Contact panel: soft light follows the pointer
  var art = document.querySelector('.c-art');
  if (art && !still) {
    art.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = art.getBoundingClientRect();
      art.style.setProperty('--ax', (e.clientX - r.left).toFixed(0) + 'px');
      art.style.setProperty('--ay', (e.clientY - r.top).toFixed(0) + 'px');
      art.classList.add('glow');
    });
    art.addEventListener('pointerleave', function () { art.classList.remove('glow'); });
  }

  // Glass orb (hero section only): follows the pointer like a water drop (lag, stretch, wobble) and draws a fading trail
  if (!still && !window.matchMedia('(hover: none)').matches) (function () {
    var cv = document.createElement('canvas'); cv.className = 'orb-canvas'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    var cx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, i;
    function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
    size(); window.addEventListener('resize', size);

    // Pre-rendered pieces: pearl-white interior (far + near layers for depth) and the glass shell
    var S = 256, TAU = Math.PI * 2;
    function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function blob(g, x, y, r, rgb, a) {
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    var far = mk(S * 2, S * 2), g = far.getContext('2d');
        blob(g, S, S * .9, S * .9, '205,215,255', .2); blob(g, S * 1.25, S * 1.3, S * .6, '255,215,238', .16);
    blob(g, S * .7, S * 1.4, S * .5, '195,238,255', .16); blob(g, S * .95, S * .85, S * .3, '255,255,255', .3);
    for (i = 0; i < 120; i++) {
      g.fillStyle = 'rgba(150,162,205,' + (.15 + Math.random() * .3) + ')'; g.beginPath();
      g.arc(Math.random() * S * 2, Math.random() * S * 2, .4 + Math.random() * 1, 0, TAU); g.fill();
    }
    var near = mk(S * 2, S * 2), cols = ['255,90,120', '90,220,170', '110,150,255']; g = near.getContext('2d');
    for (i = 0; i < 26; i++) blob(g, Math.random() * S * 2, Math.random() * S * 2, 4 + Math.random() * 5, '255,255,255', .95);
    for (i = 0; i < 14; i++) {
      var gx = Math.random() * S * 2, gy = Math.random() * S * 2;
      g.strokeStyle = 'rgba(' + cols[i % 3] + ',.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 3 + Math.random() * 4, gy + 2 + Math.random() * 5); g.stroke();
    }
    var glass = mk(S, S), h = S / 2; g = glass.getContext('2d');
    var rim = g.createRadialGradient(h, h, h * .7, h, h, h);
    rim.addColorStop(0, 'rgba(225,230,250,0)'); rim.addColorStop(.8, 'rgba(225,230,250,.14)'); rim.addColorStop(.95, 'rgba(180,192,228,.4)'); rim.addColorStop(1, 'rgba(255,255,255,.9)');
    g.fillStyle = rim; g.beginPath(); g.arc(h, h, h, 0, TAU); g.fill();
    blob(g, h * 1.4, h * 1.5, h * .75, '110,125,175', .13);
    [['255,90,120', -3], ['90,130,255', 3]].forEach(function (f) {
      g.strokeStyle = 'rgba(' + f[0] + ',.35)'; g.lineWidth = 3;
      g.beginPath(); g.arc(h + f[1], h, h - 4, .2, 1.2); g.stroke();
      g.beginPath(); g.arc(h - f[1], h, h - 4, 3.3, 4.4); g.stroke();
    });
    blob(g, h * .62, h * .5, h * .38, '255,255,255', .55);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(h * .58, h * .42, h * .13, h * .07, -.6, 0, TAU); g.fill();

    // Only shown over the hero section
    var heroEl = document.querySelector('.hero-layer');
    function inHero() {
      if (!heroEl) return false;
      var r = heroEl.getBoundingClientRect();
      return r.bottom > 0 && ty >= r.top && ty <= r.bottom && tx >= r.left && tx <= r.right;
    }

    // Motion state
    var R0 = 30, x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, st = 0, sv = 0, ox = 0, oy = 0;
    var sc = 1, tsc = 1, al = 0, tal = 0, trail = [], drops = [], run = 0, ready = false;
    function seg(a, b, w, style) { cx.strokeStyle = style; cx.lineWidth = w; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }

    function frame(now) {
      run = 0;
      vx = (vx + (tx - x) * .085) * .8; vy = (vy + (ty - y) * .085) * .8; x += vx; y += vy;
      var sp = Math.hypot(vx, vy), ang = Math.atan2(vy, vx);
      sv += (Math.min(sp * .022, .6) - st) * .2; sv *= .78; st += sv;      // squash and stretch with wobble
      sc += (tsc - sc) * .18; al += (tal - al) * .15;
      ox = clamp(ox * .985 + vx * .55, -S * .32, S * .32); oy = clamp(oy * .985 + vy * .55, -S * .32, S * .32);
      if (sp > .5) trail.push({ x: x, y: y, t: now });
      while (trail.length && now - trail[0].t > 800) trail.shift();
      if (sp > 7 && Math.random() < .5) drops.push({ x: x, y: y, vx: -vx * .1 + (Math.random() - .5) * 2.5, vy: -vy * .1 + (Math.random() - .5) * 2.5, r: 2 + Math.random() * 3.5, l: 1 });

      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
      var dark = resolved() === 'dark', R = R0 * sc; cx.lineCap = 'round';
      for (i = 1; i < trail.length; i++) {
        var a = trail[i - 1], b = trail[i], age = 1 - (now - b.t) / 800, w = R * 1.1 * (i / trail.length) * age + 1;
        if (dark) {
          seg(a, b, w, 'rgba(255,255,255,' + age * .28 * al + ')');
        } else {
          cx.shadowColor = 'rgba(70,80,120,' + age * .4 * al + ')'; cx.shadowBlur = 10;
          seg(a, b, w, 'rgba(255,255,255,' + Math.min(1, age * 1.4) * al + ')'); cx.shadowBlur = 0; cx.shadowColor = 'transparent';
        }
        seg(a, b, w * .35, 'rgba(255,255,255,' + age * (dark ? .6 : .9) * al + ')');
      }
      drops = drops.filter(function (d) { return d.l > 0; });
      drops.forEach(function (d) {
        d.l -= .025; d.x += d.vx; d.y += d.vy; d.vy += .08;
        var r = d.r * d.l + .5, gr = cx.createRadialGradient(d.x - r * .3, d.y - r * .3, 0, d.x, d.y, r);
        gr.addColorStop(0, 'rgba(255,255,255,' + d.l + ')'); gr.addColorStop(1, (dark ? 'rgba(255,255,255,' : 'rgba(225,232,250,') + d.l * .85 + ')');
        if (!dark) { cx.shadowColor = 'rgba(70,80,120,' + d.l * .4 + ')'; cx.shadowBlur = 5; }
        cx.fillStyle = gr; cx.beginPath(); cx.arc(d.x, d.y, r, 0, TAU); cx.fill();
        cx.shadowBlur = 0; cx.shadowColor = 'transparent';
      });

      if (ready && al > .02) {
        var k = 2 * R / S;
        cx.save(); cx.translate(x, y); cx.rotate(ang); cx.scale(1 + st, 1 / Math.sqrt(1 + st)); cx.rotate(-ang);
        cx.globalAlpha = al;
        cx.shadowColor = dark ? 'rgba(255,255,255,.3)' : 'rgba(60,70,110,.35)'; cx.shadowBlur = R * .7; cx.shadowOffsetY = dark ? 0 : R * .3;
        cx.fillStyle = '#000'; cx.beginPath(); cx.arc(0, 0, R, 0, TAU); cx.fill(); cx.shadowColor = 'transparent';
        cx.globalCompositeOperation = 'destination-out'; cx.beginPath(); cx.arc(0, 0, R, 0, TAU); cx.fill(); cx.globalCompositeOperation = 'source-over';
        cx.beginPath(); cx.arc(0, 0, R, 0, TAU); cx.clip();
        cx.drawImage(far, -2 * R + ox * k, -2 * R + oy * k, 4 * R, 4 * R);
        cx.drawImage(near, -2 * R + ox * k * 1.4, -2 * R + oy * k * 1.4, 4 * R, 4 * R);
        cx.drawImage(glass, -R, -R, 2 * R, 2 * R);
        cx.restore();
      }
      var active = sp > .05 || Math.abs(tx - x) > .3 || Math.abs(ty - y) > .3 || trail.length || drops.length || Math.abs(sc - tsc) > .01 || Math.abs(al - tal) > .01 || Math.abs(sv) > .002;
      if (active && !document.hidden) run = requestAnimationFrame(frame);
    }
    function kick() { if (!run) run = requestAnimationFrame(frame); }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      if (!ready) { x = tx; y = ty; ready = true; }
      var hot = e.target && e.target.closest && e.target.closest('a,button,input,textarea,label,.hit');
      tsc = hot ? .5 : 1; tal = inHero() ? (hot ? .8 : 1) : 0; kick();
    }, { passive: true });
    window.addEventListener('scroll', function () { if (ready) { tal = inHero() ? tal || 1 : 0; kick(); } }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { tal = 0; kick(); });
    document.addEventListener('visibilitychange', kick);
  })();

  // Mobile menu
  var tg = document.querySelector('.nav-toggle'), nav = document.getElementById('nav');
  function setNav(o) {
    nav.classList.toggle('open', o);
    tg.setAttribute('aria-expanded', o);
    tg.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
    tg.querySelector('use').setAttribute('href', o ? '#i-x' : '#i-menu');
  }
  tg.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setNav(false); });

  // Demo form
  var form = document.getElementById('form'), note = document.getElementById('note');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    note.textContent = form.checkValidity()
      ? 'Thanks. This demo form has no backend yet, so nothing was sent.'
      : 'Please fill in your name, a valid email and a message.';
  });
})();
