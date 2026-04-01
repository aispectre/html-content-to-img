import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HTML → Image Converter | @ai_spectre',
  description: 'Convert HTML carousel posts to Instagram-ready PNG images',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
