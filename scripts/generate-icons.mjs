/**
 * Generates every icon asset SAM ships, from one source of truth.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs into public/icons/:
 *   icon.svg                  browser tab favicon — transparent, follows the theme
 *   icon-{192,512}.png        manifest purpose "any" — transparent
 *   maskable-512.png          manifest purpose "maskable" — MUST stay opaque
 *   apple-touch-icon.png      iOS home screen — MUST stay opaque
 *   badge-96.png              notification badge — monochrome on transparent
 *   shortcuts/*-96.png        manifest shortcut icons, from the tab-bar glyphs
 *
 * Backgrounds appear only where the platform forces them: Android composes its
 * own white tile behind a maskable icon that has alpha, and iOS composites a
 * transparent apple-touch-icon onto black.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

// Tab-bar glyphs, so the shortcuts match features/planner/components/planner-tabs.tsx.
import { __iconNode as calendarGlyph } from "../node_modules/lucide-react/dist/esm/icons/calendar.js";
import { __iconNode as clockGlyph } from "../node_modules/lucide-react/dist/esm/icons/clock-3.js";
import { __iconNode as listGlyph } from "../node_modules/lucide-react/dist/esm/icons/list.js";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const FONT = "system-ui, -apple-system, sans-serif";
const PLATE = "#0f172a"; // manifest theme_color / background_color

// Both palettes copied verbatim from app/icon.svg / components/ui/logo.tsx.
const light = {
  sBg: "#ede9fe",
  sStroke: "#c4b5fd",
  sText: "#4c1d95",
  aBg: "#d1fae5",
  aStroke: "#10b981",
  aIcon: "rgba(2, 44, 34, 0.2)",
  aText: "#022c22",
  mBg: "#fcf5d2",
  mStroke: "#fcd34d",
  mText: "#78350f",
};

const dark = {
  sBg: "#432C6A",
  sStroke: "rgba(167, 139, 250, 0.6)",
  sText: "#ede9fe",
  aBg: "#065f46",
  aStroke: "#34d399",
  aIcon: "rgba(209, 250, 229, 0.2)",
  aText: "#d1fae5",
  mBg: "#663C22",
  mStroke: "rgba(251, 191, 36, 0.6)",
  mText: "#fef3c7",
};

/**
 * The three brand blocks. Content bbox inside the 210x210 logo box is ~3..203,
 * i.e. 200x200 centred on (103,103).
 *
 * @param p palette, or null to emit CSS classes for a theme-reactive stylesheet
 */
const blocks = (p) => {
  const fill = (k) => (p ? ` fill="${p[k]}"` : "");
  const stroke = (k) => (p ? ` stroke="${p[k]}"` : "");
  const cls = (name) => (p ? "" : ` class="${name}"`);

  return `
  <!-- S Block (Top) -->
  <g transform="translate(55, 5)">
    <rect width="96" height="96" rx="20"${fill("sBg")}${stroke("sStroke")} stroke-width="4"${cls("s-bg")}/>
    <text x="48" y="75"${fill("sText")}${cls("s-text")}>S</text>
  </g>

  <!-- A Block (Bottom Left) -->
  <g transform="translate(5, 105)">
    <rect width="96" height="96" rx="20"${fill("aBg")}${stroke("aStroke")} stroke-width="4"${cls("a-bg")}/>
    <g fill="none"${stroke("aIcon")} stroke-width="4" stroke-linecap="round" stroke-linejoin="round"${cls("a-icon")}>
      <rect x="10" y="20" width="76" height="66" rx="6"/>
      <path d="M28 10v16M68 10v16"/>
      <path d="M10 40h76"/>
      <path d="M35 40v46M61 40v46"/>
      <path d="M10 60h76"/>
    </g>
    <text x="48" y="75"${fill("aText")}${cls("a-text")}>A</text>
  </g>

  <!-- M Block (Bottom Right) -->
  <g transform="translate(105, 105)">
    <rect width="96" height="96" rx="20"${fill("mBg")}${stroke("mStroke")} stroke-width="4"${cls("m-bg")}/>
    <text x="48" y="75"${fill("mText")}${cls("m-text")}>M</text>
  </g>`;
};

const rules = (p, indent) =>
  [
    `.s-bg { fill: ${p.sBg}; stroke: ${p.sStroke}; }`,
    `.s-text { fill: ${p.sText}; }`,
    `.a-bg { fill: ${p.aBg}; stroke: ${p.aStroke}; }`,
    `.a-icon { stroke: ${p.aIcon}; }`,
    `.a-text { fill: ${p.aText}; }`,
    `.m-bg { fill: ${p.mBg}; stroke: ${p.mStroke}; }`,
    `.m-text { fill: ${p.mText}; }`,
  ]
    .map((rule) => indent + rule)
    .join("\n");

/**
 * @param logoSize rendered width of the 200x200 logo content, in canvas px
 * @param palette  fixed palette, or null for a theme-reactive stylesheet
 * @param plate    true to fill the whole canvas with PLATE
 */
function buildLogoSvg({ size = 512, logoSize, palette, plate, comment }) {
  const style = palette
    ? ""
    : `  <style>
${rules(light, "    ")}

    @media (prefers-color-scheme: dark) {
${rules(dark, "      ")}
    }
  </style>
`;

  const bg = plate ? `  <rect width="${size}" height="${size}" fill="${PLATE}"/>\n` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="SAM">
  <!-- ${comment} -->
${style}${bg}  <g transform="translate(${size / 2},${size / 2}) scale(${logoSize / 200}) translate(-103,-103)"
     font-family="${FONT}" font-size="76" font-weight="800" text-anchor="middle">
${blocks(palette)}
  </g>
</svg>
`;
}

/**
 * The notification badge. Android keeps only the alpha channel and draws the
 * result as a status-bar silhouette, so this is the block *shapes* in solid
 * white with no letters — glyph detail disappears at 24dp.
 */
function buildBadgeSvg(size = 96) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="SAM">
  <!-- Monochrome silhouette on transparent: Android uses the alpha channel only. -->
  <g transform="translate(${size / 2},${size / 2}) scale(${(size * 0.82) / 200}) translate(-103,-103)" fill="#ffffff">
    <rect x="55" y="5" width="96" height="96" rx="20"/>
    <rect x="5" y="105" width="96" height="96" rx="20"/>
    <rect x="105" y="105" width="96" height="96" rx="20"/>
  </g>
</svg>
`;
}

/**
 * Renders one lucide icon node onto the plate, for a manifest shortcut.
 * Lucide glyphs are 24x24 stroke outlines drawn in currentColor.
 */
function buildShortcutSvg(iconNode, { size = 96, glyphSize = 52 } = {}) {
  const body = iconNode
    .map(([tag, attrs]) => {
      const props = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `      <${tag} ${props}/>`;
    })
    .join("\n");

  const offset = (size - glyphSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">
  <!-- Tab-bar glyph on the app plate; generated from lucide-react icon data. -->
  <rect width="${size}" height="${size}" fill="${PLATE}"/>
  <g transform="translate(${offset},${offset}) scale(${glyphSize / 24})">
    <g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
${body}
    </g>
  </g>
</svg>
`;
}

const png = (svg, size, file, opaque) => {
  let pipeline = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (opaque) pipeline = pipeline.flatten({ background: PLATE });
  return pipeline.png({ compressionLevel: 9 }).toFile(join(OUT, file));
};

// --- app icons ---------------------------------------------------------------

// Browser tab: no plate, follows the viewer's colour scheme so the blocks stay
// legible in a dark tab strip. Same behaviour as app/icon.svg.
const iconSvg = buildLogoSvg({
  logoSize: 470,
  palette: null,
  plate: false,
  comment: "Transparent; follows the viewer's colour scheme.",
});

// Raster "any" fallbacks: transparent too. A PNG cannot switch palettes, so it
// takes the dark one, which reads on the light surfaces these land on.
const iconPngSvg = buildLogoSvg({
  logoSize: 470,
  palette: dark,
  plate: false,
  comment: "Transparent raster source for the PNG fallbacks.",
});

// The one place a background is mandatory: without an opaque fill Android
// composes its own white tile. Logo stays inside the 80% safe-zone circle.
const maskableSvg = buildLogoSvg({
  logoSize: 300,
  palette: dark,
  plate: true,
  comment: "Full-bleed plate (required); logo inside the 80% safe zone.",
});

// iOS renders an opaque icon no matter what, so a plate is mandatory here too.
const appleSvg = buildLogoSvg({
  size: 180,
  logoSize: 140,
  palette: dark,
  plate: true,
  comment: "Full-bleed plate (required); iOS forces an opaque icon.",
});

writeFileSync(join(OUT, "icon.svg"), iconSvg);
mkdirSync(join(OUT, "shortcuts"), { recursive: true });

await Promise.all([
  png(iconPngSvg, 192, "icon-192.png", false),
  png(iconPngSvg, 512, "icon-512.png", false),
  png(maskableSvg, 512, "maskable-512.png", true),
  png(appleSvg, 180, "apple-touch-icon.png", true),
  png(buildBadgeSvg(), 96, "badge-96.png", false),
  png(buildShortcutSvg(calendarGlyph), 96, "shortcuts/calendar-96.png", true),
  png(buildShortcutSvg(clockGlyph), 96, "shortcuts/week-96.png", true),
  png(buildShortcutSvg(listGlyph), 96, "shortcuts/list-96.png", true),
]);

console.log("Icons written to public/icons/");
