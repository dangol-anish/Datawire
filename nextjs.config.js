/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.output.globalObject = "self";
    return config;
  },
};

module.exports = nextConfig;
