// ==================== riwayat-print.js ====================
// Cetak semua transaksi hari ini

async function printAllTransactions() {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(today);
    const end = new Date(today + 'T23:59:59.999Z');

    const snap = await db.collection('Owners').doc(state.ownerId).collection('Transactions')
        .where('outletId', '==', state.employee.outletId)
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .where('is_void', '==', false)
        .orderBy('timestamp', 'asc')
        .get();

    const transactions = snap.docs.map(d => d.data());

    if (transactions.length === 0) {
        utils.showToast('Tidak ada transaksi hari ini', 'info');
        return;
    }

    let allReceipts = '';
    transactions.forEach(t => {
        allReceipts += `
            <div style="page-break-after: always;">
                <div style="font-family: 'Courier New', monospace; font-size: 12px; width: 58mm; margin: 0 auto;">
                    <div style="text-align:center;">
                        <h2>HeiKasir</h2>
                        <p>${utils.formatDateTime(t.timestamp)}</p>
                        <p>Kasir: ${t.cashier_name}</p>
                    </div>
                    <hr>
                    ${t.items.map(i => `<p>${i.name} x${i.qty} @ ${utils.formatRupiah(i.price)} = ${utils.formatRupiah(i.subtotal)}</p>`).join('')}
                    <hr>
                    <p>Subtotal: ${utils.formatRupiah(t.subtotal)}</p>
                    ${t.discount ? `<p>Diskon: -${utils.formatRupiah(t.discount)}</p>` : ''}
                    <p><strong>Total: ${utils.formatRupiah(t.total)}</strong></p>
                    <p>Metode: ${t.payment_method}</p>
                    <hr>
                    <p style="text-align:center;">Terima kasih</p>
                </div>
            </div>
        `;
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Semua Transaksi</title>
            <style>body { margin: 0; }</style>
        </head>
        <body>
            ${allReceipts}
        </body>
        </html>
    `);
    printWindow.print();
}

window.printAllTransactions = printAllTransactions;