/* ABDI beranda: angka dari data, status subtes, kartu yang sedikit miring mengikuti kursor,
   tombol magnet, dan pita yang berhenti saat tidak terlihat. Semua gerak hanya transform. */
(function () {
  'use strict';
  const A = window.Abdi;
  const halus = matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  // angka di hero langsung tampil (tanpa hitung naik) karena terlihat sejak awal
  document.querySelectorAll('[data-total-soal]').forEach((el) => { el.textContent = A.angka(A.indeks.total || 0); });
  document.querySelectorAll('[data-status]').forEach((el) => {
    const n = A.jumlah(el.dataset.status);
    el.textContent = n ? A.angka(n) + ' soal siap' : 'Segera';
    el.classList.toggle('segera', !n);
  });
  A.amati();

  const pita = document.querySelector('.pita');
  if (pita && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => pita.classList.toggle('diam', !e.isIntersecting)).observe(pita);
  }

  if (!halus) return;

  const hero = document.querySelector('.hero');
  const tumpuk = document.querySelector('.tumpukan');
  if (hero && tumpuk) {
    let raf = 0, x = 0, y = 0;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width - 0.5;
      y = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        tumpuk.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        tumpuk.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg');
      });
    });
    hero.addEventListener('pointerleave', () => {
      tumpuk.style.setProperty('--ry', '0deg');
      tumpuk.style.setProperty('--rx', '0deg');
    });
  }

  document.querySelectorAll('[data-magnet]').forEach((b) => {
    let raf = 0;
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; b.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`; });
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
})();
