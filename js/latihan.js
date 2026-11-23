/* ABDI latihan: pilih subtes/topik/tingkat, jawab dengan pembahasan langsung, lalu ringkasan dan tinjauan. */
(function () {
  'use strict';
  const A = window.Abdi;
  const $ = (id) => document.getElementById(id);
  const PETA = { twk: 'skd.twk', tiu: 'skd.tiu', tkp: 'skd.tkp', skb: 'skb.ti' };
  const TINGKAT = { semua: [1, 2, 3, 4, 5], dasar: [1, 2], menengah: [3], sulit: [4, 5] };
  const NAMA_TINGKAT = { semua: 'Semua', dasar: 'Dasar', menengah: 'Menengah', sulit: 'Sulit' };
  const awal = A.ambil('pilihan-latihan', {});
  const qs = new URLSearchParams(location.search);
  // dari e-book: ?topik=kode1,kode2 langsung memilih subtes dan topik itu
  const minta = (qs.get('topik') || '').split(',').filter((k) => A.simpul(k));
  const pilihan = {
    subtes: minta.length ? A.subtesDari(minta[0]) : PETA[qs.get('subtes')] || awal.subtes || 'skd.tiu',
    topik: new Set(minta.length ? minta : awal.topik || []),
    tingkat: minta.length ? 'semua' : awal.tingkat || 'semua',
    jumlah: awal.jumlah || 10,
    salah: !!awal.salah,
  };
  let sesi = null, detak = 0, R = A.ambil('jawaban', {});

  // Soal yang sudah dikerjakan tidak muncul lagi; kecuali (bila dicentang) yang jawaban terakhirnya salah.
  const bolehMuncul = (x) => !x || (pilihan.salah && x.akhir === 0);
  const sisa = (t, lv) => lv.reduce((n, v) => n + (t.tingkat[v - 1] || 0), 0)
    - Object.values(R).filter((x) => x.k === t.kode && lv.includes(x.v) && !bolehMuncul(x)).length;

  /* ---------------------------------------------------------------- layar pilih */
  const daunAda = () => A.daun(pilihan.subtes).filter((t) => t.jumlah > 0);
  const cocokTingkat = (t) => sisa(t, TINGKAT[pilihan.tingkat]);
  const tersedia = () => daunAda().filter((t) => pilihan.topik.has(t.kode)).reduce((n, t) => n + cocokTingkat(t), 0);

  function gambarPilih() {
    R = A.ambil('jawaban', {});
    const daun = daunAda();
    for (const k of [...pilihan.topik]) if (!daun.some((t) => t.kode === k)) pilihan.topik.delete(k);
    if (!pilihan.topik.size) daun.forEach((t) => pilihan.topik.add(t.kode));

    const subtes = $('pilih-subtes');
    subtes.textContent = '';
    A.URUT_SUBTES.forEach((kode) => {
      const n = A.jumlah(kode);
      subtes.append(A.el('button', { type: 'button', 'aria-pressed': String(pilihan.subtes === kode),
        onclick: () => { pilihan.subtes = kode; pilihan.topik.clear(); gambarPilih(); } },
      A.SUBTES[kode].singkat, A.el('small', { teks: n ? A.angka(n) : 'segera' })));
    });

    const topik = $('pilih-topik');
    topik.textContent = '';
    if (!daun.length) {
      topik.append(A.el('p', { class: 'kosong' },
        A.el('b', { teks: 'Soal ' + A.SUBTES[pilihan.subtes].singkat + ' sedang disiapkan.' }),
        ' Soal baru tampil setelah lolos verifikasi. Sementara itu, coba latihan TIU.'));
    }
    daun.forEach((t) => {
      topik.append(A.el('button', { type: 'button', class: 'chip', 'aria-pressed': String(pilihan.topik.has(t.kode)),
        onclick: () => {
          if (!pilihan.topik.has(t.kode)) pilihan.topik.add(t.kode);
          else if (pilihan.topik.size > 1) pilihan.topik.delete(t.kode);  // minimal satu topik tetap terpilih
          gambarPilih();
        } },
      t.nama, A.el('small', { teks: A.angka(cocokTingkat(t)) })));
    });
    $('pilih-semua').hidden = daun.every((t) => pilihan.topik.has(t.kode));

    const tingkat = $('pilih-tingkat');
    tingkat.textContent = '';
    Object.keys(TINGKAT).forEach((k) => {
      const n = daun.filter((t) => pilihan.topik.has(t.kode)).reduce((s, t) => s + sisa(t, TINGKAT[k]), 0);
      tingkat.append(A.el('button', { type: 'button', 'aria-pressed': String(pilihan.tingkat === k), disabled: !n,
        onclick: () => { pilihan.tingkat = k; gambarPilih(); } }, NAMA_TINGKAT[k], A.el('small', { teks: A.angka(n) })));
    });

    const jumlah = $('pilih-jumlah');
    jumlah.textContent = '';
    [10, 20, 35, 50, 100].forEach((n) => jumlah.append(A.el('button', { type: 'button', 'aria-pressed': String(pilihan.jumlah === n),
      onclick: () => { pilihan.jumlah = n; gambarPilih(); } }, n + ' soal')));
    const bebas = $('jumlah-bebas');
    if (document.activeElement !== bebas) bebas.value = pilihan.jumlah;

    $('pilih-salah').checked = pilihan.salah;
    const ada = tersedia();
    $('mulai').disabled = !ada;
    $('jumlah-bebas').max = ada || 1;
    $('pilih-info').textContent = ada
      ? `${Math.min(pilihan.jumlah, ada)} soal dari ${pilihan.topik.size} topik · ${A.angka(ada)} soal belum dikerjakan${pilihan.salah ? ' atau pernah salah' : ''}`
      : daun.some((t) => pilihan.topik.has(t.kode) && t.jumlah)
        ? 'Semua soal di pilihan ini sudah kamu kerjakan. Pilih topik atau tingkat lain' + (pilihan.salah ? '.' : ', atau centang "Ulangi juga soal yang pernah salah".')
        : 'Belum ada soal yang cocok dengan pilihan ini.';
    A.taruh('pilihan-latihan', { subtes: pilihan.subtes, topik: [...pilihan.topik], tingkat: pilihan.tingkat, jumlah: pilihan.jumlah, salah: pilihan.salah });
    gambarStatistik();
  }

  $('pilih-semua').addEventListener('click', () => {
    daunAda().forEach((t) => pilihan.topik.add(t.kode));
    gambarPilih();
  });
  $('jumlah-bebas').addEventListener('input', (e) => {
    const n = Math.floor(Number(e.target.value));
    if (n >= 1) { pilihan.jumlah = n; gambarPilih(); }
  });
  $('jumlah-bebas').addEventListener('blur', (e) => { e.target.value = pilihan.jumlah; });
  $('pilih-salah').addEventListener('change', (e) => { pilihan.salah = e.target.checked; gambarPilih(); });

  function gambarStatistik() {
    const r = A.ambil('jawaban', {});
    const semua = Object.values(r);
    const dijawab = semua.reduce((n, x) => n + x.b + x.s, 0), benar = semua.reduce((n, x) => n + x.b, 0);
    $('st-dijawab').textContent = A.angka(dijawab);
    $('st-akurasi').textContent = dijawab ? Math.round((benar / dijawab) * 100) + '%' : '–';
    $('st-unik').textContent = A.angka(semua.length);
    const daftar = $('st-topik');
    daftar.textContent = '';
    const baris = daunAda().map((t) => {
      const milik = semua.filter((x) => x.k === t.kode);
      const b = milik.reduce((n, x) => n + x.b, 0), s = milik.reduce((n, x) => n + x.s, 0);
      return { t, b, n: b + s };
    }).filter((x) => x.n).sort((a, b) => a.b / a.n - b.b / b.n);
    if (!baris.length) {
      daftar.append(A.el('li', { class: 'kosong', style: 'display:block', teks: 'Belum ada riwayat. Kemajuan per topik muncul setelah latihan pertama.' }));
      return;
    }
    baris.forEach(({ t, b, n }) => daftar.append(A.el('li', null,
      A.el('span', { teks: t.nama }), A.el('b', { teks: Math.round((b / n) * 100) + '%' }),
      A.meter(b / n, null, `${t.nama}: ${b} benar dari ${n}`))));
  }

  /* ---------------------------------------------------------------- sesi */
  function tampil(nama) {
    ['pilih', 'sesi', 'ringkas'].forEach((n) => { $(n).hidden = n !== nama; });
    window.scrollTo(0, 0);
  }

  function prioritas(s, r) {
    const x = r[s.i];
    if (!x) return 1;
    if (x.akhir === 0) return 3;
    return x.s > x.b ? 2 : 0;
  }

  async function mulai(daftar) {
    const tombol = $('mulai');
    try {
      let kumpulan = daftar;
      if (!kumpulan) {
        tombol.disabled = true;
        tombol.firstChild.textContent = 'Memuat soal… ';
        const semua = await A.muatSoal([...pilihan.topik]);
        const tingkat = TINGKAT[pilihan.tingkat], r = A.ambil('jawaban', {});
        const calon = A.acak(semua.filter((s) => tingkat.includes(s.v) && bolehMuncul(r[s.i])));
        // urut stabil: yang pernah salah didahulukan, baru yang belum pernah dikerjakan
        if (pilihan.salah) calon.sort((a, b) => prioritas(b, r) - prioritas(a, r));
        kumpulan = calon.slice(0, pilihan.jumlah);
      }
      if (!kumpulan.length) return;
      sesi = { soal: kumpulan, i: 0, jawab: [], waktu: [], mulai: Date.now() };
      tampil('sesi');
      gambarSoal();
      clearInterval(detak);
      detak = setInterval(() => { $('sesi-waktu').textContent = A.waktu((Date.now() - sesi.mulai) / 1000); }, 1000);
      A.mulaiPengingat();
    } catch (e) {
      $('pilih-info').textContent = 'Soal gagal dimuat (' + e.message + '). Buka situs lewat server lokal atau hosting, lalu coba lagi.';
    } finally {
      tombol.disabled = false;
      tombol.firstChild.textContent = 'Mulai latihan ';
    }
  }

  function gambarSoal() {
    const s = sesi.soal[sesi.i], n = sesi.soal.length, daun = A.simpul(s.k);
    $('kemajuan').style.transform = `scaleX(${sesi.i / n})`;
    $('sesi-hitung').textContent = `${sesi.i + 1}/${n}`;
    $('soal-label').textContent = `${A.SUBTES[A.subtesDari(s.k)].singkat} · ${daun ? daun.nama : ''} · tingkat ${s.v}`;
    A.isiSoal($('soal-teks'), s.q);
    const ol = $('opsi');
    ol.textContent = '';
    s.o.forEach((teks, j) => ol.append(A.el('li', null, A.el('button', { type: 'button', class: 'opsi', onclick: () => jawab(j) },
      A.el('span', { class: 'opsi-huruf', teks: A.HURUF[j] }), A.el('span', { class: 'opsi-teks', teks })))));
    $('bahas').hidden = true;
    $('cepat').hidden = true;
    $('tombol-cepat').hidden = !s.h;
    $('tombol-cepat').setAttribute('aria-expanded', 'false');
    $('lanjut').disabled = true;
    $('lanjut').firstChild.textContent = sesi.i + 1 < n ? 'Lanjut ' : 'Lihat hasil ';
    sesi.mulaiSoal = Date.now();
    const atas = $('sesi').getBoundingClientRect().top;
    if (atas < 0) $('sesi').scrollIntoView({ block: 'start' });
  }

  function jawab(p) {
    if (!sesi || sesi.jawab[sesi.i] != null) return;
    const s = sesi.soal[sesi.i], k = A.kunci(s), benar = A.benar(s, p), tkp = s.j === 'situasi';
    sesi.jawab[sesi.i] = p;
    sesi.waktu[sesi.i] = (Date.now() - sesi.mulaiSoal) / 1000;
    document.querySelectorAll('#opsi .opsi').forEach((b, j) => {
      b.disabled = true;
      if (tkp) b.dataset.nilai = s.s[j];  // TKP: tiap pilihan punya nilai 1-5, bukan benar/salah
      if (j === k) b.classList.add('benar');
      else if (j === p) b.classList.add(tkp ? 'terpilih' : 'salah');
    });
    A.catatJawaban(s, p);

    const hasil = $('bahas-hasil'), nilai = tkp ? s.s[p] : 0;
    hasil.className = 'bahas-hasil ' + (benar || nilai >= 4 ? 'benar' : tkp && nilai === 3 ? '' : 'salah');
    hasil.textContent = tkp ? (benar ? 'Pilihan terbaik. Nilai 5 dari 5.' : `Nilai pilihanmu ${nilai} dari 5. Pilihan terbaik: ${A.HURUF[k]}.`)
      : benar ? 'Benar.' : `Belum tepat. Jawabannya ${A.HURUF[k]}.`;
    const alasanmu = s.w && s.w[p];
    $('bahas-pilihanmu').hidden = !alasanmu || (benar && !tkp);
    if (alasanmu) $('bahas-pilihanmu').textContent = `Pilihanmu ${A.HURUF[p]}${tkp ? ' (nilai ' + nilai + ')' : ''}: ${alasanmu}`;
    A.isiBahas($('bahas-isi'), s.e);
    const lain = $('bahas-lain');
    lain.textContent = '';
    if (tkp) lain.append(...A.daftarNilai(s, p).children);
    else (s.w || []).forEach((w, j) => { if (j !== k && j !== p && w) lain.append(A.el('li', null, A.el('b', { teks: A.HURUF[j] }), A.el('span', { teks: w }))); });
    $('bahas-lain-judul').textContent = tkp ? 'Nilai pilihan lainnya' : 'Kenapa pilihan lain kurang tepat';
    $('bahas-lain').className = tkp ? 'daftar-nilai' : '';
    $('bahas-lain-wadah').hidden = !lain.children.length;
    $('bahas').hidden = false;
    $('cepat').hidden = true;  // versi lengkap cara cepat ada di dalam pembahasan
    $('tombol-cepat').hidden = true;
    $('lanjut').disabled = false;
    $('lanjut').focus({ preventScroll: true });
  }

  function lanjut() {
    if (!sesi || sesi.jawab[sesi.i] == null) return;
    if (sesi.i + 1 < sesi.soal.length) { sesi.i++; gambarSoal(); } else selesai();
  }

  function pesan(persen, rata) {
    const isi = persen >= 90 ? 'Mantap. Pertahankan ritmenya, lalu naikkan tingkat kesulitan.'
      : persen >= 70 ? 'Bagus. Ulangi soal yang salah supaya polanya benar-benar menempel.'
        : persen >= 50 ? 'Sudah separuh jalan. Baca pembahasan soal yang salah pelan-pelan, lalu ulangi.'
          : 'Tidak apa-apa. Mulai dari tingkat dasar dan baca pembahasannya dulu.';
    return isi + (rata > 55 ? ` Rata-ratamu ${Math.round(rata)} detik per soal; di SKD kira-kira 54 detik per soal.` : '');
  }

  function selesai() {
    clearInterval(detak);
    const n = sesi.soal.length, benar = sesi.soal.filter((s, i) => A.benar(s, sesi.jawab[i])).length;
    const persen = Math.round((benar / n) * 100), rata = sesi.waktu.reduce((a, b) => a + b, 0) / n;
    const tkp = sesi.soal.every((s) => s.j === 'situasi');
    if (tkp) {
      // TKP dinilai rata-rata 1-5; ambang 166 dari 45 soal setara rata-rata 3,7
      const nilai = sesi.soal.map((s, i) => s.s[sesi.jawab[i]]), r = nilai.reduce((a, b) => a + b, 0) / n;
      $('ringkas-skor').textContent = r.toFixed(1).replace('.', ',');
      $('ringkas-satuan').textContent = '/ 5 rata-rata';
      $('r-benar-label').textContent = 'pilihan terbaik';
      $('r-salah-label').textContent = 'nilai 1–2';
      $('r-benar').textContent = benar;
      $('r-salah').textContent = nilai.filter((x) => x <= 2).length;
      $('ringkas-pesan').textContent = (r >= 4.5 ? 'Pilihanmu konsisten mendekati yang terbaik.'
        : r >= 3.7 ? 'Sudah di atas rata-rata ambang TKP (setara 3,7 per soal). Perhatikan pilihan bernilai 4: biasanya sudah benar, tetapi belum tuntas.'
          : 'Masih di bawah rata-rata ambang TKP (setara 3,7 per soal). Pola nilai tertinggi: tindakan yang proaktif, sesuai aturan, dan tuntas.');
    } else {
      $('ringkas-skor').textContent = persen;
      $('ringkas-satuan').textContent = '% benar';
      $('r-benar-label').textContent = 'benar';
      $('r-salah-label').textContent = 'salah';
      $('r-benar').textContent = benar;
      $('r-salah').textContent = n - benar;
      $('ringkas-pesan').textContent = pesan(persen, rata);
    }
    $('r-waktu').textContent = Math.round(rata) + ' dtk';
    $('ulang-salah').hidden = benar === n;
    A.gambarTinjau($('ringkas-tinjau'), sesi.soal, sesi.jawab);
    const riwayat = A.ambil('latihan', []);
    riwayat.unshift({ t: Date.now(), n, persen, subtes: A.subtesDari(sesi.soal[0].k) });
    A.taruh('latihan', riwayat.slice(0, 50));
    tampil('ringkas');
  }

  function keluar() {
    const sudah = sesi ? sesi.jawab.filter((x) => x != null).length : 0;
    if (sudah && sudah < sesi.soal.length && !confirm('Keluar dari latihan? Jawaban yang sudah dikerjakan tetap tercatat.')) return;
    clearInterval(detak);
    sesi = null;
    tampil('pilih');
    gambarPilih();
  }

  $('mulai').addEventListener('click', () => mulai());
  $('lanjut').addEventListener('click', lanjut);
  $('keluar').addEventListener('click', keluar);
  function bukaCepat() {
    if (!sesi || sesi.jawab[sesi.i] != null || !sesi.soal[sesi.i].h) return;
    const buka = $('cepat').hidden;
    if (buka) A.isiCepat($('cepat-isi'), sesi.soal[sesi.i].h);
    $('cepat').hidden = !buka;
    $('tombol-cepat').setAttribute('aria-expanded', String(buka));
  }
  $('tombol-cepat').addEventListener('click', bukaCepat);
  $('ulang-salah').addEventListener('click', () => mulai(sesi.soal.filter((s, i) => !A.benar(s, sesi.jawab[i]))));
  $('baru').addEventListener('click', keluar);

  document.addEventListener('keydown', (e) => {
    if ($('sesi').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const huruf = 'abcde'.indexOf(e.key.toLowerCase()), angka = '12345'.indexOf(e.key);
    const p = huruf >= 0 ? huruf : angka;
    if (p >= 0 && sesi && p < sesi.soal[sesi.i].o.length) { e.preventDefault(); jawab(p); return; }
    if (e.key.toLowerCase() === 'h') { e.preventDefault(); bukaCepat(); return; }
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SUMMARY') { e.preventDefault(); lanjut(); }
  });

  // Catatan lama belum menyimpan tingkat soal; lengkapi sekali supaya hitungan soal tersisa per tingkat tepat.
  async function lengkapiTingkat() {
    const kurang = [...new Set(Object.values(R).filter((x) => x.v == null).map((x) => x.k))].filter(A.simpul);
    if (!kurang.length) return;
    const semua = await A.muatSoal(kurang), r = A.ambil('jawaban', {});
    semua.forEach((s) => { if (r[s.i] && r[s.i].v == null) r[s.i].v = s.v; });
    Object.values(r).forEach((x) => { if (x.v == null && kurang.includes(x.k)) x.v = 0; });  // soalnya sudah dihapus dari bank
    A.taruh('jawaban', r);
    if (!sesi) gambarPilih();
  }

  gambarPilih();
  lengkapiTingkat().catch(() => { /* tanpa server lokal: hitungan tetap jalan, hanya kurang tepat */ });
})();
