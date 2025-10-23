import { initToast, toast } from './ui/toast.js';
import { initAddToCart } from './cart/add-to-cart.js';
import { renderHotChips, wireSearchForm } from './search/hot-search.js';
import { initHeroSwiper } from './hero-swiper.js';
import { bumpView, topViewed } from './engage/view-tracker.js';

function getIdFromHref(href) {
  try { return new URL(href, location.href).searchParams.get('id') || null; }
  catch { return null; }
}

function trackCardClicks() {
  // จับทุกการ์ดที่ลิงก์ไปหน้า product
  document.querySelectorAll('.card[href*="product.html"]').forEach(a => {
    a.addEventListener('click', () => {
      const id = getIdFromHref(a.getAttribute('href'));
      if (id) bumpView(id, 1);
    });
  });
}

// ===== แนะนำสำหรับคุณ: แสดงเฉพาะสินค้าที่ดูบ่อย =====
function renderRecommendations({
  containerSel = '#productGrid',
  fallbackSel  = '.grid .card[href*="product.html"]', // แหล่งที่เราจะ "โคลน" การ์ดมาแสดง
  limit = 8
} = {}) {
  const wrap = document.querySelector(containerSel);
  if (!wrap) return;

  const topIds = topViewed(limit, 1); // นับตั้งแต่ดู >= 1 ครั้ง
  if (topIds.length === 0) {
    // ยังไม่มีประวัติการดู: ปล่อยให้โชว์ของเดิม (หรือจะซ่อนไว้ก็ได้)
    return;
  }

  // สร้าง index การ์ดต้นทาง ด้วย id จาก href
  const pool = Array.from(document.querySelectorAll(fallbackSel));
  const byId = new Map();
  pool.forEach(cardLink => {
    const id = getIdFromHref(cardLink.getAttribute('href'));
    if (!id) return;
    byId.set(id, cardLink);
  });

  // เอาท็อปไอดีที่เจอใน pool มาเรียงใหม่
  wrap.innerHTML = '';
  topIds.forEach(id => {
    const src = byId.get(id);
    if (!src) return;
    // โคลนการ์ดแบบลิงก์เป็นบทความให้โครงสร้างเหมือน #productGrid
    const cloned = document.createElement('article');
    cloned.className = 'card';
    // แปลง <a.card> -> โครงสร้าง article.card
    cloned.innerHTML = `
      <a class="thumb" href="${src.getAttribute('href')}">
        ${src.querySelector('.thumb')?.innerHTML || ''}
      </a>
      <div class="body">
        <h3 class="name">${src.querySelector('strong')?.textContent || 'สินค้า'}</h3>
        <div class="meta">${src.querySelector('.meta')?.textContent || ''}</div>
      </div>
      <button class="add" data-name="${src.querySelector('strong')?.textContent || 'สินค้า'}">หยิบลงตะกร้า</button>
    `;
    wrap.appendChild(cloned);
  });

  // รีไวร์ปุ่ม add ใหม่หลังโดมเปลี่ยน
  initAddToCart();
}

document.addEventListener('DOMContentLoaded', () => {
  initToast('#toast');
  initAddToCart();
  renderHotChips();
  wireSearchForm();
  document.addEventListener('hotsearch:submit', (e) => {
    toast(`ค้นหา: “${e.detail.q}”`);
    renderHotChips();
  });
  initHeroSwiper();

  trackCardClicks();
  renderRecommendations();
});
