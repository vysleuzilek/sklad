let html5QrCode;
let currentScannedCode = null;
let currentProductDoc = null; // { id, ...data } pokud produkt existuje
let allProducts = []; // lokální kopie pro hledání a statistiky

const LOW_STOCK_THRESHOLD = 5;

const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const actionPanel = document.getElementById('action-panel');
const knownProductActions = document.getElementById('knownProductActions');
const newProductForm = document.getElementById('newProductForm');

// --- SKENOVÁNÍ ---
startScanBtn.addEventListener('click', () => {
  document.getElementById('reader').classList.remove('hidden');
  stopScanBtn.classList.remove('hidden');
  startScanBtn.classList.add('hidden');

  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 150 } },
    onScanSuccess,
    () => {} // chyby při skenování ignorujeme, jen to zkouší dál
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
  actionPanel.classList.remove('hidden');

  const snapshot = await db.collection('products').where('barcode', '==', decodedText).get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    currentProductDoc = { id: doc.id, ...doc.data() };
    document.getElementById('productName').textContent = currentProductDoc.name;
    document.getElementById('currentStock').textContent = currentProductDoc.stock;
    knownProductActions.classList.remove('hidden');
    newProductForm.classList.add('hidden');
  } else {
    currentProductDoc = null;
    document.getElementById('productName').textContent = 'Neznámý produkt';
    document.getElementById('currentStock').textContent = '-';
    knownProductActions.classList.add('hidden');
    newProductForm.classList.remove('hidden');
  }
}

// --- PŘÍJEM / VÝDEJ ---
document.getElementById('stockInBtn').addEventListener('click', () => changeStock(1));
document.getElementById('stockOutBtn').addEventListener('click', () => changeStock(-1));

async function changeStock(direction) {
  const qty = parseInt(document.getElementById('qtyInput').value) || 1;
  const change = qty * direction;
  const newStock = currentProductDoc.stock + change;

  await db.collection('products').doc(currentProductDoc.id).update({ stock: newStock });
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

  await db.collection('products').add({
    barcode: currentScannedCode,
    name: name,
    price: price,
    stock: qty
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
  actionPanel.classList.add('hidden');
  knownProductActions.classList.add('hidden');
  newProductForm.classList.add('hidden');
  currentScannedCode = null;
  currentProductDoc = null;
}

// --- STATISTIKY ---
function renderStats(products) {
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStock = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length;

  document.getElementById('statProducts').textContent = totalProducts;
  document.getElementById('statTotalStock').textContent = totalStock;
  document.getElementById('statLowStock').textContent = lowStock;
}

// --- ŽIVÝ PŘEHLED SKLADU ---
function stockClass(stock) {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return '';
}

function renderProducts(products) {
  const container = document.getElementById('productsList');
  const emptyState = document.getElementById('emptyStock');
  container.innerHTML = '';

  if (products.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  products.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
      <div class="stock-indicator ${stockClass(p.stock)}"></div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.barcode} · ${p.price} Kč</div>
      </div>
      <div class="product-qty">${p.stock}</div>
    `;
    container.appendChild(row);
  });
}

db.collection('products').orderBy('name').onSnapshot((snapshot) => {
  allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderStats(allProducts);
  applySearch();
});

document.getElementById('searchInput').addEventListener('input', applySearch);

function applySearch() {
  const term = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = term
    ? allProducts.filter(p => p.name.toLowerCase().includes(term) || p.barcode.includes(term))
    : allProducts;
  renderProducts(filtered);
}

// --- HISTORIE POHYBŮ (posledních 15) ---
db.collection('movements').orderBy('timestamp', 'desc').limit(15).onSnapshot((snapshot) => {
  const list = document.getElementById('historyList');
  const emptyHistory = document.getElementById('emptyHistory');
  list.innerHTML = '';

  if (snapshot.empty) {
    emptyHistory.classList.remove('hidden');
    return;
  }
  emptyHistory.classList.add('hidden');

  snapshot.forEach((doc) => {
    const m = doc.data();
    const li = document.createElement('li');
    const sign = m.change > 0 ? '+' : '';
    const cls = m.change > 0 ? 'change-positive' : 'change-negative';
    li.innerHTML = `<span>${m.name}</span><span class="${cls}">${sign}${m.change} ks</span>`;
    list.appendChild(li);
  });
});
