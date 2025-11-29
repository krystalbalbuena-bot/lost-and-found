/* Lost & Found - app.js
   Features: image upload (DataURL), dark mode (persisted), animations, localStorage persistence
*/

const STORAGE_KEY = 'lf_items_v2';
const THEME_KEY = 'lf_theme_v2';

const form = document.getElementById('itemForm');
const listEl = document.getElementById('list');
const searchInput = document.getElementById('search');
const filterType = document.getElementById('filterType');
const filterCategory = document.getElementById('filterCategory');
const sortCtrl = document.getElementById('sortCtrl');
const clearAll = document.getElementById('clearAll');
const darkToggle = document.getElementById('darkToggle');
const importSample = document.getElementById('importSample');
const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');

let items = load();
initTheme();
render();
populateCategories();

// ---------- Form & Image preview ----------
let currentImageData = '';
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file){ currentImageData = ''; previewShowNone(); return; }

  if(file.size > 3 * 1024 * 1024){
    alert('Image is larger than 3MB. Choose a smaller image for faster load/persistence.');
  }

  try {
    currentImageData = await readFileAsDataURL(file);
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = currentImageData;
    img.alt = 'Preview';
    img.style.maxHeight = '100%';
    preview.appendChild(img);
    preview.setAttribute('aria-hidden','false');
  } catch (err) {
    console.error(err);
    previewShowNone();
  }
});

function previewShowNone(){
  preview.innerHTML = 'No photo';
  preview.setAttribute('aria-hidden','true');
}

async function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error('Failed to read file'));
    fr.readAsDataURL(file);
  });
}

// ---------- Add item ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('type').value;
  const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value.trim() || 'Misc';
  const location = document.getElementById('location').value.trim() || 'Unknown';
  const description = document.getElementById('description').value.trim() || '';

  // if user selected a file but preview not set (rare), try to read again
  if (!currentImageData && imageInput.files[0]) {
    try { currentImageData = await readFileAsDataURL(imageInput.files[0]); } catch {}
  }

  const obj = {
    id: Date.now().toString(36),
    type, date, title, category, location, description,
    imageDataUrl: currentImageData || '',
    claimed:false, createdAt: Date.now()
  };

  items.unshift(obj);
  save(items);
  form.reset();
  currentImageData = '';
  previewShowNone();
  populateCategories();
  render();
  // small success animation: focus search to show activity
  searchInput.focus();
});

// ---------- Sample/import/clear ----------
importSample.addEventListener('click', () => {
  const now = Date.now();
  const samples = [
    {id: 's1', type:'lost', title:'Black Wallet', category:'Wallet', location:'Library', description:'Leather wallet with student ID', date:'2025-11-25', imageDataUrl:'', claimed:false, createdAt: now},
    {id: 's2', type:'found', title:'Blue Backpack', category:'Bag', location:'Gate 3', description:'Blue backpack with water bottle', date:'2025-11-27', imageDataUrl:'', claimed:false, createdAt: now - 100000},
  ];
  items = samples.concat(items);
  save(items);
  populateCategories();
  render();
});

clearAll.addEventListener('click', () => {
  if(!confirm('Clear all saved items? This cannot be undone.')) return;
  items = [];
  save(items);
  populateCategories();
  render();
});

// ---------- Search / filter / sort ----------
searchInput.addEventListener('input', render);
filterType.addEventListener('change', render);
filterCategory.addEventListener('change', render);
sortCtrl.addEventListener('change', render);

// ---------- Theme ----------
darkToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  darkToggle.setAttribute('aria-pressed', String(isLight));
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
});

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light'){ document.body.classList.add('light'); darkToggle.setAttribute('aria-pressed','true'); }
}

// ---------- Render ----------
function render(){
  const q = (searchInput.value || '').trim().toLowerCase();
  const ft = filterType.value;
  const fc = filterCategory.value;
  const sort = sortCtrl.value;

  let out = items.slice();
  if(ft !== 'all') out = out.filter(i => i.type === ft);
  if(fc !== 'all') out = out.filter(i => i.category === fc);
  if(q) out = out.filter(i => (
    (i.title||'').toLowerCase().includes(q) ||
    (i.category||'').toLowerCase().includes(q) ||
    (i.location||'').toLowerCase().includes(q) ||
    (i.description||'').toLowerCase().includes(q)
  ));
  out.sort((a,b) => sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);

  listEl.innerHTML = '';
  if(out.length === 0){
    const none = document.createElement('div');
    none.className = 'card muted';
    none.style.gridColumn = '1/-1';
    none.textContent = 'No items yet — add one from the form.';
    listEl.appendChild(none);
    return;
  }

  for(const it of out){
    const card = document.createElement('article');
    card.className = 'item fade-in';
    // image
    const imgWrap = document.createElement('div');
    imgWrap.className = 'img';
    if(it.imageDataUrl){
      const im = document.createElement('img');
      im.src = it.imageDataUrl;
      im.alt = it.title;
      imgWrap.appendChild(im);
    } else {
      imgWrap.innerHTML = `<div style="padding:12px;color:var(--muted)">No photo</div>`;
    }
    card.appendChild(imgWrap);

    // meta
    const meta = document.createElement('div');
    meta.className = 'meta';
    const h3 = document.createElement('h3');
    h3.innerText = it.title;
    if(it.claimed) h3.classList.add('claimed');
    meta.appendChild(h3);

    const tags = document.createElement('div');
    tags.innerHTML = `<span class="tag">${escapeHtml(it.type.toUpperCase())}</span><span class="muted">${escapeHtml(it.category)} • ${escapeHtml(it.location || 'Unknown')}</span>`;
    meta.appendChild(tags);

    const desc = document.createElement('p');
    desc.className = 'muted';
    desc.style.marginTop = '8px';
    desc.innerText = it.description || '';
    meta.appendChild(desc);

    const small = document.createElement('div');
    small.className = 'muted';
    small.style.marginTop = '8px';
    small.innerText = `Date: ${it.date || '—'} • Added: ${new Date(it.createdAt).toLocaleString()}`;
    meta.appendChild(small);

    const actions = document.createElement('div');
    actions.className = 'actions-row';

    const claimBtn = document.createElement('button');
    claimBtn.className = 'btn-ghost';
    claimBtn.innerText = it.claimed ? 'Unclaim' : 'Mark claimed';
    claimBtn.onclick = () => { it.claimed = !it.claimed; save(items); render(); };

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-ghost';
    delBtn.innerText = 'Delete';
    delBtn.onclick = () => {
      if(!confirm('Delete this item?')) return;
      items = items.filter(x => x.id !== it.id);
      save(items);
      populateCategories();
      render();
    };

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-ghost';
    copyBtn.innerText = 'Copy details';
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(`Item: ${it.title}\nType: ${it.type}\nCategory: ${it.category}\nLocation: ${it.location}\nDate: ${it.date}\nDescription: ${it.description}`);
        flash('Copied to clipboard');
      } catch {
        alert('Unable to copy — your browser may block clipboard access.');
      }
    };

    actions.appendChild(claimBtn);
    actions.appendChild(delBtn);
    actions.appendChild(copyBtn);
    meta.appendChild(actions);

    card.appendChild(meta);
    listEl.appendChild(card);
  }
}

// ---------- Helpers ----------
function save(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
function load(){ try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch(e){ return []; } }
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

function populateCategories(){
  const cats = Array.from(new Set(items.map(i=>i.category).filter(Boolean)));
  filterCategory.innerHTML = '<option value="all">All categories</option>' + cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

// tiny transient banner (non-blocking)
function flash(msg, timeout=1200){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.top = '20px';
  el.style.transform = 'translateX(-50%)';
  el.style.background = 'var(--accent)';
  el.style.color = '#03211a';
  el.style.padding = '8px 12px';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
  el.style.zIndex = 9999;
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity = '0', timeout - 200);
  setTimeout(()=> el.remove(), timeout);
}

// expose export helper
window.exportLF = () => JSON.stringify(items, null, 2);

// initial demo if empty
if(items.length === 0){
  importSample.click();
}
