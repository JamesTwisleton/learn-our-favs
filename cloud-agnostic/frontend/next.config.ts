import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The frontend is a thin client of the Spring Boot API. In Kubernetes this is
  // a Service DNS name; locally it is the dev server.
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
