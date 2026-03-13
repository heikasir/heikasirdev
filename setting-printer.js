// ==================== setting-printer.js ====================
// Pengaturan printer (ukuran kertas, dll) - sederhana

// Untuk sementara, kita hanya menyimpan preferensi di localStorage
function savePrinterSettings(settings) {
    utils.setLocal('printerSettings', settings);
}

function getPrinterSettings() {
    return utils.getLocal('printerSettings') || { paperSize: '58mm', charactersPerLine: 32 };
}