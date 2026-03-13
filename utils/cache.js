// utils/cache.js
// Shared in-memory cache with TTL support.
// Drop-in replaceable with Redis by swapping get/set implementations.

const store = new Map();
const TTL = parseInt(process.env.CACHE_TTL_MS, 10) || 5 * 60 * 1000; // default 5 min

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data, ttl = TTL) {
  store.set(key, { data, ts: Date.now(), ttl });
}

function del(key) {
  store.delete(key);
}

function flush() {
  store.clear();
}

// Evict expired entries periodically to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.ts > (entry.ttl ?? TTL)) store.delete(key);
  }
}, 10 * 60 * 1000).unref();

module.exports = { get, set, del, flush };
