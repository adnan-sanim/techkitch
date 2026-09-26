import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection } from "firebase/firestore";

const config = {
  apiKey: "AIzaSyCJhXNzN6m7md4F2S8s9nADJr2l4OXJgJY",
  authDomain: "techkitch-5a987.firebaseapp.com",
  projectId: "techkitch-5a987",
  storageBucket: "techkitch-5a987.firebasestorage.app",
  messagingSenderId: "96532562867",
  appId: "1:96532562867:web:4e1b4378ca2c5c582f81c6",
  measurementId: "G-H4D83ZD10P"
};

const app = initializeApp(config, "seed-app");
const db = getFirestore(app);

const PRODUCTS = [
  {
    id: 1,
    name: "Hoco W55 Plus Extra 170H Long Usage ANC Headphone",
    category: "Headphone",
    price: 1890,
    oldPrice: 1980,
    images: [
      "https://i.postimg.cc/JhrB7Pzz/Screenshot-(305).png",
      "https://i.postimg.cc/R0SnCXZ3/Screenshot-(306).png",
      "https://i.postimg.cc/0NkJ5cyK/Screenshot-(308).png"
    ],
    description: "Battery: Industry-leading 170 Hours total playback (ANC off) | USB-C fast charge.\nNoise Canceling: Active Noise Cancellation (ANC) up to -28dB.\nSound: 40 mm dynamic drivers for deep bass and crisp audio.\nConnectivity: Bluetooth 5.4, 3.5mm AUX, and TF card support.\nDesign: Lightweight, foldable, and cushioned protein-leather earcups.",
    stock: 24,
    badge: "Best Seller"
  },
  {
    id: 2,
    name: "Hoco W103 Gaming Headphone",
    category: "Headphone",
    price: 1250,
    oldPrice: 1380,
    images: [
      "https://i.postimg.cc/FKGGhT0R/Screenshot-(316).png",
      "https://i.postimg.cc/cH2zNDNf/Screenshot-(317).png",
      "https://i.postimg.cc/CLHcvMdy/Screenshot-(318).png",
      "https://i.postimg.cc/W18f4pPQ/Screenshot-(314).png"
    ],
    description: "Drivers: 40mm tuned for immersive gaming audio.\nMicrophone: Dedicated Phi 6.0 x 2.2mm mic for clear voice chat.\nConnectivity: Universal 3.5mm jack with a 1.2m durable cable.\nComfort: Ultra-lightweight (184g) with cushioned ear pads.\nWarranty: 7-day replacement warranty.",
    stock: 15,
    badge: "New"
  },
  {
    id: 3,
    name: "Xiaomi AISOLOVE F01 Handheld Turbo Fan (2000mAh Battery) – Green Color",
    category: "Rechargeable Fan",
    price: 1220,
    oldPrice: 1320,
    images: [
      "https://i.postimg.cc/j5G4yLgM/Screenshot-(319).png",
      "https://i.postimg.cc/gJDb5wB1/Screenshot-(320).png",
      "https://i.postimg.cc/Kj597H3p/Screenshot-(321).png",
      "https://i.postimg.cc/xT8WpQf0/Screenshot-(322).png"
    ],
    description: "Airflow: High-speed turbo blades delivering powerful concentrated airflow.\nBattery: Built-in 2000mAh rechargeable battery.\nPortability: Compact, handheld ergonomic design with stand.\nControls: 3-speed adjustable airflow.",
    stock: 18,
    badge: "Hot"
  },
  {
    id: 4,
    name: "Awei Y386 Bluetooth Speaker",
    category: "Speakers",
    price: 1550,
    oldPrice: 1750,
    images: [
      "https://i.postimg.cc/wMsK4pGf/Screenshot-(323).png",
      "https://i.postimg.cc/k4GkPvYQ/Screenshot-(324).png",
      "https://i.postimg.cc/y8m0k4q2/Screenshot-(325).png"
    ],
    description: "Sound: 360-degree surrounding stereo with dynamic bass radiators.\nLighting: RGB atmosphere lights syncing with audio beats.\nBattery: 1200mAh providing 5-6 hours of continuous playtime.\nConnectivity: Bluetooth 5.1, TF Card, AUX, USB Flash Drive.",
    stock: 20,
    badge: "Popular"
  },
  {
    id: 5,
    name: "Awei Y528 Bluetooth Speaker",
    category: "Speakers",
    price: 2150,
    oldPrice: 2450,
    images: [
      "https://i.postimg.cc/bvv6vN1p/Screenshot-(326).png",
      "https://i.postimg.cc/hGv5kZ10/Screenshot-(327).png",
      "https://i.postimg.cc/FzXfQ5qG/Screenshot-(328).png"
    ],
    description: "Output: Dual speaker setup delivering powerful punchy bass and crystal vocals.\nRGB Mode: Multi-color pulsing ambient LED rings.\nBattery: Long-lasting lithium-ion rechargeable cell.\nBuild: Premium matte finish with durable metal mesh.",
    stock: 12,
    badge: "Sale"
  },
  {
    id: 6,
    name: "Awei Y382 Portable Bluetooth Speaker",
    category: "Speakers",
    price: 1390,
    oldPrice: 1550,
    images: [
      "https://i.postimg.cc/c4b8V5hL/Screenshot-(329).png",
      "https://i.postimg.cc/zGzR8m5f/Screenshot-(330).png",
      "https://i.postimg.cc/ht5jD3sP/Screenshot-(331).png"
    ],
    description: "Design: Ultra-compact pocket speaker with lanyard strap for outdoors.\nAudio: Clear midrange and crisp highs with passive bass radiator.\nBattery: 5+ hours playtime.\nBluetooth: Instant pairing with 10m range.",
    stock: 25,
    badge: "Compact"
  },
  {
    id: 7,
    name: "Awei P134K 20000mAh Power Bank",
    category: "Power Bank",
    price: 1590,
    oldPrice: 1750,
    images: [
      "https://i.postimg.cc/XvL4W2yP/Screenshot-(332).png",
      "https://i.postimg.cc/sgQpBfN8/Screenshot-(333).png",
      "https://i.postimg.cc/52j4K9bL/Screenshot-(334).png"
    ],
    description: "Capacity: Huge 20,000mAh high-density Li-polymer cell.\nDisplay: Digital LED battery percentage display.\nPorts: Dual USB outputs + Type-C and Micro-USB dual inputs.\nProtection: Multi-level short-circuit and over-voltage safeguards.",
    stock: 30,
    badge: "Best Value"
  },
  {
    id: 8,
    name: "Hoco J101B 30000mAh 22.5W Fast Charging Power Bank",
    category: "Power Bank",
    price: 2350,
    oldPrice: 2600,
    images: [
      "https://i.postimg.cc/x8T5k3mN/Screenshot-(335).png",
      "https://i.postimg.cc/6pB8v9xQ/Screenshot-(336).png",
      "https://i.postimg.cc/5yD8M3kZ/Screenshot-(337).png"
    ],
    description: "Speed: 22.5W Super Charge / PD 20W Fast Charging.\nCapacity: Massive 30,000mAh for days of off-grid mobile power.\nCompatibility: QC3.0, PD3.0, FCP, AFC protocols supported.\nIndicator: LED level indicators.",
    stock: 14,
    badge: "Super Fast"
  },
  {
    id: 9,
    name: "Awei P13K 10000mAh Power Bank",
    category: "Power Bank",
    price: 1050,
    oldPrice: 1200,
    images: [
      "https://i.postimg.cc/KYLg9kQv/Screenshot-(338).png",
      "https://i.postimg.cc/59c7y8kR/Screenshot-(339).png"
    ],
    description: "Portability: Slim, travel-friendly 10,000mAh battery pack.\nOutputs: Dual 2.1A USB fast charging ports.\nFinish: Textured anti-scratch matte outer shell.\nCertification: Safe for airline carry-on.",
    stock: 22,
    badge: "Essential"
  },
  {
    id: 10,
    name: "Awei Y385 Mini Outdoor Bluetooth Speaker",
    category: "Speakers",
    price: 1190,
    oldPrice: 1350,
    images: [
      "https://i.postimg.cc/L8v8D1fM/Screenshot-(340).png",
      "https://i.postimg.cc/9F7c6b5V/Screenshot-(341).png"
    ],
    description: "Form Factor: Palm-sized mini outdoor speaker with tough silicone strap.\nAudio: Surprisingly punchy bass with balanced highs.\nBattery: Up to 6 hours continuous music playback.",
    stock: 19,
    badge: "Pocket Size"
  },
  {
    id: 11,
    name: "MIIIW Type-C 4-Port USB Hub",
    category: "Hubs & Adapters",
    price: 890,
    oldPrice: 990,
    images: [
      "https://i.postimg.cc/Qd2g5L7k/Screenshot-(342).png",
      "https://i.postimg.cc/bvz3M4xN/Screenshot-(343).png"
    ],
    description: "Connectivity: Expands 1 Type-C port into 4 high-speed USB 3.0 ports.\nSpeed: Up to 5Gbps file transfer rate.\nBuild: Premium aluminum alloy body with braided stress-relief cable.\nCompatibility: Plug and play on macOS, Windows, Linux, Android.",
    stock: 40,
    badge: "Top Pick"
  },
  {
    id: 12,
    name: "Hoco HB31 4-Port USB 3.0 Hub",
    category: "Hubs & Adapters",
    price: 820,
    oldPrice: 920,
    images: [
      "https://i.postimg.cc/Y9D9j1bQ/Screenshot-(344).png",
      "https://i.postimg.cc/zX3G0x7v/Screenshot-(345).png"
    ],
    description: "Expansion: 4 standard USB 3.0 ports for mouse, keyboard, flash drive, external SSD.\nSpeed: 5Gbps ultra-fast data transfer.\nDesign: Slim compact profile with LED status indicator.",
    stock: 35,
    badge: "Popular"
  }
];

export async function runSeed() {
  console.log("🚀 Starting seed to Firestore project: techkitch-5a987...");

  // 1. Upload products
  let count = 0;
  for (const product of PRODUCTS) {
    const docRef = doc(db, "products", String(product.id));
    await setDoc(docRef, {
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    count++;
    console.log(`✅ Uploaded product ${count}/${PRODUCTS.length}: ${product.name}`);
  }

  // 2. Upload store settings
  const settingsRef = doc(db, "settings", "store");
  await setDoc(settingsRef, {
    shippingFee: 60,
    freeShippingThreshold: 3000,
    supportPhone: "+880 1800-000000",
    supportEmail: "techkitch.bd@gmail.com",
    facebookUrl: "https://facebook.com/techkitch",
    updatedAt: new Date().toISOString()
  });
  console.log("✅ Uploaded store settings");

  // 3. Upload sample order
  const orderRef = doc(db, "orders", "TK-84291");
  await setDoc(orderRef, {
    id: "TK-84291",
    customer: {
      name: "Adnan Chowdhury",
      phone: "01712345678",
      email: "adnan20370@gmail.com",
      address: "House 12, Road 4, Dhanmondi",
      city: "Dhaka",
      zip: "1205"
    },
    items: [
      {
        id: 1,
        name: "Hoco W55 Plus Extra 170H Long Usage ANC Headphone",
        price: 1890,
        qty: 1,
        image: "https://i.postimg.cc/JhrB7Pzz/Screenshot-(305).png"
      }
    ],
    subtotal: 1890,
    shipping: 60,
    tax: 0,
    total: 1950,
    status: "Delivered",
    paymentMethod: "Cash on Delivery",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });
  console.log("✅ Uploaded initial sample order");

  console.log("🎉 ALL DATA SEEDED SUCCESSFULLY TO FIRESTORE!");
}

if (process.argv[1]?.endsWith("seed-firestore.mjs")) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed failed:", err.code || err.message);
      process.exit(1);
    });
}
