'use client'

import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [fileData, setFileData] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isCarousel, setIsCarousel] = useState(false)
  const [slideCount, setSlideCount] = useState(0)
  const [pct, setPct] = useState(0)
  const [label, setLabel] = useState('Converting...')
  const [logs, setLogs] = useState<{ msg: string; state: 'run' | 'done' | 'err' }[]>([])
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [showProgress, setShowProgress] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isHowPanelOpen, setIsHowPanelOpen] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadName, setDownloadName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (msg: string, state: 'run' | 'done' | 'err' = 'run') => {
    setLogs(prev => [...prev, { msg, state }])
  }

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.html?$/i)) {
      setError('Please upload an HTML file (.html or .htm)')
      return
    }
    setError('')
    setFileData(file)
    const baseName = file.name.replace(/\.html?$/i, '')
    setFileName(baseName)

    // Call preview API
    const fd = new FormData()
    fd.append('htmlFile', file)
    try {
      const res = await fetch('/api/preview', { method: 'POST', body: fd })
      const data = await res.json()
      setIsCarousel(data.carousel)
      setSlideCount(data.slides)
      setStep(2)
    } catch (err) {
      // Fallback: client-side detect
      const reader = new FileReader()
      reader.onload = e => {
        const html = e.target?.result as string
        const carousel = html.includes('class="track"') && (html.match(/class="slide"/g) || []).length > 1
        const slides = carousel ? (html.match(/class="slide"/g) || []).length : 1
        setIsCarousel(carousel)
        setSlideCount(slides)
        setStep(2)
      }
      reader.readAsText(file)
    }
  }

  const startConvert = async () => {
    if (!fileData) return
    setIsConverting(true)
    setShowResult(false)
    setShowProgress(true)
    setLogs([])
    setError('')
    setPct(5)
    setLabel('Uploading to server...')
    addLog('Sending file to server...', 'run')

    try {
      const fd = new FormData()
      fd.append('htmlFile', fileData)

      // Fake progress while server works
      let currentPct = 5
      const interval = setInterval(() => {
        if (currentPct < 88) {
          currentPct += isCarousel ? (75 / slideCount / 3) : 5
          const slide = Math.ceil((currentPct - 5) / (80 / (slideCount || 1)))
          const newLabel = isCarousel
            ? `Rendering slide ${Math.min(slide, slideCount)} of ${slideCount}...`
            : 'Chrome is rendering your design...'
          setPct(Math.min(currentPct, 88))
          setLabel(newLabel)
        }
      }, isCarousel ? 1800 : 600)

      const res = await fetch('/api/convert', { method: 'POST', body: fd })
      clearInterval(interval)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }))
        throw new Error(err.error || `Server returned ${res.status}`)
      }

      setPct(96)
      setLabel('Preparing download...')
      addLog('Conversion complete!', 'done')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const name = isCarousel ? `${fileName}_slides.zip` : `${fileName}.png`

      setDownloadUrl(url)
      setDownloadName(name)

      // Auto download
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setPct(100)
      setLabel('Done!')
      setStep(3)
      setTimeout(() => {
        setShowProgress(false)
        setShowResult(true)
        setIsConverting(false)
      }, 500)

    } catch (err: any) {
      setShowProgress(false)
      setIsConverting(false)
      setError(err.message)
    }
  }

  const resetAll = () => {
    setFileData(null)
    setFileName('')
    setIsCarousel(false)
    setSlideCount(0)
    setPct(0)
    setLabel('Converting...')
    setLogs([])
    setStep(1)
    setError('')
    setShowProgress(false)
    setShowResult(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="app-container">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg:#06060A; --surface:#0F0F18; --card:#14141F;
          --border:rgba(255,255,255,0.07); --accent:#00E5FF;
          --accent2:#FF6B35; --text:#F0F0FF; --muted:#777788;
          --success:#00FF88; --error:#FF4466;
        }
        .app-container { background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; min-height:100vh; display:flex; flex-direction:column; }
        header { padding:20px 40px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; background:var(--surface); flex-shrink:0; }
        .logo { font-family:'Syne',sans-serif; font-size:20px; font-weight:900; }
        .logo em { font-style:normal; color:var(--accent); }
        .logo span { color:var(--accent2); }
        .logo-sub { font-family:'Space Mono',monospace; font-size:10px; color:var(--muted); letter-spacing:2px; margin-top:3px; }
        .badge { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:2px; padding:7px 14px; border-radius:20px; background:rgba(0,229,255,0.08); color:var(--accent); border:1px solid rgba(0,229,255,0.2); text-transform:uppercase; }
        main { flex:1; max-width:820px; width:100%; margin:0 auto; padding:40px 24px 60px; display:flex; flex-direction:column; gap:24px; }
        .how-panel { display:none; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:22px 26px; flex-direction:column; gap:12px; }
        .how-panel.open { display:flex; }
        .how-step { display:flex; align-items:flex-start; gap:14px; font-size:14px; color:var(--muted); line-height:1.5; }
        .how-num { font-family:'Space Mono',monospace; font-size:11px; color:var(--accent); min-width:24px; padding-top:1px; flex-shrink:0; }
        .steps-row { display:flex; gap:0; background:var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .step-item { flex:1; padding:14px 16px; text-align:center; font-family:'Space Mono',monospace; font-size:10px; letter-spacing:1px; color:var(--muted); text-transform:uppercase; border-right:1px solid var(--border); transition:all .3s; }
        .step-item:last-child { border-right:none; }
        .step-item.active { color:var(--accent); background:rgba(0,229,255,0.06); }
        .step-item.done   { color:var(--success); background:rgba(0,255,136,0.04); }
        .step-num { display:block; font-size:18px; margin-bottom:4px; }
        .drop-zone { border:2px dashed rgba(255,255,255,0.1); border-radius:16px; padding:52px 40px; text-align:center; cursor:pointer; transition:all .25s; background:var(--card); }
        .drop-zone:hover,.drop-zone.drag-over { border-color:var(--accent); background:rgba(0,229,255,0.04); }
        .drop-zone.has-file { border-color:rgba(0,255,136,0.4); border-style:solid; }
        .drop-icon { font-size:48px; display:block; margin-bottom:14px; }
        .drop-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; margin-bottom:8px; }
        .drop-sub { font-size:13px; color:var(--muted); margin-bottom:22px; line-height:1.6; }
        .browse-btn { display:inline-block; padding:12px 28px; background:var(--accent); color:#000; border-radius:8px; font-family:'Syne',sans-serif; font-weight:700; font-size:14px; cursor:pointer; border:none; transition:all .2s; }
        .browse-btn:hover { background:#00c8e0; transform:translateY(-1px); }
        .file-bar { display:none; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px 20px; align-items:center; gap:14px; }
        .file-bar.show { display:flex; }
        .file-icon-box { width:42px; height:42px; background:rgba(0,229,255,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .file-meta { flex:1; min-width:0; }
        .file-name { font-family:'Space Mono',monospace; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .file-sub { font-size:12px; color:var(--muted); margin-top:3px; }
        .f-badge { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:1px; padding:4px 12px; border-radius:20px; text-transform:uppercase; flex-shrink:0; }
        .f-carousel { background:rgba(0,229,255,0.12); color:var(--accent); border:1px solid rgba(0,229,255,0.25); }
        .f-single { background:rgba(255,107,53,0.12); color:var(--accent2); border:1px solid rgba(255,107,53,0.25); }
        .f-reset { background:none; border:none; color:var(--muted); cursor:pointer; font-size:18px; padding:4px 8px; border-radius:6px; transition:all .2s; flex-shrink:0; }
        .f-reset:hover { color:var(--error); }
        .convert-btn { width:100%; padding:18px; background:linear-gradient(135deg,var(--accent),#00a8bf); color:#000; border:none; border-radius:12px; font-family:'Syne',sans-serif; font-size:17px; font-weight:900; cursor:pointer; transition:all .25s; display:none; }
        .convert-btn.show { display:block; }
        .convert-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 40px rgba(0,229,255,0.25); }
        .convert-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none !important; }
        .progress-section { display:none; flex-direction:column; gap:12px; }
        .progress-section.show { display:flex; }
        .prog-top { display:flex; justify-content:space-between; align-items:center; }
        .prog-label { font-family:'Space Mono',monospace; font-size:11px; color:var(--muted); letter-spacing:2px; text-transform:uppercase; }
        .prog-pct { font-family:'Space Mono',monospace; font-size:12px; color:var(--accent); font-weight:700; }
        .prog-track { height:6px; background:var(--surface); border-radius:10px; overflow:hidden; }
        .prog-fill { height:100%; background:linear-gradient(90deg,var(--accent),#00a8bf); border-radius:10px; width:0%; transition:width .4s ease; }
        .prog-log { font-family:'Space Mono',monospace; font-size:12px; color:var(--muted); background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 16px; max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:7px; }
        .log-line { display:flex; align-items:center; gap:8px; }
        .log-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .dot-run{background:var(--accent);} .dot-done{background:var(--success);} .dot-err{background:var(--error);}
        .result-card { display:none; background:var(--card); border:1px solid rgba(0,255,136,0.2); border-radius:14px; padding:32px; flex-direction:column; align-items:center; gap:16px; text-align:center; }
        .result-card.show { display:flex; }
        .res-icon { font-size:52px; }
        .res-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:900; color:var(--success); }
        .res-sub { font-size:14px; color:var(--muted); line-height:1.6; }
        .dl-btn { padding:14px 36px; background:linear-gradient(135deg,var(--success),#00cc77); color:#000; border:none; border-radius:10px; font-family:'Syne',sans-serif; font-size:15px; font-weight:900; cursor:pointer; text-decoration:none; transition:all .2s; display:inline-block; }
        .dl-btn:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(0,255,136,0.3); }
        .again-btn { background:none; border:1px solid var(--border); color:var(--muted); padding:10px 24px; border-radius:8px; cursor:pointer; font-size:14px; transition:all .2s; }
        .again-btn:hover { border-color:var(--accent); color:var(--accent); }
        .err-box { display:none; background:rgba(255,68,102,0.08); border:1px solid rgba(255,68,102,0.25); border-radius:10px; padding:16px 20px; font-size:13px; color:var(--error); font-family:'Space Mono',monospace; line-height:1.6; }
        .err-box.show { display:block; }
        footer { padding:16px 40px; border-top:1px solid var(--border); text-align:center; font-family:'Space Mono',monospace; font-size:10px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; flex-shrink:0; }
        @media(max-width:600px) {
          header { padding:16px 20px; }
          main { padding:24px 16px 40px; }
          .drop-zone { padding:36px 20px; }
          .steps-row { display:none; }
        }
      ` }} />

      <header>
        <div>
          <div className="logo"><em>HTML</em> → <span>Image</span></div>
          <div className="logo-sub">Instagram Content Converter</div>
        </div>
        <div className="badge">@ai_spectre</div>
      </header>

      <main>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => setIsHowPanelOpen(!isHowPanelOpen)} 
            style={{ 
              background: 'none', 
              border: '1px solid var(--border)', 
              color: 'var(--muted)', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontSize: '13px', 
              transition: 'all .2s' 
            }}
          >
            How to use ↓
          </button>
        </div>

        <div className={`how-panel ${isHowPanelOpen ? 'open' : ''}`}>
          <div className="how-step"><div className="how-num">01</div><div>Get an HTML carousel or single-design file from Claude (or any source).</div></div>
          <div className="how-step"><div className="how-num">02</div><div>Drop the file below — app auto-detects: carousel (multiple slides) or single image.</div></div>
          <div className="how-step"><div className="how-num">03</div><div>Click Convert. The server renders each slide at exactly 1080×1080px using a real Chrome browser.</div></div>
          <div className="how-step"><div className="how-num">04</div><div>Carousel → ZIP with slide_01.png, slide_02.png… &nbsp;|&nbsp; Single design → one PNG file.</div></div>
          <div className="how-step"><div className="how-num">05</div><div>Upload directly to Instagram. No screenshots, no cropping, no editing needed.</div></div>
        </div>

        <div className="steps-row">
          <div className={`step-item ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`} id="step1"><span className="step-num">📄</span>Upload</div>
          <div className={`step-item ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`} id="step2"><span className="step-num">⚙️</span>Convert</div>
          <div className={`step-item ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`} id="step3"><span className="step-num">⬇️</span>Download</div>
        </div>

        <div 
          className={`drop-zone ${fileData ? 'has-file' : ''}`} 
          id="dropZone"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'BUTTON') fileInputRef.current?.click(); }}
        >
          <span className="drop-icon">📄</span>
          <div className="drop-title">Drop your HTML file here</div>
          <div className="drop-sub">Carousel posts → ZIP of individual PNG slides<br />Single designs → One 1080×1080 PNG image</div>
          <button className="browse-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse File</button>
          <input type="file" id="fileInput" ref={fileInputRef} accept=".html,.htm" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>

        <div className={`file-bar ${fileData ? 'show' : ''}`} id="fileBar">
          <div className="file-icon-box">📄</div>
          <div className="file-meta">
            <div className="file-name" id="fName">{fileData?.name || '—'}</div>
            <div className="file-sub" id="fSub">
              {fileData ? (isCarousel ? `Carousel • ${slideCount} slides detected` : 'Single image design') : 'Analyzing...'}
            </div>
          </div>
          <div className={`f-badge ${isCarousel ? 'f-carousel' : 'f-single'}`} id="fBadge">
            {fileData ? (isCarousel ? `${slideCount} Slides` : 'Single') : '—'}
          </div>
          <button className="f-reset" onClick={resetAll}>✕</button>
        </div>

        <button 
          className={`convert-btn ${fileData && !showProgress && !showResult ? 'show' : ''}`} 
          id="convertBtn" 
          disabled={isConverting}
          onClick={startConvert}
        >
          {isCarousel ? `⚡ Convert All ${slideCount} Slides → ZIP` : '⚡ Convert to PNG'}
        </button>

        <div className={`progress-section ${showProgress ? 'show' : ''}`} id="progressSec">
          <div className="prog-top">
            <div className="prog-label" id="progLabel">{label}</div>
            <div className="prog-pct" id="progPct">{Math.round(pct)}%</div>
          </div>
          <div className="prog-track"><div className="prog-fill" id="progFill" style={{ width: `${pct}%` }}></div></div>
          <div className="prog-log" id="progLog" ref={logContainerRef}>
            {logs.map((l, i) => (
              <div key={i} className="log-line">
                <div className={`log-dot dot-${l.state}`}></div>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`err-box ${error ? 'show' : ''}`} id="errBox">⚠ {error}</div>

        <div className={`result-card ${showResult ? 'show' : ''}`} id="resultCard">
          <div className="res-icon">✅</div>
          <div className="res-title" id="resTitle">{isCarousel ? `${slideCount} Slides Ready!` : 'Image Ready!'}</div>
          <div className="res-sub" id="resSub">
            {isCarousel ? `ZIP contains ${slideCount} PNG files — upload to Instagram as carousel.` : 'PNG ready — upload directly to Instagram.'}
          </div>
          <a className="dl-btn" id="dlBtn" href={downloadUrl} download={downloadName}>⬇ Download</a>
          <button className="again-btn" onClick={resetAll}>Convert another file</button>
        </div>
      </main>

      <footer>@ai_spectre &nbsp;|&nbsp; Powered by real Chrome — pixel-perfect 1080×1080 output</footer>
    </div>
  )
}
