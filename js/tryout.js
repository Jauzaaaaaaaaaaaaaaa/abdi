/* ABDI tryout: simulasi berwaktu dengan tanda ragu-ragu, penilaian gaya SKD, dan tinjauan.
   Jawaban dan sisa waktu disimpan di perangkat, jadi tryout bisa dilanjutkan kalau halaman tertutup. */
(function () {
  'use strict';
  const A = window.Abdi;
  const $ = (id) => document.getElementById(id);
  const MODE = {
    skd: { nama: 'SKD lengkap', komposisi: { 'skd.twk': 30, 'skd.tiu': 35, 'skd.tkp': 45 }, menit: 100 },
    tiu: { nama: 'Tryout TIU', komposisi: { 'skd.tiu': 35 }, menit: 32 },
  };
  const SIMPAN = 'tryout-berjalan';
  let ujian = null, detak = 0, saringTinjau = 'semua';

  const kurang = (mode) => Object.entries(MODE[mode].komposisi).filter(([k, n]) => A.jumlah(k) < n)
    .map(([k, n]) => `${A.SUBTES[k].singkat} butuh ${n} soal, tersedia ${A.angka(A.jumlah(k))}`);

  function tampil(nama) {
    ['awal', 'ujian', 'hasil'].forEach((n) => { $(n).hidden = n !== nama; });
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------------- layar awal */
  function gambarAwal() {
    for (const m of Object.keys(MODE)) {
      const k = kurang(m);
      $('mulai-' + m).disabled = k.length > 0;
      $('ket-' + m).textContent = k.length ? 'Belum bisa dimulai: ' + k.join('; ') + '. Soalnya sedang disiapkan.' : 'Soal cukup. Siap dimulai.';
    }
    const s = A.ambil(SIMPAN, null);
    $('lanjutkan').hidden = !s;
    if (s) {
      const sisa = (s.batas - Date.now()) / 1000;
      $('lanjutkan-teks').textContent = sisa > 0
        ? `${MODE[s.mode].nama} belum selesai. Waktu tetap berjalan; sisa ${A.waktu(sisa)}.`
        : `Waktu ${MODE[s.mode].nama} habis saat halaman ditinggal. Jawabanmu tetap bisa dinilai.`;
      $('lanjutkan-tombol').textContent = sisa > 0 ? 'Lanjutkan' : 'Lihat nilainya';
    }
    gambarRiwayat();
  }

  function gambarRiwayat() {
    const r = A.ambil('tryout', []);
    $('riwayat').hidden = !r.length;
    const daftar = $('riwayat-daftar');
    daftar.textContent = '';
    r.slice(0, 6).forEach((x) => daftar.append(A.el('li', null,
      A.el('div', null, A.el('b', { teks: (MODE[x.mode] || { nama: x.mode }).nama }), ' ',
        A.el('span', { teks: '· ' + new Date(x.t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' · ' + A.waktu(x.durasi / 1000) })),
      A.el('b', { teks: x.total + ' / ' + x.maks }))));
    const tiu = r.filter((x) => x.mode === 'tiu').slice(0, 12).reverse();
    const svg = $('tren');
    svg.hidden = tiu.length < 2;
    if (tiu.length >= 2) {
      const titik = tiu.map((x, i) => `${(i / (tiu.length - 1)) * 300},${60 - (x.total / x.maks) * 56}`).join(' ');
      const ambang = 60 - (A.SUBTES['skd.tiu'].ambang / A.SUBTES['skd.tiu'].maks) * 56;
      svg.innerHTML = `<line x1="0" x2="300" y1="${ambang}" y2="${ambang}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="4 4"/>` +
        `<polyline points="${titik}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
  }

  /* ---------------------------------------------------------------- memulai */
  function merata(semua, n) {
    const per = {};
    A.acak(semua).forEach((s) => (per[s.k] = per[s.k] || []).push(s));
    const antrian = Object.values(per), hasil = [];
    while (hasil.length < n && antrian.some((a) => a.length)) {
      for (const a of A.acak(antrian)) if (a.length && hasil.length < n) hasil.push(a.pop());
    }
    return hasil;
  }
  // Soal yang belum pernah dikerjakan dipakai dulu; soal lama hanya menambal kalau soal baru tidak cukup.
  function ambilMerata(semua, n, r) {
    const baru = merata(semua.filter((s) => !r[s.i]), n);
    return A.acak(baru.concat(merata(semua.filter((s) => r[s.i]), n - baru.length)));
  }

  async function muatKomposisi(mode) {
    const per = {};
    for (const kode of Object.keys(MODE[mode].komposisi)) per[kode] = await A.muatSoal(A.daun(kode).map((t) => t.kode));
    return per;
  }

  async function mulai(mode) {
    const tombol = $('mulai-' + mode);
    tombol.disabled = true;
    try {
      const per = await muatKomposisi(mode), soal = [], r = A.ambil('jawaban', {});
      for (const [kode, n] of Object.entries(MODE[mode].komposisi)) soal.push(...ambilMerata(per[kode], n, r));
      const kini = Date.now();
      ujian = { mode, soal, jawab: soal.map(() => null), ragu: soal.map(() => false), cepat: soal.map(() => false), i: 0, mulai: kini,
        batas: kini + MODE[mode].menit * 60000 };
      simpan();
      masuk();
    } catch (e) {
      $('ket-' + mode).textContent = 'Soal gagal dimuat (' + e.message + '). Buka situs lewat server lokal atau hosting.';
      tombol.disabled = false;
    }
  }

  async function lanjutkan() {
    const s = A.ambil(SIMPAN, null);
    if (!s) return gambarAwal();
    const per = await muatKomposisi(s.mode), peta = {};
    Object.values(per).flat().forEach((x) => { peta[x.i] = x; });
    const ada = s.ids.map((id, i) => [peta[id], i]).filter(([x]) => x);
    ujian = { mode: s.mode, soal: ada.map(([x]) => x), jawab: ada.map(([, i]) => s.jawab[i]), ragu: ada.map(([, i]) => s.ragu[i]),
      cepat: ada.map(([, i]) => !!(s.cepat && s.cepat[i])), i: Math.min(s.i, ada.length - 1), mulai: s.mulai, batas: s.batas };
    if (Date.now() >= ujian.batas) selesai(true);
    else masuk();
  }

  function simpan() {
    A.taruh(SIMPAN, { mode: ujian.mode, ids: ujian.soal.map((s) => s.i), jawab: ujian.jawab, ragu: ujian.ragu, cepat: ujian.cepat,
      i: ujian.i, mulai: ujian.mulai, batas: ujian.batas });
  }

  /* ---------------------------------------------------------------- mengerjakan */
  function masuk() {
    tampil('ujian');
    const peta = $('u-peta');
    peta.textContent = '';
    ujian.soal.forEach((_, i) => peta.append(A.el('button', { type: 'button', teks: String(i + 1), 'aria-label': 'Soal ' + (i + 1),
      onclick: () => { ujian.i = i; simpan(); gambar(); } })));
    gambar();
    clearInterval(detak);
    detik();
    detak = setInterval(detik, 1000);
  }

  function gambar() {
    const s = ujian.soal[ujian.i], n = ujian.soal.length;
    $('u-nomor').textContent = `Soal ${ujian.i + 1} dari ${n}`;
    $('u-subtes').textContent = A.SUBTES[A.subtesDari(s.k)].singkat;
    A.isiSoal($('u-teks'), s.q);
    const ol = $('u-opsi');
    ol.textContent = '';
    s.o.forEach((teks, j) => {
      const dipilih = ujian.jawab[ujian.i] === j;
      ol.append(A.el('li', null, A.el('button', { type: 'button', class: 'opsi' + (dipilih ? ' terpilih' : ''), 'aria-pressed': String(dipilih), onclick: () => pilih(j) },
        A.el('span', { class: 'opsi-huruf', teks: A.HURUF[j] }), A.el('span', { class: 'opsi-teks', teks }))));
    });
    $('u-cepat').hidden = true;
    $('u-tombol-cepat').hidden = !s.h;
    $('u-tombol-cepat').setAttribute('aria-expanded', 'false');
    $('u-tombol-cepat').classList.toggle('dipakai', !!ujian.cepat[ujian.i]);
    $('u-ragu').setAttribute('aria-pressed', String(ujian.ragu[ujian.i]));
    $('u-prev').disabled = ujian.i === 0;
    $('u-next').firstChild.textContent = ujian.i + 1 < n ? 'Berikutnya ' : 'Ke soal nomor 1 ';
    perbaruiPeta();
  }

  function perbaruiPeta() {
    const tombol = $('u-peta').children;
    for (let i = 0; i < tombol.length; i++) {
      tombol[i].className = (ujian.ragu[i] ? 'ragu' : ujian.jawab[i] != null ? 'dijawab' : '') + (i === ujian.i ? ' kini' : '');
    }
    const dijawab = ujian.jawab.filter((x) => x != null).length;
    $('u-progres').textContent = `${dijawab} dari ${ujian.soal.length} dijawab`;
  }

  function bukaCepat() {
    const s = ujian.soal[ujian.i];
    if (!s.h) return;
    const buka = $('u-cepat').hidden;
    if (buka) {
      A.isiCepat($('u-cepat-isi'), s.h);
      ujian.cepat[ujian.i] = true;  // dicatat sekali dibuka, walaupun panelnya ditutup lagi
      simpan();
    }
    $('u-cepat').hidden = !buka;
    $('u-tombol-cepat').setAttribute('aria-expanded', String(buka));
    $('u-tombol-cepat').classList.add('dipakai');
  }

  function pilih(j) {
    ujian.jawab[ujian.i] = ujian.jawab[ujian.i] === j ? null : j;  // klik lagi untuk membatalkan
    simpan();
    gambar();
  }
  function pindah(arah) {
    const n = ujian.soal.length;
    ujian.i = (ujian.i + arah + n) % n;
    simpan();
    gambar();
    const atas = $('ujian').getBoundingClientRect().top;
    if (atas < 0) $('ujian').scrollIntoView({ block: 'start' });
  }

  function detik() {
    const sisa = (ujian.batas - Date.now()) / 1000, teks = A.waktu(sisa);
    $('u-waktu').textContent = teks;
    $('u-waktu-kecil').textContent = teks;
    $('u-waktu').classList.toggle('mepet', sisa <= 300);
    if (sisa <= 0) selesai(true);
  }

  function konfirmasi() {
    const kosong = ujian.jawab.filter((x) => x == null).length, ragu = ujian.ragu.filter(Boolean).length;
    $('konf-teks').textContent = (kosong || ragu
      ? `Masih ada ${kosong} soal kosong${ragu ? ` dan ${ragu} soal ditandai ragu-ragu` : ''}. `
      : 'Semua soal sudah dijawab. ') + 'Setelah selesai, jawaban tidak bisa diubah lagi.';
    $('konfirmasi').showModal();
  }

  /* ---------------------------------------------------------------- nilai */
  function selesai(otomatis) {
    clearInterval(detak);
    if ($('konfirmasi').open) $('konfirmasi').close();
    const durasi = Math.min(Date.now(), ujian.batas) - ujian.mulai, per = {};
    ujian.soal.forEach((s, i) => {
      const k = A.subtesDari(s.k), p = ujian.jawab[i];
      const x = (per[k] = per[k] || { nilai: 0, maks: 0, benar: 0, salah: 0, kosong: 0 });
      x.nilai += A.nilai(s, p);
      x.maks += 5;
      if (p == null) x.kosong++;
      else { A.benar(s, p) ? x.benar++ : x.salah++; A.catatJawaban(s, p); }
    });
    const total = Object.values(per).reduce((n, x) => n + x.nilai, 0), maks = Object.values(per).reduce((n, x) => n + x.maks, 0);
    const riwayat = A.ambil('tryout', []);
    riwayat.unshift({ t: Date.now(), mode: ujian.mode, total, maks, durasi, per: Object.fromEntries(Object.entries(per).map(([k, x]) => [k, x.nilai])) });
    A.taruh('tryout', riwayat.slice(0, 30));
    A.hapus(SIMPAN);
    gambarHasil(per, total, maks, durasi, otomatis);
  }

  function gambarHasil(per, total, maks, durasi, otomatis) {
    tampil('hasil');
    $('h-total').textContent = total;
    $('h-maks').textContent = '/ ' + maks;
    const semuaLolos = Object.entries(per).every(([k, x]) => x.nilai >= A.SUBTES[k].ambang);
    const dibantu = ujian.cepat.filter(Boolean).length;
    $('h-pesan').textContent = (otomatis ? 'Waktu habis, jawabanmu dinilai otomatis. ' : '') +
      (semuaLolos ? 'Semua subtes di atas nilai ambang. Pertahankan, lalu coba tingkat yang lebih sulit.'
        : 'Ada subtes yang masih di bawah nilai ambang. Tinjau soal yang salah di bawah, lalu latih topiknya.') +
      (dibantu ? ` Cara cepat dibuka di ${dibantu} soal (bertanda petir di tinjauan); di SKD asli bantuan itu tidak ada.` : '');
    $('h-waktu').textContent = A.waktu(durasi / 1000);
    const wadah = $('h-subtes');
    wadah.textContent = '';
    for (const [k, x] of Object.entries(per)) {
      const st = A.SUBTES[k], lolos = x.nilai >= st.ambang;
      wadah.append(A.el('article', { class: 'hasil-baris' + (lolos ? '' : ' di-bawah') },
        A.el('header', null, A.el('h3', { teks: `${st.singkat} · ${st.nama}` }),
          A.el('p', { class: 'nilai' }, String(x.nilai), A.el('small', { teks: ' / ' + x.maks }))),
        A.meter(x.nilai / x.maks, st.ambang / x.maks, `${st.singkat}: nilai ${x.nilai} dari ${x.maks}, ambang ${st.ambang}`),
        A.el('p', { class: 'hasil-ket', teks: `${lolos ? 'Di atas' : 'Di bawah'} nilai ambang ${st.ambang} (garis hitam). ` +
          (k === 'skd.tkp'
            ? `Rata-rata nilai pilihanmu ${(x.nilai / (x.maks / 5)).toFixed(1).replace('.', ',')} dari 5 (ambang setara 3,7). Pilihan terbaik ${x.benar} kali, kosong ${x.kosong}.`
            : `Benar ${x.benar}, salah ${x.salah}, kosong ${x.kosong}.`) })));
    }
    saringTinjau = 'semua';
    gambarTinjau();
  }

  function gambarTinjau() {
    document.querySelectorAll('#tab-tinjau button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.saring === saringTinjau)));
    A.gambarTinjau($('h-tinjau'), ujian.soal, ujian.jawab, saringTinjau, ujian.cepat);
  }

  /* ---------------------------------------------------------------- tombol dan papan ketik */
  $('mulai-skd').addEventListener('click', () => mulai('skd'));
  $('mulai-tiu').addEventListener('click', () => mulai('tiu'));
  $('lanjutkan-tombol').addEventListener('click', lanjutkan);
  $('u-prev').addEventListener('click', () => pindah(-1));
  $('u-next').addEventListener('click', () => pindah(1));
  $('u-ragu').addEventListener('click', () => { ujian.ragu[ujian.i] = !ujian.ragu[ujian.i]; simpan(); gambar(); });
  $('u-tombol-cepat').addEventListener('click', bukaCepat);
  $('u-selesai').addEventListener('click', konfirmasi);
  $('konf-batal').addEventListener('click', () => $('konfirmasi').close());
  $('konf-selesai').addEventListener('click', () => selesai(false));
  $('lagi').addEventListener('click', () => { ujian = null; tampil('awal'); gambarAwal(); });
  $('tab-tinjau').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-saring]');
    if (b) { saringTinjau = b.dataset.saring; gambarTinjau(); }
  });

  document.addEventListener('keydown', (e) => {
    if ($('ujian').hidden || $('konfirmasi').open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const huruf = 'abcde'.indexOf(e.key.toLowerCase()), angka = '12345'.indexOf(e.key);
    const p = huruf >= 0 ? huruf : angka;
    if (p >= 0 && p < ujian.soal[ujian.i].o.length) { e.preventDefault(); pilih(p); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); pindah(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pindah(-1); }
    else if (e.key.toLowerCase() === 'r') { e.preventDefault(); $('u-ragu').click(); }
    else if (e.key.toLowerCase() === 'h') { e.preventDefault(); bukaCepat(); }
  });

  gambarAwal();
})();
