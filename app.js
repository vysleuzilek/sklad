let html5QrCode;
let currentScannedCode = null;
let currentProductDoc = null;
let pendingPhotoFile = null;
let allProducts = [];

const LOW_STOCK_THRESHOLD = 5;

// --- NAVIGACE MEZI ZÁLOŽKAMI ---
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-view="${viewId}"]`).classList.add('active');
}

// --- SKENOVÁNÍ ---
const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const productCard = document.getElementById('product-card');
const knownProduct = document.getElementById('knownProduct');
const newProduct = document.getElementById('newProduct');

startScanBtn.addEventListener('click', () => {
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
});

stopScanBtn.addEventListener('click', stopScanner);

function stopScanner() {
  if (html5QrCode) {
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

  const snapshot = await db.collection('products').where('barcode', '==', decodedText).get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    currentProductDoc = { id: doc.id, ...doc.data() };
    document.getElementById('productName').textContent = currentProductDoc.name;
    document.getElementById('productPrice').textContent = currentProductDoc.price + ' Kč';
    document.getElementById('currentStock').textContent = currentProductDoc.stock + ' ks';
    if (currentProductDoc.photoUrl) showPhotoPreview(currentProductDoc.photoUrl);
    knownProduct.classList.remove('hidden');
    newProduct.classList.add('hidden');
  } else {
    currentProductDoc = null;
    knownProduct.classList.add('hidden');
    newProduct.classList.remove('hidden');
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

  const updates = { stock: newStock };
  const photoUrl = await uploadPendingPhoto(currentProductDoc.barcode);
  if (photoUrl) updates.photoUrl = photoUrl;

  await db.collection('products').doc(currentProductDoc.id).update(updates);
  await db.collection('movements').add({
    barcode: currentProductDoc.barcode,
    name: currentProductDoc.name,
    change: change,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  resetPanel();
}

// --- NOVÝ PRODUKT ---
document.getElementById('createProductBtn').addEventListener('click', async () => {
  const name = document.getElementById('newName').value.trim();
  const price = parseFloat(document.getElementById('newPrice').value) || 0;
  const qty = parseInt(document.getElementById('newQty').value) || 0;

  if (!name) { alert('Vyplň název produktu'); return; }

  const photoUrl = await uploadPendingPhoto(currentScannedCode);

  await db.collection('products').add({
    barcode: currentScannedCode,
    name: name,
    price: price,
    stock: qty,
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

  document.getElementById('newName').value = '';
  document.getElementById('newPrice').value = '';
  document.getElementById('newQty').value = 0;
  resetPanel();
});

document.getElementById('cancelBtn').addEventListener('click', resetPanel);

function resetPanel() {
  productCard.classList.add('hidden');
  knownProduct.classList.add('hidden');
  newProduct.classList.add('hidden');
  currentScannedCode = null;
  currentProductDoc = null;
  resetPhotoPreview();
}

// --- SKLAD: FOTO GRID ---
function stockClass(stock) {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return '';
}

function renderGrid(products) {
  const grid = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyStock');
  grid.innerHTML = '';

  if (products.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  products.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    const photoHtml = p.photoUrl
      ? `<img class="grid-photo" src="${p.photoUrl}">`
      : `<div class="grid-photo-placeholder">bez fotky</div>`;
    item.innerHTML = `
      ${photoHtml}
      <div class="grid-name">${p.name}</div>
      <div class="grid-qty ${stockClass(p.stock)}">${p.stock} ks</div>
    `;
    item.addEventListener('click', () => openProductFromGrid(p));
    grid.appendChild(item);
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
  productCard.classList.remove('hidden');
  knownProduct.classList.remove('hidden');
  newProduct.classList.add('hidden');
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
  const filtered = term
    ? allProducts.filter(p => p.name.toLowerCase().includes(term) || p.barcode.includes(term))
    : allProducts;
  renderGrid(filtered);
}
