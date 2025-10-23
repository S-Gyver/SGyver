/* Toast (กล่องข้อความแจ้งเตือนชั่วคราว) */
const toastEl = document.getElementById('toast');
function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(window.__t);
    window.__t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* เพิ่มสินค้าลงตะกร้า (ตัวอย่างการทำงาน) */
document.querySelectorAll('.add').forEach(btn => {
    btn.addEventListener('click', () => {
        const name = btn.dataset.name || 'สินค้า';
        toast(`เพิ่ม “${name}” ลงตะกร้าแล้ว`);
        const cart = document.querySelector('.cart');
        const num = +(cart.dataset.count || 0) + 1;
        cart.dataset.count = num;
        cart.textContent = `ตะกร้า (${num})`;
    });
});

/* ตั้งค่า Swiper (สไลด์ภาพหน้าแรก) */
const heroSwiper = new Swiper('.hero-slider .swiper', {
    loop: true,
    autoplay: { delay: 3500, disableOnInteraction: false },
    pagination: { el: '.hero-slider .swiper-pagination', clickable: true },
    navigation: { nextEl: '.hero-slider .swiper-button-next', prevEl: '.hero-slider .swiper-button-prev' }
});

/* ===== การค้นหายอดนิยม (คำยอดฮิต + ประวัติการค้นหาของผู้ใช้) ===== */
const popularTerms = [
    "โคมไฟสแกนดิเนเวีย", "แจกันเซรามิก", "ชั้นวางไม้", "ปลอกหมอนลินิน",
    "ภาพโปสเตอร์วินเทจ", "พรมทอมือ", "โต๊ะกาแฟไม้โอ๊ค"
];
const STORAGE_KEY = 'gyver_search_counts';
function loadSearchCounts() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} } }
function saveSearchCounts(map) { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }
/* แสดงสูงสุด 5 คำ */
function getTopTerms(limit = 5) {
    const counts = loadSearchCounts();
    const dynamic = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    const merged = [...popularTerms, ...dynamic].filter((v, i, a) => a.indexOf(v) === i);
    return merged.slice(0, limit);
}

/* แสดงปุ่มคำค้นหายอดนิยม */
function renderHotChips() {
    const wrap = document.getElementById('hotChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    getTopTerms().forEach(term => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.textContent = term;
        btn.addEventListener('click', () => {
            const input = document.querySelector('.search input[type="search"]');
            if (input) { input.value = term; submitSearch(term); }
        });
        wrap.appendChild(btn);
    });
}

/* จัดการฟอร์มค้นหา */
const searchForm = document.querySelector('.search');
if (searchForm) {
    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        const input = searchForm.querySelector('input[type="search"]');
        const q = (input?.value || '').trim();
        if (!q) return;
        submitSearch(q);
    });
}

/* ฟังก์ชันส่งคำค้นหา */
function submitSearch(q) {
    const counts = loadSearchCounts();
    counts[q] = (counts[q] || 0) + 1;
    saveSearchCounts(counts);
    toast(`ค้นหา: “${q}”`);
    renderHotChips();
    // location.href = `/search?q=${encodeURIComponent(q)}`; // เปลี่ยนไปหน้าผลลัพธ์จริง
}

/* เรียกฟังก์ชันแสดงคำค้นหายอดนิยมเมื่อเริ่มต้น */
renderHotChips();
