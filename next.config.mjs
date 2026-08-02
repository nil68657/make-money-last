/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows a build or a second dev server to use an isolated output directory,
  // so it does not clobber the .next cache of an already-running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
