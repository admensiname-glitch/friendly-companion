import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Capacitor, SystemBars, SystemBarType } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não pôde ser carregada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#101010" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Ensina-me — Aprendizagem com clareza" },
      { name: "description", content: "Estude, pratique, revise e acompanhe seu aprendizado em um só lugar." },
      { name: "author", content: "Ensina-me" },
      { property: "og:title", content: "Ensina-me — Aprendizagem com clareza" },
      { property: "og:description", content: "Estude, pratique, revise e acompanhe seu aprendizado em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-title", content: "Ensina-me" },
      
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/ensina-me-icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/ensina-me-icon.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Hide each native system bar explicitly. Some Android builds can leave the
  // bottom navigation bar visible when only the generic hide request is used.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const hideNativeSystemBars = async () => {
      try {
        await Promise.all([
          SystemBars.hide({ bar: SystemBarType.StatusBar, animation: "NONE" }),
          SystemBars.hide({ bar: SystemBarType.NavigationBar, animation: "NONE" }),
        ]);
      } catch {
        // The web experience must remain usable if the native API is unavailable.
      }
    };

    void hideNativeSystemBars();
    const handleVisibilityChange = () => {
      if (active && document.visibilityState === "visible") {
        void hideNativeSystemBars();
      }
    };
    window.addEventListener("focus", hideNativeSystemBars);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("focus", hideNativeSystemBars);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installation must never block the learning experience.
    });
  }, []);

  // Register native Android FCM notifications only inside the installed app.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    let active = true;
    const listeners = [
      PushNotifications.addListener("registration", async (token) => {
        if (!active || !token.value) return;
        const { error } = await supabase.functions.invoke("push-notifications", {
          body: { action: "native-register", token: token.value },
        });
        if (error) console.warn("Ensina-me: não foi possível registrar o token FCM.", error.message);
      }),
      PushNotifications.addListener("registrationError", (error) => {
        console.warn("Ensina-me: registro FCM falhou.", error);
      }),
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.info("Ensina-me: notificação recebida.", notification.title);
      }),
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const target = action.notification.data?.url;
        if (typeof target === "string" && target.startsWith("/")) window.location.assign(target);
      }),
    ];
    void (async () => {
      try {
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive !== "granted") permission = await PushNotifications.requestPermissions();
        if (active && permission.receive === "granted") await PushNotifications.register();
      } catch (error) {
        console.warn("Ensina-me: notificações nativas indisponíveis.", error);
      }
    })();
    return () => {
      active = false;
      void Promise.all(listeners.map((listener) => listener.then((handle) => handle.remove())));
    };
  }, []);

  // Keep TanStack Router in sync with Supabase auth state.
  // Without this, the router caches the initial (null) session and
  // protected route guards never re-check after login.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        router.invalidate();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
