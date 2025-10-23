// ========= ดึง Element =========
const iframe = document.getElementById('embed');
const input  = document.getElementById('embedUrl');
const button = document.getElementById('loadEmbed');

// ========= โหลดโมเดลที่ป้อน =========
button.addEventListener('click', ()=>{
  let url = (input.value || '').trim();
  if(!url) return alert('กรุณาวาง URL ของโมเดลที่ต้องการฝัง');

  // ตรวจ auto แปลง Sketchfab
  try {
    const u = new URL(url);
    if (u.hostname.includes('sketchfab.com') && !u.pathname.includes('/embed')) {
      // ตัวอย่าง: https://sketchfab.com/3d-models/xxxxxx → embed
      const parts = u.pathname.split('/').filter(Boolean);
      const id = parts.pop();
      url = `https://sketchfab.com/models/${id}/embed`;
    }
    // ตรวจ auto แปลง 3D Warehouse
    if (u.hostname.includes('3dwarehouse.sketchup.com') && !url.includes('/embed.html')) {
      // ลิงก์ของ 3D Warehouse ใช้ mid=xxxx
      const mid = u.searchParams.get('mid');
      if(mid) url = `https://3dwarehouse.sketchup.com/embed.html?mid=${mid}&popupmenu=true&toolbar=true&nav=orbit`;
    }
  } catch(e) {
    console.warn('URL parsing error', e);
  }

  iframe.src = url;
});
