let html5QrCode;
let currentScannedCode = null;
let currentProductDoc = null;
let pendingPhotoFile = null;
let allProducts = []; // vše vč. smazaných (soft delete)
let allStores = [];
let activeCategory = 'all';
let trashVisible = false;

const LOW_STOCK_THRESHOLD = 5;

// Zatím jen čísla 1-5 jako placeholder, časem se nahradí reálnými názvy kategorií
const CATEGORIES = ['1', '2', '3', '4', '5'];

// --- NAVIGACE MEZI ZÁLOŽKAMI ---
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchView(btn.dataset.view);
    if (btn.dataset.view === 'view-scan') {
      resetPanel();
      startScanning();
    } else {
      stopScanner();
    }
  });
});

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-view="${viewId}"]`).classList.add('active');
}

// --- KATEGORIE: naplnění selectu na scan kartě ---
const categorySelect = document.getElementById('categorySelect');
categorySelect.innerHTML = '<option value="">Bez kategorie</option>' +
  CATEGORIES.map(c => `<option value="${c}">Kategorie ${c}</option>`).join('');

// --- SKENOVÁNÍ ---
const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const productCard = document.getElementById('product-card');
const knownProduct = document.getElementById('knownProduct');
const newProduct = document.getElementById('newProduct');
const newProductSubmit = document.getElementById('newProductSubmit');

startScanBtn.addEventListener('click', startScanning);

function startScanning() {
  if (html5QrCode && html5QrCode.isScanning) return;
  document.getElementById('reader').classList.remove('hidden');
  stopScanBtn.classList.remove('hidden');
  startScanBtn.classList.add('hidden');

  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 150 } },
    onScanSuccess,
    () => {}
  );
}

stopScanBtn.addEventListener('click', stopScanner);

function stopScanner() {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => {
      document.getElementById('reader').classList.add('hidden');
      stopScanBtn.classList.add('hidden');
      startScanBtn.classList.remove('hidden');
    });
  }
}

async function onScanSuccess(decodedText) {
  stopScanner();
  currentScannedCode = decodedText;
  document.getElementById('scannedCode').textContent = decodedText;
  productCard.classList.remove('hidden');
  resetPhotoPreview();

  let snapshot;
  try {
    snapshot = await db.collection('products').where('barcode', '==', decodedText).get();
  } catch (err) {
    alert('Nepodařilo se načíst data ze skladu: ' + err.message);
    return;
  }

  const found = snapshot.docs.find(d => !d.data().deleted);

  if (found) {
    currentProductDoc = { id: found.id, ...found.data() };
    document.getElementById('productName').textContent = currentProductDoc.name;
    document.getElementById('productPrice').textContent = currentProductDoc.price + ' Kč';
    document.getElementById('currentStock').textContent = currentProductDoc.stock + ' ks';
    if (currentProductDoc.photoUrl) showPhotoPreview(currentProductDoc.photoUrl);
    categorySelect.value = currentProductDoc.category || '';
    knownProduct.classList.remove('hidden');
    newProduct.classList.add('hidden');
    newProductSubmit.classList.add('hidden');
  } else {
    currentProductDoc = null;
    categorySelect.value = '';
    knownProduct.classList.add('hidden');
    newProduct.classList.remove('hidden');
    newProductSubmit.classList.remove('hidden');
  }
}

// --- FOTKA ---
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const photoPlaceholder = document.getElementById('photoPlaceholder');

photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pendingPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => showPhotoPreview(ev.target.result);
  reader.readAsDataURL(file);
});

function showPhotoPreview(url) {
  photoPreview.src = url;
  photoPreview.classList.remove('hidden');
  photoPlaceholder.classList.add('hidden');
}

function resetPhotoPreview() {
  photoPreview.src = '';
  photoPreview.classList.add('hidden');
  photoPlaceholder.classList.remove('hidden');
  pendingPhotoFile = null;
  photoInput.value = '';
}

async function uploadPendingPhoto(barcode) {
  if (!pendingPhotoFile) return null;
  const ref = storage.ref().child('products/' + barcode + '.jpg');
  await ref.put(pendingPhotoFile);
  return await ref.getDownloadURL();
}

// --- PŘÍJEM / VÝDEJ ---
document.getElementById('stockInBtn').addEventListener('click', () => changeStock(1));
document.getElementById('stockOutBtn').addEventListener('click', () => changeStock(-1));

async function changeStock(direction) {
  const qty = parseInt(document.getElementById('qtyInput').value) || 1;
  const change = qty * direction;
  const newStock = currentProductDoc.stock + change;

  try {
    const updates = { stock: newStock, category: categorySelect.value || null };
    const photoUrl = await uploadPendingPhoto(currentProductDoc.barcode);
    if (photoUrl) updates.photoUrl = photoUrl;

    await db.collection('products').doc(currentProductDoc.id).update(updates);
    await db.collection('movements').add({
      barcode: currentProductDoc.barcode,
      name: currentProductDoc.name,
      change: change,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    alert('Uložení se nepovedlo: ' + err.message);
    return;
  }

  resetPanel();
  switchView('view-sklad');
}

// --- NOVÝ PRODUKT ---
document.getElementById('createProductBtn').addEventListener('click', async () => {
  const name = document.getElementById('newName').value.trim();
  const price = parseFloat(document.getElementById('newPrice').value) || 0;
  const qty = parseInt(document.getElementById('newQty').value) || 0;
  const category = categorySelect.value || null;

  if (!name) { alert('Vyplň název produktu'); return; }

  try {
    const photoUrl = await uploadPendingPhoto(currentScannedCode);

    await db.collection('products').add({
      barcode: currentScannedCode,
      name: name,
      price: price,
      stock: qty,
      category: category,
      photoUrl: photoUrl || null,
      deleted: false
    });

    if (qty !== 0) {
      await db.collection('movements').add({
        barcode: currentScannedCode,
        name: name,
        change: qty,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (err) {
    alert('Založení produktu se nepovedlo: ' + err.message);
    return;
  }

  document.getElementById('newName').value = '';
  document.getElementById('newPrice').value = '';
  document.getElementById('newQty').value = 0;
  resetPanel();
  switchView('view-sklad');
});

document.getElementById('cancelBtn').addEventListener('click', resetPanel);

document.getElementById('deleteProductBtn').addEventListener('click', async () => {
  if (!currentProductDoc) return;
  if (!confirm(`Přesunout "${currentProductDoc.name}" do koše?`)) return;
  await softDeleteProduct(currentProductDoc.id);
  resetPanel();
  switchView('view-sklad');
});

function resetPanel() {
  productCard.classList.add('hidden');
  knownProduct.classList.add('hidden');
  newProduct.classList.add('hidden');
  newProductSubmit.classList.add('hidden');
  currentScannedCode = null;
  currentProductDoc = null;
  resetPhotoPreview();
}

// --- SKLAD: FILTR KATEGORIÍ ---
const categoryFilter = document.getElementById('categoryFilter');

function renderCategoryFilter() {
  const chips = ['all', ...CATEGORIES];
  categoryFilter.innerHTML = '';
  chips.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip' + (activeCategory === c ? ' active' : '');
    btn.textContent = c === 'all' ? 'Vše' : c;
    btn.addEventListener('click', () => {
      activeCategory = c;
      renderCategoryFilter();
      applySearch();
    });
    categoryFilter.appendChild(btn);
  });
}
renderCategoryFilter();

// --- SMAZÁNÍ / KOŠ ---
async function softDeleteProduct(id) {
  try {
    await db.collection('products').doc(id).update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    alert('Přesun do koše se nepovedl: ' + err.message);
  }
}

async function restoreProduct(id) {
  try {
    await db.collection('products').doc(id).update({ deleted: false, deletedAt: null });
  } catch (err) {
    alert('Obnovení se nepovedlo: ' + err.message);
  }
}

async function permanentlyDeleteProduct(p) {
  if (!confirm(`Trvale smazat "${p.name}"? Tohle už nejde vrátit.`)) return;
  try {
    await db.collection('products').doc(p.id).delete();
  } catch (err) {
    alert('Smazání se nepovedlo: ' + err.message);
  }
}

const trashToggleBtn = document.getElementById('trashToggleBtn');
const productsGridEl = document.getElementById('productsGrid');
const trashGridEl = document.getElementById('trashGrid');

trashToggleBtn.addEventListener('click', () => {
  trashVisible = !trashVisible;
  productsGridEl.classList.toggle('hidden', trashVisible);
  categoryFilter.classList.toggle('hidden', trashVisible);
  document.getElementById('searchInput').classList.toggle('hidden', trashVisible);
  trashGridEl.classList.toggle('hidden', !trashVisible);
  trashToggleBtn.classList.toggle('active', trashVisible);
  document.getElementById('emptyStock').classList.add('hidden');
  renderAll();
});

// --- STAV SKLADU: pomocné funkce ---
function stockClass(stock) {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return '';
}

function formatMoney(n) {
  return Math.round(n).toLocaleString('cs-CZ') + ' Kč';
}

// Vytvoří jednu kartu produktu. mode: 'active' (klik = detail, X = do koše)
// nebo 'trash' (Obnovit / Smazat natrvalo)
function createProductCard(p, mode) {
  const item = document.createElement('div');
  item.className = 'grid-item';

  const photoHtml = p.photoUrl
    ? `<div class="grid-photo-wrap"><img src="${p.photoUrl}"></div>`
    : `<div class="grid-photo-wrap"><div class="grid-photo-placeholder">bez fotky</div></div>`;

  if (mode === 'trash') {
    item.innerHTML = `
      ${photoHtml}
      <div class="grid-info-row">
        <div class="grid-name">${p.name}</div>
      </div>
      <div class="grid-qty">${p.stock} ks</div>
      <div class="trash-actions">
        <button class="btn-restore" type="button">Obnovit</button>
        <button class="btn-purge" type="button">Smazat natrvalo</button>
      </div>
    `;
    item.querySelector('.btn-restore').addEventListener('click', (e) => {
      e.stopPropagation();
      restoreProduct(p.id);
    });
    item.querySelector('.btn-purge').addEventListener('click', (e) => {
      e.stopPropagation();
      permanentlyDeleteProduct(p);
    });
  } else {
    item.innerHTML = `
      <button class="grid-delete-btn" type="button">✕</button>
      ${photoHtml}
      <div class="grid-info-row">
        <div class="grid-name">${p.name}</div>
        <div class="grid-arrow">›</div>
      </div>
      <div class="grid-qty ${stockClass(p.stock)}">${p.stock} ks</div>
    `;
    item.addEventListener('click', () => openProductFromGrid(p));
    item.querySelector('.grid-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Přesunout "${p.name}" do koše?`)) softDeleteProduct(p.id);
    });
  }

  return item;
}

// --- SKLAD: FOTO GRID, SESKUPENÉ PODLE KATEGORIE ---
function renderGrid(products) {
  const container = productsGridEl;
  const emptyState = document.getElementById('emptyStock');
  container.innerHTML = '';

  if (products.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const groupsToShow = activeCategory === 'all' ? [...CATEGORIES, ''] : [activeCategory];

  groupsToShow.forEach((cat) => {
    const inGroup = products.filter(p => (p.category || '') === cat);
    if (inGroup.length === 0) return;

    const group = document.createElement('div');
    group.className = 'category-group';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.textContent = cat === '' ? 'Bez kategorie' : `Kategorie ${cat}`;
    if (activeCategory !== 'all') header.classList.add('hidden');
    group.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'product-grid';

    inGroup.forEach((p) => grid.appendChild(createProductCard(p, 'active')));

    group.appendChild(grid);
    container.appendChild(group);
  });
}

function renderTrash(products) {
  trashGridEl.innerHTML = '';
  if (products.length === 0) {
    trashGridEl.innerHTML = '<p class="empty-state">Koš je prázdný.</p>';
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'product-grid';
  products.forEach(p => grid.appendChild(createProductCard(p, 'trash')));
  trashGridEl.appendChild(grid);
}

function openProductFromGrid(p) {
  switchView('view-scan');
  currentScannedCode = p.barcode;
  currentProductDoc = p;
  document.getElementById('scannedCode').textContent = p.barcode;
  document.getElementById('productName').textContent = p.name;
  document.getElementById('productPrice').textContent = p.price + ' Kč';
  document.getElementById('currentStock').textContent = p.stock + ' ks';
  categorySelect.value = p.category || '';
  productCard.classList.remove('hidden');
  knownProduct.classList.remove('hidden');
  newProduct.classList.add('hidden');
  newProductSubmit.classList.add('hidden');
  resetPhotoPreview();
  if (p.photoUrl) showPhotoPreview(p.photoUrl);
}

db.collection('products').orderBy('name').onSnapshot((snapshot) => {
  allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderAll();
});

document.getElementById('searchInput').addEventListener('input', applySearch);

function activeProducts() {
  return allProducts.filter(p => !p.deleted);
}

function deletedProducts() {
  return allProducts.filter(p => p.deleted);
}

function renderAll() {
  const trashed = deletedProducts();
  document.getElementById('trashCount').textContent = trashed.length;

  const active = activeProducts();
  const totalValue = active.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
  document.getElementById('stockValue').textContent = formatMoney(totalValue);

  if (trashVisible) {
    renderTrash(trashed);
  } else {
    applySearch();
  }

  renderLowStock(active);
}

function applySearch() {
  const term = document.getElementById('searchInput').value.trim().toLowerCase();
  let filtered = term
    ? activeProducts().filter(p => p.name.toLowerCase().includes(term) || p.barcode.includes(term))
    : activeProducts();
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => (p.category || '') === activeCategory);
  }
  renderGrid(filtered);
}

// --- DOCHÁZÍ (nízký stav skladu) ---
function renderLowStock(active) {
  const low = active.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
  const container = document.getElementById('lowStockGrid');
  const emptyState = document.getElementById('emptyLowStock');
  container.innerHTML = '';

  if (low.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const grid = document.createElement('div');
  grid.className = 'product-grid';
  low.sort((a, b) => a.stock - b.stock).forEach(p => grid.appendChild(createProductCard(p, 'active')));
  container.appendChild(grid);
}

// --- OBCHODY ---
document.getElementById('saveStoreBtn').addEventListener('click', async () => {
  const name = document.getElementById('storeName').value.trim();
  const address = document.getElementById('storeAddress').value.trim();
  const contact = document.getElementById('storeContact').value.trim();
  const note = document.getElementById('storeNote').value.trim();

  if (!name) { alert('Vyplň název obchodu'); return; }

  try {
    await db.collection('stores').add({
      name, address, contact, note,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    alert('Uložení obchodu se nepovedlo: ' + err.message);
    return;
  }

  document.getElementById('storeName').value = '';
  document.getElementById('storeAddress').value = '';
  document.getElementById('storeContact').value = '';
  document.getElementById('storeNote').value = '';
});

function renderStores() {
  const container = document.getElementById('storesList');
  const emptyState = document.getElementById('emptyStores');
  container.innerHTML = '';

  if (allStores.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  allStores.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'store-card';
    card.innerHTML = `
      <div class="store-card-header">
        <div class="store-name">${s.name}</div>
        <button class="grid-delete-btn store-delete-btn" type="button">✕</button>
      </div>
      ${s.address ? `<div class="store-line">${s.address}</div>` : ''}
      ${s.contact ? `<div class="store-line">${s.contact}</div>` : ''}
      ${s.note ? `<div class="store-note">${s.note}</div>` : ''}
    `;
    card.querySelector('.store-delete-btn').addEventListener('click', async () => {
      if (!confirm(`Smazat obchod "${s.name}"?`)) return;
      try {
        await db.collection('stores').doc(s.id).delete();
      } catch (err) {
        alert('Smazání se nepovedlo: ' + err.message);
      }
    });
    container.appendChild(card);
  });
}

db.collection('stores').orderBy('name').onSnapshot((snapshot) => {
  allStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderStores();
});
