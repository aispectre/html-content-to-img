/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
    responseLimit: '50mb',
  },
}

module.exports = nextConfig
