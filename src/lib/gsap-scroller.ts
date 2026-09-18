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
 *  1. ref callback container baru terpanggil → setGsapScroller(el)
 *     → update module state + ScrollTrigger.defaults() + refresh().
 *  2. Mode lama unmount → ref callback null → container lama dicabut (jika
 *     masih mencatat dirinya).
 *  3. useGSAP section (useLayoutEffect) berjalan SETELAH ref commit →
 *     otomatis mewarisi scroller terbaru dari defaults.
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
