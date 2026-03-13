// ==================== riwayat-download.js ====================
// Download ringkasan sebagai JPEG

async function downloadRiwayatJpeg() {
    // Gunakan data dari halaman laporan yang sedang aktif (pages.laporan)
    const laporan = pages.laporan;
    if (!laporan || !laporan.summary) {
        utils.showToast('Data laporan belum tersedia. Muat ulang halaman Laporan terlebih dahulu.', 'error');
        return;
    }

    const element = document.createElement('div');
    element.className = 'bg-white p-6 rounded-2xl shadow-lg';
    element.style.width = '500px';
    element.style.fontFamily = 'Plus Jakarta Sans, sans-serif';
    
    const today = new Date().toLocaleDateString('id-ID');
    const startCash = state.shift?.startingCash || 0;
    const totalIncome = laporan.summary.totalIncome || 0;
    const totalExpense = laporan.summary.expenseKasir || 0;
    const cashOnHand = startCash + totalIncome - totalExpense;

    element.innerHTML = `
        <div style="text-align:center">
            <h1 style="font-size:24px; font-weight:800; color:#bf2c97;">HeiKasir</h1>
            <p style="font-size:12px; color:#666;">Laporan Kasir</p>
            <p style="font-size:14px; font-weight:bold;">${today}</p>
            <p style="font-size:14px;">Outlet: ${state.outlet?.name}</p>
            <p style="font-size:14px;">Kasir: ${state.employee?.name}</p>
        </div>
        <hr style="margin:15px 0;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:#f3f4f6; padding:10px; border-radius:10px;">
                <p style="font-size:11px; color:#666;">Modal Awal</p>
                <p style="font-size:18px; font-weight:bold;">${utils.formatRupiah(startCash)}</p>
            </div>
            <div style="background:#f3f4f6; padding:10px; border-radius:10px;">
                <p style="font-size:11px; color:#666;">Pendapatan</p>
                <p style="font-size:18px; font-weight:bold; color:#10b981;">${utils.formatRupiah(totalIncome)}</p>
            </div>
            <div style="background:#f3f4f6; padding:10px; border-radius:10px;">
                <p style="font-size:11px; color:#666;">Pengeluaran</p>
                <p style="font-size:18px; font-weight:bold; color:#ef4444;">${utils.formatRupiah(totalExpense)}</p>
            </div>
            <div style="background:#f3f4f6; padding:10px; border-radius:10px;">
                <p style="font-size:11px; color:#666;">Cash on Hand</p>
                <p style="font-size:18px; font-weight:bold; color:#3b82f6;">${utils.formatRupiah(cashOnHand)}</p>
            </div>
        </div>
        <div style="margin-top:15px;">
            <p style="font-size:12px; font-weight:bold;">Pengeluaran Hari Ini</p>
            ${laporan.expenses.map(e => `
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:5px;">
                    <span>${e.itemName}</span>
                    <span>${utils.formatRupiah(e.amount)}</span>
                </div>
            `).join('')}
        </div>
        <hr style="margin:15px 0;">
        <div style="text-align:center; font-size:10px; color:#999;">
            HeiKasir · Laporan Otomatis
        </div>
    `;

    document.body.appendChild(element);
    try {
        const canvas = await html2canvas(element, { scale: 2 });
        const link = document.createElement('a');
        link.download = `laporan_kasir_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        utils.showToast('Laporan tersimpan');
    } catch (err) {
        console.error(err);
        utils.showToast('Gagal download JPEG', 'error');
    } finally {
        document.body.removeChild(element);
    }
}

window.downloadRiwayatJpeg = downloadRiwayatJpeg;