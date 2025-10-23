// JS/product.js — เวอร์ชันที่ต่อพาธรูป variant ให้อัตโนมัติ

// ----------------------- helpers -----------------------
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const money = (v) => (v==null || isNaN(v)) ? '-' : new Intl.NumberFormat('th-TH').format(v);

function percentOff(price, sale) {
  if (!price || sale == null || sale >= price) return 0;
  return Math.round((1 - sale/price) * 100);
}

// ----------------------- endpoints -----------------------
const PRODUCTS_URL = new URL('./JSON/products.json', location.href);
const VARIANTS_URL = new URL('./JSON/variants.json', location.href);

// ----------------------- state -----------------------
let PRODUCT = null;          // product object จาก products.json
let VARIANTS_BY_ID = {};     // map จาก variants.json
let selectedIndex = 0;       // index ของตัวเลือกปัจจุบัน
let BASE_DIR = '';           // โฟลเดอร์รูปภาพของสินค้า (ดึงจาก images[0])

// ----------------------- read id -----------------------
const url = new URL(location.href);
const PID = (url.searchParams.get('id') || '').trim();

// ----------------------- boot -----------------------
(async function init() {
  const [pRes, vRes] = await Promise.all([
    fetch(PRODUCTS_URL, { cache: 'no-store' }),
    fetch(VARIANTS_URL, { cache: 'no-store' })
  ]);

  const allProducts = pRes.ok ? await pRes.json() : [];
  VARIANTS_BY_ID    = vRes.ok ? await vRes.json() : {};

  PRODUCT = allProducts.find(p => (p.id || '').toUpperCase() === PID.toUpperCase());
  if (!PRODUCT) {
    $('.title').textContent = 'ไม่พบสินค้า';
    return;
  }

  // set base dir จากรูปแรกของสินค้า
  BASE_DIR = getBaseDirFromProduct(PRODUCT);

  renderTitle(PRODUCT);
  renderGallery(PRODUCT);
  renderVariantChips(PID);
  updatePriceAndBadge();
})();

// ----------------------- renderers -----------------------
function renderTitle(p) {
  $('.title').textContent = p.name || p.id || '';
}

function renderGallery(p) {
  const mainImg = $('#mainImg');
  const thumbs  = $('#thumbs');

  const imgs = Array.isArray(p.images) && p.images.length ? p.images : ['image/placeholder.png'];
  mainImg.src = imgs[0] || 'image/placeholder.png';
  mainImg.alt = p.name || p.id || '';

  thumbs.innerHTML = imgs.map((src, i) => `
    <button class="thumb" data-i="${i}" aria-label="ภาพที่ ${i+1}">
      <img src="${src}" alt="">
    </button>
  `).join('');

  thumbs.addEventListener('click', (e) => {
    const btn = e.target.closest('button.thumb');
    if (!btn) return;
    const i = +btn.dataset.i || 0;
    mainImg.src = imgs[i] || imgs[0];
  });
}

function renderVariantChips(productId) {
  const box   = $('#variantBox');
  const wrap  = $('#variantOptions');
  const items = VARIANTS_BY_ID[productId] || [];

  if (!items.length) {
    box.style.display = 'none';
    return;
  }

  box.style.display = '';
  wrap.innerHTML = items.map((v, i) => `
    <button class="chip ${i===0 ? 'active' : ''}" data-idx="${i}">
      ${v.label}
    </button>
  `).join('');

  selectedIndex = 0;

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;

    $$('#variantOptions .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');

    selectedIndex = +btn.dataset.idx || 0;

    updatePriceAndBadge();
    previewForVariant(selectedIndex);
  });
}

function updatePriceAndBadge() {
  // base จาก product
  let price     = +PRODUCT.price || 0;
  let salePrice = (PRODUCT.salePrice != null) ? +PRODUCT.salePrice : null;

  // กลบด้วยราคาจาก variant ถ้ามี
  const variants = VARIANTS_BY_ID[PID] || [];
  if (variants.length) {
    const v = variants[selectedIndex] || variants[0];
    if (v) {
      if (typeof v.price === 'number')     price = +v.price;
      if (typeof v.salePrice === 'number') salePrice = +v.salePrice;
    }
  }

  const priceMain   = $('#priceMain');
  const priceStrike = $('#priceStrike');
  const badgeOff    = $('#badgeOff');

  if (salePrice != null && salePrice < price) {
    priceMain.textContent   = `฿${money(salePrice)}`;
    priceStrike.textContent = `฿${money(price)}`;
    priceStrike.style.display = '';
    const off = percentOff(price, salePrice);
    badgeOff.textContent = off ? `-${off}%` : '';
    badgeOff.style.display = off ? '' : 'none';
  } else {
    priceMain.textContent   = `฿${money(price)}`;
    priceStrike.textContent = '';
    priceStrike.style.display = 'none';
    badgeOff.textContent = '';
    badgeOff.style.display = 'none';
  }
}

function previewForVariant(i) {
  const variants = VARIANTS_BY_ID[PID] || [];
  const v = variants[i];
  const mainImg = $('#mainImg');

  // ถ้า variant มีรูป ให้ต่อพาธอัตโนมัติ
  if (v && v.image) {
    const src = resolveVariantImage(v.image);
    if (src) {
      mainImg.src = src;
      return;
    }
  }

  // ไม่งั้น fallback ตามลำดับภาพของสินค้า
  const imgs = Array.isArray(PRODUCT.images) ? PRODUCT.images : [];
  if (imgs.length) {
    const showIdx = (i < imgs.length) ? i : 0;
    mainImg.src = imgs[showIdx];
  }
}

// ----------------------- path helpers -----------------------
// คืนโฟลเดอร์ของภาพหลัก เช่น
// "image/products/S012 .../S012-06.jpg" => "image/products/S012 .../"
function getBaseDirFromProduct(p) {
  const first = (p.images && p.images[0]) || '';
  const slash = first.lastIndexOf('/');
  return (slash >= 0) ? first.slice(0, slash + 1) : '';
}

// แปลงค่า v.image ของ variant ให้เป็นพาธสมบูรณ์
// - ถ้าเริ่มด้วย "http" หรือ "image/" จะใช้ตามนั้น
// - ไม่งั้นจะต่อ BASE_DIR + filename
function resolveVariantImage(img) {
  if (!img) return '';
  const low = img.toLowerCase();
  if (low.startsWith('http') || low.startsWith('image/')) return img;
  if (BASE_DIR) return BASE_DIR + img;
  return img;
}
