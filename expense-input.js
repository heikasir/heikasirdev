// ==================== expense-input.js ====================
// Modal input pengeluaran kasir: Memisahkan logic Operasional vs Belanja Stok untuk Offline Queue

let expenseTemplates = [];

async function loadExpenseTemplates() {
    if (!state.ownerId) return [];
    try {
        const snap = await db.collection('Owners').doc(state.ownerId).collection('Templates')
            .where('isDeleted', '==', false)
            .where('isActive', '==', true)
            .where('type', '==', 'kasir')
            .get();
        expenseTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return expenseTemplates;
    } catch (err) {
        console.error('Gagal load template:', err);
        return [];
    }
}

window.openExpenseInputModal = async () => {
    await loadExpenseTemplates();

    const modal = document.createElement('div');
    modal.id = 'expenseInputModal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 class="text-xl font-black mb-4">Catat Biaya / Belanja</h3>
            
            <div class="mb-4">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Template Cepat</label>
                <select id="expenseTemplateSelect" class="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mt-1 font-bold outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">-- Input Manual --</option>
                    ${expenseTemplates.map(t => `<option value="${t.id}" data-category="${t.category}" data-amount="${t.defaultAmount}" data-isstock="${t.isStock}" data-ingid="${t.ingId || ''}" data-qty="${t.defaultQty || ''}">${t.name}</option>`).join('')}
                </select>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori</label>
                    <input type="text" id="expenseCategory" class="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none">
                </div>
                <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan Item</label>
                    <input type="text" id="expenseItemName" placeholder="Contoh: Beli Es Batu / Galon" class="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold outline-none">
                </div>
                <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bayar (Rp)</label>
                    <input type="text" id="expenseAmount" class="w-full p-4 rounded-2xl border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 font-black text-xl text-purple-700 dark:text-purple-400 outline-none focus:ring-2 focus:ring-purple-500" oninput="this.value = this.value.replace(/[^0-9]/g, '')" placeholder="0">
                </div>

                <div id="expenseStockSection" class="hidden p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <label class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Inventaris Stok (Wajib Diisi)</label>
                    <select id="expenseIngredient" class="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 mt-2 text-sm outline-none font-bold">
                        <option value="">-- Pilih Bahan Baku --</option>
                    </select>
                    <div class="relative mt-3">
                        <input type="number" id="expenseStockQty" placeholder="Jumlah Masuk" class="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 font-bold outline-none">
                        <span id="expenseStockUnit" class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Unit</span>
                    </div>
                </div>

                <div>
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Catatan (Opsional)</label>
                    <textarea id="expenseNotes" rows="2" class="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none text-sm"></textarea>
                </div>
            </div>

            <div class="flex gap-3 mt-6">
                <button onclick="closeExpenseInputModal()" class="w-1/3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-4 rounded-2xl font-bold active:scale-95 transition-transform">Batal</button>
                <button id="expenseSaveBtn" class="w-2/3 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-purple-500/30 active:scale-95 transition-transform">Simpan Kas Keluar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Ambil bahan baku
    if (state.ownerId) {
        const ingSnap = await db.collection('Owners').doc(state.ownerId).collection('Ingredients').where('isDeleted', '==', false).get();
        let htmlOpts = '<option value="">-- Pilih Bahan Baku --</option>';
        ingSnap.forEach(doc => {
            const ing = doc.data();
            if (ing.outletId === 'global' || ing.outletId === state.employee?.outletId) {
                htmlOpts += `<option value="${doc.id}" data-unit="${ing.unit}">${ing.name} (${ing.unit})</option>`;
            }
        });
        document.getElementById('expenseIngredient').innerHTML = htmlOpts;
    }

    document.getElementById('expenseTemplateSelect').addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        if (opt.value) {
            document.getElementById('expenseCategory').value = opt.dataset.category || '';
            document.getElementById('expenseItemName').value = opt.textContent.split(' (')[0];
            document.getElementById('expenseAmount').value = opt.dataset.amount || '';

            const isStock = opt.dataset.isstock === 'true';
            const stockSection = document.getElementById('expenseStockSection');
            if (isStock) {
                stockSection.classList.remove('hidden');
                document.getElementById('expenseIngredient').value = opt.dataset.ingid || '';
                document.getElementById('expenseStockQty').value = opt.dataset.qty || '';
                const unit = document.getElementById('expenseIngredient').options[document.getElementById('expenseIngredient').selectedIndex]?.dataset.unit || 'unit';
                document.getElementById('expenseStockUnit').innerText = unit;
            } else {
                stockSection.classList.add('hidden');
            }
        }
    });

    document.getElementById('expenseIngredient')?.addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        document.getElementById('expenseStockUnit').innerText = opt?.dataset.unit || 'unit';
    });

    document.getElementById('expenseSaveBtn').addEventListener('click', async () => {
        const category = document.getElementById('expenseCategory').value.trim();
        const itemName = document.getElementById('expenseItemName').value.trim();
        const amount = parseInt(document.getElementById('expenseAmount').value.replace(/[^0-9]/g, '')) || 0;
        const notes = document.getElementById('expenseNotes').value.trim();
        const ingId = document.getElementById('expenseIngredient')?.value;
        const qty = parseFloat(document.getElementById('expenseStockQty')?.value) || 0;
        
        const isStockPurchase = !document.getElementById('expenseStockSection').classList.contains('hidden') && ingId && qty > 0;

        if (!itemName || amount <= 0) {
            utils.showToast('Nama dan Nominal wajib diisi', 'warning');
            return;
        }

        if (!document.getElementById('expenseStockSection').classList.contains('hidden') && (!ingId || qty <= 0)) {
            utils.showToast('Pilih bahan baku dan jumlah untuk belanja stok', 'warning');
            return;
        }

        const expenseData = {
            id: utils.generateId(),
            itemName,
            category: category || 'Operasional',
            amount,
            notes,
            inputBy: 'kasir',
            outletId: state.employee.outletId,
            timestamp: firebase.firestore.Timestamp.fromMillis(Date.now()), // gunakan objek Timestamp
            isDeleted: false,
            isStockPurchase: isStockPurchase
        };

        if (isStockPurchase) {
            expenseData.stockDetails = { ingId, addedQty: qty, total: amount };
        }

        utils.showLoading();
        try {
            const result = await saveWithQueue('expenses', expenseData, 'create');
            
            if (!result.success) {
                throw new Error(result.error || 'Gagal menyimpan');
            }

            utils.hideLoading();
            utils.showToast('Pengeluaran berhasil dicatat', 'success');
            closeExpenseInputModal();
            if (state.page === 'laporan' && typeof pages.laporan.render === 'function') pages.laporan.render();
            if (state.page === 'riwayat' && typeof pages.riwayat.loadData === 'function') pages.riwayat.loadData();
        } catch (err) {
            console.error(err);
            utils.hideLoading();
            utils.showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    });
};

window.closeExpenseInputModal = () => {
    const modal = document.getElementById('expenseInputModal');
    if (modal) modal.remove();
};