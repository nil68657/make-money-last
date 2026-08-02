/**
 * The deployed site is a static export served by GitHub Pages from
 * https://nil68657.github.io/make-money-last/ — a project page, so every URL
 * it serves sits under a /make-money-last prefix. That prefix must NOT be
 * applied to local builds or `next dev`, where the app is served from the
 * root, so it is gated behind GITHUB_PAGES which only the deploy workflow sets.
 */
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? "/make-money-last" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolates a second dev server from the .next cache of an already-running
  // one. Note this no longer isolates `next build`: with output "export" a
  // distDir other than .next is reinterpreted as the *export* directory and
  // build intermediates go to .next regardless. Leave it unset when building,
  // which puts the exported site in out/.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Emits a plain directory of HTML/CSS/JS into out/. Pages serves files, not
  // a Node process, so nothing here may depend on a server at request time.
  output: "export",

  basePath,
  assetPrefix: basePath,

  // The image optimizer is a server route, which a static export cannot carry.
  images: { unoptimized: true },
};

export default nextConfig;
