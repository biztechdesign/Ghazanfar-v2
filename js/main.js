/* Ghazanfar Bank — homepage behaviour.
   Motion values follow securevest.netlify.app's GSAP setup (see css/style.css
   tokens); everything here is vanilla JS + CSS transitions, no libraries
   beyond the Lucide icon set the site already used. */
(function(){
  'use strict';

  var root = document.documentElement;
  var MOTION = root.classList.contains('has-js');          // JS on + motion allowed
  var hoverMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  var desktopMQ = window.matchMedia('(min-width: 1200px)');

  if (window.lucide) window.lucide.createIcons();

  function $(s, c){ return (c || document).querySelector(s); }
  function $$(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
  function onReady(fn){ if (window.__gbReady) fn(); else document.addEventListener('gb:ready', fn, {once:true}); }
  function signalReady(){ if (window.__gbReady) return; window.__gbReady = true; document.dispatchEvent(new Event('gb:ready')); }

  /* ======================================================================
     PRELOADER — reference loader.js: blocks of brand colour, bouncing title
     characters and a % counter with a 1.5s minimum; on finish the copy
     fades up (.35s, .05s apart) and the blocks collapse to width 0
     (.8s power1.in, .04s apart). Shown once per session here.
     ====================================================================== */
  (function(){
    var pre = $('#preloader');
    if (!pre) return;
    if (!root.classList.contains('is-loading')){ pre.remove(); signalReady(); return; }

    var BLOCKS = 6, MIN_MS = 1500, start = performance.now(), loaded = document.readyState === 'complete', progress = 0;
    var blocksEl = $('.preloader__blocks', pre), fill = $('.preloader__fill', pre), pct = $('.preloader__pct', pre), title = $('.preloader__title', pre);
    for (var b = 0; b < BLOCKS; b++){
      var blk = document.createElement('div');
      blk.className = 'preloader__block';
      blk.style.left = (b * 100 / BLOCKS) + '%';
      blk.style.width = (100 / BLOCKS + 1) + '%';
      blk.style.transitionDelay = (b * 0.04) + 's';
      blocksEl.appendChild(blk);
    }
    var txt = title.textContent; title.textContent = '';
    txt.split('').forEach(function(ch, i){
      var s = document.createElement('span'); s.textContent = ch; s.style.animationDelay = (i * 0.04) + 's'; title.appendChild(s);
    });
    window.addEventListener('load', function(){ loaded = true; });

    var done = false;
    var timer = setInterval(function(){
      var t = performance.now() - start;
      if (loaded && t >= MIN_MS) progress += 3;
      else if (loaded) progress += (100 - progress) / Math.max(1, (MIN_MS - t) / 25) * 0.5;
      else progress = progress < 70 ? Math.min(progress + 0.8, 95) : progress < 90 ? progress + 0.3 : Math.min(progress + 0.1, 95);
      if (t > 4500) progress = 100;                                  // never hold the page hostage
      progress = Math.min(progress, 100);
      fill.style.width = progress + '%';
      pct.textContent = Math.floor(progress) + '%';
      if (progress >= 100 && !done){ done = true; clearInterval(timer); setTimeout(finish, 100); }
    }, 25);

    function finish(){
      try{ sessionStorage.setItem('gb-loaded', '1'); }catch(e){}
      window.scrollTo(0, 0);
      pre.classList.add('is-leaving');
      setTimeout(function(){ $$('.preloader__block', pre).forEach(function(el){ el.style.width = '0%'; }); }, 200);
      setTimeout(function(){ root.classList.remove('is-loading'); signalReady(); }, 650);
      setTimeout(function(){ pre.remove(); }, 1500);
    }
  })();

  /* ======================================================================
     HEADER — fixed dark bar; slides away when scrolling down past its own
     height (.2s) and returns on any upward scroll (.4s), as the reference.
     ====================================================================== */
  var header = $('#siteHeader');
  var menuLocked = false;                                           // mega/mobile menu open: keep header shown
  (function(){
    var lastY = window.scrollY, ticking = false;
    function update(){
      ticking = false;
      var y = window.scrollY, h = header.offsetHeight;
      header.classList.toggle('is-scrolled', y > 0);
      if (!menuLocked){
        if (y > lastY && y > h) header.classList.add('is-hidden');
        else if (y < lastY) header.classList.remove('is-hidden');
      }
      lastY = y;
    }
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }, {passive:true});
    header.addEventListener('focusin', function(){ header.classList.remove('is-hidden'); });
  })();

  /* ---------- small dropdowns (language, login) ---------- */
  var utils = $$('.util');
  function closeUtils(except){
    utils.forEach(function(u){
      if (u === except) return;
      var btn = $('.util-btn', u), dd = $('.dropdown', u);
      btn.setAttribute('aria-expanded', 'false'); dd.classList.remove('is-open');
    });
  }
  utils.forEach(function(u){
    var btn = $('.util-btn', u), dd = $('.dropdown', u), t;
    function set(open){ closeUtils(open ? u : null); btn.setAttribute('aria-expanded', String(open)); dd.classList.toggle('is-open', open); }
    btn.addEventListener('click', function(e){
      var open = btn.getAttribute('aria-expanded') === 'true';
      if (hoverMQ.matches && e.detail > 0 && open) return;             // already opened by hover
      closeMega(); set(!open);
      if (!open && e.detail === 0) setTimeout(function(){ var first = $('a', dd); if (first) first.focus(); }, 30);   // after it becomes visible
    });
    u.addEventListener('mouseenter', function(){ if (!hoverMQ.matches) return; clearTimeout(t); closeMega(); set(true); });
    u.addEventListener('mouseleave', function(){ if (!hoverMQ.matches) return; clearTimeout(t); t = setTimeout(function(){ set(false); }, 200); });
    u.addEventListener('focusout', function(e){ if (!u.contains(e.relatedTarget)) set(false); });
  });

  /* ---------- mega menus ----------
     Each top-level trigger (aria-controls) owns its own panel. Panels flip
     down from the header (.4s) and their content slides in; Banking also
     has the reference's vertical tabs (Personal / Corporate / Digital). */
  var megaOpen = false, current = null, megaTimer;
  var triggers = $$('.nav-link[aria-controls]');
  function megaOf(tr){ return document.getElementById(tr.getAttribute('aria-controls')); }
  function show(panel){ panel.classList.remove('is-shown'); void panel.offsetWidth; panel.classList.add('is-shown'); }   // restart the slide-in
  function setTab(mega, name){
    $$('.mega__tab', mega).forEach(function(t){ var on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $$('.mega__panel', mega).forEach(function(p){
      var on = p.id === 'panel-' + name;
      if (on && !p.classList.contains('is-active')){ p.classList.add('is-active'); show(p); }
      else if (!on) p.classList.remove('is-active', 'is-shown');
    });
  }
  function openMega(tr, viaKeyboard){
    clearTimeout(megaTimer); closeUtils();
    var mega = megaOf(tr);
    if (current === tr && megaOpen) return;
    closeMega();
    megaOpen = true; current = tr; menuLocked = true; header.classList.remove('is-hidden');
    tr.setAttribute('aria-expanded', 'true');
    mega.classList.add('is-open');
    var active = $('.mega__panel.is-active', mega); if (active) show(active);
    if (viaKeyboard) setTimeout(function(){
      var f = $('.mega__tab[aria-selected="true"]', mega) || $('a', mega); if (f) f.focus();
    }, 30);
  }
  function closeMega(returnFocus){
    if (!megaOpen) return;
    var tr = current, mega = megaOf(tr);
    megaOpen = false; current = null; menuLocked = false;
    mega.classList.remove('is-open');
    $$('.mega__panel', mega).forEach(function(p){ p.classList.remove('is-shown'); });
    tr.setAttribute('aria-expanded', 'false');
    if (returnFocus) tr.focus();
  }
  var navPrimary = $('.nav-primary');
  if (navPrimary){
    triggers.forEach(function(tr){
      var li = tr.closest('.nav-item'), mega = megaOf(tr);
      li.addEventListener('mouseenter', function(){ if (hoverMQ.matches) openMega(tr); });
      tr.addEventListener('click', function(e){
        var isOpen = megaOpen && current === tr;
        if (e.detail === 0){ if (isOpen) closeMega(); else openMega(tr, true); return; }
        if (hoverMQ.matches){ openMega(tr); return; }
        if (isOpen) closeMega(); else openMega(tr);
      });
      mega.addEventListener('mouseenter', function(){ clearTimeout(megaTimer); });
      mega.addEventListener('click', function(e){ if (e.target.closest('a')) closeMega(); });
      var tabs = $$('.mega__tab', mega);
      tabs.forEach(function(t, i){
        t.addEventListener('mouseenter', function(){ setTab(mega, t.dataset.tab); });
        t.addEventListener('click', function(){ setTab(mega, t.dataset.tab); });
        t.addEventListener('keydown', function(e){
          var k = e.key, n = null;
          if (k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
          else if (k === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (k === 'Home') n = tabs[0];
          else if (k === 'End') n = tabs[tabs.length - 1];
          if (n){ e.preventDefault(); setTab(mega, n.dataset.tab); n.focus(); }
        });
      });
    });
    $$('.nav-item').forEach(function(li){
      if ($('.nav-link[aria-controls]', li)) return;
      li.addEventListener('mouseenter', function(){ if (hoverMQ.matches){ clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 120); } });
    });
    navPrimary.addEventListener('mouseleave', function(){ if (!hoverMQ.matches) return; clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 220); });
    navPrimary.addEventListener('focusout', function(e){ if (!navPrimary.contains(e.relatedTarget)) closeMega(); });
  }
  document.addEventListener('click', function(e){
    if (!e.target.closest('.nav-primary')) closeMega();
    if (!e.target.closest('.util')) closeUtils();
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    if (megaOpen) closeMega(true);
    var openUtil = utils.filter(function(u){ return $('.util-btn', u).getAttribute('aria-expanded') === 'true'; })[0];
    if (openUtil){ closeUtils(); $('.util-btn', openUtil).focus(); }
    if (mobileOpen) setMobile(false, true);
  });

  /* ---------- mobile menu: clip-path wipe + accordions ---------- */
  var toggle = $('.menu-toggle'), mobile = $('#mobileMenu'), scrim = $('#pageScrim'), mobileOpen = false;
  function setMobile(open, returnFocus){
    mobileOpen = open; menuLocked = open;
    if (open) header.classList.remove('is-hidden');
    mobile.classList.toggle('is-open', open); scrim.classList.toggle('is-open', open);
    if (open) mobile.removeAttribute('inert'); else mobile.setAttribute('inert', '');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.style.overflow = open ? 'hidden' : '';
    if (!open && returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', function(){ setMobile(!mobileOpen); });
  scrim.addEventListener('click', function(){ setMobile(false); });
  mobile.addEventListener('click', function(e){ if (e.target.closest('a')) setMobile(false); });
  $$('.m-sub').forEach(function(s){ s.setAttribute('inert', ''); });
  $$('.m-acc').forEach(function(btn){
    btn.addEventListener('click', function(){
      var sub = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      sub.classList.toggle('is-open', open);
      if (open) sub.removeAttribute('inert'); else sub.setAttribute('inert', '');
    });
  });
  desktopMQ.addEventListener('change', function(e){ if (e.matches && mobileOpen) setMobile(false); if (!e.matches) closeMega(); });

  /* ======================================================================
     HERO INTRO — reference initHeroAnimation: each block rises 60px out of
     a 6px blur, .6s power2.out, starting .1s apart.
     ====================================================================== */
  onReady(function(){
    $$('[data-hero]').forEach(function(el, i){
      el.style.setProperty('--delay', (i * 0.1) + 's');
      requestAnimationFrame(function(){ el.classList.add('is-in'); });
    });
  });

  /* ======================================================================
     TEXT SPLIT + SECTION TITLES — reference: SplitText with line masks;
     eyebrow chars .4s/.008s, heading words .6s/.06s, lead lines .6s/.08s,
     all "osmo-ease"; star icon spins in (1s). Fires at "top 75%", once.
     ====================================================================== */
  function makeMask(text, cls){
    var m = document.createElement('span'); m.className = cls || 'split-mask';
    var i = document.createElement('span'); i.className = 'split-inner'; i.textContent = text;
    m.appendChild(i); return m;
  }
  function splitWords(el){
    var frag = document.createDocumentFragment(), inners = [];
    Array.prototype.slice.call(el.childNodes).forEach(function(n){
      if (n.nodeType !== 3){ frag.appendChild(n.cloneNode(true)); return; }
      n.textContent.split(/(\s+)/).forEach(function(part){
        if (!part) return;
        if (/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(' ')); return; }
        var m = makeMask(part); inners.push(m.firstChild); frag.appendChild(m);
      });
    });
    el.textContent = ''; el.appendChild(frag);
    return inners;
  }
  function splitChars(el){
    var text = el.textContent, inners = [];
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split('').forEach(function(ch){
      if (ch === ' '){ el.appendChild(document.createTextNode(' ')); return; }
      var m = makeMask(ch); m.setAttribute('aria-hidden', 'true'); inners.push(m.firstChild); el.appendChild(m);
    });
    return inners;
  }
  function splitLines(el){
    var original = el.innerHTML;
    splitWords(el);
    var lines = [], top = null;
    $$('.split-mask', el).forEach(function(m){
      var t = m.offsetTop;
      if (top === null || Math.abs(t - top) > 4){ lines.push([]); top = t; }
      lines[lines.length - 1].push(m.textContent);
    });
    el.textContent = '';
    var inners = lines.map(function(words){
      var l = makeMask(words.join(' '), 'split-line'); el.appendChild(l); return l.firstChild;
    });
    return {inners: inners, restore: function(){ el.innerHTML = original; }};
  }
  function stagger(inners, start, step, dur){
    inners.forEach(function(inner, i){
      inner.style.setProperty('--delay', (start + i * step).toFixed(3) + 's');
      inner.style.setProperty('--dur', dur + 's');
    });
    return start + dur + Math.max(0, inners.length - 1) * step;      // end time
  }

  function initTitles(){
    var titles = $$('[data-section-title]');
    if (!MOTION){ titles.forEach(function(t){ t.classList.add('is-ready'); }); return; }
    titles.forEach(function(t){
      var chars = $('[data-split="chars"]', t), words = $('[data-split="words"]', t), lines = $('[data-split="lines"]', t);
      var c = chars ? splitChars(chars) : [], w = words ? splitWords(words) : [], l = lines ? splitLines(lines) : null;
      var tEye = stagger(c, 0.2, 0.008, 0.75);                          // eyebrow .75s
      var tHead = stagger(w, Math.max(tEye, 1) - 0.6, 0.08, 0.9);        // heading .9s
      var tEnd = l ? stagger(l.inners, tHead - 0.6, 0.1, 0.85) : tHead;  // description .85s
      t._restore = l ? l.restore : null; t._end = tEnd;
      t.classList.add('is-ready');
    });
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var t = en.target; io.unobserve(t);
        t.classList.add('title-in', 'is-split-in');
        $$('[data-split]', t).forEach(function(s){ s.classList.add('is-split-in'); });
        if (t._restore) setTimeout(t._restore, (t._end + 0.2) * 1000);   // unwrap lines so later resizes reflow naturally
      });
    }, {rootMargin: '0px 0px -25% 0px'});
    titles.forEach(function(t){ io.observe(t); });
  }

  /* ======================================================================
     BLUR-RISE CARDS — reference [data-sttr-card]: y 50 -> 0, blur 10 -> 0,
     .6s power3.out, each card starting .2s after the previous.
     ====================================================================== */
  function initRise(){
    var items = $$('[data-rise]');
    if (!MOTION){ return; }
    $$('[data-stagger]').forEach(function(group){
      $$('[data-rise]', group).forEach(function(el, i){ el.style.setProperty('--delay', (i * 0.12) + 's'); });
    });
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        var group = el.closest('[data-stagger]');
        var targets = group ? $$('[data-rise]', group).filter(function(x){ return !x.classList.contains('is-in'); }) : [el];
        targets.forEach(function(x){
          io.unobserve(x);
          x.classList.add('is-in');
          var d = parseFloat(x.style.getPropertyValue('--delay')) || 0;
          setTimeout(function(){ x.classList.add('is-settled'); }, (d + 1.1) * 1000);
        });
      });
    }, {rootMargin: '0px 0px -25% 0px'});
    items.forEach(function(el){ io.observe(el); });
  }

  /* ======================================================================
     TRUST COUNTERS — reference initTrustProgress: 2s easeOutQuart, ring
     fills via a conic-gradient --p, starts at 30% visibility, runs once.
     ====================================================================== */
  function initCounters(){
    var box = $('#trustStats');
    if (!box) return;
    var stats = $$('.stat', box);
    if (!MOTION){ stats.forEach(function(s){ $('.stat__ring', s).style.setProperty('--p', 100); }); return; }
    stats.forEach(function(s){
      var n = $('.stat__num', s);
      n.setAttribute('aria-label', n.textContent);
      n.textContent = '0' + (n.dataset.suffix || '');
    });
    var io = new IntersectionObserver(function(entries){
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now(), DUR = 2000;
      (function frame(now){
        var p = clamp((now - t0) / DUR, 0, 1), e = 1 - Math.pow(1 - p, 4);
        stats.forEach(function(s){
          var n = $('.stat__num', s), end = parseInt(n.dataset.count, 10) || 0;
          n.textContent = Math.round(end * e).toLocaleString('en-US') + (n.dataset.suffix || '');
          $('.stat__ring', s).style.setProperty('--p', (e * 100).toFixed(2));
        });
        if (p < 1) requestAnimationFrame(frame);
      })(t0);
    }, {threshold: 0.3});
    io.observe(box);
  }

  /* ======================================================================
     SCROLL-EXPAND MEDIA — reference video-container: from container width
     to full viewport width while the radius straightens; start "top 65%",
     end "+=120%", power2.inOut, scrub .8 (approximated with a lerp).
     ====================================================================== */
  function initExpand(){
    var el = $('#expandMedia');
    if (!el || !MOTION) return;
    var cur = 0, target = 0, raf = 0, R0 = 24;
    function inOut(t){ return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function measure(){
      if (window.innerWidth < 1024){ el.style.width = ''; el.style.maxWidth = ''; el.style.borderRadius = ''; return false; }
      var vh = window.innerHeight, top = el.getBoundingClientRect().top;
      target = clamp((vh * 0.65 - top) / (vh * 1.2), 0, 1);
      return true;
    }
    function paint(){
      raf = 0;
      if (!measure()) return;
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      var vw = document.documentElement.clientWidth;
      var gutter = parseFloat(getComputedStyle(root).getPropertyValue('--gutter')) || 80;
      var minW = Math.min(1440, vw) - gutter * 2, e = inOut(cur);
      el.style.maxWidth = 'none';
      el.style.width = (minW + (vw - minW) * e).toFixed(1) + 'px';
      el.style.borderRadius = (R0 * (1 - e)).toFixed(2) + 'px';
      if (cur !== target) raf = requestAnimationFrame(paint);
    }
    function kick(){ if (!raf) raf = requestAnimationFrame(paint); }
    window.addEventListener('scroll', kick, {passive:true});
    window.addEventListener('resize', kick);
    kick();
  }

  /* ---------- app promo phone: scale with scroll (kept from the previous build) ---------- */
  function initAppPromo(){
    var vis = $('#appPromoVisual'), img = vis && $('img', vis);
    if (!img || !MOTION) return;
    var ticking = false;
    function update(){
      ticking = false;
      var r = vis.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh - r.top) / (vh * 0.7), 0, 1), narrow = window.innerWidth < 700;
      var MIN = narrow ? .95 : .88, MAX = narrow ? 1 : 1.05;
      img.style.transform = 'scale(' + (MIN + (MAX - MIN) * p).toFixed(4) + ')';
    }
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }, {passive:true});
    update();
  }

  /* ======================================================================
     GRID REVEAL — reference grid-reveal.js: a field of page-colour square
     tiles laid over an element that drop out in random order as it scrolls
     in. Used on the footer (15x6 / 10x6 / 5x16, .004s, .5s at "top 70%")
     and the about image (12x12 / 10x10 / 5x5, .002s, .2s at "top 100%").
     ====================================================================== */
  function gridReveal(el, o){
    if (!el || !MOTION) return;
    var w = window.innerWidth, g = w <= 640 ? o.sm : w <= 1024 ? o.lg : o.xl, cols = g[0], rows = g[1];
    var grid = document.createElement('div');
    grid.className = 'grid-reveal'; grid.setAttribute('aria-hidden', 'true');
    grid.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    grid.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    var order = [];
    for (var i = 0; i < cols * rows; i++) order.push(i);
    for (var j = order.length - 1; j > 0; j--){ var k = Math.floor(Math.random() * (j + 1)), tmp = order[j]; order[j] = order[k]; order[k] = tmp; }
    order.forEach(function(rank){
      var c = document.createElement('i');
      c.style.transitionDuration = o.duration + 's';
      c.style.transitionDelay = (rank * o.stagger).toFixed(3) + 's';
      grid.appendChild(c);
    });
    el.appendChild(grid);
    var io = new IntersectionObserver(function(entries){
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      grid.classList.add('is-done');
      setTimeout(function(){ grid.remove(); }, (cols * rows * o.stagger + o.duration + 0.1) * 1000);
    }, {rootMargin: '0px 0px ' + (-o.trigger) + '% 0px'});
    io.observe(el);
  }
  function initGridReveal(){
    gridReveal($('#expandMedia'), {xl:[12,12], lg:[10,10], sm:[5,5], stagger:.004, duration:.6, trigger:30});   // reference video: top 70%, .004s, .6s
    gridReveal($('#siteFooter'), {xl:[15,6], lg:[10,6], sm:[5,16], stagger:.007, duration:.9, trigger:30});   // reference: .004s/.5s; slowed ~1.7x on request
  }

  onReady(function(){
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var started = false;
    function go(){ if (started) return; started = true; initTitles(); initRise(); initCounters(); initGridReveal(); }
    fontsReady.then(go); setTimeout(go, 2000);
    initExpand(); initAppPromo();
  });

  /* ======================================================================
     FEATURES CAROUSEL — infinite, centre-snapped strip: the slides are
     cloned before and after themselves and the strip silently re-centres
     on the real slide once it settles on a clone. Drag, prev/next, and a
     3s autoplay that pauses on hover/focus/drag/hidden tab.
     ====================================================================== */
  (function(){
    var track = $('#featuresTrack');
    if (!track) return;
    var real = $$('[data-slide]', track), prev = $('#carouselPrev'), next = $('#carouselNext');
    var curEl = $('#carouselCurrent'), totEl = $('#carouselTotal'), n = real.length;
    var reduce = !MOTION;
    function pad(x){ return (x < 10 ? '0' : '') + x; }
    totEl.textContent = pad(n);
    function clones(){
      return real.map(function(el){
        var c = el.cloneNode(true);
        c.removeAttribute('data-slide'); c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', '');
        return c;
      });
    }
    var before = clones(), after = clones();
    before.forEach(function(c){ track.insertBefore(c, real[0]); });
    after.forEach(function(c){ track.appendChild(c); });
    var all = before.concat(real, after);

    function centerOffset(el){
      var t = track.getBoundingClientRect(), r = el.getBoundingClientRect();
      return track.scrollLeft + (r.left - t.left) - (t.width - r.width) / 2;
    }
    function centerOn(el, smooth){
      track.style.scrollBehavior = smooth && !reduce ? 'smooth' : 'auto';
      if (!smooth) track.style.scrollSnapType = 'none';
      track.scrollTo({left: centerOffset(el), behavior: smooth && !reduce ? 'smooth' : 'auto'});
      if (!smooth) setTimeout(function(){ track.style.scrollSnapType = ''; track.style.scrollBehavior = ''; }, 60);
    }
    function nearest(){
      var t = track.getBoundingClientRect(), mid = t.left + t.width / 2, best = 0, bd = Infinity;
      all.forEach(function(el, i){ var r = el.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd){ bd = d; best = i; } });
      return best;
    }
    function updateCounter(){ curEl.textContent = pad((nearest() % n) + 1); }
    function settle(){
      var i = nearest();
      if (i < n) centerOn(all[i + n], false); else if (i >= 2 * n) centerOn(all[i - n], false);
      updateCounter();
    }
    prev.addEventListener('click', function(){ centerOn(all[nearest() - 1], true); });
    next.addEventListener('click', function(){ centerOn(all[nearest() + 1], true); });

    var scrollTimer, isDown = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener('scroll', function(){
      updateCounter(); clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function(){ if (!isDown) settle(); }, 140);
    }, {passive:true});
    track.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'touch') return;
      isDown = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add('dragging'); track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', function(e){
      if (!isDown) return;
      var dx = e.clientX - startX; if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    function endDrag(){ if (!isDown) return; isDown = false; track.classList.remove('dragging'); clearTimeout(scrollTimer); scrollTimer = setTimeout(settle, 400); }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener('click', function(e){ if (moved){ e.preventDefault(); e.stopPropagation(); } }, true);

    function init(){ centerOn(real[0], false); updateCounter(); }
    init();
    window.addEventListener('load', init);
    window.addEventListener('resize', function(){ centerOn(all[nearest()], false); });

    if (!reduce){
      var AUTOPLAY_MS = 3000, timer = null, inView = false, root2 = track.closest('.carousel-bleed') || track;
      function stop(){ clearInterval(timer); timer = null; }
      function start(){ stop(); timer = setInterval(function(){ if (!isDown && !document.hidden && inView) centerOn(all[nearest() + 1], true); }, AUTOPLAY_MS); }
      root2.addEventListener('mouseenter', stop);
      root2.addEventListener('mouseleave', start);
      root2.addEventListener('focusin', stop);
      root2.addEventListener('focusout', function(){ if (!root2.contains(document.activeElement)) start(); });
      document.addEventListener('visibilitychange', function(){ if (document.hidden) stop(); else start(); });
      // autoplay only while the carousel is on screen and has finished rising in, so the slides never
      // slide sideways while the section is still revealing (bottom -> top only)
      new IntersectionObserver(function(en){
        inView = en[0].isIntersecting;
        if (inView) setTimeout(function(){ if (inView) start(); }, 1200); else stop();
      }, {threshold: .35}).observe(root2);
    }
  })();

  /* ---------- carousel drag cursor (reference initDragCursor) ---------- */
  (function(){
    var wrap = $('.carousel'), cur = $('#dragCursor');
    if (!wrap || !cur || !hoverMQ.matches) return;
    wrap.classList.add('has-drag-cursor');
    var on = false, x = 0, y = 0, tx = 0, ty = 0, raf = 0, last = 0;
    function target(e){
      var r = wrap.getBoundingClientRect(), w = cur.offsetWidth, h = cur.offsetHeight;
      tx = clamp(e.clientX - r.left - w / 2, 0, r.width - w);
      ty = clamp(e.clientY - r.top - h / 2, 0, r.height - h);
    }
    function paint(){ cur.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; }
    function tick(now){                                   // ~.3s ease-out follow, frame-rate independent
      raf = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      var a = 1 - Math.exp(-dt / 0.075);
      x += (tx - x) * a; y += (ty - y) * a; paint();
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(tick); else last = 0;
    }
    function show(e){ if (on) return; on = true; target(e); x = tx; y = ty; paint(); cur.classList.remove('is-off'); cur.classList.add('is-on'); }
    function hide(){ if (!on) return; on = false; cur.classList.remove('is-on'); cur.classList.add('is-off'); }
    function overControl(el){ return el && el.closest && el.closest('a, button, [role="button"]'); }
    wrap.addEventListener('mouseenter', function(e){ if (!overControl(e.target)) show(e); });
    wrap.addEventListener('mouseleave', hide);
    wrap.addEventListener('mousemove', function(e){
      if (overControl(e.target)){ hide(); return; }
      if (!on) show(e);
      target(e); if (!raf) raf = requestAnimationFrame(tick);
    });
  })();

  /* ======================================================================
     HERO MOTIF — 8-point-star-and-cross lattice that draws itself in and
     drifts one cell on a slow loop; follows the pointer slightly.
     ====================================================================== */
  (function(){
    var host = $('#heroMotif');
    if (!host) return;
    var NS = 'http://www.w3.org/2000/svg', CELL = 54;
    function el(t, a){ var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); return n; }
    function roundPoly(pts, r){
      var d = '', n = pts.length;
      for (var i = 0; i < n; i++){
        var p = pts[(i - 1 + n) % n], v = pts[i], q = pts[(i + 1) % n];
        var ax = v[0] - p[0], ay = v[1] - p[1], bx = q[0] - v[0], by = q[1] - v[1];
        var la = Math.hypot(ax, ay), lb = Math.hypot(bx, by), ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
        d += (i === 0 ? 'M' : 'L') + (v[0] - ax / la * ra).toFixed(2) + ',' + (v[1] - ay / la * ra).toFixed(2);
        d += 'Q' + v[0].toFixed(2) + ',' + v[1].toFixed(2) + ' ' + (v[0] + bx / lb * rb).toFixed(2) + ',' + (v[1] + by / lb * rb).toFixed(2);
      }
      return d + 'Z';
    }
    function roundPolyline(pts, r){
      var d = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2);
      for (var i = 1; i < pts.length - 1; i++){
        var p = pts[i - 1], v = pts[i], q = pts[i + 1];
        var ax = v[0] - p[0], ay = v[1] - p[1], bx = q[0] - v[0], by = q[1] - v[1];
        var la = Math.hypot(ax, ay), lb = Math.hypot(bx, by), ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
        d += 'L' + (v[0] - ax / la * ra).toFixed(2) + ',' + (v[1] - ay / la * ra).toFixed(2);
        d += 'Q' + v[0].toFixed(2) + ',' + v[1].toFixed(2) + ' ' + (v[0] + bx / lb * rb).toFixed(2) + ',' + (v[1] + by / lb * rb).toFixed(2);
      }
      var e = pts[pts.length - 1];
      return d + 'L' + e[0].toFixed(2) + ',' + e[1].toFixed(2);
    }
    function starPoints(cx, cy, R){
      var pts = [], ri = R * 0.7654;
      for (var k = 0; k < 8; k++){
        var ao = (45 * k) * Math.PI / 180, ai = (45 * k + 22.5) * Math.PI / 180;
        pts.push([cx + R * Math.cos(ao), cy + R * Math.sin(ao)]);
        pts.push([cx + ri * Math.cos(ai), cy + ri * Math.sin(ai)]);
      }
      return pts;
    }
    function starHalves(cx, cy, R){
      var p = starPoints(cx, cy, R), r = R * 0.075, lower = p.slice(8).concat([p[0]]), upper = [];
      for (var i = 8; i >= 0; i--) upper.push(p[i]);
      return [roundPolyline(lower, r), roundPolyline(upper, r)];
    }
    function cross(cx, cy, L, w){
      var p = [[0,-L],[w,-w],[L,0],[w,w],[0,L],[-w,w],[-L,0],[-w,-w]].map(function(q){ return [cx + q[0], cy + q[1]]; });
      return roundPoly(p, w * 0.5);
    }
    function build(){
      var W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) return;
      host.replaceChildren();
      root.style.setProperty('--cell', CELL + 'px');
      var svg = el('svg', {viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', 'aria-hidden': 'true'});
      var drift = el('g', {'class': 'drift'}), S = CELL, R = S * 0.5;
      var cols = Math.ceil(W / S) + 3, rows = Math.ceil(H / S) + 3, P = 0.34 * (S / 104), DSTAR = 0.62;
      for (var c = -1; c < cols; c++){
        var tStar = 0.05 + (c + 1) * P, tCross = tStar + DSTAR * 0.72;
        for (var r = -1; r < rows; r++){
          var x = c * S, y = r * S, halves = starHalves(x, y, R);
          for (var h = 0; h < 2; h++){
            var ln = el('path', {d: halves[h], fill: 'none', 'stroke-width': 1.1, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', pathLength: 1, 'class': 'ln ln-star'});
            ln.style.animationDelay = tStar.toFixed(3) + 's'; drift.appendChild(ln);
          }
          var cr = el('path', {d: cross(x + S / 2, y + S / 2, S * 0.23, S * 0.07), 'stroke-width': 1, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', pathLength: 1, 'class': 'ln ln-cross'});
          cr.style.animationDelay = tCross.toFixed(3) + 's'; drift.appendChild(cr);
        }
      }
      svg.appendChild(drift); host.appendChild(svg);
    }
    build();
    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(build, 200); });
    if (MOTION && hoverMQ.matches){
      var hero = $('#hero'), mx = 0, my = 0, tx = 0, ty = 0, running = false, visible = true;
      hero.addEventListener('pointermove', function(e){
        var r = hero.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5;
        if (!running){ running = true; requestAnimationFrame(loop); }
      }, {passive:true});
      new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }).observe(hero);
      function loop(){
        tx += (mx - tx) * .06; ty += (my - ty) * .06;
        host.style.transform = 'translate3d(' + (-tx * 22).toFixed(2) + 'px,' + (-ty * 22).toFixed(2) + 'px,0)';
        if (visible && (Math.abs(mx - tx) > .001 || Math.abs(my - ty) > .001)) requestAnimationFrame(loop); else running = false;
      }
    }
  })();

  /* ======================================================================
     HERO CARD FAN — the reference "Borderless Banking" stack, same numbers:
     all three cards start on one shared pose (rotate 45, skewX -20, origin
     95% 80%) and scrub into separate poses (card-3 rot 85/skewX -10/skewY -7,
     y -55, x 10; card-2 rot 67/skewX -15/skewY -3; card-1 rot 70/skewX -5/
     skewY -22, y 20, x -15). Reference: ScrollTrigger "top 50%" -> "top 20%",
     scrub .5, linear. Here the box sits at the top of the page: on load
     it starts open and closes; scrolling down over the first 30% of a viewport
     opens it, scrolling back up closes it again.
     ====================================================================== */
  (function(){
    var box = $('#heroCards');
    if (!box) return;
    var START = {x:0, y:0, r:45, sx:-20, sy:0};
    var END = {                                     // px at the reference's 660px box
      back:  {x:-15, y:20,  r:70, sx:-5,  sy:-22},  // reference item-1 (bottom)
      green: {x:0,   y:0,   r:67, sx:-15, sy:-3},   // reference item-2
      black: {x:10,  y:-55, r:85, sx:-10, sy:-7}    // reference item-3 (top)
    };
    var names = Object.keys(END), cards = {};
    names.forEach(function(n){ cards[n] = $('[data-card="' + n + '"]', box); });
    var TAU = 0.16;                                 // smoothing time constant (s) ~ GSAP scrub .5
    var cur = 0, target = 1, k = 1, raf = 0, last = 0, intro = MOTION ? 0 : 1, introStart = 0, INTRO_MS = 1500;
    function outCubic(t){ return 1 - Math.pow(1 - t, 3); }
    function lerp(a, b, t){ return a + (b - a) * t; }
    function measure(){
      k = box.offsetWidth / 660;
      target = MOTION ? clamp(window.pageYOffset / Math.max(200, window.innerHeight * 0.3), 0, 1) : 1;   // closed at rest, opens as you scroll down
    }
    function paint(){
      names.forEach(function(n){
        var f = END[n], t = Math.max(cur, 1 - outCubic(intro));            // 0 = stacked, 1 = fanned; the intro starts open and closes
        cards[n].style.transform = 'translate3d(' + (lerp(START.x, f.x, t) * k).toFixed(2) + 'px,' + (lerp(START.y, f.y, t) * k).toFixed(2) + 'px,0) rotate(' +
          lerp(START.r, f.r, t).toFixed(3) + 'deg) skew(' + lerp(START.sx, f.sx, t).toFixed(3) + 'deg,' + lerp(START.sy, f.sy, t).toFixed(3) + 'deg)';
      });
    }
    function tick(now){
      raf = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      if (introStart && intro < 1) intro = clamp((now - introStart) / INTRO_MS, 0, 1);
      cur += (target - cur) * (1 - Math.exp(-dt / TAU));
      if (Math.abs(target - cur) < 0.0005) cur = target;
      paint();
      if (cur !== target || (introStart && intro < 1)) raf = requestAnimationFrame(tick); else last = 0;
    }
    function kick(){ if (!raf) raf = requestAnimationFrame(tick); }
    window.addEventListener('scroll', function(){ measure(); kick(); }, {passive:true});
    window.addEventListener('resize', function(){ measure(); paint(); });
    measure(); cur = target; paint();
    if (MOTION) onReady(function(){ setTimeout(function(){ introStart = performance.now(); kick(); }, 450); });   // load: starts open, then closes
  })();

  /* ---------- floating contact button ---------- */
  (function(){
    var fab = $('#fab'), btn = $('#fabToggle');
    if (!fab || !btn) return;
    var items = $$('.fab-item', fab);
    function set(open){
      fab.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
      items.forEach(function(i){ i.tabIndex = open ? 0 : -1; });
    }
    btn.addEventListener('click', function(){ set(!fab.classList.contains('open')); });
    items.forEach(function(i){ i.addEventListener('click', function(){ set(false); }); });
    document.addEventListener('click', function(e){ if (fab.classList.contains('open') && !fab.contains(e.target)) set(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && fab.classList.contains('open')){ set(false); btn.focus(); } });
  })();
})();
