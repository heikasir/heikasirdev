// ==================== riwayat-render.js ====================
// Halaman riwayat transaksi dan pengeluaran dengan dukungan data offline dan logging

pages.riwayat = {
    transactions: [],
    expenses: [],
    pendingTransactions: [],
    filterDate: new Date().toISOString().slice(0, 10),
    filterType: 'semua',

    render: async () => {
        console.log('📅 [riwayat] render() dipanggil dengan filter:', pages.riwayat.filterDate, pages.riwayat.filterType);
        
        els.pageContent.innerHTML = `
            <div class="p-4 space-y-4">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 class="text-2xl font-black">Riwayat</h2>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <input type="date" id="filterDate" value="${pages.riwayat.filterDate}" class="px-3 py-2 rounded-xl border text-sm flex-1 sm:w-auto">
                        <select id="filterType" class="px-3 py-2 rounded-xl border text-sm">
                            <option value="semua" ${pages.riwayat.filterType === 'semua' ? 'selected' : ''}>Semua</option>
                            <option value="transaksi" ${pages.riwayat.filterType === 'transaksi' ? 'selected' : ''}>Transaksi</option>
                            <option value="pengeluaran" ${pages.riwayat.filterType === 'pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
                        </select>
                    </div>
                </div>
                <div id="riwayatContent" class="space-y-4">
                    <div class="space-y-2">
                        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('filterDate').addEventListener('change', (e) => {
            console.log(`📅 [riwayat] Filter tanggal berubah: ${e.target.value}`);
            pages.riwayat.filterDate = e.target.value;
            pages.riwayat.loadData();
        });
        
        document.getElementById('filterType').addEventListener('change', (e) => {
            console.log(`📋 [riwayat] Filter tipe berubah: ${e.target.value}`);
            pages.riwayat.filterType = e.target.value;
            pages.riwayat.loadData();
        });

        await pages.riwayat.loadData();
    },

    loadData: async () => {
        const date = pages.riwayat.filterDate;
        const type = pages.riwayat.filterType;
        const container = document.getElementById('riwayatContent');
        if (!container) {
            console.error('❌ [riwayat] Container #riwayatContent tidak ditemukan');
            return;
        }

        console.log(`📊 [riwayat] loadData() untuk tanggal ${date}, tipe ${type}`);
        utils.showLoading();

        try {
            // Reset data
            pages.riwayat.transactions = [];
            pages.riwayat.expenses = [];
            pages.riwayat.pendingTransactions = [];

            // Ambil transaksi dari Firestore jika diperlukan
            if (type === 'semua' || type === 'transaksi') {
                console.log('🔍 [riwayat] Mengambil transaksi dari Firestore...');
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);

                const snap = await db.collection('Owners').doc(state.ownerId).collection('Transactions')
                    .where('outletId', '==', state.employee.outletId)
                    .where('timestamp', '>=', start)
                    .where('timestamp', '<=', end)
                    .orderBy('timestamp', 'desc')
                    .get();

                pages.riwayat.transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log(`✅ [riwayat] Mendapat ${pages.riwayat.transactions.length} transaksi dari Firestore`);
            }

            // Ambil pengeluaran dari Firestore jika diperlukan
            if (type === 'semua' || type === 'pengeluaran') {
                console.log('🔍 [riwayat] Mengambil pengeluaran dari Firestore...');
                pages.riwayat.expenses = await dbHelpers.getExpenses(date);
                console.log(`✅ [riwayat] Mendapat ${pages.riwayat.expenses.length} pengeluaran dari Firestore`);
            }

            // Ambil transaksi pending dari antrian offline
            if (offlineDB) {
                console.log('🔍 [riwayat] Mengambil antrian pending...');
                const pendingQueue = await offline.getPendingQueue();
                console.log(`📦 [riwayat] Total pending queue: ${pendingQueue.length}`);
                
                pages.riwayat.pendingTransactions = pendingQueue
                    .filter(item => item.collection === 'transactions')
                    .map(item => {
                        const data = item.data;
                        let timestamp = data.timestamp ? new Date(data.timestamp) : new Date(item.timestamp);
                        const tgl = timestamp.toISOString().slice(0, 10);
                        if (tgl !== date) return null;
                        return {
                            id: data.id,
                            ...data,
                            timestamp: timestamp,
                            is_pending: true,
                            pendingId: item.id
                        };
                    })
                    .filter(t => t !== null);
                
                console.log(`✅ [riwayat] Ditemukan ${pages.riwayat.pendingTransactions.length} transaksi pending untuk tanggal ${date}`);
            }

            // Render konten
            let html = '';

            // Gabungkan transaksi dari Firestore dan pending
            let allTransactions = [...pages.riwayat.transactions, ...pages.riwayat.pendingTransactions];
            allTransactions.sort((a, b) => {
                const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return tb - ta;
            });
            console.log(`📊 [riwayat] Total transaksi setelah digabung: ${allTransactions.length}`);

            // Bagian Transaksi
            if (type === 'semua' || type === 'transaksi') {
                html += `<h3 class="font-bold text-lg mt-2">Transaksi</h3>`;

                if (allTransactions.length === 0) {
                    html += `<p class="text-gray-400 text-center py-4">Tidak ada transaksi</p>`;
                } else {
                    allTransactions.forEach(t => {
                        const isVoid = t.is_void === true;
                        const isPending = t.is_pending === true;
                        const statusClass = isVoid ? 'text-red-500 line-through' : (isPending ? 'text-yellow-600' : 'text-green-600');
                        const statusBadge = isVoid ? '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">VOID</span>' : (isPending ? '<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">PENDING</span>' : '');

                        html += `
                            <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${isVoid ? 'border-red-200 dark:border-red-900' : (isPending ? 'border-yellow-200 dark:border-yellow-900' : 'border-gray-100 dark:border-gray-700')}">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-bold flex items-center">
                                            ${utils.formatDateTime(t.timestamp)}
                                            ${statusBadge}
                                        </p>
                                        <p class="text-sm text-gray-500">${t.customer || 'Reg'} • ${t.items?.length || 0} item</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-bold ${statusClass}">${utils.formatRupiah(t.total)}</p>
                                        <p class="text-xs text-gray-500">${t.payment_method}</p>
                                    </div>
                                </div>
                                <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                    ${t.items ? t.items.map(i => `${i.name} x${i.qty}`).join(', ') : ''}
                                </div>
                                ${!isVoid && !isPending ? `
                                    <div class="mt-3 flex justify-end">
                                        <button onclick="voidTransaction('${t.id}')" class="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
                                            <i class="fas fa-ban mr-1"></i>Void
                                        </button>
                                    </div>
                                ` : ''}
                                ${isPending ? `
                                    <div class="mt-3 flex justify-end">
                                        <span class="text-xs text-yellow-600">Menunggu sinkronisasi</span>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    });
                }
            }

            // Bagian Pengeluaran
            if (type === 'semua' || type === 'pengeluaran') {
                html += `<h3 class="font-bold text-lg mt-4">Pengeluaran</h3>`;

                if (pages.riwayat.expenses.length === 0) {
                    html += `<p class="text-gray-400 text-center py-4">Tidak ada pengeluaran</p>`;
                } else {
                    pages.riwayat.expenses.forEach(e => {
                        html += `
                            <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-bold">${e.itemName}</p>
                                        <p class="text-xs text-gray-500">${utils.formatDateTime(e.timestamp)}</p>
                                        ${e.notes ? `<p class="text-xs italic text-gray-500 mt-1">${e.notes}</p>` : ''}
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
                            </div>
                        `;
                    });
                }
            }

            container.innerHTML = html;
            console.log('✅ [riwayat] Render selesai');
        } catch (err) {
            console.error('❌ [riwayat] Error load data:', err);
            container.innerHTML = `<p class="text-red-500 text-center">Gagal memuat data. ${err.message}</p>`;
        } finally {
            utils.hideLoading();
        }
    }
};