import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 's3.nl-ams.scw.cloud' },
      { protocol: 'https', hostname: '*.scw.cloud' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
    ],
  },
  // typedRoutes: true, // disabled to allow dynamic route strings
};

export default nextConfig;
