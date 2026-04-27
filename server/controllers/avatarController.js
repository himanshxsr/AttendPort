const mongoose = require('mongoose');
const User = require('../models/User');
const {
  getAvatarFetchUrlCandidates,
  isAllowedAvatarUrl,
  isTrustedImageResponseUrl,
  isProbablyHtmlBuffer,
  isLikelyImageBuffer,
  isImageContentTypeHeader,
} = require('../utils/avatarUrl');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const HEADER_SETS = [
  {
    'User-Agent': UA,
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    Referer: 'https://drive.google.com/',
  },
  {
    'User-Agent': UA,
    Accept: 'image/*,*/*;q=0.5',
    Referer: 'https://www.google.com/',
  },
  {
    'User-Agent': UA,
    Accept: 'image/*,*/*;q=0.5',
  },
];

const FETCH_TIMEOUT_MS = 12000;

/**
 * @desc    Stream a user's profile photo
 * @route   GET /api/avatar/relay/:id
 * @access  Public
 */
exports.relayUserAvatar = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).end();
  }
  let user;
  try {
    user = await User.findById(id).select('avatar isDeleted');
  } catch (e) {
    return res.status(400).end();
  }
  if (!user || user.isDeleted || !user.avatar) {
    return res.status(404).end();
  }
  if (!isAllowedAvatarUrl(user.avatar)) {
    return res.status(400).end();
  }

  const candidates = getAvatarFetchUrlCandidates(user.avatar);
  if (candidates.length === 0) {
    return res.status(400).end();
  }

  let outBuf;
  let outType = 'image/jpeg';

  outer: for (const target of candidates) {
    if (!isAllowedAvatarUrl(target)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    for (const headers of HEADER_SETS) {
      let response;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        // eslint-disable-next-line no-await-in-loop
        response = await fetch(target, {
          redirect: 'follow',
          headers,
          signal: controller.signal,
        });
        clearTimeout(t);
      } catch (e) {
        // try next header / candidate
        // eslint-disable-next-line no-continue
        continue;
      }
      if (!response || !response.ok) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (!isTrustedImageResponseUrl(response.url)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      let buffer;
      try {
        // eslint-disable-next-line no-await-in-loop
        buffer = Buffer.from(await response.arrayBuffer());
      } catch (e) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (buffer.length === 0) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (isProbablyHtmlBuffer(buffer)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const byMime = isImageContentTypeHeader(response);
      const byBytes = isLikelyImageBuffer(buffer);
      if (!byMime && !byBytes) {
        // e.g. wrong content-type but not a known image header
        // eslint-disable-next-line no-continue
        continue;
      }
      outBuf = buffer;
      const c = (response.headers.get('content-type') || '').toLowerCase();
      if (c.startsWith('image/')) {
        [outType] = c.split(';');
      } else {
        outType = 'image/jpeg';
      }
      break outer;
    }
  }

  if (!outBuf) {
    // Browser-side direct loads usually work; server fetches are often blocked by Google.
    if (process.env.AVATAR_RELAY_LOG === '1') {
      console.warn('[avatar/relay] no image bytes for user', id);
    }
    return res.status(502).end();
  }

  res.setHeader('Content-Type', outType);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(outBuf);
};
