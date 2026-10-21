"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing, Loader2, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/server/actions/push";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type State =
  | "checking"
  | "unconfigured"
  | "ios-install"
  | "unsupported"
  | "denied"
  | "off"
  | "on";

/** The VAPID key arrives base64url-encoded; the Push API wants bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Whether a subscription was made with this key. Replacing the server's keys
 * strands every phone subscribed before: the push services refuse whatever
 * the new key signs for it. A browser that does not say counts as a match.
 */
function madeWith(subscription: PushSubscription, publicKey: string): boolean {
  const key = subscription.options?.applicationServerKey;
  if (!key) return true;
  const given = new Uint8Array(key);
  const expected = keyBytes(publicKey);
  return (
    given.length === expected.length &&
    given.every((byte, i) => byte === expected[i])
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS presents itself as a Mac.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function supported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Switching notifications on for this phone.
 *
 * Per device, not per account: each member does it on their own phone. On
 * an iPhone, Apple only delivers web notifications to an app installed on
 * the home screen (iOS 16.4+), so until then this card explains how instead
 * of offering a button that cannot work.
 */
export function PushSettings() {
  const [state, setState] = useState<State>("checking");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let next: State;
      if (!PUBLIC_KEY) next = "unconfigured";
      else if (isIos() && !isStandalone()) next = "ios-install";
      else if (!supported()) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        let subscription = await registration.pushManager.getSubscription();
        if (subscription && !madeWith(subscription, PUBLIC_KEY)) {
          // Dropped, so the button below can start it over with the key the
          // server signs with now.
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
          subscription = null;
        }
        if (subscription) {
          // Re-filed under whoever is signed in now: on a shared phone the
          // notifications follow the person using it.
          await savePushSubscription(subscription.toJSON(), navigator.userAgent);
        }
        next = subscription ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })().catch((error) => {
      console.error("[push] checking", error);
      if (!cancelled) setState("unsupported");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = () => {
    startTransition(async () => {
      // Asked inside the tap: iOS refuses a permission prompt that is not.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        toast.error("Izin notifikasi belum diberikan.");
        return;
      }

      let subscription: PushSubscription;
      try {
        const registration = await navigator.serviceWorker.ready;
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(PUBLIC_KEY),
        });
      } catch (error) {
        // The browser's push service refusing. Only this part is caught: a
        // failure reaching our own server goes to the error page, which says
        // where it is, like everywhere else.
        console.error("[push] subscribe", error);
        toast.error("HP ini gagal mendaftar ke layanan notifikasi. Coba lagi sebentar lagi.");
        return;
      }

      const result = await savePushSubscription(subscription.toJSON(), navigator.userAgent);
      if (!result.ok) {
        await subscription.unsubscribe();
        toast.error(result.message);
        return;
      }
      setState("on");
      toast.success("Notifikasi aktif di HP ini.");
    });
  };

  const disable = () => {
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
      toast.success("Notifikasi dimatikan di HP ini.");
    });
  };

  const test = () => {
    startTransition(async () => {
      const result = await sendTestPush();
      if (result.ok) toast.success(result.message ?? "Terkirim.");
      else toast.error(result.message);
    });
  };

  return (
    <Card className="mb-8 py-4" id="notifikasi">
      <CardContent className="grid gap-3 px-4">
        <div className="flex items-center gap-2">
          {state === "on" ? (
            <BellRing className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <Bell className="text-muted-foreground size-4" aria-hidden />
          )}
          <h2 className="text-sm font-medium">Notifikasi di HP ini</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Pengingat tugas besok (sekitar pukul 18.00) dan setiap ada temuan baru
          dari anggota lain. Diaktifkan di HP masing-masing.
        </p>

        <Status state={state} />

        {state === "off" ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={enable} disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Bell className="size-4" aria-hidden />
              )}
              Aktifkan notifikasi
            </Button>
          </div>
        ) : null}
        {state === "on" ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={test} disabled={pending}>
              <Send className="size-4" aria-hidden />
              Kirim notifikasi uji
            </Button>
            <Button size="sm" variant="ghost" onClick={disable} disabled={pending}>
              <BellOff className="size-4" aria-hidden />
              Matikan
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Status({ state }: { state: State }) {
  switch (state) {
    case "checking":
      return <p className="text-muted-foreground text-xs">Memeriksa HP ini…</p>;
    case "on":
      return (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Aktif di HP ini.
        </p>
      );
    case "off":
      return null;
    case "unconfigured":
      return (
        <Note>
          Notifikasi belum disiapkan di server. Admin perlu memasang kunci
          notifikasi di pengaturan Vercel.
        </Note>
      );
    case "ios-install":
      return (
        <Note icon>
          Di iPhone, notifikasi hanya bisa setelah aplikasi dipasang ke layar
          utama: buka di <strong>Safari</strong> → tombol <strong>Bagikan</strong> →{" "}
          <strong>Tambahkan ke Layar Utama</strong>. Lalu buka Kang Cabe dari
          ikonnya dan kembali ke halaman ini. Butuh iOS 16.4 atau lebih baru.
        </Note>
      );
    case "unsupported":
      return (
        <Note>
          Browser ini tidak mendukung notifikasi. Di iPhone butuh iOS 16.4 atau
          lebih baru, dan Kang Cabe dibuka dari ikonnya di layar utama. Di
          Android, pakai Chrome.
        </Note>
      );
    case "denied":
      return (
        <Note>
          Notifikasi diblokir untuk aplikasi ini. Di iPhone: Pengaturan →
          Notifikasi → Kang Cabe. Di Chrome: ikon di kiri alamat → Notifikasi →
          Izinkan. Lalu muat ulang halaman ini.
        </Note>
      );
  }
}

function Note({ children, icon = false }: { children: React.ReactNode; icon?: boolean }) {
  return (
    <p className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
      {icon ? <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
      <span>{children}</span>
    </p>
  );
}
