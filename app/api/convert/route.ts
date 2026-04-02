import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'nodejs'
export const maxDuration = 300

const SIZE = 1080 // Always square 1080×1080

function isCarousel(html: string) {
  return html.includes('class="track"') && (html.match(/class="slide"/g) || []).length > 1
}
function countSlides(html: string) {
  return (html.match(/class="slide"/g) || []).length
}

function prepareHtml(originalHtml: string, slideIndex: number | null): string {
  let html = originalHtml
    .replace(/<meta\s+name="viewport"[^>]*>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')

  const injection = `
<meta name="viewport" content="width=${SIZE}, initial-scale=1.0, user-scalable=no">
<style>
  *, *::before, *::after {
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale  !important;
    text-rendering: optimizeLegibility  !important;
  }
  html {
    width:  ${SIZE}px !important;
    height: ${SIZE}px !important;
    overflow: hidden !important;
  }
  body {
    width:      ${SIZE}px !important;
    height:     ${SIZE}px !important;
    min-height: ${SIZE}px !important;
    max-height: ${SIZE}px !important;
    overflow:   hidden !important;
    margin:     0 !important;
    padding:    0 !important;
    gap:        0 !important;
    display:    flex !important;
    align-items:     center !important;
    justify-content: center !important;
    background: #050508 !important;
  }
  .label, .hint, .nav-row, footer, .nav-btn, .dots, .slide-num {
    display: none !important;
  }
  .carousel-outer, #carouselOuter, .post-outer, #postOuter {
    width:         ${SIZE}px !important;
    height:        ${SIZE}px !important;
    min-width:     ${SIZE}px !important;
    min-height:    ${SIZE}px !important;
    max-width:     ${SIZE}px !important;
    max-height:    ${SIZE}px !important;
    overflow:      hidden    !important;
    border-radius: 0         !important;
    box-shadow:    none      !important;
    flex-shrink:   0         !important;
    transform:     none      !important;
    position:      relative  !important;
  }
  .carousel-canvas, #carouselCanvas, .post-canvas, #postCanvas {
    width:     ${SIZE}px !important;
    height:    ${SIZE}px !important;
    transform: none      !important;
    position:  relative  !important;
    top:  0 !important;
    left: 0 !important;
    overflow: hidden !important;
  }
  .track, #track {
    transition: none !important;
  }
</style>
<script>
  (function () {
    var _ael = window.addEventListener.bind(window);
    window.addEventListener = function (type, handler, opts) {
      if (type === 'resize') return;
      _ael(type, handler, opts);
    };
    window.scale       = function () {};
    window.scaleCanvas = function () {};

    document.addEventListener('DOMContentLoaded', function () {
      var track = document.getElementById('track') || document.querySelector('.track');
      if (track) {
        track.style.transition = 'none';
        track.style.transform  = 'translateX(-${slideIndex === null ? 0 : slideIndex * SIZE}px)';
      }
      ['carouselOuter','carouselCanvas','postOuter','postCanvas'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
          el.style.transform = 'none';
          el.style.width     = '${SIZE}px';
          el.style.height    = '${SIZE}px';
        }
      });
    });
  })();
<\/script>`

  if (html.includes('</head>')) {
    html = html.replace('</head>', injection + '</head>')
  } else {
    html = injection + html
  }

  return html
}

async function screenshotWithBrowserless(html: string): Promise<Buffer> {
  const token = process.env.BROWSERLESS_TOKEN
  if (!token) throw new Error('BROWSERLESS_TOKEN not set in environment variables.')

  const res = await fetch(`https://chrome.browserless.io/screenshot?token=${token}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      options: {
        type: 'png',
        clip: { x: 0, y: 0, width: SIZE, height: SIZE },
        omitBackground: false,
      },
      viewport: {
        width:             SIZE,
        height:            SIZE,
        deviceScaleFactor: 1,   // CRITICAL: must be 1, not 2
      },
      gotoOptions: {
        waitUntil: 'networkidle0',
        timeout:   30000,
      }
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Browserless ${res.status}: ${txt.slice(0, 400)}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('htmlFile') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const originalHtml = await file.text()
    const baseName     = file.name.replace(/\.html?$/i, '')
    const carousel     = isCarousel(originalHtml)
    const total        = carousel ? countSlides(originalHtml) : 1

    if (carousel) {
      const zip = new JSZip()
      for (let i = 0; i < total; i++) {
        const prepared = prepareHtml(originalHtml, i)
        const png      = await screenshotWithBrowserless(prepared)
        zip.file(`slide_${String(i + 1).padStart(2, '0')}.png`, png)
      }
      const zipBuf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
      return new NextResponse(zipBuf as any, {
        headers: {
          'Content-Type':        'application/zip',
          'Content-Disposition': `attachment; filename="${baseName}_slides.zip"`,
        },
      })
    } else {
      const prepared = prepareHtml(originalHtml, null)
      const png      = await screenshotWithBrowserless(prepared)
      return new NextResponse(new Uint8Array(png) as any, {
        headers: {
          'Content-Type':        'image/png',
          'Content-Disposition': `attachment; filename="${baseName}.png"`,
        },
      })
    }
  } catch (err: any) {
    console.error('[convert] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
