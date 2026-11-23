/* ABDI inti: setelan tampilan, data soal, penilaian, tinjauan, efek gulir ringan, dan pengingat istirahat kecil.
   Skrip biasa (bukan module) supaya situs tetap jalan saat index.html dibuka langsung dari folder. */
(function () {
  'use strict';
  const A = (window.Abdi = window.Abdi || {});
  const root = document.documentElement;
  const geraknya = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- penyimpanan; bisa ditolak di mode privat, jadi selalu dibungkus */
  A.ambil = (k, d) => { try { const v = localStorage.getItem('abdi:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  A.taruh = (k, v) => { try { localStorage.setItem('abdi:' + k, JSON.stringify(v)); } catch (e) { /* tetap jalan tanpa simpan */ } };
  A.hapus = (k) => { try { localStorage.removeItem('abdi:' + k); } catch (e) { /* abaikan */ } };

  /* ---------- aturan SKD (acuan Kepmen PANRB 321/2024, dicek 16 November 2026) */
  A.SUBTES = {
    'skd.twk': { singkat: 'TWK', nama: 'Tes Wawasan Kebangsaan', no: '01', soal: 30, ambang: 65, maks: 150 },
    'skd.tiu': { singkat: 'TIU', nama: 'Tes Intelegensia Umum', no: '02', soal: 35, ambang: 80, maks: 175 },
    'skd.tkp': { singkat: 'TKP', nama: 'Tes Karakteristik Pribadi', no: '03', soal: 45, ambang: 166, maks: 225 },
    // SKB: hanya latihan; ambang dan jumlah soal SKB ditetapkan tiap instansi, jadi tidak ikut tryout SKD
    'skb.ti': { singkat: 'SKB TI', nama: 'SKB Teknik Informatika', no: '04' },
  };
  A.URUT_SUBTES = ['skd.twk', 'skd.tiu', 'skd.tkp', 'skb.ti'];
  A.HURUF = 'ABCDE';

  /* ---------- indeks soal hasil ekspor bank.db */
  const IDX = window.ABDI_INDEKS || { total: 0, topik: [] };
  A.indeks = IDX;
  A.simpul = (kode) => IDX.topik.find((t) => t.kode === kode) || null;
  A.anak = (kode) => IDX.topik.filter((t) => t.induk === kode).sort((a, b) => a.urutan - b.urutan);
  A.daun = (kode) => {
    const a = A.anak(kode);
    if (a.length) return a.flatMap((x) => A.daun(x.kode));
    const s = A.simpul(kode);
    return s ? [s] : [];
  };
  A.jumlah = (kode) => (A.simpul(kode) || { jumlah: 0 }).jumlah;
  A.subtesDari = (kode) => A.URUT_SUBTES.find((s) => kode === s || kode.startsWith(s + '.')) || 'skd.tiu';

  const antre = {};
  A.muatPaket = (nama) => {
    const ada = window.ABDI_PAKET && window.ABDI_PAKET[nama];
    if (ada) return Promise.resolve(ada);
    if (!antre[nama]) {
      antre[nama] = new Promise((ok, gagal) => {
        const s = document.createElement('script');
        s.src = 'data/soal/' + nama + '.js';
        s.onload = () => {
          const isi = window.ABDI_PAKET && window.ABDI_PAKET[nama];
          isi ? ok(isi) : gagal(new Error('Paket kosong: ' + nama));
        };
        s.onerror = () => { delete antre[nama]; gagal(new Error('Gagal memuat paket ' + nama)); };
        document.head.appendChild(s);
      });
    }
    return antre[nama];
  };
  A.muatSoal = async (kodeDaun) => {
    const paket = kodeDaun.flatMap((k) => (A.simpul(k) || { paket: [] }).paket);
    return (await Promise.all(paket.map(A.muatPaket))).flat();
  };

  /* ---------- penilaian: TWK/TIU benar 5 salah 0; TKP (situasi) sesuai skor opsi 1-5; kosong 0 */
  A.kunci = (s) => s.s.indexOf(Math.max(...s.s));
  A.benar = (s, p) => p != null && p === A.kunci(s);
  A.nilai = (s, p) => (p == null ? 0 : s.j === 'situasi' ? s.s[p] : s.s[p] === 1 ? 5 : 0);

  /* ---------- alat kecil */
  A.angka = (n) => Number(n).toLocaleString('id-ID');
  A.acak = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  A.waktu = (detik) => {
    detik = Math.max(0, Math.round(detik));
    const j = Math.floor(detik / 3600), m = Math.floor((detik % 3600) / 60), d = detik % 60;
    return (j ? j + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(d).padStart(2, '0');
  };
  A.el = (tag, atr, ...anak) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(atr || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'teks') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const a of anak.flat()) if (a != null) e.append(a);
    return e;
  };
  // Baris pertama = kalimat soal. Baris berikutnya: blok ``` … ``` (kode atau tabel) tampil apa adanya dalam huruf mono,
  // kutipan pasal (diawali “) tampil sebagai kutipan, data pendek seperti deret dicetak besar, sisanya paragraf biasa.
  A.isiSoal = (wadah, q) => {
    wadah.textContent = '';
    let kode = null;
    q.split('\n').forEach((baris, i) => {
      if (baris === '```') {
        if (kode) wadah.append(A.el('pre', { class: 'soal-kode', tabindex: '0' }, A.el('code', { teks: kode.join('\n') })));
        kode = kode ? null : [];
        return;
      }
      if (kode) { kode.push(baris); return; }
      const kelas = !i ? null : baris.startsWith('“') ? 'soal-kutipan' : baris.length <= 90 ? 'soal-data' : null;
      wadah.append(A.el('p', { class: kelas, teks: baris }));
    });
  };
  // TKP: semua pilihan berurutan dari nilai tertinggi, lengkap dengan alasannya.
  A.daftarNilai = (s, kecuali) => A.el('ul', { class: 'daftar-nilai' },
    s.o.map((teks, j) => j).filter((j) => j !== kecuali).sort((a, b) => s.s[b] - s.s[a])
      .map((j) => A.el('li', null, A.el('b', { teks: A.HURUF[j] + ' · nilai ' + s.s[j] }),
        A.el('span', { teks: s.o[j] + (s.w && s.w[j] ? ' — ' + s.w[j] : '') }))));
  // Pembahasan dari bank soal: baris "Konsep:", langkah bernomor "1. …", kutipan “…”, dan baris "Cara cepat:".
  const ikonCepat = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>';
    return s;
  };
  A.ikonCepat = ikonCepat;
  const kapital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  A.isiBahas = (wadah, e) => {
    wadah.textContent = '';
    e.split('\n').forEach((baris) => {
      const langkah = baris.match(/^(\d+)\.\s+(.*)$/);
      if (baris.startsWith('Cara cepat:')) {
        wadah.append(A.el('div', { class: 'bahas-cepat' },
          A.el('p', { class: 'cepat-judul' }, ikonCepat(), 'Cara cepat'),
          A.el('p', { teks: kapital(baris.slice(11).trim()) })));
      } else if (baris.startsWith('Konsep:')) {
        wadah.append(A.el('p', { class: 'bahas-konsep' }, A.el('b', { teks: 'Konsep ' }), kapital(baris.slice(7).trim())));
      } else if (langkah) {
        wadah.append(A.el('p', { class: 'langkah' }, A.el('span', { class: 'langkah-no', teks: langkah[1] }), A.el('span', { teks: langkah[2] })));
      } else if (baris.startsWith('“')) {
        wadah.append(A.el('p', { class: 'bahas-kutipan', teks: baris }));
      } else {
        // "Pilihan terbaik (nilai 5): …", "Peta Bab III: …": label pendek sebelum titik dua ditebalkan agar mudah dipindai
        const label = baris.match(/^([^:“]{3,50}):\s+(.+)$/);
        wadah.append(label ? A.el('p', null, A.el('b', { teks: label[1] + ':' }), ' ' + label[2]) : A.el('p', { teks: baris }));
      }
    });
  };
  // Petunjuk cara cepat sebelum menjawab: teknik, bukan jawaban.
  A.isiCepat = (wadah, h) => {
    wadah.textContent = '';
    h.split('\n').forEach((baris) => wadah.append(A.el('p', { teks: baris })));
  };
  A.meter = (isi, ambang, label) => A.el('div', { class: 'meter', role: 'img', 'aria-label': label },
    A.el('div', { class: 'meter-isi', style: '--isi:' + Math.max(0, Math.min(1, isi)).toFixed(3) }),
    ambang == null ? null : A.el('i', { class: 'meter-ambang', style: '--ambang:' + (ambang * 100).toFixed(1) + '%' }));

  A.catatJawaban = (s, p) => {
    const r = A.ambil('jawaban', {});
    const x = r[s.i] || { b: 0, s: 0, k: s.k };
    A.benar(s, p) ? x.b++ : x.s++;
    x.akhir = A.benar(s, p) ? 1 : 0;
    x.v = s.v;  // tingkat, supaya jumlah soal tersisa per tingkat bisa dihitung tanpa memuat paket
    x.t = Date.now();
    r[s.i] = x;
    A.taruh('jawaban', r);
  };

  // Untuk daftar tinjauan: nama topik + bagian soal yang paling khas (baris data deret bila ada).
  const ringkasSoal = (s) => {
    const baris = s.q.split('\n'), daun = A.simpul(s.k), data = baris.length > 1 && !s.q.includes('```');
    return (daun ? daun.nama + ': ' : '') + (data ? baris.slice(1).join(' ') : baris[0]);
  };
  // cepat (opsional): penanda soal yang dikerjakan dengan membuka cara cepat.
  A.gambarTinjau = (wadah, daftar, jawab, saring, cepat) => {
    wadah.textContent = '';
    daftar.forEach((s, i) => {
      const p = jawab[i], k = A.kunci(s), kosong = p == null, benar = A.benar(s, p), tkp = s.j === 'situasi';
      if ((saring === 'salah' && (benar || kosong)) || (saring === 'kosong' && !kosong)) return;
      const tanda = kosong ? ['kosong-t', 'Kosong']
        : tkp ? [s.s[p] >= 4 ? 'benar' : s.s[p] === 3 ? 'netral' : 'salah', 'Nilai ' + s.s[p]]
          : benar ? ['benar', 'Benar'] : ['salah', 'Salah'];
      const teks = A.el('div', { class: 'soal-teks' });
      A.isiSoal(teks, s.q);
      const bahas = A.el('div', { class: 'bahas-isi' });
      A.isiBahas(bahas, s.e);
      const isi = A.el('div', { class: 'tinjau-isi' }, teks,
        A.el('p', { class: 'tinjau-jawab' },
          A.el('span', null, 'Jawabanmu: ', A.el('b', { teks: kosong ? '—' : A.HURUF[p] + '. ' + s.o[p] + (tkp ? ' (nilai ' + s.s[p] + ')' : '') })),
          A.el('span', null, tkp ? 'Terbaik: ' : 'Kunci: ', A.el('b', { teks: A.HURUF[k] + '. ' + s.o[k] }))),
        bahas,
        tkp ? A.daftarNilai(s) : null,
        !tkp && !kosong && !benar && s.w && s.w[p] ? A.el('p', { class: 'petunjuk-teks', teks: 'Kenapa ' + A.HURUF[p] + ' kurang tepat: ' + s.w[p] }) : null);
      wadah.append(A.el('details', { class: 'tinjau-item' },
        A.el('summary', null,
          A.el('span', { class: 'tinjau-no', teks: String(i + 1).padStart(2, '0') }),
          A.el('span', { class: 'tinjau-q', teks: ringkasSoal(s) }),
          cepat && cepat[i] ? A.el('span', { class: 'tanda dibantu', title: 'Dikerjakan dengan membuka cara cepat' }, ikonCepat()) : null,
          A.el('span', { class: 'tanda ' + tanda[0], teks: tanda[1] })),
        isi));
    });
    if (!wadah.children.length) wadah.append(A.el('p', { class: 'kosong', teks: 'Tidak ada soal di kelompok ini.' }));
  };

  /* ---------- setelan tampilan: tema, ukuran huruf, pengingat istirahat */
  A.setelan = Object.assign({ tema: 'otomatis', skala: 1, istirahat: true }, A.ambil('setelan', {}));
  function terapkan() {
    if (A.setelan.tema === 'otomatis') delete root.dataset.tema;
    else root.dataset.tema = A.setelan.tema;
    root.style.setProperty('--skala', A.setelan.skala);
    document.querySelectorAll('[data-setel]').forEach((grup) => {
      grup.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(String(A.setelan[grup.dataset.setel]) === b.dataset.nilai)));
    });
  }
  document.querySelectorAll('[data-setel]').forEach((grup) => {
    grup.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-nilai]');
      if (!b) return;
      const k = grup.dataset.setel, v = b.dataset.nilai;
      A.setelan[k] = k === 'skala' ? Number(v) : k === 'istirahat' ? v === 'true' : v;
      A.taruh('setelan', A.setelan);
      terapkan();
    });
  });
  terapkan();
  document.addEventListener('click', (e) => {
    document.querySelectorAll('details.setel[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('details.setel[open]').forEach((d) => { d.open = false; });
  });

  /* ---------- kepala diberi garis setelah digulir (tanpa event scroll) */
  const kepala = document.querySelector('.kepala');
  if (kepala && 'IntersectionObserver' in window) {
    const penanda = A.el('div', { 'aria-hidden': 'true', style: 'position:absolute;top:0;height:1px;width:1px' });
    document.body.prepend(penanda);
    new IntersectionObserver(([e]) => kepala.classList.toggle('tergulir', !e.isIntersecting)).observe(penanda);
  }

  /* ---------- muncul saat digulir + angka berhitung */
  function hitung(el) {
    const akhir = Number(el.dataset.hitung) || 0;
    if (!geraknya) { el.textContent = A.angka(akhir); return; }
    const t0 = performance.now(), lama = 1100;
    const langkah = (t) => {
      const p = Math.min(1, (t - t0) / lama);
      el.textContent = A.angka(Math.round(akhir * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(langkah);
    };
    requestAnimationFrame(langkah);
  }
  A.amati = () => {
    const target = document.querySelectorAll('.muncul:not(.terlihat), [data-hitung]:not([data-dihitung])');
    if (!('IntersectionObserver' in window)) {
      target.forEach((el) => { el.classList.add('terlihat'); if (el.dataset.hitung) hitung(el); });
      return;
    }
    const io = new IntersectionObserver((daftar) => {
      daftar.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('terlihat');
        if (e.target.dataset.hitung && !e.target.dataset.dihitung) { e.target.dataset.dihitung = '1'; hitung(e.target); }
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    target.forEach((el) => io.observe(el));
  };

  document.querySelectorAll('[data-dibuat]').forEach((el) => {
    if (IDX.dibuat) el.textContent = new Date(IDX.dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  /* ---------- pengingat istirahat: notif kecil di atas tiap 30 menit, hilang sendiri; tidak menghalangi soal.
     Waktu hanya dihitung saat tab terlihat. */
  let pengingatJalan = false;
  A.mulaiPengingat = () => {
    if (pengingatJalan) return;
    pengingatJalan = true;
    const BATAS = 30 * 60 * 1000;
    let aktif = 0, lalu = performance.now(), sembunyi = 0;
    const teks = A.el('p', { teks: '' });
    const tutup = () => { notif.classList.remove('tampil'); clearTimeout(sembunyi); };
    const notif = A.el('div', { class: 'istirahat', role: 'status', 'aria-live': 'polite' }, teks,
      A.el('button', { type: 'button', class: 'istirahat-tutup', 'aria-label': 'Tutup pengingat', teks: '×', onclick: tutup }));
    document.body.append(notif);
    let sesiMenit = 0;
    setInterval(() => {
      const kini = performance.now();
      if (document.visibilityState === 'visible') aktif += kini - lalu;
      lalu = kini;
      if (aktif < BATAS) return;
      aktif = 0;
      sesiMenit += 30;
      if (!A.setelan.istirahat) return;
      teks.textContent = `Sudah ${sesiMenit} menit belajar. Kalau mata lelah, lihat jauh sebentar.`;
      notif.classList.add('tampil');
      clearTimeout(sembunyi);
      sembunyi = setTimeout(tutup, 8000);
    }, 15000);
  };

  A.amati();
})();
