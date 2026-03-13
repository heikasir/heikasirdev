// ==================== stok-alert.js ====================
// Peringatan stok menipis (bisa ditampilkan di header atau notifikasi)

let stockAlertInterval = null;

async function checkStockAlert() {
    const ingredients = await dbHelpers.getIngredients();
    const lowStock = ingredients.filter(i => (i.currentStock || 0) <= (i.minStock || 0));
    if (lowStock.length > 0) {
        // Tampilkan notifikasi jika ada
        utils.showToast(`${lowStock.length} bahan stok menipis`, 'warning');
        // Bisa juga tambahkan badge di navigasi
    }
    return lowStock;
}

function startStockAlert() {
    if (stockAlertInterval) clearInterval(stockAlertInterval);
    stockAlertInterval = setInterval(checkStockAlert, 60000); // setiap 1 menit
    console.log('🔄 Stock alert interval dimulai');
}

function stopStockAlert() {
    if (stockAlertInterval) {
        clearInterval(stockAlertInterval);
        stockAlertInterval = null;
        console.log('⏹️ Stock alert interval dihentikan');
    }
}

// Ekspos fungsi ke window
window.startStockAlert = startStockAlert;
window.stopStockAlert = stopStockAlert;

// Panggil startStockAlert saat kasir login nanti (misal di auth-pin.js setelah login sukses)
// Dan panggil stopStockAlert saat logout (di auth-logout.js)