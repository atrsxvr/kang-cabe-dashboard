import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Finding photos are downscaled in the browser first, but a file the
      // canvas cannot decode passes through untouched. The default 1 MB would
      // reject those outright.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
