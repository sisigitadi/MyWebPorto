/**
 * Jembatan GSAP ScrollTrigger ↔ scroller dinamis SigitOS.
 *
 * Masalah: semua section publik (hero, services, projects, products,
 * testimonials, articles, contact) memakai `gsap.from(..., { scrollTrigger: … })`
 * dengan scroller default = window. Setelah navigasi jadi dual-mode:
 *  - desktop: konten di-scroll di dalam window body (div overflow-y-auto)
 *  - mobile : konten di-scroll di container single-page (div overflow-y-auto)
 * Window TIDAK pernah scroll di keduanya → ScrollTrigger tidak pernah aktif,
 * kartu bisa tetap tersembunyi (opacity 0) karena animasi "play" tidak
 * pernah dipicu.
 *
 * Solusi: container scroll yang sedang aktif mendaftarkan dirinya di sini;
 * os-desktop-manager memasang `ScrollTrigger.defaults({ scroller })` global
 * sehingga SEMUA ScrollTrigger yang dibuat sesudahnya memakai scroller yang
 * benar tanpa mengubah satu baris pun di komponen section.
 *
 * Alur lengkap saat mode berganti:
 *  1. useInsertionEffect os-desktop-manager (fase mutation) →
 *     setGsapScroller(el) → ScrollTrigger.defaults({ scroller }) TERPASANG
 *     sebelum fase layout dimulai. Ref belum siap di fase mutation, jadi
 *     elemennya dicari lewat atribut [data-gsap-scroller].
 *  2. useGSAP section (useLayoutEffect, fase layout) menjalankan gsap.from
 *     → trigger baru membaca defaults → terikat ke container yang benar.
 *  3. ref callback container (fase layout, setelah anak-anak) →
 *     setGsapScroller(el) lagi (idempoten) + menjaga tracking untuk unmount.
 *  4. Mode lama unmount → ref callback null → container lama dicabut (jika
 *     masih mencatat dirinya).
 *
 * CATATAN: ref callback induk TIDAK boleh jadi satu-satunya titik registrasi.
 * React menjalankan layout effect ANAK sebelum INDUK, jadi bila hanya daftar
 * di ref, trigger section (anak) sudah dibuat lebih dulu dengan scroller
 * window — di produksi (tanpa double-invoke StrictMode) tidak pernah
 * diperbaiki dan kartu menetap di opacity 0.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

let activeScroller: HTMLElement | null = null;
let defaultsConfigured = false;

/** Daftarkan container scroll yang sedang aktif sebagai scroller GSAP. */
export function setGsapScroller(el: HTMLElement | null): void {
  if (typeof window === "undefined") return;

  if (el === null) {
    // Container lama unmount (pindah mode / pindah rute). PENTING: ref
    // detach dipanggil SEBELUM node dikeluarkan dari DOM, jadi cek
    // isConnected di sini selalu "true" dan tidak berguna. Tunda satu
    // tick: setelah commit selesai, bila elemen tercatat sudah lepas dari
    // dokumen, reset defaults ke window. Tanpa reset, ScrollTrigger di
    // halaman lain (katalog /proyek, /artikel) mewarisi scroller detached
    // (rect nol) → start "top 80%" salah hitung → kartu bisa tetap
    // tersembunyi (gsap.from menahan opacity 0).
    requestAnimationFrame(() => {
      if (activeScroller && !activeScroller.isConnected) {
        activeScroller = null;
        ScrollTrigger.defaults({ scroller: window });
        requestAnimationFrame(() => ScrollTrigger.refresh());
      }
    });
    return;
  }

  const changed = activeScroller !== el;
  activeScroller = el;

  if (!defaultsConfigured || changed) {
    // defaults() hanya mengubah trigger yang dibuat SETELAH pemanggilan ini;
    // trigger lama (milik mode sebelumnya) sudah hancur bersama unmount-nya.
    ScrollTrigger.defaults({ scroller: el });
    defaultsConfigured = true;
  }

  // Ukuran konten baru belum tentu terukur saat ref terpasang; beri satu
  // frame agar layout selesai lalu hitung ulang posisi trigger.
  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

/** Scroller aktif saat ini (untuk debugging / komponen lain bila perlu). */
export function getGsapScroller(): HTMLElement | null {
  return activeScroller;
}
