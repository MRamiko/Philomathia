import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Philomathia" },
      { name: "description", content: "Sign in to your Philomathia film and book diary." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Sign in · Philomathia" },
      { property: "og:description", content: "A film and book diary with swipe discovery, made for Georgia." },
    ],
  }),
  beforeLoad: () => { throw redirect({ to: '/login', replace: true }); },
});
