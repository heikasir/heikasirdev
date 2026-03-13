// ==================== transaksi-payment.js ====================
// Modal pembayaran - versi lengkap dengan selalu antri (saveWithQueue)
// Tidak ada operasi Firestore langsung, hanya saveWithQueue ke IndexedDB

// ==================================================================
//                        INISIALISASI
// ==================================================================

let paymentMethods = [];

function initPaymentMethods() {
    console.log('💳 [initPaymentMethods] Memuat metode pembayaran default');
    paymentMethods = [
        { id: 'tunai', label: 'Tunai', icon: 'fa-money-bill-wave' },
        { id: 'gofood', label: 'GoFood', icon: 'fa-motorcycle' },
        { id: 'shopeefood', label: 'ShopeeFood', icon: 'fa-shopping-bag' },
        { id: 'qris', label: 'QRIS', icon: 'fa-qrcode' },
        { id: 'transfer', label: 'Transfer', icon: 'fa-university' }
    ];
    console.log('✅ [initPaymentMethods] Metode pembayaran:', paymentMethods);
}

// ==================================================================
//                   FUNGSI UPDATE UI KERANJANG
// ==================================================================

/**
 * Memperbarui tampilan keranjang berdasarkan metode pembayaran yang dipilih
 */
function updatePricesForMethod(method) {
    console.log(`🔄 [updatePricesForMethod] Mengupdate harga untuk metode '${method}'`);
    state.selectedPaymentMethod = method;
    renderCart(); // fungsi dari transaksi-cart.js
    // Update nilai di modal pembayaran
    const subtotalEl = document.getElementById('paymentSubtotal');
    const taxEl = document.getElementById('paymentTax');
    const totalEl = document.getElementById('paymentTotal');
    if (subtotalEl) subtotalEl.innerText = utils.formatRupiah(state.cartSubtotal || 0);
    if (taxEl) taxEl.innerText = utils.formatRupiah(state.cartTax || 0);
    if (totalEl) totalEl.innerText = utils.formatRupiah(state.cartTotal || 0);
    console.log(`✅ [updatePricesForMethod] Subtotal: ${state.cartSubtotal}, Total: ${state.cartTotal}`);
}

/**
 * Menampilkan atau menyembunyikan bagian input tunai
 */
function toggleCashSection() {
    const method = document.getElementById('paymentMethod')?.value;
    console.log(`💵 [toggleCashSection] Metode yang dipilih: ${method}`);
    const cashSection = document.getElementById('paymentCashSection');
    if (!cashSection) {
        console.warn('⚠️ [toggleCashSection] Elemen #paymentCashSection tidak ditemukan');
        return;
    }
    if (method === 'tunai') {
        cashSection.classList.remove('hidden');
    } else {
        cashSection.classList.add('hidden');
    }
    updatePricesForMethod(method);
}

/**
 * Menghitung kembalian
 */
function calculateChange() {
    const total = state.cartTotal || 0;
    const cashInput = document.getElementById('paymentCashInput')?.value.replace(/[^0-9]/g, '') || '0';
    const cash = parseInt(cashInput) || 0;
    const change = cash - total;
    console.log(`🧮 [calculateChange] Total: ${total}, Uang: ${cash}, Kembali: ${change}`);
    const changeEl = document.getElementById('paymentChange');
    if (changeEl) changeEl.innerText = utils.formatRupiah(change >= 0 ? change : 0);
}

// ==================================================================
//                   FUNGSI MEMBUKA MODAL PEMBAYARAN
// ==================================================================

window.openPaymentModal = () => {
    console.log('💰 [openPaymentModal] MEMBUKA MODAL PEMBAYARAN');
    console.log('📦 [openPaymentModal] State cart saat ini:', state.cart);

    initPaymentMethods();

    const modal = document.getElementById('paymentModal');
    if (!modal) {
        console.error('❌ [openPaymentModal] Elemen #paymentModal tidak ditemukan');
        return;
    }

    const methodSelect = document.getElementById('paymentMethod');
    if (methodSelect) {
        methodSelect.innerHTML = paymentMethods.map(m => `<option value="${m.id}">${m.label}</option>`).join('');
        methodSelect.value = state.selectedPaymentMethod || 'tunai';
    } else {
        console.warn('⚠️ [openPaymentModal] Elemen #paymentMethod tidak ditemukan');
    }

    // Update tampilan
    updatePricesForMethod(state.selectedPaymentMethod || 'tunai');
    document.getElementById('paymentSubtotal').innerText = utils.formatRupiah(state.cartSubtotal || 0);
    document.getElementById('paymentTax').innerText = utils.formatRupiah(state.cartTax || 0);
    document.getElementById('paymentTotal').innerText = utils.formatRupiah(state.cartTotal || 0);
    document.getElementById('paymentDiscountDisplay').innerText = utils.formatRupiah(state.cartDiscount || 0);
    const customerInput = document.getElementById('paymentCustomer');
    if (customerInput) customerInput.value = 'Reg';

    toggleCashSection();
    modal.classList.remove('hidden');
    console.log('✅ [openPaymentModal] Modal ditampilkan');
};

// ==================================================================
//                   FUNGSI MENUTUP MODAL PEMBAYARAN
// ==================================================================

window.closePaymentModal = () => {
    console.log('🔒 [closePaymentModal] Menutup modal pembayaran');
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.add('hidden');
};

// ==================================================================
//                   EVENT LISTENER
// ==================================================================

// Ketika metode pembayaran berubah
document.getElementById('paymentMethod')?.addEventListener('change', (e) => {
    console.log(`🔄 [event] Metode pembayaran berubah menjadi '${e.target.value}'`);
    toggleCashSection();
});

// Ketika input uang tunai berubah
document.getElementById('paymentCashInput')?.addEventListener('input', calculateChange);

// Ketika tombol nominal cepat diklik
document.querySelectorAll('.cash-amount')?.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const amount = e.target.dataset.amount;
        console.log(`💰 [event] Tombol tunai Rp${amount} diklik`);
        const cashInput = document.getElementById('paymentCashInput');
        if (cashInput) {
            cashInput.value = amount;
            calculateChange();
        }
    });
});

// ==================================================================
//                   TOMBOL BAYAR (INTI)
// ==================================================================

document.getElementById('paymentConfirmBtn')?.addEventListener('click', async () => {
    console.log('🟢 [PAYMENT] ========== TOMBOL BAYAR DIKLIK ==========');

    // ==================== VALIDASI AWAL ====================
    if (!state.ownerId || !state.employee) {
        console.error('❌ [PAYMENT] Sesi tidak valid', { ownerId: state.ownerId, employee: state.employee });
        utils.showToast('Sesi tidak valid, silakan login ulang', 'error');
        return;
    }

    if (state.cart.length === 0) {
        console.warn('⚠️ [PAYMENT] Keranjang kosong');
        utils.showToast('Keranjang kosong', 'warning');
        return;
    }

    const method = document.getElementById('paymentMethod')?.value || 'tunai';
    const customer = document.getElementById('paymentCustomer')?.value.trim() || 'Reg';
    console.log(`📝 [PAYMENT] Data: metode=${method}, customer=${customer}`);

    // Validasi khusus tunai
    if (method === 'tunai') {
        const cashInput = document.getElementById('paymentCashInput')?.value.replace(/[^0-9]/g, '') || '0';
        const cash = parseInt(cashInput) || 0;
        console.log(`💵 [PAYMENT] Uang tunai: ${cash}, Total yang harus dibayar: ${state.cartTotal}`);
        if (cash < state.cartTotal) {
            console.warn('⚠️ [PAYMENT] Uang kurang');
            utils.showToast('Uang kurang', 'error');
            return;
        }
    }

    // Buka jendela cetak untuk menghindari pop-up blocker
    let printWindow = null;
    if (!bluetoothPrinter.connected) {
        console.log('🖨️ [PAYMENT] Membuka jendela cetak...');
        printWindow = window.open('', '_blank');
        if (!printWindow) {
            console.warn('⚠️ [PAYMENT] Pop-up diblokir, cetak mungkin gagal');
            utils.showToast('Izinkan pop-up untuk mencetak struk', 'warning');
        }
    }

    utils.showLoading();
    console.log('⏳ [PAYMENT] Loading dimulai');

    try {
        // ==================== HITUNG TOTAL HPP (opsional, dari state) ====================
        // Jika ingin hitung HPP, bisa menggunakan data dari state.ingredients dan state.menu
        // Untuk sederhana, kita set 0 dulu
        const totalHpp = 0; // atau hitung jika perlu

        // ==================== HITUNG ITEM TERJUAL ====================
        const itemsSold = state.cart.reduce((sum, item) => sum + item.qty, 0);
        console.log(`📦 [PAYMENT] Total item terjual: ${itemsSold}`);

        // ==================== BUAT OBJEK TRANSAKSI ====================
        const transaction = {
            items: state.cart.map(i => ({
                menu_id: i.isManual ? null : i.id,
                name: i.name,
                price: i.price,
                qty: i.qty,
                subtotal: i.price * i.qty
            })),
            subtotal: state.cartSubtotal,
            discount: state.cartDiscount,
            tax: state.cartTax,
            total: state.cartTotal,
            total_hpp: totalHpp,
            payment_method: method,
            customer: customer,
            cashier_id: state.employee.id,
            cashier_name: state.employee.name,
            outletId: state.employee.outletId,
            shiftId: state.shift?.id,
            timestamp: Date.now(), // pakai timestamp lokal, nanti saat sync diganti serverTimestamp
            is_void: false
        };
        console.log('📄 [PAYMENT] Objek transaksi:', transaction);

        // ==================== SIMPAN TRANSAKSI KE ANTRIAN (SELALU) ====================
        console.log('💾 [PAYMENT] Menyimpan transaksi ke antrian...');
        const result = await saveWithQueue('transactions', transaction, 'create');
        console.log('📦 [PAYMENT] Hasil saveWithQueue:', result);

        if (!result.success) {
            throw new Error(result.error || 'Gagal menyimpan transaksi ke antrian');
        }

        // ==================== CETAK STRUK ====================
        console.log('🖨️ [PAYMENT] Mencetak struk...');
        if (bluetoothPrinter.connected) {
            await bluetoothPrinter.printReceipt(transaction);
            console.log('✅ [PAYMENT] Cetak via Bluetooth');
        } else if (printWindow) {
            printReceiptHTML(transaction, printWindow);
            console.log('✅ [PAYMENT] Cetak via pop-up');
        } else {
            printReceiptHTML(transaction);
            console.log('✅ [PAYMENT] Cetak via tab baru');
        }

        // ==================== BERSIHKAN KERANJANG ====================
        state.cart = [];
        state.selectedPaymentMethod = 'tunai';
        renderCart(); // bersihkan tampilan keranjang
        closePaymentModal();

        console.log('🎉 [PAYMENT] Transaksi BERHASIL (tersimpan di antrian)!');
        utils.showToast('Transaksi berhasil', 'success');

    } catch (err) {
        console.error('❌ [PAYMENT] ERROR dalam proses pembayaran:', err);
        utils.showToast('Gagal: ' + err.message, 'error');
    } finally {
        utils.hideLoading();
        console.log('⏹️ [PAYMENT] Loading selesai');
    }
});