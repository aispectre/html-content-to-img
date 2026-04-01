import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

function isCarousel(html: string) {
  return html.includes('class="track"') && (html.match(/class="slide"/g) || []).length > 1
}

function countSlides(html: string) {
  return (html.match(/class="slide"/g) || []).length
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('htmlFile') as File
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const html = await file.text()
    const carousel = isCarousel(html)
    const slides = carousel ? countSlides(html) : 1

    return NextResponse.json({ carousel, slides, filename: file.name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
