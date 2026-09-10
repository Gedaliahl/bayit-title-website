/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Legacy Wix URLs. The old site included Pennsylvania pages that must not
  // resurface as live content — they redirect to the Florida equivalents.
  // Add the remaining legacy paths here as they are pulled from Wix analytics.
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/about-us', destination: '/about', permanent: true },
      { source: '/our-team', destination: '/team', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/services-1', destination: '/services', permanent: true },
      { source: '/testimonials', destination: '/reviews', permanent: true },
      { source: '/pennsylvania', destination: '/', permanent: true },
      { source: '/pa-closings', destination: '/', permanent: true },
      { source: '/pennsylvania-title-insurance', destination: '/', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
