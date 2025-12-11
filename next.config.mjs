/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // Generate extension-based pages (e.g., /proyectos/editar.html) instead of directory
  // indexes so Azure Static/App Service can serve deep links without needing a trailing
  // slash rewrite. This keeps the site fully static while ensuring URLs such as
  // /proyectos/editar?id=21 and /proyectos/vista?id=21 resolve correctly when entered
  // directly in the browser.
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
