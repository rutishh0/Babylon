import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 's3.nl-ams.scw.cloud' },
      { protocol: 'https', hostname: '*.scw.cloud' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'myanimelist.net' },
      { protocol: 'https', hostname: 'wp.youtube-anime.com' },
      { protocol: 'https', hostname: 'img.bunnyccdn.co' },
      { protocol: 'https', hostname: '*.allanime.day' },
      { protocol: 'https', hostname: 'allanime.day' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/anime/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  // typedRoutes: true, // disabled to allow dynamic route strings
};

export default nextConfig;
