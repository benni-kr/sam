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
    lang: "en",
    categories: ["productivity", "education"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      // The maskable icon is PNG-only on purpose. Chrome's Android launcher-icon
      // path cannot rasterise SVG, and an SVG entry advertising sizes "any"
      // outranks the PNG — Chrome then falls back to the "any" icon and composes
      // it onto a white tile.
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
    // Each shortcut carries the glyph its tab uses in the planner tab bar, so
    // the long-press menu reads the same as the in-app navigation. Generated
    // from the lucide icon data by scripts/generate-icons.mjs.
    shortcuts: [
      {
        name: "Calendar",
        short_name: "Calendar",
        description: "Open the full semester calendar",
        url: "/",
        icons: [
          {
            src: "/icons/shortcuts/calendar-96.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "This Week",
        short_name: "Week",
        description: "Open the weekly schedule",
        url: "/week",
        icons: [
          {
            src: "/icons/shortcuts/week-96.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Event List",
        short_name: "List",
        description: "Upcoming events as a list",
        url: "/list",
        icons: [
          {
            src: "/icons/shortcuts/list-96.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
