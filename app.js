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

// Your exact configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAJYKUY7VU_IGWkUn2FWHk56quBRGhROX0",
  authDomain: "mithai-magic-8e591.firebaseapp.com",
  projectId: "mithai-magic-8e591",
  storageBucket: "mithai-magic-8e591.firebasestorage.app",
  messagingSenderId: "906997948277",
  appId: "1:906997948277:web:5fcb3f72387d88c4ccbd3c",
  measurementId: "G-6QPVTPCW1G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= CUSTOMER CART & STOREFRONT LOGIC =================
let cart = [];
const MIN_DELIVERY_THRESHOLD = 550;

// Listen to products added by the owner in real-time
const productGrid = document.getElementById('productGrid');
if (productGrid) {
  const productsCol = collection(db, 'products');
  onSnapshot(productsCol, (snapshot) => {
    productGrid.innerHTML = '';
    if (snapshot.empty) {
      productGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#888;">No sweets on the counter yet. Open admin.html to add fresh batches!</p>';
      return;
    }
    snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      productGrid.innerHTML += `
        <div class="product-card">
          <img src="${p.imageUrl}" class="product-img" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500'">
          <div class="product-body">
            <h3>${p.name}</h3>
            <p>${p.description}</p>
            <div class="product-footer">
              <span class="product-price">₹${p.rate}</span>
              <button class="btn btn-primary" onclick="window.addToCart('${docSnap.id}', '${p.name}', ${p.rate})">
                <i class="fa-solid fa-plus"></i> Add
              </button>
            </div>
          </div>
        </div>
      `;
    });
  });
}

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
    cartItems.innerHTML = '<p class="empty-msg">Your box is empty. Add your favorite sweets!</p>';
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

  cartCount.innerText = count;
  cartSubtotal.innerText = `₹${subtotal}`;

  // Enforce the ₹550 Doorstep Delivery Limit
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
    backdrop.classList.add('open');
  } else {
    drawer.classList.toggle('open');
    backdrop.classList.toggle('open');
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

// ================= SECURE OWNER / ADMIN LOGIC =================
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
    errEl.innerText = '';
  } catch (err) {
    errEl.innerText = "Invalid credentials: " + err.message;
  }
};

window.logoutAdmin = function() {
  signOut(auth);
};

let initialLoadComplete = false;
function initializeAdminListeners() {
  const audio = document.getElementById('orderAudio');
  const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

  // Listen for Orders
  onSnapshot(ordersQuery, (snapshot) => {
    const ordersList = document.getElementById('ordersList');
    const orderCountBadge = document.getElementById('orderCountBadge');
    if (!ordersList) return;

    orderCountBadge.innerText = `${snapshot.size} Total`;
    ordersList.innerHTML = '';

    if (snapshot.empty) {
      ordersList.innerHTML = '<p class="empty-msg">No active orders right now.</p>';
      return;
    }

    if (initialLoadComplete) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          audio.play().catch(() => console.log('Audio waiting for user interaction'));
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

  // Listen for Products
  onSnapshot(collection(db, 'products'), (snapshot) => {
    const list = document.getElementById('adminItemsList');
    if (!list) return;
    list.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      list.innerHTML += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
          <span><strong>${p.name}</strong> - ₹${p.rate}</span>
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

window.addNewMithai = async function(e) {
  e.preventDefault();
  const name = document.getElementById('mName').value.trim();
  const rate = Number(document.getElementById('mRate').value);
  const imageUrl = document.getElementById('mImage').value.trim();
  const description = document.getElementById('mDesc').value.trim();

  await addDoc(collection(db, 'products'), {
    name,
    rate,
    imageUrl,
    description,
    available: true,
    updatedAt: serverTimestamp()
  });

  alert(`${name} added to online counter!`);
  e.target.reset();
};

window.deleteMithai = async function(productId) {
  if (confirm("Remove this mithai item from the online counter?")) {
    await deleteDoc(doc(db, 'products', productId));
  }
};
