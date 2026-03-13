// ==================== laporan-render.js ====================
// Halaman laporan keuangan kasir (ringkasan, HPP, daftar pengeluaran)
// Margin dihapus, HPP ditampilkan dari daily summary

pages.laporan = {
    summary: {},
    expenses: [],
    transactions: [],
    filterDate: new Date().toISOString().slice(0, 10),

    render: async function() {
        const container = els.pageContent;
        if (!container) return;

        // Skeleton loading
        container.innerHTML = `
            <div class="p-4 space-y-4">
                <div class="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                    <div class="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                    <div class="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                    <div class="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                </div>
                <div class="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            </div>
        `;

        await this.loadData();
        this.renderContent();
    },

    loadData: async function() {
        const date = this.filterDate;
        const outletId = state.employee?.outletId;
        if (!state.ownerId || !outletId) return;

        try {
            // Daily summary
            const sumDoc = await db.collection('Owners').doc(state.ownerId).collection('DailySummaries').doc(date).get();
            this.summary = sumDoc.exists ? sumDoc.data() : {
                totalIncome: 0,
                totalHpp: 0,
                expenseKasir: 0,
                voidCount: 0,
                transactionCount: 0
            };

            // Expenses hari ini
            const expSnap = await db.collection('Owners').doc(state.ownerId).collection('Expenses')
                .where('outletId', '==', outletId)
                .where('timestamp', '>=', new Date(date + 'T00:00:00.000Z'))
                .where('timestamp', '<=', new Date(date + 'T23:59:59.999Z'))
                .where('isDeleted', '==', false)
                .orderBy('timestamp', 'desc')
                .get();
            this.expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Transaksi hari ini (untuk total item, dll)
            const start = new Date(date + 'T00:00:00.000Z');
            const end = new Date(date + 'T23:59:59.999Z');
            const transSnap = await db.collection('Owners').doc(state.ownerId).collection('Transactions')
                .where('outletId', '==', outletId)
                .where('timestamp', '>=', start)
                .where('timestamp', '<=', end)
                .where('is_void', '==', false)
                .get();
            this.transactions = transSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        } catch (err) {
            console.error('Gagal load laporan:', err);
            utils.showToast('Gagal memuat data', 'error');
        }
    },

    renderContent: function() {
        const date = this.filterDate;
        const startCash = state.shift?.startingCash || 0;
        const totalIncome = this.summary.totalIncome || 0;
        const totalHpp = this.summary.totalHpp || 0;
        const totalExpense = this.summary.expenseKasir || 0;
        const cashOnHand = startCash + totalIncome - totalExpense;
        const labaKotor = totalIncome - totalHpp;

        els.pageContent.innerHTML = `
            <div class="p-4 space-y-4">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 class="text-2xl font-black">Laporan Keuangan</h2>
                    <div class="flex gap-2">
                        <input type="date" id="laporanFilterDate" value="${date}" class="px-3 py-2 rounded-xl border text-sm">
                        <button id="refreshLaporanBtn" class="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>

                <!-- Ringkasan cards -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                        <p class="text-xs text-gray-500">Pendapatan</p>
                        <p class="text-xl font-black text-green-600">${utils.formatRupiah(totalIncome)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                        <p class="text-xs text-gray-500">HPP Terjual</p>
                        <p class="text-xl font-black text-orange-600">${utils.formatRupiah(totalHpp)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                        <p class="text-xs text-gray-500">Pengeluaran</p>
                        <p class="text-xl font-black text-red-600">${utils.formatRupiah(totalExpense)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                        <p class="text-xs text-gray-500">Cash on Hand</p>
                        <p class="text-xl font-black text-blue-600">${utils.formatRupiah(cashOnHand)}</p>
                    </div>
                </div>

                <!-- Rincian tambahan -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <h3 class="font-bold mb-2">Rincian</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>Modal Awal</span>
                            <span class="font-bold">${utils.formatRupiah(startCash)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Laba Kotor</span>
                            <span class="font-bold text-green-600">${utils.formatRupiah(labaKotor)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Transaksi</span>
                            <span class="font-bold">${this.summary.transactionCount || 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Void</span>
                            <span class="font-bold text-red-600">${this.summary.voidCount || 0}</span>
                        </div>
                    </div>
                </div>

                <!-- Tombol aksi -->
                <div class="flex gap-2">
                    <button id="downloadJpegBtn" class="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold">
                        <i class="fas fa-download mr-2"></i>Download JPEG
                    </button>
                    <button id="printAllBtn" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">
                        <i class="fas fa-print mr-2"></i>Cetak Semua
                    </button>
                </div>

                <!-- Tombol catat pengeluaran -->
                <button id="addExpenseBtn" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">
                    <i class="fas fa-plus-circle mr-2"></i>Catat Pengeluaran
                </button>

                <!-- Daftar pengeluaran -->
                <div>
                    <h3 class="font-bold text-lg mb-2">Pengeluaran Hari Ini</h3>
                    <div id="expenseList" class="space-y-2">
                        ${this.renderExpenseList()}
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('laporanFilterDate').addEventListener('change', (e) => {
            this.filterDate = e.target.value;
            this.render();
        });
        document.getElementById('refreshLaporanBtn').addEventListener('click', () => this.render());
        document.getElementById('downloadJpegBtn').addEventListener('click', () => {
            if (typeof downloadRiwayatJpeg === 'function') downloadRiwayatJpeg();
            else utils.showToast('Fungsi download belum tersedia', 'warning');
        });
        document.getElementById('printAllBtn').addEventListener('click', () => {
            if (typeof printAllTransactions === 'function') printAllTransactions();
            else utils.showToast('Fungsi cetak belum tersedia', 'warning');
        });
        document.getElementById('addExpenseBtn').addEventListener('click', () => {
            if (typeof openExpenseInputModal === 'function') openExpenseInputModal();
            else utils.showToast('Fungsi catat pengeluaran belum tersedia', 'warning');
        });
    },

    renderExpenseList: function() {
        if (this.expenses.length === 0) {
            return '<p class="text-gray-400 text-center py-4">Belum ada pengeluaran</p>';
        }
        return this.expenses.map(e => `
            <div class="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm flex justify-between items-center" data-id="${e.id}">
                <div>
                    <p class="font-bold">${e.itemName}</p>
                    <p class="text-xs text-gray-500">${utils.formatDateTime(e.timestamp)}</p>
                    ${e.notes ? `<p class="text-xs italic text-gray-500">${e.notes}</p>` : ''}
                    ${e.isStockPurchase ? '<span class="text-xs text-blue-600">🔄 Stok</span>' : ''}
                </div>
                <div class="text-right">
                    <p class="font-bold text-red-600">${utils.formatRupiah(e.amount)}</p>
                    <div class="flex gap-1 mt-1">
                        <button onclick="editExpense('${e.id}')" class="text-blue-500 text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.voidExpense('${e.id}')" class="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

// Fungsi edit expense (sederhana) - tetap dipertahankan
window.editExpense = async (id) => {
    const expense = pages.laporan.expenses.find(e => e.id === id);
    if (!expense) return;
    const newName = prompt('Nama item:', expense.itemName);
    if (newName === null) return;
    const newAmount = prompt('Nominal (Rp):', expense.amount);
    if (newAmount === null) return;
    const newNotes = prompt('Catatan:', expense.notes || '');

    const updated = {
        ...expense,
        itemName: newName,
        amount: parseInt(newAmount.replace(/[^0-9]/g, '')) || 0,
        notes: newNotes
    };
    utils.showLoading();
    try {
        await saveWithQueue('expenses', updated, 'update');
        utils.showToast('Pengeluaran diperbarui', 'success');
        pages.laporan.render();
    } catch (err) {
        console.error(err);
        utils.showToast('Gagal update', 'error');
    } finally {
        utils.hideLoading();
    }
};

// Fungsi void expense (dengan PIN dan pengembalian stok) - global
window.voidExpense = async (id) => {
    const expense = pages.laporan.expenses.find(e => e.id === id);
    if (!expense) return;
    if (!confirm('Hapus pengeluaran ini?')) return;

    const pin = prompt('Masukkan PIN Owner/Head untuk konfirmasi:');
    if (!pin) return;
    const valid = await validatePin(pin, 'head');
    if (!valid) {
        utils.showToast('PIN salah', 'error');
        return;
    }

    utils.showLoading();
    try {
        const batch = db.batch();

        // Soft delete expense
        const expRef = db.collection('Owners').doc(state.ownerId).collection('Expenses').doc(id);
        batch.update(expRef, { isDeleted: true, deletedAt: firebase.firestore.FieldValue.serverTimestamp() });

        // Jika expense adalah pembelian stok, kembalikan stok (kurangi karena saat input stok bertambah)
        if (expense.isStockPurchase && expense.stockDetails) {
            const ingRef = db.collection('Owners').doc(state.ownerId).collection('Ingredients').doc(expense.stockDetails.ingId);
            batch.update(ingRef, {
                currentStock: firebase.firestore.FieldValue.increment(-expense.stockDetails.addedQty)
            });
        }

        // Koreksi daily summary
        const dateStr = expense.timestamp.toDate().toISOString().slice(0, 10);
        const sumRef = db.collection('Owners').doc(state.ownerId).collection('DailySummaries').doc(dateStr);
        batch.set(sumRef, {
            expenseKasir: firebase.firestore.FieldValue.increment(-expense.amount)
        }, { merge: true });

        await batch.commit();
        utils.showToast('Pengeluaran dihapus', 'success');
        pages.laporan.render();
    } catch (err) {
        console.error(err);
        utils.showToast('Gagal hapus', 'error');
    } finally {
        utils.hideLoading();
    }
};