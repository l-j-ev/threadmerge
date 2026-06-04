import { Router, Request, Response } from 'express';
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

/**
 * GET /verify/:hash
 * Public HTML page - what recipients see when they click a verify link.
 * Minimal styling, no PII, no external dependencies.
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${valid ? 'Verified' : 'Not Found'} — Nootro</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f7f8fa;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.06);
      padding: 40px;
      max-width: 480px;
      width: 100%;
    }
    .brand {
      font-size: 14px;
      font-weight: 600;
      color: #5b6cff;
      letter-spacing: 0.02em;
      margin-bottom: 24px;
    }
    .status {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .status.valid { color: #0a8a3a; }
    .status.invalid { color: #b34238; }
    .icon {
      font-size: 48px;
      line-height: 1;
      margin-bottom: 12px;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #4a4a4a;
      margin-bottom: 24px;
    }
    .detail {
      background: #f7f8fa;
      border-radius: 8px;
      padding: 16px;
      font-size: 13px;
      color: #4a4a4a;
      margin-top: 24px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }
    .detail-label {
      color: #888;
      font-weight: 500;
    }
    .detail-value {
      font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #888;
      line-height: 1.5;
    }
    .footer a { color: #5b6cff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">NOOTRO</div>
    ${
      valid
        ? `
      <div class="icon">🔒</div>
      <div class="status valid">Verified</div>
      <p class="message">
        This hash matches a message captured by Nootro. The quoted content
        has not been tampered with since capture.
      </p>
      <div class="detail">
        <div class="detail-row">
          <span class="detail-label">Captured</span>
          <span>${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Hash</span>
          <span class="detail-value">${shortHash}</span>
        </div>
      </div>
    `
        : `
      <div class="icon">⚠️</div>
      <div class="status invalid">Not found</div>
      <p class="message">
        ${
          isValidFormat
            ? `This hash doesn't match any message captured by Nootro. The content may have been altered, or it was never captured by us.`
            : `This doesn't look like a valid verification hash. Check the link you clicked.`
        }
      </p>
      <div class="detail">
        <div class="detail-row">
          <span class="detail-label">Hash checked</span>
          <span class="detail-value">${shortHash}</span>
        </div>
      </div>
    `
    }
    <div class="footer">
      Nootro provides cryptographic proof that quoted email content matches
      the original message at the time of capture. We don't share information
      about senders, recipients, or content — only that a hash is valid.
      <br><br>
      <a href="https://nootro.ai">nootro.ai</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
