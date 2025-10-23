// เก็บ/อ่านจำนวนครั้งที่ดูจาก localStorage
const KEY = 'gyver_view_counts';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function save(map) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function bumpView(id, n = 1) {
  if (!id) return;
  const map = load();
  map[id] = (map[id] || 0) + n;
  save(map);
}

export function topViewed(limit = 8, minCount = 1) {
  const map = load();
  return Object.entries(map)
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
