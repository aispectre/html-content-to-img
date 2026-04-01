import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min for large carousels

// ── Helpers ──────────────────────────────────────────────
function isCarousel(html: string) {
  return html.includes('class="track"') && (html.match(/class="slide"/g) || []).length > 1
}
function countSlides(html: string) {
  return (html.match(/class="slide"/g) || []).length
}

// ── Build HTML that renders ONE slide at 1080×1080 ───────
function buildSlideHtml(originalHtml: string, slideIndex: number | null): string {
  const script = `
  <script>
    (function() {
      function run() {
        // Hide nav
        document.querySelectorAll('.nav-row, .label, footer').forEach(el => el.style.display = 'none');

        // Fix body
        Object.assign(document.body.style, {
          margin: '0', padding: '0', gap: '0',
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', justifyContent: 'flex-start',
          background: '#06060A', overflow: 'hidden',
          width: '1080px', height: '1080px'
        });

        // Fix carousel containers
        var outer  = document.getElementById('carouselOuter')  || document.querySelector('.carousel-outer');
        var canvas = document.getElementById('carouselCanvas') || document.querySelector('.carousel-canvas');
        if (outer)  outer.style.cssText  = 'width:1080px;height:1080px;overflow:hidden;border-radius:0;box-shadow:none;position:relative;flex-shrink:0;';
        if (canvas) canvas.style.cssText = 'width:1080px;height:1080px;position:relative;transform:none;';

        // Go to slide instantly (no animation)
        ${slideIndex !== null ? `
        var track = document.getElementById('track') || document.querySelector('.track');
        if (track) {
          track.style.transition = 'none';
          track.style.transform  = 'translateX(-' + (${slideIndex} * 1080) + 'px)';
        }
        ` : ''}
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
      } else {
        run();
      }
    })();
  <\/script>`

  return originalHtml.replace('</body>', script + '</body>')
}

// ── Call Browserless to screenshot HTML ──────────────────
async function screenshotWithBrowserless(html: string): Promise<Buffer> {
  const token = process.env.BROWSERLESS_TOKEN
  if (!token) throw new Error('BROWSERLESS_TOKEN env variable not set. See setup guide.')

  const endpoint = `https://chrome.browserless.io/screenshot?token=${token}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      options: {
        type: 'png',
        clip: { x: 0, y: 0, width: 1080, height: 1080 },
        omitBackground: false,
      },
      viewport: { width: 1080, height: 1080, deviceScaleFactor: 1 },
      waitFor: 1200, // ms — wait for fonts/transitions
      gotoOptions: { waitUntil: 'networkidle2', timeout: 20000 },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Browserless error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ═══════════════════════════════════════════════════════════
//  POST handler
// ═══════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('htmlFile') as File
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const originalHtml = await file.text()
    const baseName     = file.name.replace(/\.html?$/i, '')
    const carousel     = isCarousel(originalHtml)
    const total        = carousel ? countSlides(originalHtml) : 1

    if (carousel) {
      // ── Build ZIP with all slides ──
      const zip = new JSZip()

      for (let i = 0; i < total; i++) {
        const slideHtml = buildSlideHtml(originalHtml, i)
        const pngBuf    = await screenshotWithBrowserless(slideHtml)
        zip.file(`slide_${String(i + 1).padStart(2, '0')}.png`, pngBuf)
      }

      const zipBuf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })

      return new NextResponse(zipBuf as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${baseName}_slides.zip"`,
        },
      })
    } else {
      // ── Single PNG ──
      const slideHtml = buildSlideHtml(originalHtml, null)
      const pngBuf    = await screenshotWithBrowserless(slideHtml)
      const pngUint8  = new Uint8Array(pngBuf)

      return new NextResponse(pngUint8 as any, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${baseName}.png"`,
        },
      })
    }
  } catch (err: any) {
    console.error('Convert error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
