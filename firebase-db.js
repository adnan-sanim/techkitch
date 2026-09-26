import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import appletConfig from "./firebase-applet-config.json";

// User provided config from the screenshot
export const USER_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCJhXNzN6m7md4F2S8s9nADJr2l4OXJgJY",
  authDomain: "techkitch-5a987.firebaseapp.com",
  projectId: "techkitch-5a987",
  storageBucket: "techkitch-5a987.firebasestorage.app",
  messagingSenderId: "96532562867",
  appId: "1:96532562867:web:4e1b4378ca2c5c582f81c6",
  measurementId: "G-H4D83ZD10P"
};

let app = null;
let db = null;
let isConnected = false;
let activeConfig = USER_FIREBASE_CONFIG;

function getActiveConfig() {
  const custom = localStorage.getItem("techkitch_custom_firebase_config");
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch (e) {
      console.warn("Invalid custom config in storage, using default", e);
    }
  }
  return USER_FIREBASE_CONFIG;
}

export function initFirebase() {
  if (db) return { app, db, isConnected: true, activeConfig };

  try {
    activeConfig = getActiveConfig();
    app = initializeApp(activeConfig, "techkitch-app");
    db = activeConfig.firestoreDatabaseId
      ? getFirestore(app, activeConfig.firestoreDatabaseId)
      : getFirestore(app);
    isConnected = true;
    console.log("🔥 Firebase initialized successfully with project:", activeConfig.projectId);
  } catch (error) {
    console.error("🔥 Firebase init error:", error);
    // Fallback: try default without named app
    try {
      app = initializeApp(activeConfig);
      db = activeConfig.firestoreDatabaseId
        ? getFirestore(app, activeConfig.firestoreDatabaseId)
        : getFirestore(app);
      isConnected = true;
    } catch (err2) {
      console.error("🔥 Firebase fallback failed:", err2);
      isConnected = false;
    }
  }

  return { app, db, isConnected, activeConfig };
}

// Ensure init
initFirebase();

/**
 * Sync products with Firestore.
 * Automatically seeds default products if Firestore collection is empty.
 */
export async function syncProductsFromFirestore(defaultProducts = []) {
  if (!db) initFirebase();
  if (!db) return null;

  try {
    const colRef = collection(db, "products");
    const snapshot = await getDocs(colRef);

    if (snapshot.empty && defaultProducts.length > 0) {
      console.log("🌱 Firestore products collection is empty. Seeding initial products...");
      const batchPromises = defaultProducts.map((p) => {
        const idStr = String(p.id);
        const docRef = doc(db, "products", idStr);
        return setDoc(docRef, {
          ...p,
          id: Number(p.id) || p.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(batchPromises);
      return defaultProducts;
    }

    const products = [];
    snapshot.forEach((d) => {
      const data = d.data();
      products.push({
        ...data,
        id: Number(data.id) || d.id
      });
    });

    // Sort products by id ascending
    products.sort((a, b) => Number(a.id) - Number(b.id));
    return products;
  } catch (error) {
    console.warn("⚠️ Could not fetch products from Firestore, using local fallback:", error);
    return null;
  }
}

/**
 * Save or update single product in Firestore
 */
export async function saveProductToFirestore(product) {
  if (!db) initFirebase();
  if (!db) return;

  try {
    const idStr = String(product.id);
    const docRef = doc(db, "products", idStr);
    await setDoc(docRef, {
      ...product,
      id: Number(product.id) || product.id,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("✅ Product saved to Firestore:", product.id);
  } catch (error) {
    console.error("❌ Failed to save product to Firestore:", error);
    throw error;
  }
}

/**
 * Delete product from Firestore
 */
export async function deleteProductFromFirestore(id) {
  if (!db) initFirebase();
  if (!db) return;

  try {
    const idStr = String(id);
    const docRef = doc(db, "products", idStr);
    await deleteDoc(docRef);
    console.log("✅ Product deleted from Firestore:", id);
  } catch (error) {
    console.error("❌ Failed to delete product from Firestore:", error);
    throw error;
  }
}

/**
 * Save new customer order to Firestore
 */
export async function createOrderInFirestore(order) {
  if (!db) initFirebase();
  if (!db) return order;

  try {
    const idStr = String(order.id || `TK-${Math.floor(10000 + Math.random() * 89999)}`);
    const docRef = doc(db, "orders", idStr);
    const payload = {
      ...order,
      id: idStr,
      status: order.status || "Pending",
      date: order.date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, payload);
    console.log("✅ Order created in Firestore:", idStr);
    return payload;
  } catch (error) {
    console.error("❌ Failed to create order in Firestore:", error);
    return order;
  }
}

/**
 * Fetch all orders from Firestore
 */
export async function getOrdersFromFirestore() {
  if (!db) initFirebase();
  if (!db) return [];

  try {
    const colRef = collection(db, "orders");
    const snapshot = await getDocs(colRef);
    const orders = [];
    snapshot.forEach((d) => {
      orders.push(d.data());
    });
    // Sort newest first
    orders.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    return orders;
  } catch (error) {
    console.warn("⚠️ Failed to load orders from Firestore:", error);
    return [];
  }
}

/**
 * Update order in Firestore
 */
export async function updateOrderInFirestore(orderId, updateData) {
  if (!db) initFirebase();
  if (!db) return;

  try {
    const idStr = String(orderId);
    const docRef = doc(db, "orders", idStr);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
    console.log("✅ Order updated in Firestore:", orderId);
  } catch (error) {
    console.error("❌ Failed to update order in Firestore:", error);
    throw error;
  }
}

/**
 * Delete order from Firestore
 */
export async function deleteOrderFromFirestore(orderId) {
  if (!db) initFirebase();
  if (!db) return;

  try {
    const idStr = String(orderId);
    const docRef = doc(db, "orders", idStr);
    await deleteDoc(docRef);
    console.log("✅ Order deleted from Firestore:", orderId);
  } catch (error) {
    console.error("❌ Failed to delete order from Firestore:", error);
    throw error;
  }
}

/**
 * Listen for live orders updates
 */
export function subscribeToOrders(callback) {
  if (!db) initFirebase();
  if (!db) return () => {};

  try {
    const colRef = collection(db, "orders");
    return onSnapshot(colRef, (snapshot) => {
      const orders = [];
      snapshot.forEach((d) => orders.push(d.data()));
      orders.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
      callback(orders);
    }, (error) => {
      console.warn("⚠️ Order live sync warning:", error);
    });
  } catch (e) {
    console.warn("⚠️ Order live sync setup failed:", e);
    return () => {};
  }
}

/**
 * Store settings sync
 */
export async function getStoreSettingsFromFirestore() {
  if (!db) initFirebase();
  if (!db) return null;

  try {
    const docRef = doc(db, "settings", "store");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.warn("⚠️ Could not load settings from Firestore:", e);
  }
  return null;
}

export async function saveStoreSettingsToFirestore(settings) {
  if (!db) initFirebase();
  if (!db) return;

  try {
    const docRef = doc(db, "settings", "store");
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("✅ Settings saved to Firestore");
  } catch (e) {
    console.error("❌ Failed to save settings to Firestore:", e);
  }
}

/**
 * Hero slides sync
 */
export async function getHeroSlidesFromFirestore() {
  if (!db) initFirebase();
  if (!db) return null;

  try {
    const docRef = doc(db, "hero_slides", "main");
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data().slides)) {
      return snap.data().slides;
    }
  } catch (e) {
    console.warn("⚠️ Could not load hero slides from Firestore:", e);
  }
  return null;
}

export async function saveHeroSlidesToFirestore(slides) {
  if (!db) initFirebase();
  if (!db) return;

  try {
    const docRef = doc(db, "hero_slides", "main");
    await setDoc(docRef, {
      slides,
      updatedAt: new Date().toISOString()
    });
    console.log("✅ Hero slides saved to Firestore");
  } catch (e) {
    console.error("❌ Failed to save hero slides to Firestore:", e);
  }
}

/**
 * Test whether the current Firestore rules allow writing.
 * Returns { ok: true } or { ok: false, error: 'permission-denied' | string }
 */
export async function testFirestorePermissions() {
  if (!db) initFirebase();
  if (!db) return { ok: false, error: "Firebase initialization failed" };

  try {
    const pingRef = doc(db, "_health_check", "ping");
    await setDoc(pingRef, { timestamp: new Date().toISOString() });
    return { ok: true };
  } catch (err) {
    const code = err.code || "";
    const isPermission = code.includes("permission-denied") || err.message?.includes("Missing or insufficient permissions");
    return {
      ok: false,
      isPermissionDenied: isPermission,
      error: err.message || String(err),
      code: err.code || "unknown"
    };
  }
}

/**
 * Seed all catalog products, store settings, and sample data into Firestore.
 */
export async function seedAllDataToFirestore(products = [], orders = [], settings = null, heroSlides = null) {
  if (!db) initFirebase();
  if (!db) throw new Error("Firebase is not initialized");

  const results = {
    productsUploaded: 0,
    ordersUploaded: 0,
    settingsUploaded: false,
    heroSlidesUploaded: false
  };

  // 1. Upload products
  if (Array.isArray(products) && products.length > 0) {
    for (const p of products) {
      const idStr = String(p.id);
      const docRef = doc(db, "products", idStr);
      await setDoc(docRef, {
        ...p,
        id: Number(p.id) || p.id,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      results.productsUploaded++;
    }
  }

  // 2. Upload orders
  if (Array.isArray(orders) && orders.length > 0) {
    for (const o of orders) {
      const idStr = String(o.id);
      const docRef = doc(db, "orders", idStr);
      await setDoc(docRef, {
        ...o,
        id: idStr,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      results.ordersUploaded++;
    }
  }

  // 3. Upload store settings
  if (settings) {
    const docRef = doc(db, "settings", "store");
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    results.settingsUploaded = true;
  }

  // 4. Upload hero slides
  if (Array.isArray(heroSlides) && heroSlides.length > 0) {
    const docRef = doc(db, "hero_slides", "main");
    await setDoc(docRef, {
      slides: heroSlides,
      updatedAt: new Date().toISOString()
    });
    results.heroSlidesUploaded = true;
  }

  return results;
}

// Attach to window for global access from classic script files
window.TechKitchDB = {
  initFirebase,
  testFirestorePermissions,
  seedAllDataToFirestore,
  syncProductsFromFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  createOrderInFirestore,
  getOrdersFromFirestore,
  updateOrderInFirestore,
  deleteOrderFromFirestore,
  subscribeToOrders,
  getStoreSettingsFromFirestore,
  saveStoreSettingsToFirestore,
  getHeroSlidesFromFirestore,
  saveHeroSlidesToFirestore,
  getActiveConfig,
  USER_FIREBASE_CONFIG,
  APPLET_CONFIG: appletConfig
};

// Dispatch database ready event
window.dispatchEvent(new CustomEvent("techkitch:db-ready", { detail: { isConnected: true, activeConfig } }));
