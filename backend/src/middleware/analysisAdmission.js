import { config } from '../config/env.js';

// Process-local protection for the expensive AI path.  The rate limiter remains
// the cross-request quota; this guard prevents one account from consuming all
// image-processing and provider slots at once on a Render instance.
const activeByUser = new Map();
const completedByKey = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(email, key) {
  return key ? `${email}:${key}` : null;
}

export function getCompletedAnalysis(email, key) {
  const keyName = cacheKey(email, key);
  if (!keyName) return null;
  const entry = completedByKey.get(keyName);
  if (!entry || Date.now() - entry.createdAt > CACHE_TTL_MS) {
    completedByKey.delete(keyName);
    return null;
  }
  return entry.payload;
}

export function storeCompletedAnalysis(email, key, payload) {
  const keyName = cacheKey(email, key);
  if (!keyName) return;
  completedByKey.set(keyName, { createdAt: Date.now(), payload });
}

export function admitAnalysis(req, res, next) {
  const email = req.user?.email;
  if (!email) return next();

  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (idempotencyKey && (idempotencyKey.length > 128 || !/^[A-Za-z0-9._-]+$/.test(idempotencyKey))) {
    return res.status(400).json({ success: false, message: 'Invalid Idempotency-Key header.', data: null });
  }

  const keyName = cacheKey(email, idempotencyKey);
  if (keyName && getCompletedAnalysis(email, idempotencyKey)) {
    req.idempotencyKey = idempotencyKey;
    req.replayCompletedAnalysis = true;
    return next();
  }

  const active = activeByUser.get(email) || 0;
  if (active >= config.maxConcurrentAnalysesPerUser) {
    return res.status(429).json({
      success: false,
      message: 'An analysis is already running for this account. Please wait for it to finish.',
      data: null
    });
  }

  activeByUser.set(email, active + 1);
  req.idempotencyKey = idempotencyKey;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const remaining = (activeByUser.get(email) || 1) - 1;
    if (remaining > 0) activeByUser.set(email, remaining);
    else activeByUser.delete(email);
  };
  res.once('finish', release);
  res.once('close', release);
  next();
}
