// ==================== offline-queue.js ====================
// Fungsi antrian sinkronisasi - selalu simpan ke IndexedDB dulu

/**
 * Map nama koleksi ke Firestore (untuk keperluan sinkronisasi)
 * @param {string} collection 
 * @returns {string|null} Nama koleksi di Firestore, atau null untuk lokal
 */
function mapCollectionName(collection) {
    const map = {
        'transactions': 'Transactions',
        'expenses': 'Expenses',
        'shifts': 'Shifts',
        'attendances': 'Attendances',
        'outletSettings': 'OutletSettings',
        'dailySummaries': 'DailySummaries',
        'stock_updates': null,
        'menu_photos': null,
        'photos': null
    };
    return map[collection] || collection;
}

/**
 * Simpan data dengan antrian (SELALU ke IndexedDB dulu)
 * @param {string} collection Nama koleksi (misal 'transactions')
 * @param {Object} data Data yang akan disimpan
 * @param {string} operation 'create', 'update', 'delete', 'increment'
 * @returns {Promise<{success: boolean, id: string|null, queued: boolean, error: string|null}>}
 */
async function saveWithQueue(collection, data, operation = 'create') {
    console.log(`💾 [saveWithQueue] Memulai untuk ${collection} (${operation})`, data);

    if (!state.ownerId) {
        console.error('❌ [saveWithQueue] Owner ID tidak ditemukan');
        return { success: false, id: null, queued: false, error: 'Owner ID tidak ditemukan' };
    }

    // Generate ID jika diperlukan
    if (!data.id && operation === 'create') {
        data.id = utils.generateId();
    }

    // ========== SELALU SIMPAN KE ANTRIAN OFFLINE ==========
    const queueId = await offline.addToQueue(collection, data, operation);
    if (!queueId) {
        return { 
            success: false, 
            id: data.id, 
            queued: false, 
            error: 'Gagal menambah ke antrian (IndexedDB error)' 
        };
    }

    // ========== JIKA ONLINE, PICU SINKRONISASI BACKGROUND ==========
    if (utils.isOnline()) {
        console.log('🌐 [saveWithQueue] Online, memicu sinkronisasi background...');
        setTimeout(() => {
            if (typeof window.syncToFirebase === 'function') {
                window.syncToFirebase().catch(err => {
                    console.error('❌ Background sync error:', err);
                });
            }
        }, 0);
    }

    return { 
        success: true, 
        id: data.id, 
        queued: true, 
        error: null 
    };
}

/**
 * Hapus item dari antrian
 * @param {number} queueId 
 * @returns {Promise<boolean>}
 */
async function removeFromQueue(queueId) {
    if (!offlineDB) return false;
    return new Promise((resolve) => {
        try {
            const tx = offlineDB.transaction('sync_queue', 'readwrite');
            const store = tx.objectStore('sync_queue');
            const req = store.delete(queueId);
            req.onsuccess = () => {
                console.log(`✅ [removeFromQueue] Item ${queueId} dihapus`);
                resolve(true);
            };
            req.onerror = (err) => {
                console.error(`❌ [removeFromQueue] Gagal hapus ${queueId}:`, err);
                resolve(false);
            };
            tx.oncomplete = () => {
                // transaksi selesai
            };
        } catch (e) {
            console.error('❌ [removeFromQueue] Error:', e);
            resolve(false);
        }
    });
}

/**
 * Update status item dalam antrian
 * @param {number} queueId 
 * @param {string} status 'pending', 'success', 'failed'
 * @param {string} errorMsg Pesan error (opsional)
 * @returns {Promise<boolean>}
 */
async function updateQueueStatus(queueId, status, errorMsg = '') {
    if (!offlineDB) return false;
    return new Promise((resolve) => {
        try {
            const tx = offlineDB.transaction('sync_queue', 'readwrite');
            const store = tx.objectStore('sync_queue');
            
            // Ambil data dulu
            const getReq = store.get(queueId);
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (!item) {
                    console.warn(`⚠️ [updateQueueStatus] Item ${queueId} tidak ditemukan`);
                    resolve(false);
                    return;
                }
                
                item.status = status;
                if (errorMsg) item.error = errorMsg;
                item.lastAttempt = Date.now();
                
                const putReq = store.put(item);
                putReq.onsuccess = () => {
                    console.log(`✅ [updateQueueStatus] Item ${queueId} diupdate ke ${status}`);
                    resolve(true);
                };
                putReq.onerror = (err) => {
                    console.error(`❌ [updateQueueStatus] Gagal update ${queueId}:`, err);
                    resolve(false);
                };
            };
            getReq.onerror = (err) => {
                console.error(`❌ [updateQueueStatus] Gagal get ${queueId}:`, err);
                resolve(false);
            };
            
            tx.oncomplete = () => {};
            tx.onerror = (err) => {
                console.error(`❌ [updateQueueStatus] Transaksi error:`, err);
            };
        } catch (e) {
            console.error('❌ [updateQueueStatus] Error:', e);
            resolve(false);
        }
    });
}

// Ekspor fungsi
window.saveWithQueue = saveWithQueue;
window.removeFromQueue = removeFromQueue;
window.updateQueueStatus = updateQueueStatus;
window.mapCollectionName = mapCollectionName; // untuk digunakan di offline-sync