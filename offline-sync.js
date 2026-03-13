// ==================== offline-sync.js ====================
// Sinkronisasi data dari antrian ke Firestore

/**
 * Membersihkan objek dari field undefined (rekursif)
 * @param {any} obj 
 * @returns {any} objek tanpa undefined
 */
function cleanUndefined(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => cleanUndefined(item));
    }
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        if (value !== undefined) {
            acc[key] = cleanUndefined(value);
        }
        return acc;
    }, {});
}

/**
 * Konversi timestamp lokal ke Firestore Timestamp
 * @param {any} data 
 * @returns {any} data dengan timestamp yang sudah dikonversi
 */
function convertTimestamps(data) {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) {
        return data.map(item => convertTimestamps(item));
    }
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object') {
            if (value.seconds !== undefined && value.nanoseconds !== undefined) {
                // sudah berupa Firestore Timestamp, biarkan
                result[key] = value;
            } else {
                result[key] = convertTimestamps(value);
            }
        } else {
            result[key] = value;
        }
    }
    // Jika ada field timestamp dengan angka, konversi
    if (data.timestamp && typeof data.timestamp === 'number') {
        result.timestamp = firebase.firestore.Timestamp.fromMillis(data.timestamp);
    }
    return result;
}

async function syncToFirebase() {
    if (!navigator.onLine) {
        utils.showToast('Tidak ada koneksi internet', 'error');
        return;
    }

    if (!offlineDB) {
        utils.showToast('Sistem offline belum siap', 'error');
        return;
    }

    const queue = await offline.getPendingQueue();
    if (queue.length === 0) {
        utils.showToast('Tidak ada data pending', 'info');
        return;
    }

    utils.showLoading();
    let success = 0, failed = 0;

    for (const item of queue) {
        try {
            const firestoreCollection = window.mapCollectionName(item.collection);
            if (!firestoreCollection) {
                // Koleksi lokal, hapus dari antrian
                await removeFromQueue(item.id);
                success++;
                continue;
            }

            if (!state.ownerId) {
                throw new Error('Owner ID tidak ditemukan');
            }

            // Bersihkan undefined dari data
            const cleanedData = cleanUndefined(item.data);
            
            // Konversi timestamp
            const finalData = convertTimestamps(cleanedData);

            const docRef = db.collection('Owners').doc(state.ownerId).collection(firestoreCollection).doc(item.data.id);

            if (item.operation === 'delete') {
                await docRef.update({ 
                    isDeleted: true, 
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
            } else {
                await docRef.set(finalData, { merge: true });
            }

            await removeFromQueue(item.id);
            success++;

        } catch (err) {
            console.error('Sync error untuk item', item.id, err);
            // Update status di queue (jika masih ada)
            await updateQueueStatus(item.id, 'failed', err.message);
            failed++;
        }
    }

    utils.hideLoading();
    utils.showToast(`Sinkron selesai: ${success} berhasil, ${failed} gagal`);

    if (typeof updateSyncBadge === 'function') {
        updateSyncBadge();
    }
}

// Ekspor ke global
window.syncToFirebase = syncToFirebase;