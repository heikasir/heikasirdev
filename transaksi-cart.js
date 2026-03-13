// ==================== transaksi-cart.js ====================
// Manajemen Keranjang Belanja Kasir Pro

if (!state.cart) state.cart = [];
if (!state.selectedPaymentMethod) state.selectedPaymentMethod = 'tunai';

window.addToCart = (menu) => {
    try {
        console.log("🛒 Menambahkan ke keranjang:", menu.name);
        const existing = state.cart.find(i => i.id === menu.id && !i.isManual);
        
        // Pastikan objek prices tersedia (guard clause)
        const prices = menu.prices || { tunai: 0 };
        
        if (existing) {
            existing.qty += 1;
        } else {
            state.cart.push({
                id: menu.id,
                name: menu.name,
                prices: prices,
                qty: 1,
                isManual: false,
                taxPpn: menu.taxPpn || 0,
                calculatedHpp: menu.calculatedHpp || 0
            });
        }
        renderCart();
        utils.showToast(`${menu.name} ditambah`, 'success');
    } catch (e) {
        console.error("❌ Gagal tambah ke keranjang:", e);
    }
};

window.addManualToCart = (name, price, qty) => {
    try {
        console.log("⌨️ Input Manual:", name);
        state.cart.push({
            id: 'manual_' + Date.now(),
            name: name,
            prices: { tunai: price, gofood: price, shopeefood: price },
            qty: qty,
            isManual: true,
            taxPpn: 0,
            calculatedHpp: 0
        });
        renderCart();
    } catch (e) {
        console.error("❌ Gagal input manual:", e);
    }
};

window.updateCartQty = (id, delta) => {
    try {
        const item = state.cart.find(i => i.id === id);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                state.cart = state.cart.filter(i => i.id !== id);
            }
        }
        renderCart();
    } catch (e) {
        console.error("❌ Gagal update qty:", e);
    }
};

window.removeFromCart = (id) => {
    try {
        state.cart = state.cart.filter(i => i.id !== id);
        renderCart();
    } catch (e) {
        console.error("❌ Gagal hapus item:", e);
    }
};

function renderCart() {
    console.log("🎨 Me-render Keranjang...");
    const container = document.getElementById('cartItems');
    if (!container) {
        console.warn("⚠️ Elemen #cartItems tidak ditemukan di HTML.");
        return;
    }

    try {
        const method = state.selectedPaymentMethod || 'tunai';
        let subtotal = 0;
        let totalTax = 0;
        let html = '';

        state.cart.forEach(item => {
            // Ambil harga berdasarkan metode pembayaran (tunai/gofood/dll)
            const price = item.prices[method] || item.prices.tunai || 0;
            const itemSubtotal = price * item.qty;
            subtotal += itemSubtotal;
            
            if (item.taxPpn) {
                totalTax += itemSubtotal * (item.taxPpn / 100);
            }

            html += `
                <div class="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                    <div class="flex-1 pr-2">
                        <p class="font-bold text-gray-900 dark:text-white">${item.name}</p>
                        <p class="text-[10px] text-gray-500">${utils.formatRupiah(price)} x ${item.qty}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-purple-600 dark:text-purple-400 mr-2">${utils.formatRupiah(itemSubtotal)}</span>
                        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                            <button onclick="updateCartQty('${item.id}', -1)" class="w-6 h-6 rounded-full bg-white dark:bg-gray-700 text-red-500 flex items-center justify-center shadow-sm"><i class="fas fa-minus text-[10px]"></i></button>
                            <span class="w-6 text-center text-xs font-bold">${item.qty}</span>
                            <button onclick="updateCartQty('${item.id}', 1)" class="w-6 h-6 rounded-full bg-white dark:bg-gray-700 text-green-500 flex items-center justify-center shadow-sm"><i class="fas fa-plus text-[10px]"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<p class="text-center text-gray-400 py-10">Keranjang Kosong</p>';
        
        // Kalkulasi Akhir
        const discountInput = document.getElementById('cartDiscountInput');
        const discountValue = discountInput ? parseInt(discountInput.value.replace(/[^0-9]/g, '')) || 0 : 0;
        const finalTotal = subtotal - discountValue + totalTax;
        
        // Update UI Ringkasan (Gunakan optional chaining agar tidak crash jika ID tidak ada)
        if (document.getElementById('cartSubtotal')) document.getElementById('cartSubtotal').innerText = utils.formatRupiah(subtotal);
        if (document.getElementById('cartTotal')) document.getElementById('cartTotal').innerText = utils.formatRupiah(finalTotal);

        // Simpan ke state global untuk digunakan saat bayar
        state.cartSubtotal = subtotal;
        state.cartTax = totalTax;
        state.cartDiscount = discountValue;
        state.cartTotal = finalTotal;

    } catch (e) {
        console.error("❌ renderCart Crash:", e);
    }
}

// Global Listener untuk Diskon
document.addEventListener('input', (e) => {
    if (e.target.id === 'cartDiscountInput') {
        renderCart();
    }
});

window.renderCart = renderCart;