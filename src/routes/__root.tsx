import { useLocale } from "@/lib/locale";
import { initializePwa } from "@/lib/pwa";
import { LocaleProvider } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";
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
import { AuthDraftProvider } from '@/components/auth-form';
import { ScreenMotion } from '@/components/motion';
import {checkThemeContrast} from '@/lib/contrast';
import { StartupAuthProvider } from '@/lib/startup-auth';
import { BootDiagnostics } from '@/components/startup-recovery';
import { initializeDiagnostics } from '@/lib/startup-diagnostics';

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
 const {t}=useLocale();return <div className="app"><h1 className="h1">{t('Page not found')}</h1><Link className="btn" to="/">{t('Go home')}</Link></div>;
}
function ErrorComponent({error}:ErrorComponentProps){
 const {t}=useLocale();useEffect(()=>{reportLovableError(error,{boundary:'root'});},[error]);return <div className="app"><h1 className="h1">{t('Something went wrong')}</h1><button className="btn" onClick={()=>window.location.reload()}>{t('Reload')}</button></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Philomathia" },
      { name: "description", content: "Film and book diary with swipe discovery, made for Georgia." },
      { name: "theme-color", content: "rgb(14, 20, 9)" },
      { property: "og:title", content: "Philomathia" },
      { property: "og:description", content: "Film and book diary with swipe discovery, made for Georgia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },

    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/icons/phi.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { t, lang: appLang } = useLocale();
  return (
    <html lang="en">
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
  const { t, lang: appLang } = useLocale();
  const { queryClient } = Route.useRouteContext();

  const router = useRouter();
  useEffect(() => { initializeDiagnostics(); initializePwa(); if(import.meta.env.DEV) checkThemeContrast(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <LocaleProvider><AuthDraftProvider><StartupAuthProvider><ScreenMotion><Outlet /></ScreenMotion><BootDiagnostics/></StartupAuthProvider></AuthDraftProvider></LocaleProvider>
    </QueryClientProvider>
  );
}
