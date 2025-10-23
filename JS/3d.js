/* ========= ตั้งค่าพื้นฐาน ========= */
const canvas = document.getElementById('stage');
const container = canvas.parentElement;
const dbg = document.getElementById('dbg');

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f6f8);

const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 5000);
camera.position.set(2.6, 1.8, 3.2);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.3;
controls.maxDistance = 50;
controls.enablePan = true;   // ✅ เปิด pan

/* ========= ไฟและกริด ========= */
const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1); scene.add(hemi);
const dir  = new THREE.DirectionalLight(0xffffff, 1.2); dir.position.set(3,5,4); scene.add(dir);
const amb  = new THREE.AmbientLight(0xffffff, 0.35); scene.add(amb);

const grid = new THREE.GridHelper(10, 20, 0xdddddd, 0xeeeeee);
grid.material.opacity = 0.35; grid.material.transparent = true; scene.add(grid);
const axes = new THREE.AxesHelper(0.5); scene.add(axes);

/* ========= ปรับขนาด ========= */
function onResize(){
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  dbg.textContent = `W:${w} H:${h}\nPxRatio:${renderer.getPixelRatio()}`;
}
addEventListener('resize', onResize); onResize();

/* ========= Loop แสดงผล ========= */
(function tick(){
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
})();

/* ========= โหลด / ลบ / จัดมุม ========= */
let current = null;
function clearCurrent(){
  if(!current) return;
  current.traverse(o=>{
    if (o.geometry) o.geometry.dispose();
    if (o.material){
      if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose?.());
      else o.material.dispose?.();
    }
  });
  scene.remove(current);
  current = null;
}
function fitView(obj){
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  const fitDist = size * 0.65 / Math.tan((camera.fov * Math.PI / 180) / 2);
  const dirVec = new THREE.Vector3(1, 0.5, 1).normalize();
  camera.position.copy(center.clone().add(dirVec.multiplyScalar(fitDist)));
  camera.near = Math.max(0.01, size/1000);
  camera.far  = Math.max(1000, size*10);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

/* ========= โหลด GLTF / GLB ========= */
const gltfLoader  = new THREE.GLTFLoader();
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
gltfLoader.setDRACOLoader(dracoLoader);

function loadGLTF(url){
  dbg.textContent = 'กำลังโหลด...';
  gltfLoader.load(url, (gltf)=>{
    clearCurrent();
    current = gltf.scene || gltf.scenes[0];
    scene.add(current);
    fitView(current);

    // ✅ ปรับวัสดุให้สว่างถูกต้อง
    current.traverse(o=>{
      if (o.isMesh && o.material){
        const m = o.material;
        if (m.map) m.map.encoding = THREE.sRGBEncoding;
        if (m.emissiveMap) m.emissiveMap.encoding = THREE.sRGBEncoding;
        m.needsUpdate = true;
      }
    });

    dbg.textContent = `โหลดสำเร็จ: ${url.split('/').pop()}`;
  }, (ev)=>{
    if (ev.total) dbg.textContent = `โหลด: ${Math.round(ev.loaded/ev.total*100)}%`;
  }, (err)=>{
    console.error(err);
    dbg.textContent = '❌ โหลดไม่สำเร็จ';
    alert('โหลดโมเดลไม่สำเร็จ กรุณา export เป็น .glb แบบ Embed texture');
  });
}

/* ========= UI ========= */
document.getElementById('fit').addEventListener('click', ()=> current && fitView(current));
document.getElementById('file').addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  if(!/\.(glb|gltf)$/i.test(f.name)){
    alert('รองรับเฉพาะ .glb/.gltf'); return;
  }
  const url = URL.createObjectURL(f);
  loadGLTF(url);
});
document.getElementById('sample').addEventListener('click', ()=>{
  const demo = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
  loadGLTF(demo);
});

/* ========= ปรับแสงด้วยสไลด์ ========= */
const baseLight = { amb: 0.35, hemi: 1.1, dir: 1.2, exposure: 1.0 };
const lightSlider = document.getElementById('light');
function applyLightScale(scale){
  amb.intensity  = baseLight.amb  * scale;
  hemi.intensity = baseLight.hemi * scale;
  dir.intensity  = baseLight.dir  * scale;
  renderer.toneMappingExposure = baseLight.exposure * scale;
}
if (lightSlider){
  applyLightScale(lightSlider.value / 100);
  lightSlider.addEventListener('input', () => {
    applyLightScale(lightSlider.value / 100);
  });
}

/* ========= ระบบแชท ========= */
const chatLog  = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const msgInput = document.getElementById('msg');
const KEY = 'gyver_chat_log';

let history = [];
try{ history = JSON.parse(localStorage.getItem(KEY)) || []; }catch{ history = []; }
history.forEach(addMsg);

chatForm.addEventListener('submit', e=>{
  e.preventDefault();
  const text = msgInput.value.trim();
  if(!text) return;
  pushMsg({me:true, text});
  msgInput.value = '';
  setTimeout(()=> pushMsg({me:false, text:'รับทราบครับ/ค่ะ'}), 500);
});

function pushMsg(m){
  m.at = Date.now();
  history.push(m);
  localStorage.setItem(KEY, JSON.stringify(history));
  addMsg(m);
}
function addMsg({me,text,at}){
  const el = document.createElement('div');
  el.className = 'msg'+(me?' me':'');
  el.innerHTML = `${escapeHtml(text)}<span class="time">${new Date(at).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</span>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}
function escapeHtml(s){return s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

/* ========= Cube ตัวอย่าง ========= */
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.2,0.2,0.2),
  new THREE.MeshStandardMaterial({color:0xff6f59, roughness:.6, metalness:.1})
);
cube.position.set(-0.5, 0.12, 0);
scene.add(cube);
