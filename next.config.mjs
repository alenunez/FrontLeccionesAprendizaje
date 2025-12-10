/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Build into a custom directory named `out` while keeping the
   * application behavior (dynamic routes, API routes, etc.) intact.
   */
  distDir: "out",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
