import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';

export const verifyRouter = Router();

/**
 * GET /api/verify/:hash
 * Public JSON endpoint - returns minimal hash validity info.
 * No PII leak: only valid/invalid + capture timestamp.
 */
verifyRouter.get('/api/verify/:hash', async (req: Request, res: Response) => {
  try {
    const hash = String(req.params.hash).trim().toLowerCase();

    // Basic format check - SHA-256 hex is 64 chars
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      res.status(400).json({ valid: false, error: 'Invalid hash format' });
      return;
    }

    // Find the earliest capture of this hash (the original sighting)
    const capture = await prisma.capturedMessage.findFirst({
      where: { contentHash: hash },
      orderBy: { capturedAt: 'asc' },
      select: { capturedAt: true, hashAlgorithm: true },
    });

    if (!capture) {
      res.json({ valid: false });
      return;
    }

    res.json({
      valid: true,
      capturedAt: capture.capturedAt.toISOString(),
      hashAlgorithm: capture.hashAlgorithm,
    });
  } catch (err: any) {
    console.error('Verify endpoint error:', err);
    res.status(500).json({ valid: false, error: 'Verification check failed' });
  }
});

// ----------------------------------------------------------------------------
// Shared presentation (self-contained: no external fonts/scripts, no PII).
// ----------------------------------------------------------------------------

const leaf = `<svg viewBox="0 32 158 97" aria-hidden="true"><path fill="#52FF52" d="M95.7,34.74c-14.29,0-29.49,4.13-29.49,4.13-30.87,8.13-46.55,30.84-46.55,30.84C1.13,93.08,2.03,126.66,2.03,126.66h61.32c31.49-.46,48.6-11.18,48.6-11.18,24.67-12.46,35.06-34.05,35.06-34.05,8.72-13.71,11.01-46.69,11.01-46.69h-62.32ZM103.44,68.39c-8.12,12.13-20.86,20.29-38.23,24.48l-9.96,2.4c.43-.72.82-1.45,1.29-2.16,8.16-12.21,20.87-20.39,38.12-24.54l10.13-2.44c-.45.76-.85,1.53-1.35,2.27Z"/><path fill="#00C600" d="M56.54,93.01c8.16-12.2,20.87-20.38,38.12-24.54l9.81-2.36,53.24-31.37h-62.2c-14.27,0-29.42,4.12-29.42,4.12-30.81,8.12-46.45,30.78-46.45,30.78C1.14,92.96,2.04,126.47,2.04,126.47l53.27-31.39c.41-.69.78-1.39,1.23-2.06Z"/></svg>`;

const BRAND_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#050b07;--ink:#eafff0;--ink-soft:#a7c4b2;--mute:#6f8a7a;
    --green:#00c600;--green-bright:#52ff52;--green-deep:#0a2e16;--glow:rgba(82,255,82,.5);
    --warn:#ffb02e;--warn-glow:rgba(255,176,46,.4);
    --line:rgba(82,255,82,.12);--line-strong:rgba(82,255,82,.24);--card:#0a150d;
  }
  body{
    font-family:"Poppins",-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    background:var(--bg);color:var(--ink);min-height:100vh;font-weight:300;line-height:1.6;
    display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;
    -webkit-font-smoothing:antialiased;
  }
  body::before{
    content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
    background:
      radial-gradient(720px 520px at 50% -12%, rgba(0,198,0,.13), transparent 60%),
      radial-gradient(620px 620px at 92% 108%, rgba(0,198,0,.05), transparent 60%);
  }
  .wrap{position:relative;z-index:1;width:100%;max-width:460px}
  .brand{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:22px;font-weight:600;font-size:18px;letter-spacing:-.02em;color:var(--ink)}
  .brand svg{width:26px;height:auto;display:block;filter:drop-shadow(0 0 11px rgba(82,255,82,.45))}
  .card{
    background:var(--card);border:1px solid var(--line-strong);border-radius:22px;overflow:hidden;
    box-shadow:0 30px 80px -30px rgba(0,0,0,.85), 0 0 60px -22px rgba(0,198,0,.30);
  }
  .top{
    display:flex;align-items:center;gap:10px;padding:15px 22px;font-size:12.5px;letter-spacing:.03em;
    border-bottom:1px solid var(--line);background:linear-gradient(90deg, var(--green-deep), #06200d);
    color:var(--ink-soft);word-break:break-all;
  }
  .top .u{color:var(--mute)}
  .mid{padding:42px 32px}
  .emblem{width:88px;height:88px;border-radius:50%;margin:0 auto 24px;display:grid;place-items:center}
  .emblem svg{width:42px;height:42px;fill:none;stroke-width:2.4}
  .emblem.ok{
    border:2px solid var(--green-bright);
    background:radial-gradient(circle at 50% 38%, rgba(82,255,82,.20), transparent 72%);
    box-shadow:0 0 40px -6px var(--glow), inset 0 0 26px rgba(82,255,82,.12);
    animation:pulse 3s ease-in-out infinite;
  }
  .emblem.ok svg{stroke:var(--green-bright)}
  .emblem.no{
    border:2px solid var(--warn);
    background:radial-gradient(circle at 50% 38%, rgba(255,176,46,.16), transparent 72%);
    box-shadow:0 0 40px -8px var(--warn-glow), inset 0 0 26px rgba(255,176,46,.10);
  }
  .emblem.no svg{stroke:var(--warn)}
  @keyframes pulse{
    0%,100%{box-shadow:0 0 40px -6px var(--glow), inset 0 0 26px rgba(82,255,82,.12)}
    50%{box-shadow:0 0 56px -4px var(--glow), inset 0 0 32px rgba(82,255,82,.18)}
  }
  @media (prefers-reduced-motion:reduce){.emblem.ok{animation:none}}
  .status{text-align:center;font-size:23px;font-weight:600;letter-spacing:-.01em;color:var(--ink)}
  .sub{text-align:center;color:var(--ink-soft);font-size:14px;margin-top:11px;font-weight:300;line-height:1.65}
  .detail{
    margin-top:28px;padding-top:22px;border-top:1px dashed var(--line-strong);
    font-size:12px;color:var(--ink-soft);letter-spacing:.02em;
  }
  .detail .row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:6px 0}
  .detail .label{color:var(--mute);text-transform:uppercase;letter-spacing:.15em;font-size:9.5px;font-weight:500;flex:none}
  .detail .val{font-variant-numeric:tabular-nums;color:var(--ink);word-break:break-all;text-align:right}
  /* entry */
  .intro{padding:42px 32px 36px;text-align:center}
  .intro h1{font-size:22px;font-weight:600;letter-spacing:-.01em}
  .intro p{color:var(--ink-soft);font-size:14px;margin-top:11px;font-weight:300;line-height:1.65}
  .vform{margin-top:26px;display:flex;flex-direction:column;gap:14px}
  .vform input{
    width:100%;padding:15px 18px;border-radius:12px;
    background:rgba(255,255,255,.03);border:1px solid var(--line-strong);
    color:var(--ink);font-family:inherit;font-size:13.5px;letter-spacing:.04em;
    font-variant-numeric:tabular-nums;outline:none;transition:border-color .2s, box-shadow .2s;
  }
  .vform input::placeholder{color:var(--mute)}
  .vform input:focus{border-color:var(--green-bright);box-shadow:0 0 0 3px rgba(82,255,82,.15)}
  .vform button{
    width:100%;padding:15px 22px;border-radius:999px;border:1px solid rgba(82,255,82,.4);
    background:linear-gradient(180deg, var(--green-bright), var(--green));color:#03210b;
    font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;
    box-shadow:0 10px 30px -8px var(--glow);transition:transform .2s, box-shadow .2s;
  }
  .vform button:hover{transform:translateY(-2px);box-shadow:0 16px 40px -10px var(--glow)}
  .hint{font-size:11px;color:var(--mute);margin-top:2px}
  .footer{
    padding:20px 26px 24px;border-top:1px solid var(--line);background:rgba(82,255,82,.02);
    font-size:11.5px;color:var(--mute);line-height:1.7;font-weight:300;
  }
  .footer a{color:var(--green-bright);text-decoration:none}
  .footer a:hover{text-decoration:underline}
`;

const FOOTER = `Nootro provides cryptographic proof that quoted email content matches the original message at the time of capture. We don't reveal senders, recipients, or content, only whether a fingerprint is valid.<br><br><a href="https://nootro.ai">nootro.ai</a>`;

function renderEntryPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify a message — Nootro</title>
  <style>${BRAND_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">${leaf} Nootro</div>
    <div class="card">
      <div class="intro">
        <h1>Verify a sealed message</h1>
        <p>Paste the fingerprint from a Nootro-sealed email to confirm it's authentic and hasn't been altered since it was sent.</p>
        <form class="vform" action="/verify" method="get">
          <input name="hash" type="text" inputmode="latin" autocomplete="off" spellcheck="false"
                 placeholder="Paste SHA-256 fingerprint" aria-label="SHA-256 fingerprint" autofocus />
          <button type="submit">Verify</button>
          <div class="hint">A fingerprint is a 64-character code (0–9, a–f).</div>
        </form>
      </div>
      <div class="footer">${FOOTER}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * GET /  (verify host only)
 * Bare verify.nootro.ai -> the entry page. Other hosts (e.g. api.) fall through.
 */
verifyRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('verify.')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderEntryPage());
    return;
  }
  next();
});

/**
 * GET /verify
 * With ?hash=... -> redirect to the canonical result URL.
 * Without -> the entry page.
 */
verifyRouter.get('/verify', (req: Request, res: Response) => {
  const raw = req.query.hash;
  if (typeof raw === 'string' && raw.trim()) {
    const h = raw.trim().toLowerCase();
    res.redirect(302, `/verify/${encodeURIComponent(h)}`);
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderEntryPage());
});

/**
 * GET /verify/:hash
 * Public HTML result page - what recipients see when they click a verify link.
 */
verifyRouter.get('/verify/:hash', async (req: Request, res: Response) => {
  const hash = String(req.params.hash).trim().toLowerCase();
  const isValidFormat = /^[a-f0-9]{64}$/.test(hash);

  let valid = false;
  let capturedAt: Date | null = null;

  if (isValidFormat) {
    try {
      const capture = await prisma.capturedMessage.findFirst({
        where: { contentHash: hash },
        orderBy: { capturedAt: 'asc' },
        select: { capturedAt: true },
      });
      if (capture) {
        valid = true;
        capturedAt = capture.capturedAt;
      }
    } catch (err) {
      console.error('Verify HTML page error:', err);
    }
  }

  const shortHash = hash.length >= 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;
  const formattedDate = capturedAt
    ? capturedAt.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      })
    : null;

  const body = valid
    ? `
      <div class="emblem ok">
        <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h1 class="status">This message is verified</h1>
      <p class="sub">This fingerprint matches a message sealed by Nootro. The quoted content has not been altered since it was captured.</p>
      <div class="detail">
        <div class="row"><span class="label">Captured</span><span class="val">${formattedDate}</span></div>
        <div class="row"><span class="label">Fingerprint</span><span class="val">${shortHash}</span></div>
      </div>`
    : `
      <div class="emblem no">
        <svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 10v4" stroke-linecap="round"/><path d="M12 17.5v.01" stroke-linecap="round"/></svg>
      </div>
      <h1 class="status">Not verified</h1>
      <p class="sub">${
        isValidFormat
          ? `This fingerprint doesn't match any message sealed by Nootro. The content may have been altered, or it was never captured by us.`
          : `This doesn't look like a valid verification link. Check the link you clicked.`
      }</p>
      <div class="detail">
        <div class="row"><span class="label">Fingerprint checked</span><span class="val">${shortHash}</span></div>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${valid ? 'Verified' : 'Not verified'} — Nootro</title>
  <style>${BRAND_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">${leaf} Nootro</div>
    <div class="card">
      <div class="top"><span class="u">verify.nootro.ai/</span>${shortHash}</div>
      <div class="mid">${body}</div>
      <div class="footer">${FOOTER}</div>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});