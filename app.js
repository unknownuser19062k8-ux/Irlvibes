(function () {
  const MEDIA = window.MEDIA || [];
  const SITE = window.SITE || {};
  const PLAY = '<svg class="icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const IMG = '<svg class="icon" viewBox="0 0 24 24"><path d="M4 5h16v14H4zM6 17l4-5 3 3 2-2 3 4H6z"/></svg>';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Instagram links
  $$('[data-ig]').forEach(a => { a.href = SITE.instagramUrl || '#'; a.target = '_blank'; a.rel = 'noopener'; });
$('#copyright').innerHTML = `
  <div class="footer-bottom">
    <div class="copyright-text">
      © ${SITE.year || new Date().getFullYear()} IRL VIBES. All Rights Reserved.
    </div>

    <div class="developed-by">
      Developed with ❤️ by <span>Bunny</span>
    </div>
  </div>
`;
  // Nav: scrolled state + mobile menu
  const nav = $('#nav'), toggle = $('#menuToggle'), links = $('#navLinks');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
  }));

  // Floating hero previews (first three photos)
  const stack = $('#floatStack');
  MEDIA.filter(m => m.type === 'photo').slice(0, 3).forEach(m => {
    const card = document.createElement('div');
    card.className = 'float-card';
    card.innerHTML = `<img loading="lazy" alt="" src="${m.thumbnail || m.url}">`;
    stack.appendChild(card);
  });

  // Gallery
  const gallery = $('#gallery'), empty = $('#empty');
  const items = MEDIA.map((m, i) => {
    const el = document.createElement('button');
    el.className = `tile ${m.size || 'normal'}`;
    el.dataset.type = m.type;
    el.dataset.category = m.category;
    el.dataset.index = i;
    el.setAttribute('aria-label', `Open ${m.title || m.type}`);
    const badge = m.type === 'video' ? PLAY : IMG;
    const media = m.type === 'video'
      ? `<video muted loop playsinline preload="none" poster="${m.thumbnail || ''}" src="${m.url}"></video>`
      : `<img loading="lazy" decoding="async" alt="${m.title || ''}" src="${m.thumbnail || m.url}">`;
    el.innerHTML = `${media}<span class="badge" aria-hidden="true">${badge}</span><span class="tile-caption">${m.title || ''}</span>`;
    gallery.appendChild(el);
    return el;
  });

  // Hover-to-preview videos (muted, stop on leave)
  items.filter(el => el.dataset.type === 'video').forEach(el => {
    const v = el.querySelector('video');
    el.addEventListener('mouseenter', () => { v.muted = true; v.play().catch(() => {}); });
    el.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
  });

  // Filtering with staggered animation
  const applyFilter = f => {
    let visible = 0;
    items.forEach(el => {
      const show = f === 'all' || el.dataset.type === f || el.dataset.category === f;
      el.classList.toggle('hide', !show);
      if (show) {
        visible++;
        el.classList.remove('enter'); void el.offsetWidth;
        el.style.animationDelay = `${visible * 40}ms`;
        el.classList.add('enter');
      }
    });
    empty.style.display = visible ? 'none' : 'block';
    $$('#filters .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === f)));
  };
  $$('#filters .chip').forEach(c => c.addEventListener('click', () => applyFilter(c.dataset.filter)));
  $$('#navLinks [data-filter]').forEach(a => a.addEventListener('click', () => {
    setTimeout(() => applyFilter(a.dataset.filter), 300);
  }));

  // Lightbox
  const lb = $('#lightbox'), stage = $('#lbStage'), count = $('#lbCount'), caption = $('#lbCaption');
  let list = [], current = 0, lastFocus = null;

  const visibleIndexes = () => items.filter(el => !el.classList.contains('hide')).map(el => +el.dataset.index);
  const stopMedia = () => {
    const v = stage.querySelector('video');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  };

  function render() {
    stopMedia();
    const m = MEDIA[list[current]];
    stage.innerHTML = '';
    if (m.type === 'video') {
      const v = document.createElement('video');
      v.controls = true; v.playsInline = true; v.preload = 'auto';
      v.muted = false; v.volume = 1; v.src = m.url;
      v.setAttribute('aria-label', m.title || 'Video');
      stage.appendChild(v);
      v.play().catch(() => {});
    } else {
      const img = document.createElement('img');
      img.src = m.url; img.alt = m.title || 'Photo'; img.decoding = 'async';
      img.addEventListener('click', () => img.classList.toggle('zoomed'));
      stage.appendChild(img);
    }
    count.textContent = `${current + 1} / ${list.length}`;
    caption.textContent = m.title || '';
    const single = list.length < 2;
    $('#lbPrev').style.display = single ? 'none' : 'grid';
    $('#lbNext').style.display = single ? 'none' : 'grid';
  }

  function openAt(index) {
    list = visibleIndexes();
    current = Math.max(0, list.indexOf(index));
    lastFocus = document.activeElement;
    render();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#lbClose').focus();
  }
  function closeLb() {
    lb.classList.remove('open');
    stopMedia();
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  const step = d => { current = (current + d + list.length) % list.length; render(); };

  items.forEach(el => el.addEventListener('click', () => openAt(+el.dataset.index)));
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => step(-1));
  $('#lbNext').addEventListener('click', () => step(1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target === stage) closeLb(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  // Reveal on scroll
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => io.observe(el));

  // Counters
  const countUp = (el, target) => {
    const start = performance.now(), dur = 1200;
    const tick = t => {
      const p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const statIO = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    countUp($('#statPhotos'), MEDIA.filter(m => m.type === 'photo').length);
    countUp($('#statVideos'), MEDIA.filter(m => m.type === 'video').length);
    statIO.disconnect();
  }, { threshold: 0.4 });
  statIO.observe($('#about'));

  // Active nav link on scroll
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      $$('#navLinks a.nav-link').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['home', 'memories', 'about'].forEach(id => navIO.observe(document.getElementById(id)));
})();
