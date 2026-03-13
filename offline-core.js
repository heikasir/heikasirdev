// ==================== offline-core.js ====================
// Inisialisasi IndexedDB dan fungsi dasar dengan logging lengkap

let offlineDB = null;
let dbInitPromise = null;
let offlineReadyPromise = null;

/**
 * Inisialisasi IndexedDB
 * @returns {Promise<boolean>} true jika berhasil, false jika gagal
 */
function initOfflineDB() {
    console.log('🔄 [offline-core] initOfflineDB dipanggil');
    
    if (dbInitPromise) {
        console.log('⏳ [offline-core] Menggunakan promise yang sudah ada');
        return dbInitPromise;
    }
    
    dbInitPromise = new Promise((resolve) => {
        console.log('🔄 [offline-core] Mencoba membuka IndexedDB...');
        
        if (!window.indexedDB) {
            console.error('❌ [offline-core] Browser tidak mendukung IndexedDB');
            utils.showToast('Browser tidak mendukung penyimpanan offline', 'warning');
            resolve(false);
            return;
        }

        const request = indexedDB.open('HeiKasirOffline', 5); // naikkan versi ke 5

        request.onerror = (event) => {
            console.error('❌ [offline-core] Gagal membuka IndexedDB:', event.target.error);
            utils.showToast('Gagal mengaktifkan mode offline', 'error');
            resolve(false);
        };

        request.onsuccess = (event) => {
            offlineDB = event.target.result;
            console.log('✅ [offline-core] IndexedDB siap (versi 5)');
            
            // Handle error global
            offlineDB.onerror = (event) => {
                console.error('❌ [offline-core] IndexedDB global error:', event.target.error);
            };
            
            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            console.log(`🔄 [offline-core] Upgrade IndexedDB dari versi ${oldVersion} ke 5`);

            // Buat store yang diperlukan kasir
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id' });
                console.log('✅ [offline-core] Store photos dibuat');
            }
            
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
                console.log('✅ [offline-core] Store settings dibuat');
            }
            
            if (!db.objectStoreNames.contains('sync_queue')) {
                const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('ownerId', 'ownerId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('collection', 'collection', { unique: false });
                console.log('✅ [offline-core] Store sync_queue dibuat dengan index');
            } else if (oldVersion < 5) {
                // Upgrade versi 5: pastikan index collection ada
                const transaction = event.target.transaction;
                const store = transaction.objectStore('sync_queue');
                if (!store.indexNames.contains('collection')) {
                    store.createIndex('collection', 'collection', { unique: false });
                    console.log('✅ [offline-core] Index collection ditambahkan ke sync_queue');
                }
            }
            
            if (!db.objectStoreNames.contains('menu_photos')) {
                db.createObjectStore('menu_photos', { keyPath: 'id' });
                console.log('✅ [offline-core] Store menu_photos dibuat');
            }
        };
    });
    
    return dbInitPromise;
}

/**
 * Menunggu hingga offlineDB siap
 * @returns {Promise<boolean>}
 */
function waitForOfflineReady() {
    if (offlineDB) return Promise.resolve(true);
    if (offlineReadyPromise) return offlineReadyPromise;
    
    offlineReadyPromise = new Promise((resolve) => {
        // Cek setiap 100ms hingga offlineDB tersedia atau timeout 5 detik
        let attempts = 0;
        const check = setInterval(() => {
            if (offlineDB) {
                clearInterval(check);
                clearTimeout(timeout);
                resolve(true);
            }
            attempts++;
            if (attempts > 50) { // 5 detik
                clearInterval(check);
                clearTimeout(timeout);
                console.warn('⚠️ [offline-core] Timeout menunggu offlineDB');
                resolve(false);
            }
        }, 100);
        
        const timeout = setTimeout(() => {
            clearInterval(check);
            resolve(false);
        }, 5000);
    });
    
    return offlineReadyPromise;
}

/**
 * Objek offline dengan berbagai metode
 */
const offline = {
    /**
     * Cek apakah IndexedDB siap
     */
    isReady: () => {
        const ready = offlineDB !== null;
        console.log(`🔍 [offline] isReady: ${ready}`);
        return ready;
    },

    /**
     * Simpan data ke store tertentu
     * @param {string} storeName Nama store
     * @param {Object} data Data yang akan disimpan
     * @returns {Promise<string|null>} ID data jika sukses, null jika gagal
     */
    save: async (storeName, data) => {
        console.log(`💾 [offline] save ke ${storeName} dimulai`, data);
        
        // Tunggu hingga offlineDB siap
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn(`⚠️ [offline] IndexedDB belum siap, data tidak disimpan ke ${storeName}`);
            return null;
        }
        
        // Generate ID jika tidak ada
        if (!data.id && storeName !== 'settings' && storeName !== 'sync_queue') {
            data.id = utils.generateId();
            console.log(`🆔 [offline] ID digenerate: ${data.id}`);
        }
        
        return new Promise((resolve) => {
            try {
                const tx = offlineDB.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.put(data);
                
                req.onsuccess = () => {
                    console.log(`✅ [offline] Data tersimpan di ${storeName} dengan ID ${data.id}`);
                    resolve(data.id);
                };
                
                req.onerror = (err) => {
                    console.error(`❌ [offline] Gagal simpan ke ${storeName}:`, err);
                    resolve(null);
                };
                
                tx.onerror = (err) => {
                    console.error(`❌ [offline] Transaksi error di ${storeName}:`, err);
                };
                
                tx.oncomplete = () => {
                    console.log(`✅ [offline] Transaksi ${storeName} selesai`);
                };
            } catch (e) {
                console.error(`❌ [offline] Error saat menyimpan ke ${storeName}:`, e);
                resolve(null);
            }
        });
    },

    /**
     * Ambil data berdasarkan ID
     * @param {string} storeName 
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    get: async (storeName, id) => {
        console.log(`🔍 [offline] get dari ${storeName} dengan ID ${id}`);
        
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn('⚠️ [offline] IndexedDB belum siap');
            return null;
        }
        
        return new Promise((resolve) => {
            try {
                const tx = offlineDB.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(id);
                
                req.onsuccess = () => {
                    const result = req.result || null;
                    console.log(`✅ [offline] Data ditemukan di ${storeName}:`, result);
                    resolve(result);
                };
                
                req.onerror = (err) => {
                    console.error(`❌ [offline] Gagal get dari ${storeName}:`, err);
                    resolve(null);
                };
            } catch (e) {
                console.error(`❌ [offline] Error get ${storeName}:`, e);
                resolve(null);
            }
        });
    },

    /**
     * Ambil semua data dari store
     * @param {string} storeName 
     * @returns {Promise<Array>}
     */
    getAll: async (storeName) => {
        console.log(`🔍 [offline] getAll dari ${storeName}`);
        
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn('⚠️ [offline] IndexedDB belum siap');
            return [];
        }
        
        return new Promise((resolve) => {
            try {
                const tx = offlineDB.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                
                req.onsuccess = () => {
                    const results = req.result || [];
                    console.log(`✅ [offline] Mendapat ${results.length} data dari ${storeName}`);
                    resolve(results);
                };
                
                req.onerror = (err) => {
                    console.error(`❌ [offline] Gagal getAll dari ${storeName}:`, err);
                    resolve([]);
                };
            } catch (e) {
                console.error(`❌ [offline] Error getAll ${storeName}:`, e);
                resolve([]);
            }
        });
    },

    /**
     * Hapus data berdasarkan ID
     * @param {string} storeName 
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    delete: async (storeName, id) => {
        console.log(`🗑️ [offline] delete dari ${storeName} dengan ID ${id}`);
        
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn('⚠️ [offline] IndexedDB belum siap');
            return false;
        }
        
        return new Promise((resolve) => {
            try {
                const tx = offlineDB.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.delete(id);
                
                req.onsuccess = () => {
                    console.log(`✅ [offline] Data ${id} dihapus dari ${storeName}`);
                    resolve(true);
                };
                
                req.onerror = (err) => {
                    console.error(`❌ [offline] Gagal delete dari ${storeName}:`, err);
                    resolve(false);
                };
            } catch (e) {
                console.error(`❌ [offline] Error delete ${storeName}:`, e);
                return false;
            }
        });
    },

    /**
     * Tambah item ke antrian sinkronisasi
     * @param {string} collection Nama koleksi (misal 'transactions')
     * @param {Object} data Data yang akan disinkron
     * @param {string} operation 'create', 'update', 'delete', 'increment'
     * @param {number} priority Prioritas (1 tertinggi)
     * @returns {Promise<number|null>} ID antrian jika sukses, null jika gagal
     */
    addToQueue: async (collection, data, operation = 'create', priority = 2) => {
        console.log(`📦 [offline] addToQueue: ${collection} (${operation})`, data);
        
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn('⚠️ [offline] IndexedDB tidak siap, tidak bisa menambah ke antrian');
            return null;
        }
        
        return new Promise((resolve) => {
            try {
                const tx = offlineDB.transaction('sync_queue', 'readwrite');
                const store = tx.objectStore('sync_queue');
                
                const item = {
                    collection,
                    data,
                    operation,
                    status: 'pending',
                    timestamp: Date.now(),
                    ownerId: state.ownerId,
                    retryCount: 0,
                    priority
                };
                
                const req = store.add(item);
                
                req.onsuccess = (e) => {
                    const queueId = e.target.result;
                    console.log(`✅ [offline] Item ditambahkan ke antrian dengan ID ${queueId}`);
                    
                    // Update badge jika fungsi tersedia
                    if (typeof updateSyncBadge === 'function') {
                        updateSyncBadge();
                    }
                    
                    resolve(queueId);
                };
                
                req.onerror = (err) => {
                    console.error('❌ [offline] Gagal tambah ke antrian:', err);
                    resolve(null);
                };
                
                tx.oncomplete = () => {
                    console.log('✅ [offline] Transaksi antrian selesai');
                };
            } catch (e) {
                console.error('❌ [offline] Error tambah ke antrian:', e);
                resolve(null);
            }
        });
    },

    /**
     * Ambil semua item pending dalam antrian
     * @returns {Promise<Array>}
     */
    getPendingQueue: async () => {
        console.log('🔍 [offline] getPendingQueue dipanggil');
        
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn('⚠️ [offline] IndexedDB belum siap');
            return [];
        }
        
        return new Promise((resolve) => {
            try {
                const tx = offlineDB.transaction('sync_queue', 'readonly');
                const store = tx.objectStore('sync_queue');
                const index = store.index('status');
                const req = index.getAll('pending');
                
                req.onsuccess = () => {
                    let items = req.result || [];
                    if (state.ownerId) {
                        items = items.filter(i => i.ownerId === state.ownerId);
                    }
                    console.log(`✅ [offline] Ditemukan ${items.length} item pending`);
                    resolve(items);
                };
                
                req.onerror = (err) => {
                    console.error('❌ [offline] Gagal getPendingQueue:', err);
                    resolve([]);
                };
            } catch (e) {
                console.error('❌ [offline] Error getPendingQueue:', e);
                resolve([]);
            }
        });
    },

    /**
     * Hitung jumlah item pending
     * @returns {Promise<number>}
     */
    countPending: async () => {
        console.log('🔢 [offline] countPending dipanggil');
        const queue = await offline.getPendingQueue();
        console.log(`📊 [offline] Total pending: ${queue.length}`);
        return queue.length;
    },

    /**
     * Update status item dalam antrian
     * @param {number} queueId 
     * @param {string} status 'pending', 'success', 'failed'
     * @param {string} error Pesan error (opsional)
     * @returns {Promise<boolean>}
     */
    updateQueueStatus: async (queueId, status, error = '') => {
        console.log(`🔄 [offline] updateQueueStatus: ${queueId} -> ${status}`);
        
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn('⚠️ [offline] IndexedDB belum siap');
            return false;
        }
        
        try {
            const tx = offlineDB.transaction('sync_queue', 'readwrite');
            const store = tx.objectStore('sync_queue');
            
            // Ambil data lama
            const getReq = store.get(queueId);
            
            return new Promise((resolve) => {
                getReq.onsuccess = () => {
                    const item = getReq.result;
                    if (!item) {
                        console.warn(`⚠️ [offline] Item ${queueId} tidak ditemukan`);
                        resolve(false);
                        return;
                    }
                    
                    item.status = status;
                    item.error = error;
                    item.lastAttempt = Date.now();
                    
                    const putReq = store.put(item);
                    putReq.onsuccess = () => {
                        console.log(`✅ [offline] Status antrian ${queueId} diupdate menjadi ${status}`);
                        resolve(true);
                    };
                    putReq.onerror = (err) => {
                        console.error(`❌ [offline] Gagal update status ${queueId}:`, err);
                        resolve(false);
                    };
                };
                
                getReq.onerror = (err) => {
                    console.error(`❌ [offline] Gagal get item ${queueId}:`, err);
                    resolve(false);
                };
            });
        } catch (e) {
            console.error('❌ [offline] Error updateQueueStatus:', e);
            return false;
        }
    },

    /**
     * Hapus item dari antrian
     * @param {number} queueId 
     * @returns {Promise<boolean>}
     */
    removeFromQueue: async (queueId) => {
        console.log(`🗑️ [offline] removeFromQueue: ${queueId}`);
        
        const ready = await waitForOfflineReady();
        if (!ready || !offlineDB) {
            console.warn('⚠️ [offline] IndexedDB belum siap');
            return false;
        }
        
        return new Promise((resolve) => {
            try {
                const tx = offlineDB.transaction('sync_queue', 'readwrite');
                const store = tx.objectStore('sync_queue');
                const req = store.delete(queueId);
                
                req.onsuccess = () => {
                    console.log(`✅ [offline] Item antrian ${queueId} dihapus`);
                    if (typeof updateSyncBadge === 'function') {
                        updateSyncBadge();
                    }
                    resolve(true);
                };
                
                req.onerror = (err) => {
                    console.error(`❌ [offline] Gagal hapus item ${queueId}:`, err);
                    resolve(false);
                };
            } catch (e) {
                console.error('❌ [offline] Error removeFromQueue:', e);
                return false;
            }
        });
    }
};

// Ekspor ke global
window.offline = offline;
window.initOfflineDB = initOfflineDB;
window.waitForOfflineReady = waitForOfflineReady; // tambahkan ekspor