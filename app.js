// Slide-out sidebar + inventory + deleted bin - app.js (DOMContentLoaded safe)
// ---------- SIDEBAR (Slide-out menu) ----------
function bindSidebar() {
  const menuBtn = document.getElementById("menuBtn");
  const closeMenu = document.getElementById("closeMenu");
  const sidebar = document.getElementById("sidebar");

  if (!menuBtn || !closeMenu || !sidebar) return;

  menuBtn.onclick = () => {
    sidebar.classList.add("open");
    sidebar.setAttribute("aria-hidden", "false");
  };

  closeMenu.onclick = () => {
    sidebar.classList.remove("open");
    sidebar.setAttribute("aria-hidden", "true");
  };

  // click outside to close
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("open")) {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    }
  });
}

(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {

    // Keys
    const STORAGE_KEY = 'lf_items_v2';
    const CLAIMED_KEY = 'lf_claimed_v2';
    const DELETED_KEY = 'lf_deleted_v1';
    const USER_KEY = 'lf_users_v1';
    const SESSION_KEY = 'lf_session_v1';
    const THEME_KEY = 'lf_theme_v2';

    // DOM refs
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');

    const form = document.getElementById('itemForm');
    const listEl = document.getElementById('list');
    const inventoryEl = document.getElementById('inventory');
    const deletedEl = document.getElementById('deleted');

    const searchInput = document.getElementById('search');
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const sortCtrl = document.getElementById('sortCtrl');

    const clearAll = document.getElementById('clearAll');
    const darkToggle = document.getElementById('darkToggle');
    const importSample = document.getElementById('importSample');
    const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');

    const inventoryCountEl = document.getElementById('inventoryCount');
    const authArea = document.getElementById('authArea');

    const exportAllCsvBtn = document.getElementById('exportAllCsv');
    const exportAllPdfBtn = document.getElementById('exportAllPdf');

    // state
    let items = load(STORAGE_KEY);
    let claimed = load(CLAIMED_KEY);
    let deleted = load(DELETED_KEY);
    let users = load(USER_KEY);
    let session = load(SESSION_KEY);
    let currentImage = '';

    // initial UI
    initTheme();
    bindSidebar();
    bindBasic();
    populateCategories();
    renderList();
    renderInventory();
    renderDeleted();
    renderAuth();

    // ---------- FULLSCREEN TOGGLE (top-right) ----------
    // Adds a small fullscreen toggle button at top-right corner.
    (function bindFullscreen(){
      const existing = document.getElementById('fullscreenToggle');
      if (existing) return;

      const btn = document.createElement('button');
      btn.id = 'fullscreenToggle';
      btn.setAttribute('aria-label','Toggle fullscreen');
      btn.title = 'Toggle fullscreen';
      // minimal inline styling so it appears at top-right without modifying CSS files
      btn.style.position = 'fixed';
      btn.style.top = '10px';
      btn.style.right = '10px';
      btn.style.zIndex = 10000;
      btn.style.padding = '6px 8px';
      btn.style.borderRadius = '6px';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.background = 'rgba(255,255,255,0.92)';
      btn.style.boxShadow = '0 1px 6px rgba(0,0,0,0.12)';
      btn.style.fontSize = '14px';
      btn.style.lineHeight = '1';
      btn.style.minWidth = '38px';
      btn.style.minHeight = '34px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.gap = '6px';

      const updateIcon = () => {
        const isFs = !!document.fullscreenElement;
        btn.textContent = isFs ? '⤢' : '⛶'; // different glyphs for state
      };

      async function enterFs(){
        try{
          if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
          else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
          else if (document.documentElement.msRequestFullscreen) document.documentElement.msRequestFullscreen();
        }catch(e){}
      }
      async function exitFs(){
        try{
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          else if (document.msExitFullscreen) document.msExitFullscreen();
        }catch(e){}
      }
      btn.addEventListener('click', async () => {
        if (!document.fullscreenElement) await enterFs();
        else await exitFs();
      });

      // update on change (user pressed ESC etc)
      document.addEventListener('fullscreenchange', updateIcon);
      document.addEventListener('webkitfullscreenchange', updateIcon);
      document.addEventListener('msfullscreenchange', updateIcon);

      // initial state
      updateIcon();
      document.body.appendChild(btn);
    })();

    // ---------- helpers ----------
    function save(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }
    function load(key){ try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
    function saveAll(){ save(STORAGE_KEY, items); save(CLAIMED_KEY, claimed); save(DELETED_KEY, deleted); }

    function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
    function flash(msg, timeout=1200){
      const el = document.createElement('div'); el.textContent = msg;
      el.style.position='fixed'; el.style.left='50%'; el.style.top='20px'; el.style.transform='translateX(-50%)';
      el.style.background='var(--accent)'; el.style.color='#03211a'; el.style.padding='8px 12px'; el.style.borderRadius='8px'; el.style.zIndex=9999;
      document.body.appendChild(el); setTimeout(()=> el.style.opacity='0', timeout-200); setTimeout(()=> el.remove(), timeout);
    }

    // ---------- THEME ----------
    function initTheme(){
      const saved = localStorage.getItem(THEME_KEY);
      if(saved==='light'){ document.body.classList.add('light'); if(darkToggle) darkToggle.textContent='☀️'; }
      else { if(darkToggle) darkToggle.textContent='🌙'; }
      if(darkToggle) darkToggle.addEventListener('click', ()=>{
        const isLight = document.body.classList.toggle('light');
        darkToggle.textContent = isLight ? '☀️' : '🌙';
        localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
      });
    }

    // ---------- SIDEBAR ----------
    function bindSidebar(){
      if(menuBtn && sidebar){ menuBtn.addEventListener('click', ()=> sidebar.classList.add('open')); }
      if(closeMenu && sidebar){ closeMenu.addEventListener('click', ()=> sidebar.classList.remove('open')); }
      // side links navigation
      document.querySelectorAll('.side-link').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          const t = btn.dataset.target;
          // hide all views with class 'view' and show the selected view / search controls accordingly
          document.querySelectorAll('.view').forEach(v=> v.style.display = 'none');
          // show target
          if(t === 'view-items'){ document.getElementById('view-items')?.classList.remove('hidden'); document.getElementById('list-controls').style.display = ''; document.querySelectorAll('#list, #view-inventory, #view-deleted').forEach(el=> el.style.display = (el.id === 'list' ? '' : 'none')); }
          if(t === 'view-inventory'){ document.getElementById('list-controls').style.display = 'none'; document.getElementById('view-inventory').style.display = ''; document.getElementById('view-deleted').style.display = 'none'; document.getElementById('list').style.display='none'; }
          if(t === 'view-deleted'){ document.getElementById('list-controls').style.display = 'none'; document.getElementById('view-deleted').style.display = ''; document.getElementById('view-inventory').style.display = 'none'; document.getElementById('list').style.display='none'; }
          sidebar.classList.remove('open');
        });
      });

      // export all
      if(exportAllCsvBtn) exportAllCsvBtn.addEventListener('click', exportAllCsv);
      if(exportAllPdfBtn) exportAllPdfBtn.addEventListener('click', ()=> exportPdf('All Items', items.concat(claimed).concat(deleted)));
    }

    // ---------- BASIC bindings ----------
    function bindBasic(){
      if(imageInput){
        imageInput.addEventListener('change', async (e)=>{
          const f = e.target.files[0];
          if(!f){ currentImage=''; previewShow(); return; }
          if(f.size > 5*1024*1024) alert('Image > 5MB recommended max');
          try { currentImage = await readFile(f); previewShow(); } catch { previewShow(); }
        });
      }

      if(form){
        form.addEventListener('submit', async (e)=>{
          e.preventDefault();
          const title = (document.getElementById('title')?.value || '').trim();
          if(!title) return alert('Enter title');
          const obj = {
            id: Date.now().toString(36),
            type: document.getElementById('type')?.value || 'lost',
            date: document.getElementById('date')?.value || new Date().toISOString().slice(0,10),
            title,
            category: (document.getElementById('category')?.value || '').trim() || 'Misc',
            location: (document.getElementById('location')?.value || '').trim() || 'Unknown',
            description: (document.getElementById('description')?.value || '').trim() || '',
            imageDataUrl: currentImage || '',
            createdAt: Date.now()
          };
          items.unshift(obj);
          saveAll();
          populateCategories();
          renderList();
          flash('Added');
          form.reset();
          currentImage = '';
          previewShow();
        });
      }

      if(importSample){ importSample.addEventListener('click', importSampleFn); }
      if(clearAll){
        clearAll.addEventListener('click', ()=>{
          if(!confirm('Clear all data?')) return;
          items=[]; claimed=[]; deleted=[];
          saveAll(); populateCategories(); renderList(); renderInventory(); renderDeleted(); updateCounts(); flash('Cleared');
        });
      }

      if(searchInput) searchInput.addEventListener('input', renderList);
      if(filterType) filterType.addEventListener('change', renderList);
      if(filterCategory) filterCategory.addEventListener('change', renderList);
      if(sortCtrl) sortCtrl.addEventListener('change', renderList);
    }

    // ---------- preview helper ----------
    function previewShow(){
      if(!preview) return;
      preview.innerHTML = '';
      if(currentImage){
        const img = document.createElement('img'); img.src = currentImage; img.alt='preview'; img.style.maxHeight='100%'; preview.appendChild(img); preview.setAttribute('aria-hidden','false');
      } else {
        preview.innerText = 'No photo'; preview.setAttribute('aria-hidden','true');
      }
    }
    function readFile(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(); fr.readAsDataURL(file); }); }

    // ---------- import sample ----------
    function importSampleFn(){
      const now = Date.now();
      items = [{id:'s1',type:'lost',title:'Black Wallet',category:'Wallet',location:'Library',description:'Leather wallet',date:'2025-11-25',imageDataUrl:'',createdAt:now}].concat(items);
      saveAll(); populateCategories(); renderList(); flash('Sample added');
    }

    // ---------- render active list ----------
    function renderList(){
      if(!listEl) return;
      const q = (searchInput?.value||'').toLowerCase().trim();
      const ft = filterType?.value || 'all';
      const fc = filterCategory?.value || 'all';
      const sort = sortCtrl?.value || 'newest';

      let out = items.slice();
      if(ft !== 'all') out = out.filter(i=> i.type === ft);
      if(fc !== 'all') out = out.filter(i=> i.category === fc);
      if(q) out = out.filter(i => (i.title||'').toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q) || (i.location||'').toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
      out.sort((a,b)=> sort==='newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);

      listEl.innerHTML = '';
      if(out.length === 0) { listEl.innerHTML = '<div class="card muted" style="grid-column:1/-1">No items</div>'; return; }

      out.forEach(it=>{
        const card = document.createElement('article'); card.className='item fade-in';
        const imgWrap = document.createElement('div'); imgWrap.className='img';
        if(it.imageDataUrl){ const im=document.createElement('img'); im.src=it.imageDataUrl; imgWrap.appendChild(im); } else imgWrap.innerHTML=`<div class="muted" style="padding:12px">No photo</div>`;
        card.appendChild(imgWrap);

        const meta = document.createElement('div'); meta.className='meta';
        meta.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class="muted">${escapeHtml(it.category)} • ${escapeHtml(it.location)}</div><p class="muted">${escapeHtml(it.description)}</p><div class="muted">Date: ${escapeHtml(it.date||'—')}</div>`;

        const actions = document.createElement('div'); actions.className='actions-row';
        const claimBtn = document.createElement('button'); claimBtn.className='btn-ghost'; claimBtn.innerText='Claim';
        claimBtn.addEventListener('click', ()=>{
          // move to inventory (NO UNCLAIM)
          items = items.filter(x=> x.id !== it.id);
          claimed.unshift(it);
          saveAll();
          populateCategories(); renderList(); renderInventory(); updateCounts();
          flash('Moved to Inventory');
        });

        const delBtn = document.createElement('button'); delBtn.className='btn-ghost'; delBtn.innerText='Delete';
        delBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          if(!confirm('Delete this item?')) return;
          items = items.filter(x=> x.id !== it.id);
          deleted.unshift(it);
          saveAll();
          populateCategories(); renderList(); renderDeleted(); updateCounts();
          flash('Moved to Deleted');
        });

        actions.appendChild(claimBtn); actions.appendChild(delBtn);
        meta.appendChild(actions);
        card.appendChild(meta);
        listEl.appendChild(card);
      });
    }

    // ---------- render inventory ----------
    function renderInventory(){
      if(!inventoryEl) return;
      inventoryEl.innerHTML = '';
      if(claimed.length===0) { inventoryEl.innerHTML = '<div class="card muted">No claimed items</div>'; return; }
      claimed.forEach(it=>{
        const card = document.createElement('article'); card.className='item fade-in';
        const imgWrap = document.createElement('div'); imgWrap.className='img';
        if(it.imageDataUrl){ const im=document.createElement('img'); im.src=it.imageDataUrl; imgWrap.appendChild(im); } else imgWrap.innerHTML=`<div class="muted" style="padding:12px">No photo</div>`;
        card.appendChild(imgWrap);

        const meta = document.createElement('div'); meta.className='meta';
        meta.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class="muted">${escapeHtml(it.category)} • ${escapeHtml(it.location)}</div><p class="muted">Claimed on: ${new Date(it.createdAt).toLocaleString()}</p><p class="muted">${escapeHtml(it.description)}</p>`;

        const actions = document.createElement('div'); actions.className='actions-row';
        const delBtn = document.createElement('button'); delBtn.className='btn-ghost'; delBtn.innerText='Delete';
        delBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          if(!confirm('Delete from inventory?')) return;
          claimed = claimed.filter(x=> x.id !== it.id);
          deleted.unshift(it);
          saveAll();
          renderInventory(); renderDeleted(); updateCounts();
          flash('Deleted to bin');
        });

        actions.appendChild(delBtn);
        meta.appendChild(actions);
        card.appendChild(meta);
        inventoryEl.appendChild(card);
      });
    }

    // ---------- render deleted ----------
    function renderDeleted(){
      if(!deletedEl) return;
      deletedEl.innerHTML = '';
      if(deleted.length===0) { deletedEl.innerHTML = '<div class="card muted">Bin is empty</div>'; return; }
      deleted.forEach(it=>{
        const card = document.createElement('article'); card.className='item fade-in';
        const imgWrap = document.createElement('div'); imgWrap.className='img';
        if(it.imageDataUrl){ const im=document.createElement('img'); im.src=it.imageDataUrl; imgWrap.appendChild(im); } else imgWrap.innerHTML=`<div class="muted" style="padding:12px">No photo</div>`;
        card.appendChild(imgWrap);

        const meta = document.createElement('div'); meta.className='meta';
        meta.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class="muted">${escapeHtml(it.category)} • ${escapeHtml(it.location)}</div><p class="muted">${escapeHtml(it.description)}</p><div class="muted">Deleted: ${new Date(it.createdAt).toLocaleString()}</div>`;

        const actions = document.createElement('div'); actions.className='actions-row';
        // restore
        const restoreBtn = document.createElement('button'); restoreBtn.className='btn-ghost'; restoreBtn.innerText='Restore';
        restoreBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          deleted = deleted.filter(x=> x.id !== it.id);
          items.unshift(it);
          saveAll();
          renderDeleted(); renderList(); updateCounts();
          flash('Restored');
        });
        // purge
        const purgeBtn = document.createElement('button'); purgeBtn.className='btn-ghost'; purgeBtn.innerText='Permanently Delete';
        purgeBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          if(!confirm('Permanently delete?')) return;
          deleted = deleted.filter(x=> x.id !== it.id);
          saveAll();
          renderDeleted(); updateCounts();
          flash('Permanently deleted');
        });

        actions.appendChild(restoreBtn); actions.appendChild(purgeBtn);
        meta.appendChild(actions);
        card.appendChild(meta);
        deletedEl.appendChild(card);
      });
    }

    // ---------- utility: categories / counts / auth ----------
    function populateCategories(){
      if(!filterCategory) return;
      const cats = [...new Set(items.map(i=> i.category).filter(Boolean))];
      filterCategory.innerHTML = '<option value="all">All categories</option>' + cats.map(c=> `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    function updateCounts(){
      if(inventoryCountEl) inventoryCountEl.textContent = String(claimed.length || 0);
    }

    // ---------- AUTH UI (client demo) ----------
    function renderAuth(){
      if(!authArea) return;
      authArea.innerHTML = '';
      if(session && session.username){
        const box = document.createElement('div'); box.className='auth-box';
        box.innerHTML = `<div>Signed in as <strong>${escapeHtml(session.username)}</strong> (${escapeHtml(session.role)})</div>`;
        const out = document.createElement('button'); out.className='ghost'; out.textContent='Logout'; out.addEventListener('click', ()=>{ session=null; localStorage.removeItem(SESSION_KEY); renderAuth(); flash('Logged out'); });
        box.appendChild(out); authArea.appendChild(box); return;
      }
      const box = document.createElement('div'); box.className='auth-box';
      box.innerHTML = `<input id="authUser" placeholder="username"/><input id="authPass" placeholder="password" type="password"/><label style="font-size:12px;color:var(--muted)"><input id="authAdmin" type="checkbox"/> Register as admin</label>`;
      const register = document.createElement('button'); register.className='ghost'; register.textContent='Register';
      register.addEventListener('click', ()=> {
        const u = document.getElementById('authUser')?.value?.trim(); const p = document.getElementById('authPass')?.value || ''; const asAdmin = document.getElementById('authAdmin')?.checked;
        if(!u || !p) return alert('Enter username & password');
        if(users.find(x=> x.username === u)) return alert('User exists');
        users.push({ username: u, hash: hashSimple(p), role: asAdmin ? 'admin' : 'user' });
        localStorage.setItem(USER_KEY, JSON.stringify(users));
        alert('Registered. Now login.');
      });
      const login = document.createElement('button'); login.className='primary'; login.textContent='Login';
      login.addEventListener('click', ()=> {
        const u = document.getElementById('authUser')?.value?.trim(); const p = document.getElementById('authPass')?.value || '';
        const found = users.find(x=> x.username === u && x.hash === hashSimple(p));
        if(!found) return alert('Invalid');
        session = { username: found.username, role: found.role };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        renderAuth(); flash('Logged in');
      });
      box.appendChild(register); box.appendChild(login); authArea.appendChild(box);
    }

    function isAdmin(){ return session && session.role === 'admin'; }
    function hashSimple(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h=h&h; } return 'h'+Math.abs(h); }

    // ---------- EXPORT helpers ----------
    function toCSV(rows){
      if(!rows || !rows.length) return '';
      const esc = v => `"${String(v||'').replaceAll('"','""')}"`;
      const keys = Object.keys(rows[0]);
      return [keys.map(esc).join(',')].concat(rows.map(r => keys.map(k=>esc(r[k])).join(','))).join('\n');
    }
    function download(name, content, mime='text/csv'){
      const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }
    function exportAllCsv(){ const rows = items.concat(claimed).concat(deleted); if(rows.length===0) return alert('No data'); download('lostfound_all.csv', toCSV(rows)); }
    function exportPdf(title, rows){ const html = rows.map(i=>`<div style="border-bottom:1px solid #ddd;padding:8px"><strong>${escapeHtml(i.title)}</strong><div>${escapeHtml(i.category)} • ${escapeHtml(i.location)}</div><div>${escapeHtml(i.description)}</div></div>`).join(''); const w = window.open('','_blank','width=900,height=700'); w.document.write(`<html><head><title>${escapeHtml(title)}</title><link rel="stylesheet" href="styles.css"></head><body><h1>${escapeHtml(title)}</h1>${html}<script>window.print()</script></body></html>`); w.document.close(); }

    if(exportAllCsvBtn) exportAllCsvBtn.addEventListener('click', exportAllCsv);
    if(exportAllPdfBtn) exportAllPdfBtn.addEventListener('click', ()=> exportPdf('All Items', items.concat(claimed).concat(deleted)));

    // ---------- finishers ----------
    function updateCounts(){ if(inventoryCountEl) inventoryCountEl.textContent = String(claimed.length || 0); }
    updateCounts();

  }); 
})(); 

// ---- Initialize Sidebar after everything loads ----
document.addEventListener("DOMContentLoaded", () => {
  bindSidebar();
});
