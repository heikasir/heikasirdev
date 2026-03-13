// ==================== state.js ====================
// State global aplikasi kasir

window.state = {
    // ========== INFORMASI OWNER ==========
    user: null,                // User Firebase (objek)
    ownerId: null,              // ID dokumen di Master_Owners

    // ========== INFORMASI KASIR ==========
    employee: null,             // { id, name, username, outletId, role, shift }
    outlet: null,                // { id, name, ... } data outlet tempat kasir bekerja
    shift: null,                 // { id, startTime, startingCash, status }

    // ========== KERANJANG BELANJA ==========
    cart: [],                    // Array item { id, name, prices, qty, isManual, taxPpn, calculatedHpp }
    selectedPaymentMethod: 'tunai', // Metode pembayaran aktif
    cartSubtotal: 0,             // Subtotal sementara (untuk keperluan UI)
    cartTax: 0,                  // Total pajak sementara
    cartDiscount: 0,             // Diskon manual sementara
    cartTotal: 0,                // Total akhir sementara

    // ========== PRINTER BLUETOOTH ==========
    printer: {
        connected: false,
        device: null,
        service: null,
        characteristic: null
    },

    // ========== NAVIGASI ==========
    page: 'transaksi',           // Halaman aktif

    // ========== LISTENER FIRESTORE ==========
    unsubscribers: [],           // Array fungsi untuk berhenti mendengarkan perubahan

    // ========== DATA STATIS (DIMUAT SAAT LOGIN) ==========
    /**
     * Ingredients dalam bentuk Map (object) dengan key = ingredientId
     * Contoh:
     * {
     *   "ing123": { name: "Gula", unit: "kg", currentStock: 10, avgBuyPrice: 12000, lastPurchasePrice: 12500, ... },
     *   "ing456": { ... }
     * }
     */
    ingredients: {},

    /**
     * Menu dalam bentuk array, masing-masing berisi data menu + recipe.
     * Sudah difilter berdasarkan outlet dan isActive.
     * Contoh:
     * [
     *   { id: "menu1", name: "Es Teh", prices: { tunai: 5000, gofood: 5500 }, recipe: [{ ingId: "ing123", qty: 0.2 }], ... },
     *   { id: "menu2", name: "Nasi Goreng", ... }
     * ]
     */
    menu: []
};