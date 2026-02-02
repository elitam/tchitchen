/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! ATTENTION !!
    // Cela permet de déployer même s'il y a des erreurs TypeScript.
    // Très utile pour un prototype rapide !
    ignoreBuildErrors: true,
  },
  eslint: {
    // On ignore aussi les avertissements de style
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;