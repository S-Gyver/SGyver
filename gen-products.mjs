// gen-products.mjs  (ต้องมี Node 16+)
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = 'image/products';         // โฟลเดอร์ที่มี S001, S002, ...
const OUT  = 'products.json';          // ไฟล์ผลลัพธ์

function isImg(name){
  return /\.(jpe?g|png|webp|avif)$/i.test(name);
}

const entries = [];
const dirs = (await fs.readdir(ROOT, { withFileTypes: true }))
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort((a,b)=>a.localeCompare(b, undefined, { numeric:true }));

for (const dir of dirs){
  const full = path.join(ROOT, dir);
  const files = (await fs.readdir(full))
    .filter(isImg)
    .sort((a,b)=>a.localeCompare(b, undefined, { numeric:true }));

  const images = files.map(f => `${ROOT}/${dir}/${f}`.replace(/\\/g,'/'));

  // ลองอ่าน Data.txt เป็นรายละเอียด (ถ้ามี)
  let desc = '';
  try{
    desc = await fs.readFile(path.join(full, 'Data.txt'), 'utf8');
  }catch{}

  entries.push({
    id: dir,                          // เช่น "S001"
    name: `สินค้า ${dir}`,           // จะเปลี่ยนชื่อจริงทีหลังได้
    price: 0,                         // ใส่ราคา/โปรตามจริง
    salePrice: null,
    images,
    desc
  });
}

await fs.writeFile(OUT, JSON.stringify(entries, null, 2), 'utf8');
console.log(`✅ สร้าง ${OUT} แล้ว: ${entries.length} รายการ`);
