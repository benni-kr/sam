import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest (served at /manifest.webmanifest).
 *
 * Makes SAM installable as a standalone web app on phones and desktops.
 * Launching the installed icon opens the planner home. The `shortcuts` entries
 * power the long-press quick actions on the installed home-screen icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAM",
    short_name: "SAM",
    description:
      "Collaborative semester planner for shared activities, inboxing ideas, and participation tracking.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "de",
    categories: ["productivity", "education"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      // PNG fallbacks for platforms/launchers that don't render SVG icons.
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Kalender",
        short_name: "Kalender",
        description: "Vollständigen Semesterkalender öffnen",
        url: "/",
        icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Diese Woche",
        short_name: "Woche",
        description: "Wochenplan öffnen",
        url: "/week",
        icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Termin-Liste",
        short_name: "Liste",
        description: "Anstehende Termine als Liste",
        url: "/list",
        icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
  };
}
