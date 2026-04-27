/**
 * Parse Google Drive file id from common share / open / uc URL shapes.
 */
function extractGoogleDriveFileId(s) {
  if (!s || typeof s !== 'string') return null;
  const trimmed = s.trim();
  const fromPath = trimmed.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  if (fromPath) return fromPath[1];
  const m = trimmed.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m) {
    if (trimmed.includes('drive.google.com') || trimmed.includes('drive.usercontent.google.com')) {
      return m[1];
    }
  }
  return null;
}

/**
 * For server-side fetch, try several direct endpoints.
 */
function getAvatarFetchUrlCandidates(stored) {
  if (!stored || typeof stored !== 'string') return [];
  const storedVal = stored.trim();
  if (!storedVal) return [];
  const out = [];
  const push = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };

  const fileId = extractGoogleDriveFileId(storedVal);
  if (fileId) {
    push(`https://drive.google.com/thumbnail?sz=w512&id=${fileId}`);
    push(`https://drive.google.com/uc?export=view&id=${fileId}`);
    push(`https://drive.google.com/uc?export=download&id=${fileId}`);
    return out;
  }
  if (isAllowedAvatarUrl(storedVal)) {
    push(storedVal);
  }
  return out;
}

function toAvatarFetchUrl(stored) {
  const c = getAvatarFetchUrlCandidates(stored);
  return c[0] || null;
}

function isAllowedAvatarUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    if (h === 'drive.google.com') return true;
    if (h === 'drive.usercontent.google.com' || h.includes('googleusercontent.com')) {
      return true;
    }
    if (h === 'www.gstatic.com' || h.includes('gstatic.com')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * After redirects, response must be on a host Google uses for avatars/photos.
 * Broader than before — Drive redirects may land on ggpht, gstatic, or usercontent.
 */
function isTrustedImageResponseUrl(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h === 'drive.google.com' || h === 'drive.usercontent.google.com') return true;
    if (h.includes('googleusercontent.com')) return true;
    if (h.includes('gstatic.com') || h.includes('ggpht.com')) return true;
    if (h.endsWith('.google.com') && h.includes('usercontent')) return true;
    return false;
  } catch {
    return false;
  }
}

function isProbablyHtmlBuffer(buf) {
  if (buf.length < 4) return true;
  const start = buf.slice(0, 300).toString('utf8').trimStart().toLowerCase();
  if (start.startsWith('<svg') || start.includes('<svg')) return false;
  return start.startsWith('<!') || start.startsWith('<ht') || (start.startsWith('<?xml') && !start.includes('svg'));
}

function isLikelyImageBuffer(buf) {
  if (buf.length < 3) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    return true; // RIFF: webp, etc.
  }
  if (buf[0] === 0x3c) return false;
  return false;
}

function isImageContentTypeHeader(response) {
  const c = (response.headers.get('content-type') || '').toLowerCase();
  if (c.includes('text/html') || c.includes('text/plain')) {
    return false; // may still be a mislabeled image — validate with isLikelyImageBuffer
  }
  return c.startsWith('image/') || c === 'application/octet-stream' || c === '' || c.startsWith('binary/');
}

module.exports = {
  extractGoogleDriveFileId,
  getAvatarFetchUrlCandidates,
  toAvatarFetchUrl,
  isAllowedAvatarUrl,
  isTrustedImageResponseUrl,
  isProbablyHtmlBuffer,
  isLikelyImageBuffer,
  isImageContentTypeHeader,
};
