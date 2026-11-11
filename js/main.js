/* Princeton Tower Club — interactions & motion */
(() => {
  const html = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motion = hasGsap && !reduced;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = matchMedia('(min-width: 901px)');
  if (!motion) html.classList.add('reduced');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const session = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };
  const PAGE_LABELS = {
    'index.html': 'Home', 'history.html': 'History', '125.html': '125 Years', 'house.html': 'The House',
    'leadership.html': 'Leadership', 'alumni.html': 'Alumni', 'members.html': 'Members', 'join.html': 'Join Tower',
  };
  const fileOf = (path) => path.split('/').pop() || 'index.html';

  /* ---------- Text splitting ---------- */
  // Wraps each character in .char (inside a .word-mask per word), keeping <em>/<br>.
  function splitChars(el) {
    let i = 0;
    const chars = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
            const word = document.createElement('span');
            word.className = 'word-mask';
            [...part].forEach((c) => {
              const s = document.createElement('span');
              s.className = 'char';
              s.textContent = c;
              s.style.setProperty('--i', i++);
              word.appendChild(s);
              chars.push(s);
            });
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    return chars;
  }

  $$('.rise').forEach((el) => splitChars(el));
  $$('[data-fade]').forEach((el, n) => {
    el.classList.add('fade-up');
    el.style.transitionDelay = `${0.75 + n * 0.12}s`;
  });

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (motion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToTarget(target, immediate = false) {
    const isNum = typeof target === 'number';
    if (lenis) return lenis.scrollTo(target, { offset: isNum ? 0 : -80, duration: 1.6, immediate });
    if (isNum) window.scrollTo({ top: target, behavior: reduced || immediate ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced || immediate ? 'auto' : 'smooth' });
  }

  /* ---------- Intro: preloader on first visit, curtain afterwards ---------- */
  const loader = $('.loader');
  const curtain = $('.curtain');
  const returning = html.classList.contains('is-returning');
  session.set('ptc-visited', '1');
  if (curtain) curtain.style.animation = 'none';

  let isReady = false;
  function ready() {
    if (isReady) return;
    isReady = true;
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    lenis && lenis.start();
    if (hasGsap) ScrollTrigger.refresh();
    const target = location.hash && $(location.hash);
    if (target) setTimeout(() => scrollToTarget(target, true), 60);
  }

  if (!returning && loader) {
    if (!motion) {
      loader.remove();
      ready();
    } else {
      const count = $('.loader__count');
      const year = { v: 1902 };
      gsap.timeline({ onComplete: () => loader.remove() })
        .to(year, { v: 2027, duration: 1.9, ease: 'power2.inOut', onUpdate: () => (count.textContent = Math.round(year.v)) }, 0.3)
        .to('.loader__bar span', { scaleX: 1, duration: 1.9, ease: 'power2.inOut' }, 0.3)
        .to(count, { yPercent: -40, opacity: 0, duration: 0.3, ease: 'power2.in' })
        .add(() => {
          count.textContent = '125';
          count.classList.add('is-gold');
          loader.classList.add('is-125');
        })
        .fromTo(count, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out' })
        .to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '+=0.35')
        .add(ready, '-=0.8');
    }
  } else {
    loader && loader.remove();
    if (!motion || !curtain) {
      if (curtain) curtain.style.transform = 'translateY(100%)';
      ready();
    } else {
      gsap.timeline()
        .set(curtain, { yPercent: 0 })
        .to(curtain, { yPercent: -100, duration: 1, ease: 'expo.inOut', delay: 0.1 })
        .add(ready, 0.55)
        .set(curtain, { yPercent: 100 });
    }
  }

  /* ---------- Links: in-page glide, page-to-page curtain ---------- */
  function leaveTo(href, label) {
    $('.curtain__label').textContent = label;
    closeMenu();
    gsap.timeline({ onComplete: () => (location.href = href) })
      .fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: 'expo.inOut' })
      .from('.curtain > *', { y: 30, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'expo.out' }, '-=0.35');
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    const samePage = fileOf(url.pathname) === fileOf(location.pathname);
    if (samePage) {
      const target = url.hash && url.hash !== '#top' ? $(url.hash) : 0;
      if (target === null) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
      return;
    }
    if (!motion || !curtain) return;
    e.preventDefault();
    leaveTo(url.href, PAGE_LABELS[fileOf(url.pathname)] || '');
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && hasGsap && curtain) gsap.set(curtain, { yPercent: 100 });
  });

  /* ---------- Nav, progress bar ---------- */
  const nav = $('#nav');
  const heroEl = $('.hero, .page-hero, .anniv-hero');
  const progressBar = $('.progress span');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    const heroBox = heroEl && heroEl.parentElement.classList.contains('pin-spacer') ? heroEl.parentElement : heroEl;
    const threshold = heroBox ? Math.max(heroBox.offsetHeight - 90, 60) : 60;
    nav.classList.toggle('is-scrolled', y > threshold);
    nav.classList.toggle('is-hidden', y > lastY + 2 && y > 500 && !body.classList.contains('menu-open'));
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('.nav__toggle');
  const menu = $('.menu');
  function closeMenu() {
    if (!body.classList.contains('menu-open')) return;
    body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    lenis && lenis.start();
  }
  toggle.addEventListener('click', () => {
    if (body.classList.contains('menu-open')) return closeMenu();
    body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    lenis && lenis.stop();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  // Nav labels scramble on hover
  const GLYPHS = 'abcdefghijklmnopqrstuvwxyz';
  $$('[data-scramble]').forEach((a) => {
    const node = [...a.childNodes].find((n) => n.nodeType === 3);
    if (!node || !motion) return;
    const original = node.textContent;
    let raf;
    a.addEventListener('mouseenter', () => {
      let frame = 0;
      cancelAnimationFrame(raf);
      const tick = () => {
        node.textContent = [...original].map((c, i) => (c === ' ' || i < frame / 2 ? c : GLYPHS[(Math.random() * 26) | 0])).join('');
        if (++frame <= original.length * 2) raf = requestAnimationFrame(tick);
        else node.textContent = original;
      };
      tick();
    });
  });

  /* ---------- Clip-path image reveals + footer word ---------- */
  // IntersectionObserver ignores fully clipped elements, so watch each one's parent instead
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      if (e.target.classList.contains('footer__word')) e.target.classList.add('is-in');
      else $$(':scope > .reveal-img', e.target).forEach((el) => el.classList.add('is-in'));
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  new Set($$('.reveal-img').map((el) => el.parentElement)).forEach((p) => revealIO.observe(p));
  $$('.footer__word').forEach((el) => revealIO.observe(el));
  if (!motion) $$('.reveal-img').forEach((el) => el.classList.add('is-in'));

  /* ---------- Forms (front end only until a backend is connected) ---------- */
  $$('[data-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach((input) => {
        const field = input.closest('.field');
        field.classList.remove('is-error');
        if (!input.value.trim()) {
          void field.offsetWidth; // restart the shake animation
          field.classList.add('is-error');
          ok = false;
        }
      });
      if (!ok) return;
      // TODO: POST the form data to the club's backend
      form.classList.add('is-done');
    });
  });

  /* ---------- FAQ accordion ---------- */
  $$('.faq__item').forEach((item) => {
    const q = $('.faq__q', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.faq__item.is-open', item.parentElement).forEach((o) => {
        o.classList.remove('is-open');
        $('.faq__q', o).setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
      if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 650);
    });
  });

  /* ---------- Tabs (members' menu) ---------- */
  $$('[data-tabs]').forEach((root) => {
    const list = $('.tabs', root);
    const btns = $$('[role="tab"]', list);
    const ink = $('.tabs__ink', list);
    const select = (btn, animate = true) => {
      btns.forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
      });
      ink.style.width = `${btn.offsetWidth}px`;
      ink.style.transform = `translateX(${btn.offsetLeft}px)`;
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (animate && motion) gsap.from(panel.children, { y: 18, opacity: 0, stagger: 0.07, duration: 0.8, ease: 'expo.out' });
    };
    btns.forEach((b) => b.addEventListener('click', () => select(b)));
    list.addEventListener('keydown', (e) => {
      const i = btns.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const next = e.key === 'ArrowRight' ? btns[(i + 1) % btns.length] : e.key === 'ArrowLeft' ? btns[(i - 1 + btns.length) % btns.length] : null;
      if (next) { e.preventDefault(); next.focus(); select(next); }
    });
    const today = btns.find((b) => Number(b.dataset.day) === new Date().getDay()) || btns[0];
    select(today, false);
    window.addEventListener('resize', () => select(btns.find((b) => b.getAttribute('aria-selected') === 'true'), false));
  });

  /* ---------- Accordion gallery ---------- */
  $$('.accordion-gallery').forEach((g) => {
    const panels = $$('.ag__panel', g);
    const activate = (p) => panels.forEach((x) => x.classList.toggle('is-active', x === p));
    panels.forEach((p) => {
      p.tabIndex = 0;
      p.addEventListener('mouseenter', () => finePointer && activate(p));
      p.addEventListener('click', () => activate(p));
      p.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(p); }
      });
    });
  });

  /* ---------- Then & now compare ---------- */
  $$('[data-compare]').forEach((c) => {
    const range = $('.compare__range', c);
    const set = (v) => c.style.setProperty('--pos', `${v}%`);
    range.addEventListener('input', () => set(range.value));
    if (!motion) return;
    const o = { v: 92 };
    set(o.v);
    gsap.to(o, {
      v: 50, duration: 2.2, ease: 'expo.inOut',
      scrollTrigger: { trigger: c, start: 'top 65%' },
      onUpdate: () => { set(o.v); range.value = o.v; },
    });
  });

  /* ---------- Members: greeting + tile hover origin ---------- */
  $$('[data-greeting]').forEach((el) => {
    const h = new Date().getHours();
    el.textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });
  $$('.tile').forEach((t) => {
    t.addEventListener('mouseenter', (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- Gold sparkle canvas ---------- */
  function sparkle(canvas) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, running = false, looping = false, mx = -999, my = -999;
    const parts = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const make = (anywhere) => ({
      x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.7 + 0.4, vy: -(Math.random() * 0.4 + 0.08), vx: (Math.random() - 0.5) * 0.15,
      t: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.006,
    });
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < Math.round(Math.min(140, (w * h) / 8000)); i++) parts.push(make(true));
    canvas.parentElement.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    const frame = () => {
      if (!running) { looping = false; return; }
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.t += p.s;
        p.x += p.vx + Math.sin(p.t) * 0.15;
        p.y += p.vy;
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d > 0 && d < 130) { p.x += (dx / d) * 1.4; p.y += (dy / d) * 1.4; }
        if (p.y < -10) Object.assign(p, make(false));
        ctx.beginPath();
        ctx.fillStyle = `rgba(236, 213, 159, ${0.3 + Math.sin(p.t * 3) * 0.28})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    new IntersectionObserver(([en]) => {
      running = en.isIntersecting;
      if (running && !looping) { looping = true; requestAnimationFrame(frame); }
    }).observe(canvas);
  }
  if (motion) $$('canvas[data-sparkle]').forEach(sparkle);

  /* ---------- Odometer numbers ---------- */
  $$('[data-odometer]').forEach((el) => {
    const target = el.textContent.trim();
    el.setAttribute('aria-label', target);
    el.textContent = '';
    const cols = [];
    [...target].forEach((ch) => {
      if (!/\d/.test(ch)) {
        const s = document.createElement('span');
        s.textContent = ch;
        return el.appendChild(s);
      }
      const wrap = document.createElement('span');
      wrap.className = 'odo';
      wrap.setAttribute('aria-hidden', 'true');
      const col = document.createElement('span');
      col.className = 'odo__col';
      for (let n = 0; n < 20; n++) {
        const d = document.createElement('span');
        d.textContent = n % 10;
        col.appendChild(d);
      }
      wrap.appendChild(col);
      el.appendChild(wrap);
      cols.push([col, Number(ch)]);
    });
    // 20 digits per column: land on the second lap so every column visibly spins
    if (!motion) return cols.forEach(([col, d]) => (col.style.transform = `translateY(-${(d + 10) * 5}%)`));
    cols.forEach(([col, d], i) => {
      gsap.fromTo(col, { yPercent: 0 }, {
        yPercent: -(d + 10) * 5, duration: 2.2 + i * 0.3, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
      });
    });
  });

  if (!motion) return;

  /* ======================= GSAP-driven motion ======================= */

  // Scroll velocity, shared by the marquees and skewing images
  let velocity = 0;
  let lastScroll = window.scrollY;
  gsap.ticker.add(() => {
    const y = window.scrollY;
    velocity += (y - lastScroll - velocity) * 0.2;
    lastScroll = y;
  });

  // Marquees: drift, speed up and lean with the scroll, reverse on scroll-up
  $$('.marquee__track').forEach((track) => {
    let x = 0, dir = 1, half = track.scrollWidth / 2;
    window.addEventListener('resize', () => (half = track.scrollWidth / 2));
    const setX = gsap.quickSetter(track, 'x', 'px');
    const skew = gsap.quickTo(track, 'skewX', { duration: 0.6, ease: 'power3' });
    gsap.ticker.add((time, delta) => {
      if (Math.abs(velocity) > 0.6) dir = velocity > 0 ? 1 : -1;
      x -= (0.055 * delta + Math.abs(velocity) * 0.7) * dir;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      setX(x);
      skew(gsap.utils.clamp(-14, 14, -velocity * 0.45));
    });
  });

  // Images that lean with fast scrolling
  $$('[data-skew]').forEach((el) => {
    const skew = gsap.quickTo(el, 'skewY', { duration: 0.6, ease: 'power3' });
    gsap.ticker.add(() => skew(gsap.utils.clamp(-5, 5, velocity * 0.12)));
  });

  // Headings: characters rise out of masks as they enter
  $$('.display, [data-split]').forEach((el) => {
    if (el.classList.contains('rise')) return;
    const chars = splitChars(el);
    gsap.from(chars, {
      yPercent: 115, rotate: 8, duration: 1.2, ease: 'expo.out', stagger: 0.016,
      scrollTrigger: { trigger: el, start: 'top 87%' },
    });
  });

  // Generic fade-up reveals, batched so siblings stagger
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 89%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, overwrite: true }),
  });

  // Statements light up word by word as you read
  $$('[data-words]').forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to($$('.w', el), {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });

  // Hero (home): photo sinks, copy lifts away
  if ($('.hero')) {
    gsap.to('.hero__media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.seal__ring', { rotate: 540, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1 } });
  }

  // Inner-page heroes
  $$('.page-hero').forEach((hero) => {
    const media = $('.page-hero__media', hero);
    if (media) gsap.to(media, { yPercent: 16, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to($('.container', hero), { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    const giant = $('.page-hero__giant', hero);
    if (giant) gsap.to(giant, { xPercent: -12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  });

  // Parallax images inside their frames
  $$('[data-parallax]').forEach((img) => {
    gsap.fromTo(img, { yPercent: -12 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Photo strips slide sideways with scroll
  $$('.strip__row').forEach((row) => {
    const dir = Number(row.dataset.dir || -1);
    gsap.fromTo(row, { x: () => (dir > 0 ? -(row.scrollWidth - window.innerWidth) * 0.6 : 0) }, {
      x: () => (dir > 0 ? 0 : -(row.scrollWidth - window.innerWidth) * 0.6), ease: 'none',
      scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  });

  // Outline "125" fills with gold as you scroll past
  $$('.outline-num').forEach((el) => {
    gsap.to(el, { backgroundSize: '100% 100%', ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 35%', scrub: true } });
  });

  // Quote marks drift
  $$('.quote__mark').forEach((m) => gsap.from(m, { y: 70, rotate: -14, scrollTrigger: { trigger: m, start: 'top bottom', end: 'center center', scrub: true } }));

  // Process line draws across the steps
  $$('.process__line').forEach((l) => gsap.to(l, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: l.parentElement, start: 'top 75%', end: 'bottom 55%', scrub: true } }));

  // 125: zoom out of the clubhouse photo into the numerals
  const ah = $('.anniv-hero');
  if (ah) {
    gsap.timeline({ scrollTrigger: { trigger: ah, start: 'top top', end: '+=170%', pin: true, scrub: 1 } })
      .to('.anniv-hero__intro', { opacity: 0, y: -80, duration: 0.25 }, 0)
      .to('.anniv-hero__scroll', { opacity: 0, duration: 0.1 }, 0)
      .fromTo('.anniv-hero__num', { scale: 5.5 }, { scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
      .to('.anniv-hero__photo', { opacity: 0, duration: 0.45 }, 0.1)
      .to('.anniv-hero__glow', { opacity: 1, duration: 0.5 }, 0.5)
      .fromTo('.anniv-hero__after', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 0.78);
  }

  // History timeline: pin and scroll sideways (desktop)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    $$('.timeline').forEach((tl) => {
      const track = $('.timeline__track', tl);
      const distance = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: tl, start: 'top top', end: () => `+=${distance()}`, pin: $('.timeline__pin', tl), scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      gsap.to($('.timeline__progress span', tl), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top top', end: () => `+=${distance()}`, scrub: true } });
      $$('.era', tl).forEach((card) => {
        gsap.from(card, {
          opacity: 0.2, y: 60, rotate: 3, scale: 0.94, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 70%', scrub: true },
        });
      });
    });

    // Archive photos fly out of a stack, then can be dragged around
    $$('[data-scatter]').forEach((wrap) => {
      const cards = $$('.polaroid', wrap);
      gsap.from(cards, {
        x: (i, el) => wrap.offsetWidth / 2 - el.offsetLeft - el.offsetWidth / 2,
        y: (i, el) => wrap.offsetHeight / 2 - el.offsetTop - el.offsetHeight / 2,
        rotate: (i) => (i % 2 ? 14 : -14), scale: 0.7, opacity: 0,
        duration: 1.5, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: wrap, start: 'top 70%' },
      });
      let z = 10;
      cards.forEach((card) => {
        card.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          card.setPointerCapture(e.pointerId);
          card.classList.add('is-dragging');
          card.style.zIndex = ++z;
          const sx = e.clientX, sy = e.clientY;
          const ox = gsap.getProperty(card, 'x'), oy = gsap.getProperty(card, 'y');
          gsap.to(card, { scale: 1.07, rotate: 0, duration: 0.4, ease: 'power3.out' });
          const move = (ev) => gsap.to(card, { x: ox + ev.clientX - sx, y: oy + ev.clientY - sy, duration: 0.25, ease: 'power3.out' });
          const up = () => {
            card.classList.remove('is-dragging');
            gsap.to(card, { scale: 1, rotate: gsap.utils.random(-9, 9), duration: 1, ease: 'elastic.out(1, 0.5)' });
            card.removeEventListener('pointermove', move);
            card.removeEventListener('pointerup', up);
            card.removeEventListener('pointercancel', up);
          };
          card.addEventListener('pointermove', move);
          card.addEventListener('pointerup', up);
          card.addEventListener('pointercancel', up);
        });
      });
    });
  });

  /* ---------- Pointer niceties (desktop only) ---------- */
  if (!finePointer) return;

  // Custom cursor
  const cursor = $('.cursor');
  const label = $('.cursor__label');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('mousemove', (e) => {
    cursor.classList.add('is-visible');
    cx(e.clientX);
    cy(e.clientY);
  });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
  document.addEventListener('mouseover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button, input, select, textarea, .ag__panel, .roster li');
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-dark-label', !!labelled && labelled.dataset.cursorTone === 'gold');
    cursor.classList.toggle('is-link', !labelled && !!link);
    if (labelled) label.textContent = labelled.dataset.cursor;
  });

  // Magnetic buttons
  $$('.magnetic').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.6, ease: 'power3.out' });
    });
    btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }));
  });

  // 3D tilt cards
  $$('.tilt').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => (card.style.transform = ''));
  });

  // Hero photo follows the mouse a touch (x/y compose with the scroll yPercent)
  const heroMedia = $('.hero__media');
  if (heroMedia) {
    $('.hero').addEventListener('mousemove', (e) => {
      gsap.to(heroMedia, { x: (e.clientX / innerWidth - 0.5) * -26, y: (e.clientY / innerHeight - 0.5) * -18, duration: 1.4, ease: 'power3.out' });
    });
  }

  // Hover lists: a floating photo follows the cursor and swaps per row
  $$('[data-hover-list]').forEach((list) => {
    const rows = $$('.hl__row', list);
    const float = document.createElement('div');
    float.className = 'hl__float';
    float.innerHTML = `<div class="hl__frame">${rows.map((r) => `<img src="${r.dataset.img}" alt="">`).join('')}</div>`;
    body.appendChild(float);
    const imgs = $$('img', float);
    gsap.set(float, { xPercent: -50, yPercent: -50 });
    const fx = gsap.quickTo(float, 'x', { duration: 0.7, ease: 'power3' });
    const fy = gsap.quickTo(float, 'y', { duration: 0.7, ease: 'power3' });
    const fr = gsap.quickTo(float, 'rotate', { duration: 0.9, ease: 'power3' });
    let lastX = 0;
    list.addEventListener('mousemove', (e) => {
      fx(e.clientX);
      fy(e.clientY);
      fr(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6));
      lastX = e.clientX;
    });
    rows.forEach((row, i) => {
      row.addEventListener('mouseenter', (e) => {
        if (!float.classList.contains('is-on')) gsap.set(float, { x: e.clientX, y: e.clientY });
        float.classList.add('is-on');
        list.classList.add('is-hovering');
        rows.forEach((r) => r.classList.toggle('is-on', r === row));
        imgs.forEach((im, j) => im.classList.toggle('is-on', j === i));
      });
    });
    list.addEventListener('mouseleave', () => {
      float.classList.remove('is-on');
      list.classList.remove('is-hovering');
      rows.forEach((r) => r.classList.remove('is-on'));
    });
  });
})();
