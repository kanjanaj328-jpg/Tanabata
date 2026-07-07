/* ================================================================
   七夕 TANABATA WISH TREE — SCRIPT
   โครงสร้างไฟล์:
   1. Config & Data (สี短冊 7 สี)
   2. Sky: ดาว / ดาวตก / โคมไฟลอย
   3. Wind Gust Loop (ลมพัดทุก 8-15 วินาที)
   4. Color Cards: render + selection
   5. Tanzaku Anchors (ตำแหน่งแขวนบนกิ่งไผ่)
   6. Wish Storage (LocalStorage)
   7. Wish Creation + Render + Animation
   8. Tooltip (Hover)
   9. Popup Glassmorphism (Click)
   10. Init
   ================================================================ */

(() => {
  'use strict';

  /* ================================================================
     1. CONFIG & DATA
     ================================================================ */
  const TANZAKU_COLORS = [
    { id: 'pink',   nameJp: '桃色', hex: '#f4a6c1', glow: 'rgba(244,166,193,0.6)', meaning: 'ความรัก' },
    { id: 'red',    nameJp: '紅色', hex: '#d1544a', glow: 'rgba(209,84,74,0.6)',   meaning: 'ความสำเร็จ' },
    { id: 'yellow', nameJp: '黄色', hex: '#f0cd6a', glow: 'rgba(240,205,106,0.6)', meaning: 'การเรียน' },
    { id: 'green',  nameJp: '緑色', hex: '#6fae7a', glow: 'rgba(111,174,122,0.6)', meaning: 'สุขภาพ' },
    { id: 'blue',   nameJp: '青色', hex: '#6f9bd1', glow: 'rgba(111,155,209,0.6)', meaning: 'การเติบโต' },
    { id: 'purple', nameJp: '紫色', hex: '#a389c9', glow: 'rgba(163,137,201,0.6)', meaning: 'ความฝัน' },
    { id: 'white',  nameJp: '白色', hex: '#f5f0e8', glow: 'rgba(245,240,232,0.6)', meaning: 'ความสงบ' },
  ];

  const STORAGE_KEY = 'tanabata_wishes_v1';

  const state = {
    selectedColor: null,
    wishes: [],       // { id, colorId, text, date, x, y, rot, idleDelay }
    usedAnchors: new Set(),
  };

  /* ================================================================
     2. SKY: ดาว / ดาวตก / โคมไฟลอย
     ================================================================ */
  function createStars() {
    const field = document.getElementById('starsField');
    const count = window.innerWidth < 760 ? 70 : 140;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.top = `${Math.random() * 62}%`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.animationDuration = `${Math.random() * 3 + 2}s`;
      star.style.animationDelay = `${Math.random() * 4}s`;
      star.style.opacity = `${Math.random() * 0.5 + 0.3}`;
      frag.appendChild(star);
    }
    field.appendChild(frag);
  }

  function spawnShootingStar() {
    const container = document.getElementById('shootingStars');
    const star = document.createElement('div');
    star.className = 'shooting-star';
    star.style.top = `${Math.random() * 30 + 4}%`;
    star.style.left = `${Math.random() * 40 + 45}%`;
    container.appendChild(star);

    requestAnimationFrame(() => {
      star.classList.add('active');
    });

    setTimeout(() => star.remove(), 1600);
  }

  function scheduleShootingStars() {
    const delay = Math.random() * 9000 + 5000; // ทุก 5-14 วินาที
    setTimeout(() => {
      spawnShootingStar();
      scheduleShootingStars();
    }, delay);
  }

  function spawnFloatingLantern() {
    const container = document.getElementById('floatingLanterns');
    const lantern = document.createElement('div');
    lantern.className = 'lantern-float';
    lantern.style.left = `${Math.random() * 90 + 5}%`;
    lantern.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    lantern.style.animationDuration = `${Math.random() * 6 + 14}s`;
    container.appendChild(lantern);
    setTimeout(() => lantern.remove(), 21000);
  }

  function scheduleFloatingLanterns() {
    const delay = Math.random() * 6000 + 6000;
    setTimeout(() => {
      spawnFloatingLantern();
      scheduleFloatingLanterns();
    }, delay);
  }

  /* ================================================================
     3. WIND GUST LOOP
     ================================================================ */
  function scheduleWindGust() {
    const delay = Math.random() * 7000 + 8000; // ทุก 8-15 วินาที
    setTimeout(() => {
      const container = document.getElementById('bambooContainer');
      container.classList.add('wind-gust');
      setTimeout(() => container.classList.remove('wind-gust'), 1900);
      scheduleWindGust();
    }, delay);
  }

  /* ================================================================
     4. COLOR CARDS
     ================================================================ */
  function renderColorCards() {
    const leftHost = document.getElementById('colorCardsLeft');
    const rightHost = document.getElementById('colorCardsRight');

    const leftSet = TANZAKU_COLORS.slice(0, 4);
    const rightSet = TANZAKU_COLORS.slice(4);

    leftSet.forEach((c) => leftHost.appendChild(buildColorCard(c)));
    rightSet.forEach((c) => rightHost.appendChild(buildColorCard(c)));
  }

  function buildColorCard(color) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'color-card';
    card.dataset.colorId = color.id;
    card.style.setProperty('--card-color', color.hex);
    card.style.setProperty('--card-glow', color.glow);
    card.setAttribute('aria-pressed', 'false');

    card.innerHTML = `
      <span class="color-swatch"></span>
      <span class="color-info">
        <span class="color-name-jp">${color.nameJp}</span>
        <span class="color-meaning">${color.meaning}</span>
      </span>
    `;

    card.addEventListener('click', () => selectColor(color.id));
    return card;
  }

  function selectColor(colorId) {
    state.selectedColor = colorId;
    const color = TANZAKU_COLORS.find((c) => c.id === colorId);

    document.querySelectorAll('.color-card').forEach((el) => {
      const isSel = el.dataset.colorId === colorId;
      el.classList.toggle('selected', isSel);
      el.setAttribute('aria-pressed', String(isSel));
    });

    const strip = document.getElementById('previewStrip');
    const text = document.getElementById('previewText');
    strip.style.setProperty('--preview-color', color.hex);
    strip.style.borderStyle = 'solid';
    text.textContent = `${color.nameJp} · ${color.meaning}`;
  }

  /* ================================================================
     5. TANZAKU ANCHORS
     ================================================================ */
  // ตำแหน่งอ้างอิงบนกิ่งไผ่ (พิกัดตรงกับ viewBox 900x900 ของ bambooSVG)
  const BASE_ANCHORS = [
    { x: 150, y: 590 }, { x: 170, y: 606 }, { x: 200, y: 462 }, { x: 190, y: 436 },
    { x: 738, y: 366 }, { x: 746, y: 336 }, { x: 730, y: 212 }, { x: 712, y: 186 },
    { x: 350, y: 18 },  { x: 550, y: 14 },
    { x: 300, y: 500 }, { x: 560, y: 480 }, { x: 420, y: 320 }, { x: 500, y: 250 },
    { x: 260, y: 340 }, { x: 620, y: 300 }, { x: 380, y: 150 }, { x: 480, y: 120 },
    { x: 330, y: 720 }, { x: 570, y: 700 }, { x: 250, y: 460 }, { x: 640, y: 430 },
  ];

  function getNextAnchor(index) {
    if (index < BASE_ANCHORS.length) {
      const a = BASE_ANCHORS[index];
      return {
        x: a.x + (Math.random() - 0.5) * 22,
        y: a.y + (Math.random() - 0.5) * 18,
      };
    }
    // เมื่อเกินจำนวน anchor พื้นฐาน สุ่มตำแหน่งในพื้นที่ทรงพุ่มของต้นไผ่
    return {
      x: 240 + Math.random() * 440,
      y: 20 + Math.random() * 760,
    };
  }

  /* ================================================================
     6. WISH STORAGE
     ================================================================ */
  function loadWishes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.wishes = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.wishes = [];
    }
  }

  function saveWishes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.wishes));
    } catch (e) {
      /* localStorage อาจไม่พร้อมใช้งาน (โหมดส่วนตัว ฯลฯ) - ไม่ต้องแจ้งเตือนผู้ใช้ */
    }
  }

  /* ================================================================
     7. WISH CREATION + RENDER
     ================================================================ */
  function createWish(colorId, text) {
    const anchor = getNextAnchor(state.wishes.length);
    const wish = {
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      colorId,
      text,
      date: new Date().toISOString(),
      x: anchor.x,
      y: anchor.y,
      rot: (Math.random() - 0.5) * 24,
      idleDelay: Math.random() * 3,
    };
    state.wishes.push(wish);
    saveWishes();
    renderTanzaku(wish, true);
    updateWishCounter();
  }

  function renderTanzaku(wish, animateRise) {
    const layer = document.getElementById('bambooContainer');
    const color = TANZAKU_COLORS.find((c) => c.id === wish.colorId) || TANZAKU_COLORS[6];

    const el = document.createElement('div');
    el.className = 'tanzaku';
    el.dataset.wishId = wish.id;
    el.style.left = `${(wish.x / 900) * 100}%`;
    el.style.top = `${(wish.y / 900) * 100}%`;
    el.style.background = `linear-gradient(180deg, ${color.hex}, ${shade(color.hex, -12)})`;
    el.style.setProperty('--base-rot', `${wish.rot}deg`);
    el.style.setProperty('--drift-x', '0px');
    el.style.setProperty('--drift-y', '0px');
    el.style.setProperty('--idle-delay', `${wish.idleDelay}s`);
    el.style.transform = `rotate(${wish.rot}deg)`;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `คำอธิษฐานสี${color.nameJp}: ${wish.text}`);

    if (animateRise) {
      el.classList.add('tanzaku-rising');
      el.addEventListener('animationend', function onEnd() {
        el.classList.remove('tanzaku-rising');
        el.classList.add('tanzaku-idle');
        el.removeEventListener('animationend', onEnd);
      });
    } else {
      el.classList.add('tanzaku-idle');
    }

    attachTanzakuEvents(el, wish, color);
    document.getElementById('bambooSVG').insertAdjacentElement('afterend', el);
  }

  function shade(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0x00ff) + amt;
    let b = (num & 0x0000ff) + amt;
    r = Math.max(Math.min(255, r), 0);
    g = Math.max(Math.min(255, g), 0);
    b = Math.max(Math.min(255, b), 0);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  }

  function renderAllWishes() {
    state.wishes.forEach((w) => renderTanzaku(w, false));
    updateWishCounter();
  }

  function updateWishCounter() {
    document.getElementById('wishCount').textContent = state.wishes.length;
  }

  function removeWish(wishId) {
    state.wishes = state.wishes.filter((w) => w.id !== wishId);
    saveWishes();
    const el = document.querySelector(`.tanzaku[data-wish-id="${wishId}"]`);
    if (el) el.remove();
    updateWishCounter();
  }

  /* ================================================================
     8. TOOLTIP
     ================================================================ */
  function attachTanzakuEvents(el, wish, color) {
    const tooltip = document.getElementById('tanzakuTooltip');
    const tooltipText = document.getElementById('tooltipText');

    const showTooltip = (evt) => {
      el.classList.add('tanzaku-hovered');
      tooltipText.textContent = wish.text;
      const rect = el.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top}px`;
      tooltip.classList.add('show');
    };
    const hideTooltip = () => {
      el.classList.remove('tanzaku-hovered');
      tooltip.classList.remove('show');
    };

    el.addEventListener('mouseenter', showTooltip);
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('focus', showTooltip);
    el.addEventListener('blur', hideTooltip);

    el.addEventListener('click', () => openPopup(wish, color));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPopup(wish, color);
      }
    });
  }

  /* ================================================================
     9. POPUP GLASSMORPHISM
     ================================================================ */
  function openPopup(wish, color) {
    const overlay = document.getElementById('popupOverlay');
    const strip = document.getElementById('popupColorStrip');
    const meaning = document.getElementById('popupMeaning');
    const text = document.getElementById('popupWishText');
    const dateEl = document.getElementById('popupDate');
    const deleteBtn = document.getElementById('popupDeleteBtn');

    strip.style.setProperty('--strip-color', color.hex);
    strip.style.setProperty('--strip-glow', color.glow);
    meaning.textContent = `${color.nameJp} · ${color.meaning}`;
    text.textContent = wish.text;

    const d = new Date(wish.date);
    dateEl.textContent = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    deleteBtn.onclick = () => {
      removeWish(wish.id);
      closePopup();
    };

    overlay.classList.add('open');
  }

  function closePopup() {
    document.getElementById('popupOverlay').classList.remove('open');
  }

  function initPopupEvents() {
    document.getElementById('popupClose').addEventListener('click', closePopup);
    document.getElementById('popupOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'popupOverlay') closePopup();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePopup();
    });
  }

  /* ================================================================
     WISH FORM SUBMISSION
     ================================================================ */
  function initWishForm() {
    const textarea = document.getElementById('wishInput');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('wishSubmitBtn');
    const hint = document.getElementById('wishFormHint');

    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });

    submitBtn.addEventListener('click', () => {
      const text = textarea.value.trim();

      if (!state.selectedColor) {
        showHint(hint, 'กรุณาเลือกสีของ短冊ก่อนเขียนคำอธิษฐาน');
        return;
      }
      if (!text) {
        showHint(hint, 'กรุณาเขียนคำอธิษฐานของคุณก่อนกดปุ่ม');
        return;
      }

      createWish(state.selectedColor, text);
      textarea.value = '';
      charCount.textContent = '0';
      showHint(hint, 'คำอธิษฐานของคุณถูกแขวนไว้บนต้นไผ่แล้ว ✧');
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        submitBtn.click();
      }
    });
  }

  let hintTimeout = null;
  function showHint(hintEl, message) {
    hintEl.textContent = message;
    hintEl.classList.add('show');
    clearTimeout(hintTimeout);
    hintTimeout = setTimeout(() => hintEl.classList.remove('show'), 3200);
  }

  /* ================================================================
     10. INIT
     ================================================================ */
  function init() {
    createStars();
    scheduleShootingStars();
    scheduleFloatingLanterns();
    scheduleWindGust();
    renderColorCards();
    loadWishes();
    renderAllWishes();
    initWishForm();
    initPopupEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
