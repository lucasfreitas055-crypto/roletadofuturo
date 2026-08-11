import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo | Roleta do Futuro" },
      {
        name: "description",
        content: "Gestão da gincana: ranking, leads, indicações e relatórios da Mister Wiz.",
      },
      { property: "og:title", content: "Painel administrativo | Roleta do Futuro" },
      {
        property: "og:description",
        content: "Gestão da gincana: ranking, leads, indicações e relatórios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
