/* ABDI e-book: pilih buku, daftar bab, baca satu bab, cari di seluruh buku, tandai sudah dibaca, lalu latih topiknya.
   Alamat bab ada di hash (#twk/pancasila) supaya tombol Back dan tautan langsung jalan. */
(function () {
  'use strict';
  const A = window.Abdi;
  const $ = (id) => document.getElementById(id);
  const BUKU = [
    { kode: 'twk', singkat: 'TWK', nama: 'Wawasan Kebangsaan' },
    { kode: 'skb', singkat: 'SKB TI', nama: 'Teknik Informatika' },
  ];
  const simpan = Object.assign({ buku: 'twk', bab: {}, dibaca: {} }, A.ambil('ebook', {}));
  const taruh = () => A.taruh('ebook', simpan);
  const lebar = matchMedia('(min-width: 981px)');
  let buku = null, kode = null, cari = '', teks = [];

  const antre = {};
  function muat(k) {
    if (window.ABDI_EBOOK && window.ABDI_EBOOK[k]) return Promise.resolve(window.ABDI_EBOOK[k]);
    if (!antre[k]) {
      antre[k] = new Promise((ok, gagal) => {
        const s = document.createElement('script');
        s.src = 'data/ebook-' + k + '.js';
        s.onload = () => (window.ABDI_EBOOK && window.ABDI_EBOOK[k] ? ok(window.ABDI_EBOOK[k]) : gagal(new Error('kosong')));
        s.onerror = () => { delete antre[k]; gagal(new Error('Gagal memuat buku ' + k)); };
        document.head.append(s);
      });
    }
    return antre[k];
  }

  const kunci = (id) => kode + '/' + id;
  const sudah = (id) => !!simpan.dibaca[kunci(id)];
  const polos = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.toLowerCase(); };
  const hitung = (t, q) => { let n = 0, i = t.indexOf(q); while (i >= 0) { n++; i = t.indexOf(q, i + q.length); } return n; };

  /* ---------------------------------------------------------------- pilihan buku */
  function gambarBuku() {
    $('eb-buku').replaceChildren(...BUKU.map((b) => A.el('a', {
      class: 'eb-buku-tombol', role: 'tab', href: '#' + b.kode + '/' + (simpan.bab[b.kode] || ''),
      'aria-selected': String(b.kode === kode),
    }, A.el('b', { teks: b.singkat }), A.el('span', { teks: b.nama }))));
  }

  /* ---------------------------------------------------------------- daftar bab */
  function gambarDaftar(aktif) {
    const q = cari.trim().toLowerCase();
    const n = buku.bab.filter((b) => sudah(b.id)).length;
    $('eb-kemajuan').replaceChildren(
      A.el('span', { teks: `${n} dari ${buku.bab.length} bab sudah dibaca` }),
      A.el('span', { class: 'eb-kemajuan-batang', 'aria-hidden': 'true' }, A.el('i', { style: `--isi:${n / buku.bab.length}` })));
    const isi = [];
    buku.bab.forEach((b, i) => {
      const hit = q ? hitung(teks[i], q) + hitung(b.judul.toLowerCase(), q) : 0;
      if (q && !hit) return;
      isi.push(A.el('li', { class: sudah(b.id) ? 'dibaca' : null },
        A.el('a', { href: '#' + kode + '/' + b.id, 'aria-current': b.id === aktif ? 'page' : null },
          A.el('span', { class: 'eb-no', teks: String(i + 1).padStart(2, '0') }),
          A.el('span', { class: 'eb-judul', teks: b.judul }),
          A.el('span', { class: 'eb-ket', teks: q ? `${hit} hasil` : sudah(b.id) ? '✓' : `${b.menit} mnt` }))));
    });
    if (!isi.length) isi.push(A.el('li', { class: 'kosong', teks: `Tidak ada “${cari.trim()}” di buku ini.` }));
    $('eb-daftar').replaceChildren(...isi);
  }

  /* ---------------------------------------------------------------- satu bab */
  function tandai(wadah, q) {
    if (!q) return null;
    const jalan = document.createTreeWalker(wadah, NodeFilter.SHOW_TEXT);
    const simpul = [];
    while (jalan.nextNode()) if (jalan.currentNode.nodeValue.toLowerCase().includes(q)) simpul.push(jalan.currentNode);
    let pertama = null;
    simpul.forEach((n) => {
      const t = n.nodeValue, lower = t.toLowerCase(), frag = document.createDocumentFragment();
      let i = 0, j;
      while ((j = lower.indexOf(q, i)) >= 0) {
        frag.append(t.slice(i, j));
        const m = A.el('mark', { teks: t.slice(j, j + q.length) });
        pertama = pertama || m;
        frag.append(m);
        i = j + q.length;
      }
      frag.append(t.slice(i));
      n.replaceWith(frag);
    });
    return pertama;
  }

  function daftarIsi(isi) {
    const sub = [...isi.querySelectorAll('h3')];
    if (sub.length < 4) return null;
    return A.el('details', { class: 'eb-isi-bab' }, A.el('summary', { teks: `Isi bab ini (${sub.length} bagian)` }),
      A.el('ol', {}, sub.map((h) => A.el('li', {}, A.el('button', {
        type: 'button', class: 'tautan', teks: h.textContent,
        onclick: () => h.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      })))));
  }

  function gambarBab(id, gulir) {
    const i = Math.max(0, buku.bab.findIndex((b) => b.id === id));
    const b = buku.bab[i], seb = buku.bab[i - 1], ber = buku.bab[i + 1];
    simpan.bab[kode] = b.id;
    taruh();
    const isi = A.el('div', { class: 'eb-isi' });
    isi.innerHTML = b.isi;
    // tabel lebar bisa digulir sendiri tanpa membuat halaman melebar
    isi.querySelectorAll('table').forEach((t) => { if (!t.parentElement.classList.contains('tabel')) t.replaceWith(A.el('div', { class: 'tabel' }, t.cloneNode(true))); });
    const latih = b.topik.map((k) => A.simpul(k)).filter(Boolean);
    const tombolBaca = A.el('button', {
      type: 'button', class: 'tombol tombol-garis', 'aria-pressed': String(sudah(b.id)),
      onclick: () => {
        simpan.dibaca[kunci(b.id)] = !sudah(b.id) || undefined;
        if (!simpan.dibaca[kunci(b.id)]) delete simpan.dibaca[kunci(b.id)];
        taruh();
        tombolBaca.setAttribute('aria-pressed', String(sudah(b.id)));
        tombolBaca.textContent = sudah(b.id) ? '✓ Sudah dibaca' : 'Tandai sudah dibaca';
        gambarDaftar(b.id);
      },
    }, sudah(b.id) ? '✓ Sudah dibaca' : 'Tandai sudah dibaca');
    const geser = (x, arah) => x ? A.el('a', {
      class: 'eb-geser-' + arah, href: '#' + kode + '/' + x.id,
      onclick: arah === 'lanjut' ? () => { simpan.dibaca[kunci(b.id)] = true; taruh(); } : null,
    }, A.el('span', { class: 'label', teks: arah === 'lanjut' ? 'Bab berikutnya' : 'Bab sebelumnya' }), A.el('b', { teks: x.judul })) : A.el('span');

    $('eb-baca').replaceChildren(
      A.el('header', { class: 'eb-kepala' },
        A.el('p', { class: 'label', teks: `${buku.judul} · Bab ${i + 1} dari ${buku.bab.length} · ±${b.menit} menit baca` }),
        A.el('h2', { teks: b.judul }),
        b.ringkas ? A.el('p', { class: 'eb-ringkas', teks: b.ringkas }) : null),
      daftarIsi(isi),
      isi,
      A.el('footer', { class: 'eb-kaki' },
        latih.length ? A.el('div', { class: 'eb-latih' },
          A.el('p', { teks: 'Sudah paham? Langsung jawab soalnya:' }),
          A.el('div', { class: 'eb-latih-daftar' },
            latih.map((t) => A.el('a', { class: 'tombol tombol-utama', href: 'latihan.html?topik=' + encodeURIComponent(t.kode) },
              `${t.nama} · ${A.angka(t.jumlah)} soal `, A.el('span', { class: 'panah', teks: '→' }))),
            latih.length > 1 ? A.el('a', { class: 'tombol tombol-garis', href: 'latihan.html?topik=' + encodeURIComponent(latih.map((t) => t.kode).join(',')), teks: 'Semua topik bab ini' }) : null)) : null,
        tombolBaca,
        A.el('nav', { class: 'eb-geser', 'aria-label': 'Bab lain' }, geser(seb, 'balik'), geser(ber, 'lanjut'))));

    gambarDaftar(b.id);
    const m = tandai(isi, cari.trim().toLowerCase());
    if (!lebar.matches && gulir) $('eb-daftar-wadah').open = false;
    if (m) m.scrollIntoView({ block: 'center' });
    else if (gulir) {
      const atas = $('eb-baca').getBoundingClientRect().top + scrollY - 90;
      if (scrollY > atas || !lebar.matches) scrollTo({ top: atas });
    }
    document.title = `${b.judul} — E-Book Abdi`;
  }

  /* ---------------------------------------------------------------- jalur (hash) */
  let jalanKe = 0;
  async function arah(gulir) {
    const [k, id] = decodeURIComponent(location.hash.slice(1)).split('/');
    const tuju = BUKU.some((b) => b.kode === k) ? k : simpan.buku;
    const nomor = ++jalanKe;
    if (tuju !== kode) {
      $('eb-baca').replaceChildren(A.el('p', { class: 'kosong', teks: 'Memuat buku…' }));
      let data;
      try { data = await muat(tuju); } catch (e) {
        $('eb-baca').replaceChildren(A.el('p', { class: 'kosong', teks: 'Buku gagal dimuat. Periksa koneksi lalu muat ulang halaman.' }));
        return;
      }
      if (nomor !== jalanKe) return;
      buku = data; kode = tuju;
      teks = buku.bab.map((b) => polos(b.isi));
      simpan.buku = kode;
      gambarBuku();
    }
    gambarBab(id || simpan.bab[kode] || buku.bab[0].id, gulir);
  }

  let tunda = 0;
  $('eb-cari').addEventListener('input', (e) => {
    cari = e.target.value;
    clearTimeout(tunda);
    tunda = setTimeout(() => { if (buku) gambarDaftar(simpan.bab[kode]); }, 120);
  });
  $('eb-cari').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !buku) return;
    const pertama = $('eb-daftar').querySelector('a');
    if (pertama) { e.preventDefault(); location.hash = pertama.getAttribute('href'); }
  });
  // klik bab yang sedang dibuka (misalnya setelah mengetik kata cari) tidak memicu hashchange, jadi gambar ulang di sini
  $('eb-daftar').addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); arah(true); }
  });
  $('eb-daftar-wadah').open = lebar.matches;
  addEventListener('hashchange', () => arah(true));
  arah(false);
  A.mulaiPengingat();
})();
