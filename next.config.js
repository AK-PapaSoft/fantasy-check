/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', 'discord.js', 'telegraf'],
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      'zlib-sync': 'commonjs zlib-sync',
    });
    return config;
  },
}

module.exports = nextConfig