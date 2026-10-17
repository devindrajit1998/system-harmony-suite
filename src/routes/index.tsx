import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Modulo — Modular SaaS admin platform" },
      { name: "description", content: "Demo of a multi-tenant, modular admin platform for gyms, clinics, salons, cafes and online sellers." },
      { property: "og:title", content: "Modulo — Modular SaaS admin platform" },
      { property: "og:description", content: "One codebase, many businesses: modules, bundles and per-tenant fields." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/super" });
  },
});
