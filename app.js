// ================= FIREBASE MODULAR SDK IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJYKUY7VU_IGWkUn2FWHk56quBRGhROX0",
  authDomain: "mithai-magic-8e591.firebaseapp.com",
  projectId: "mithai-magic-8e591",
  storageBucket: "mithai-magic-8e591.firebasestorage.app",
  messagingSenderId: "906997948277",
  appId: "1:906997948277:web:5fcb3f72387d88c4ccbd3c",
  measurementId: "G-6QPVTPCW1G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= SHOPPING CART & CLIENT STORE =================
let cart = [];
const MIN_DELIVERY_THRESHOLD = 550;

// Render products dynamically ONLY from Firestore
const productGrid = document.getElementById('productGrid');
if (productGrid) {
  onSnapshot(collection(db, 'products'), (snapshot) => {
    productGrid.innerHTML = '';
    
    if (snapshot.empty) {
      productGrid.innerHTML = `
        <div class="empty-catalog-box">
          <i class="fa-solid fa-store-slash"></i>
          <h3>Counter is being stocked!</h3>
          <p>Fresh batches are currently being prepared. Check back shortly or contact us directly on WhatsApp.</p>
          <a href="https://wa.me/919637493711?text=Hi%20Mithai%20Magic,%20what%20items%20are%20available%20today?" target="_blank" class="btn btn-whatsapp" style="margin-top:12px;">
            <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
          </a>
        </div>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.imageUrl}" class="product-img" alt="${p.name}">
        <div class="product-body">
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <div class="product-price-row">
            <span class="price-label">Price:</span>
            <span class="product-price">₹${p.rate}</span>
          </div>
          <div class="dual-actions">
            <a href="https://wa.me/919637493711?text=Hi%20Mithai%20Magic,%20I%20want%20to%20order%20${encodeURIComponent(p.name)}" target="_blank" class="btn-wa">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </a>
            <button class="btn-add" onclick="window.addToCart('${docSnap.id}', '${p.name.replace(/'/g, "\\'")}', ${p.rate})">
              <i class="fa-solid fa-plus"></i> Add to Box
            </button>
          </div>
        </div>
      `;
      productGrid.appendChild(card);
    });
  });
}

// Add Item to Cart
window.addToCart = function(id, name, rate) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, rate, qty: 1 });
  }
  updateCartUI();
  window.toggleCart(true);
};

function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartCount = document.getElementById('cartCount');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const deliveryEligibility = document.getElementById('deliveryEligibility');

  if (!cartItems) return;

  let subtotal = 0;
  let count = 0;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-msg">Your delivery box is empty. Add items from the menu!</p>';
  } else {
    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
      subtotal += item.rate * item.qty;
      count += item.qty;
      cartItems.innerHTML += `
        <div class="cart-item">
          <div>
            <strong>${item.name}</strong><br>
            <small>₹${item.rate} × ${item.qty} = ₹${item.rate * item.qty}</small>
          </div>
          <div>
            <button onclick="window.changeQty(${index}, -1)">-</button>
            <span> ${item.qty} </span>
            <button onclick="window.changeQty(${index}, 1)">+</button>
          </div>
        </div>
      `;
    });
  }

  if (cartCount) cartCount.innerText = count;
  if (cartSubtotal) cartSubtotal.innerText = `₹${subtotal}`;

  // Check ₹550 limit for Doorstep Delivery
  if (deliveryEligibility && placeOrderBtn) {
    if (subtotal >= MIN_DELIVERY_THRESHOLD) {
      deliveryEligibility.className = 'threshold-badge eligible';
      deliveryEligibility.innerHTML = `<i class="fa-solid fa-circle-check"></i> Eligible for Doorstep Delivery in Charholi!`;
      placeOrderBtn.disabled = false;
      placeOrderBtn.innerText = `Place Doorstep Order (₹${subtotal})`;
    } else {
      deliveryEligibility.className = 'threshold-badge';
      const remaining = MIN_DELIVERY_THRESHOLD - subtotal;
      deliveryEligibility.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Add ₹${remaining} more to qualify for Doorstep Delivery`;
      placeOrderBtn.disabled = true;
      placeOrderBtn.innerText = `Min Order ₹550 Needed`;
    }
  }
}

window.changeQty = function(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  updateCartUI();
};

window.toggleCart = function(forceOpen = false) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (!drawer) return;

  if (forceOpen) {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  } else {
    drawer.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('open');
  }
};

window.submitCustomerOrder = async function(e) {
  e.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const subtotal = cart.reduce((acc, curr) => acc + (curr.rate * curr.qty), 0);

  if (subtotal < MIN_DELIVERY_THRESHOLD) {
    alert("Minimum order value is ₹550 for doorstep delivery in Charholi.");
    return;
  }

  const orderData = {
    customerName: name,
    phone: phone,
    address: address,
    items: cart,
    subtotal: subtotal,
    status: "Pending Approval",
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'orders'), orderData);
    alert("Order submitted to Mithai Magic counter! We will approve it shortly based on today's routine.");
    cart = [];
    updateCartUI();
    window.toggleCart(false);
    document.getElementById('orderForm').reset();
  } catch (err) {
    alert("Error placing order: " + err.message);
  }
};

// ================= OWNER / ADMIN PORTAL =================
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');

if (loginScreen && adminDashboard) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginScreen.style.display = 'none';
      adminDashboard.style.display = 'block';
      initializeAdminListeners();
    } else {
      loginScreen.style.display = 'flex';
      adminDashboard.style.display = 'none';
    }
  });
}

window.handleAdminLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const pass = document.getElementById('adminPassword').value.trim();
  const errEl = document.getElementById('loginError');

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    if (errEl) errEl.innerText = '';
  } catch (err) {
    if (errEl) errEl.innerText = "Invalid credentials: " + err.message;
  }
};

window.logoutAdmin = function() {
  signOut(auth);
};

let initialLoadComplete = false;
function initializeAdminListeners() {
  const audio = document.getElementById('orderAudio');
  const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

  onSnapshot(ordersQuery, (snapshot) => {
    const ordersList = document.getElementById('ordersList');
    const orderCountBadge = document.getElementById('orderCountBadge');
    if (!ordersList) return;

    if (orderCountBadge) orderCountBadge.innerText = `${snapshot.size} Total`;
    ordersList.innerHTML = '';

    if (snapshot.empty) {
      ordersList.innerHTML = '<p class="empty-msg">No active orders right now.</p>';
      return;
    }

    if (initialLoadComplete) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          audio.play().catch(() => console.log('Audio waiting for user gesture'));
        }
      });
    }
    initialLoadComplete = true;

    snapshot.forEach((docSnap) => {
      const ord = docSnap.data();
      const statusColor = ord.status === 'Approved' ? 'green' : (ord.status === 'Rejected' ? 'red' : '#b07e15');
      let itemsHtml = ord.items ? ord.items.map(i => `${i.name} (x${i.qty})`).join(', ') : 'No items';

      ordersList.innerHTML += `
        <div class="order-card">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <strong>${ord.customerName} (+91 ${ord.phone})</strong>
            <span style="font-weight:bold; color:${statusColor}">${ord.status}</span>
          </div>
          <p><i class="fa-solid fa-location-dot"></i> ${ord.address}</p>
          <p><strong>Items:</strong> ${itemsHtml}</p>
          <p><strong>Amount:</strong> ₹${ord.subtotal}</p>
          <div class="order-actions">
            <button class="btn-approve" onclick="window.updateOrderStatus('${docSnap.id}', 'Approved')">Approve Order</button>
            <button class="btn-reject" onclick="window.updateOrderStatus('${docSnap.id}', 'Rejected')">Reject</button>
          </div>
        </div>
      `;
    });
  });

  onSnapshot(collection(db, 'products'), (snapshot) => {
    const list = document.getElementById('adminItemsList');
    if (!list) return;
    list.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      list.innerHTML += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${p.imageUrl}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;">
            <span><strong>${p.name}</strong> - ₹${p.rate}</span>
          </div>
          <button style="background:#dc3545; color:#fff; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;" onclick="window.deleteMithai('${docSnap.id}')">
            Delete
          </button>
        </div>
      `;
    });
  });
}

window.updateOrderStatus = async function(orderId, newStatus) {
  await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
};

// Helper: Compress and convert uploaded image file to lightweight Base64 string
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Compress to JPEG with 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

window.addNewMithai = async function(e) {
  e.preventDefault();
  const name = document.getElementById('mName').value.trim();
  const rate = Number(document.getElementById('mRate').value);
  const fileInput = document.getElementById('mImageFile');
  const description = document.getElementById('mDesc').value.trim();
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadStatus = document.getElementById('uploadStatus');

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Please select a photo from your phone!");
    return;
  }

  try {
    uploadBtn.disabled = true;
    uploadStatus.innerText = "Processing and uploading photo...";

    // Convert file to compressed image
    const base64Image = await compressImage(fileInput.files[0]);

    await addDoc(collection(db, 'products'), {
      name,
      rate,
      imageUrl: base64Image,
      description,
      available: true,
      updatedAt: serverTimestamp()
    });

    uploadStatus.innerText = "";
    alert(`${name} uploaded and added to the counter!`);
    e.target.reset();
  } catch (err) {
    alert("Error uploading image: " + err.message);
    uploadStatus.innerText = "";
  } finally {
    uploadBtn.disabled = false;
  }
};

window.deleteMithai = async function(productId) {
  if (confirm("Remove this item from the online counter?")) {
    await deleteDoc(doc(db, 'products', productId));
  }
};
