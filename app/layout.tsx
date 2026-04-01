import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HTML → Image Converter | @ai_spectre',
  description: 'Convert HTML carousel posts to Instagram-ready PNG images',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#06060A' }}>{children}</body>
    </html>
  )
}
