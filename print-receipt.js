// ==================== print-receipt.js ====================
// Fungsi Cetak Struk Web (Safe Mode)

function printReceiptHTML(transaction, win = null) {
    if (!win) {
        console.warn("⚠️ Window cetak diblokir browser.");
        utils.showToast("Buka blokir popup untuk mencetak", "warning");
        return;
    }

    try {
        console.log("📄 Menulis struk ke window...");
        win.document.write(`
            <html>
            <head>
                <title>Struk HeiKasir</title>
                <style>
                    body { font-family: monospace; width: 58mm; padding: 2mm; font-size: 11px; }
                    .center { text-align: center; }
                    .item { display: flex; justify-content: space-between; margin: 1mm 0; }
                    hr { border: 0; border-top: 1px dashed #000; }
                </style>
            </head>
            <body>
                <div class="center">
                    <h3>HeiKasir</h3>
                    <p>${new Date().toLocaleString('id-ID')}</p>
                    <p>Kasir: ${transaction.cashier_name}</p>
                </div>
                <hr>
                ${transaction.items.map(i => `
                    <div class="item">
                        <span>${i.name} x${i.qty}</span>
                        <span>${(i.price * i.qty).toLocaleString('id-ID')}</span>
                    </div>
                `).join('')}
                <hr>
                <div class="item"><span>Subtotal</span><span>${transaction.subtotal.toLocaleString('id-ID')}</span></div>
                ${transaction.discount ? `<div class="item"><span>Diskon</span><span>-${transaction.discount.toLocaleString('id-ID')}</span></div>` : ''}
                <div class="item"><strong>TOTAL</strong><strong>Rp${transaction.total.toLocaleString('id-ID')}</strong></div>
                <p class="center">Terima kasih</p>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        win.document.close();
    } catch (e) {
        console.error("❌ Gagal tulis struk:", e);
        win.close();
    }
}

window.printReceiptHTML = printReceiptHTML;