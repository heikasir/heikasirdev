// ==================== transaksi-manual.js ====================
// Modal input manual

// Sudah ada di HTML, tinggal event listener
document.getElementById('addManualBtn')?.addEventListener('click', () => {
    const name = document.getElementById('manualName').value.trim();
    const price = parseInt(document.getElementById('manualPrice').value.replace(/[^0-9]/g, '')) || 0;
    const qty = parseInt(document.getElementById('manualQty').value) || 1;
    if (!name || price <= 0) {
        utils.showToast('Isi nama dan harga dengan benar', 'error');
        return;
    }
    addManualToCart(name, price, qty);
    closeManualModal();
    // Reset form
    document.getElementById('manualName').value = '';
    document.getElementById('manualPrice').value = '';
    document.getElementById('manualQty').value = '1';
});