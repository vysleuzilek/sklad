let html5QrCode;
let currentScannedCode = null;
let currentProductDoc = null;
let pendingPhotoFile = null;
let allProducts = [];
let activeCategory = 'all';

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

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    currentProductDoc = { id: doc.id, ...doc.data() };
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
      photoUrl: photoUrl || null
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
  if (!confirm(`Smazat "${currentProductDoc.name}" ze skladu?`)) return;
  try {
    await db.collection('products').doc(currentProductDoc.id).delete();
  } catch (err) {
    alert('Smazání se nepovedlo: ' + err.message);
    return;
  }
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

// --- SKLAD: FOTO GRID, SESKUPENÉ PODLE KATEGORIE ---
function stockClass(stock) {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return '';
}

function productItemHtml(p) {
  const photoHtml = p.photoUrl
    ? `<div class="grid-photo-wrap"><img src="${p.photoUrl}"></div>`
    : `<div class="grid-photo-wrap"><div class="grid-photo-placeholder">bez fotky</div></div>`;
  return `
    <button class="grid-delete-btn" type="button">✕</button>
    ${photoHtml}
    <div class="grid-info-row">
      <div class="grid-name">${p.name}</div>
      <div class="grid-arrow">›</div>
    </div>
    <div class="grid-qty ${stockClass(p.stock)}">${p.stock} ks</div>
  `;
}

async function deleteProduct(p) {
  if (!confirm(`Smazat "${p.name}" ze skladu?`)) return;
  try {
    await db.collection('products').doc(p.id).delete();
  } catch (err) {
    alert('Smazání se nepovedlo: ' + err.message);
  }
}

function renderGrid(products) {
  const container = document.getElementById('productsGrid');
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

    inGroup.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'grid-item';
      item.innerHTML = productItemHtml(p);
      item.addEventListener('click', () => openProductFromGrid(p));
      item.querySelector('.grid-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProduct(p);
      });
      grid.appendChild(item);
    });

    group.appendChild(grid);
    container.appendChild(group);
  });
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
  applySearch();
});

document.getElementById('searchInput').addEventListener('input', applySearch);

function applySearch() {
  const term = document.getElementById('searchInput').value.trim().toLowerCase();
  let filtered = term
    ? allProducts.filter(p => p.name.toLowerCase().includes(term) || p.barcode.includes(term))
    : allProducts;
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => (p.category || '') === activeCategory);
  }
  renderGrid(filtered);
}
