/* =========================
 * Catalog — Gyver Home
 * ========================= */

(function () {
  "use strict";

  // ---------- Config ----------
  const PAGE_SIZE = 20;
  const PRODUCT_JSON_CANDIDATES = [
    "./products.json",
    "products.json",
    "./JSON/products.json",
    "JSON/products.json",
    "./data/products.json",
    "data/products.json",
  ];

  // ---------- DOM ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const els = {
    grid: $("#grid"),
    pager: $("#pager"),
    count: $("#count"),
    sort: $("#sort"),
    category: $("#category"),
    pmin: $("#pmin"),
    pmax: $("#pmax"),
    applyPrice: $("#applyPrice"),
    searchForm: $("#searchForm"),
    q: $("#q"),
  };

  // ---------- State ----------
  let allProducts = [];
  let filtered = [];
  let page = 1;

  // ---------- Utils ----------
  const thb = (n) => `฿ ${Number(n || 0).toLocaleString("th-TH")}`;

  function calcDiscount(price, sale) {
    if (sale == null || price == null) return 0;
    if (sale >= price) return 0;
    return Math.round((1 - sale / price) * 100);
  }

  function getCover(p) {
    return (p.images && p.images.length ? p.images[0] : "image/placeholder.jpg");
  }

  function parseQuery() {
    const u = new URL(location.href);
    return {
      q: (u.searchParams.get("q") || "").trim(),
      cat: u.searchParams.get("cat") || "",
      sort: u.searchParams.get("sort") || "popular",
      pmin: u.searchParams.get("pmin"),
      pmax: u.searchParams.get("pmax"),
      page: Number(u.searchParams.get("page") || 1),
    };
  }

  function updateURL(params) {
    const u = new URL(location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v === "" || v == null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    });
    history.replaceState(null, "", u.toString());
  }

  // ---------- Card ----------
  function createProductCard(p) {
    const cover = getCover(p);
    const price = Number(p.price ?? 0);
    const sale = p.salePrice != null ? Number(p.salePrice) : null;

    const finalPrice = sale != null ? sale : price;
    const hasDiscount = sale != null && sale < price;
    const discount = calcDiscount(price, sale);

    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <a class="thumb" href="product.html?id=${p.id}" aria-label="${p.name}">
        <img loading="lazy" src="${cover}" alt="${p.name}">
      </a>

      <a class="title" href="product.html?id=${p.id}">
        ${p.name}
      </a>

      <div class="meta">
        <span class="star">★</span>
        <span class="rate">${(p.rating ?? 4.9).toFixed(1)}</span>
        <span class="dot">·</span>
        <span class="sold">ขายแล้ว ${Number(p.sold ?? 0).toLocaleString("th-TH")}</span>
      </div>

      <div class="price-line">
        <span class="cur">${thb(finalPrice)}</span>
        ${hasDiscount ? `<span class="old">${thb(price)}</span>` : ""}
        ${hasDiscount ? `<span class="off">-${discount}%</span>` : ""}
      </div>
    `;
    return el;
  }

  // ---------- Render ----------
  function renderGrid(list, pageNum = 1) {
    const start = (pageNum - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = list.slice(start, end);

    els.grid.innerHTML = "";
    if (!slice.length) {
      els.grid.innerHTML = `<div class="empty">ไม่พบสินค้า</div>`;
      els.pager.innerHTML = "";
      els.count.textContent = 0;
      return;
    }

    const frag = document.createDocumentFragment();
    slice.forEach((p) => frag.appendChild(createProductCard(p)));
    els.grid.appendChild(frag);

    els.count.textContent = list.length;
    renderPager(list.length, pageNum);
  }

  function renderPager(total, pageNum) {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) {
      els.pager.innerHTML = "";
      return;
    }

    let html = `<button class="pg" data-goto="${Math.max(1, pageNum - 1)}" ${pageNum === 1 ? "disabled" : ""}>ก่อนหน้า</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button class="pg ${i === pageNum ? "active" : ""}" data-goto="${i}">${i}</button>`;
    }
    html += `<button class="pg" data-goto="${Math.min(pages, pageNum + 1)}" ${pageNum === pages ? "disabled" : ""}>ถัดไป</button>`;
    els.pager.innerHTML = html;

    els.pager.querySelectorAll(".pg").forEach((btn) => {
      btn.addEventListener("click", () => {
        const goto = Number(btn.dataset.goto);
        if (goto && goto !== page) {
          page = goto;
          updateURL({ page });
          renderGrid(filtered, page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }

  // ---------- Filter / Sort ----------
  function applyFilters() {
    const q = (els.q.value || "").trim().toLowerCase();
    const cat = els.category.value || "";
    const pmin = Number(els.pmin.value || "");
    const pmax = Number(els.pmax.value || "");

    let list = allProducts.slice();

    if (q) {
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q)
      );
    }

    if (cat) {
      list = list.filter((p) => (p.category || []).includes(cat));
    }

    if (!Number.isNaN(pmin)) {
      list = list.filter((p) => {
        const n = Number(p.salePrice ?? p.price ?? 0);
        return n >= pmin;
      });
    }
    if (!Number.isNaN(pmax) && pmax > 0) {
      list = list.filter((p) => {
        const n = Number(p.salePrice ?? p.price ?? 0);
        return n <= pmax;
      });
    }

    // sort
    switch (els.sort.value) {
      case "latest":
        list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        break;
      case "bestseller":
        list.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
      case "price-asc":
        list.sort(
          (a, b) =>
            Number(a.salePrice ?? a.price ?? 0) -
            Number(b.salePrice ?? b.price ?? 0)
        );
        break;
      case "price-desc":
        list.sort(
          (a, b) =>
            Number(b.salePrice ?? b.price ?? 0) -
            Number(a.salePrice ?? a.price ?? 0)
        );
        break;
      default:
        // popular (rating then sold)
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.sold || 0) - (a.sold || 0));
    }

    filtered = list;
    page = 1;
    updateURL({
      q,
      cat,
      sort: els.sort.value,
      pmin: els.pmin.value || "",
      pmax: els.pmax.value || "",
      page,
    });
    renderGrid(filtered, page);
  }

  // ---------- Data ----------
  async function tryFetch(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  async function loadProducts() {
    for (const url of PRODUCT_JSON_CANDIDATES) {
      const data = await tryFetch(url);
      if (data && Array.isArray(data)) {
        return data;
      }
    }
    throw new Error("ไม่พบไฟล์ products.json ในพาธที่รองรับ");
  }

  // ---------- Init ----------
  async function init() {
    // restore from URL
    const qs = parseQuery();
    if (qs.q) els.q.value = qs.q;
    if (qs.cat) els.category.value = qs.cat;
    if (qs.sort) els.sort.value = qs.sort;
    if (qs.pmin) els.pmin.value = qs.pmin;
    if (qs.pmax) els.pmax.value = qs.pmax;
    if (qs.page) page = qs.page;

    try {
      allProducts = await loadProducts();
    } catch (err) {
      console.error(err);
      els.grid.innerHTML = `<div class="empty">โหลดข้อมูลสินค้าไม่สำเร็จ<br><small>${String(err.message || err)}</small></div>`;
      return;
    }

    // initial render using current controls
    applyFilters();

    // events
    els.sort.addEventListener("change", applyFilters);
    els.category.addEventListener("change", applyFilters);
    els.applyPrice.addEventListener("click", applyFilters);
    els.searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      applyFilters();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
