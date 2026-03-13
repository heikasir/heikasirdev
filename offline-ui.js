// ==================== offline-ui.js ====================
// UI untuk badge sinkronisasi

async function updateSyncBadge() {
    const count = await offline.countPending();
    let badge = document.getElementById('syncBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'syncBadge';
        badge.onclick = syncToFirebase;
        document.body.appendChild(badge);
    }
    if (count > 0) {
        badge.innerHTML = `<i class="fas fa-cloud-upload-alt"></i><span>${count}</span>`;
        badge.style.cssText = `
            position: fixed; bottom: 80px; right: 20px; background: #bf2c97;
            color: white; width: 50px; height: 50px; border-radius: 50%;
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; box-shadow: 0 4px 10px rgba(191,44,151,0.3);
            cursor: pointer; z-index: 100; font-size: 10px;
            animation: pulse 2s infinite;
        `;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

async function resetLocalData() {
    if (!offlineDB) return;
    if (!confirm('Hapus semua data lokal? Data di server tetap aman.')) return;
    utils.showLoading();
    try {
        const stores = Array.from(offlineDB.objectStoreNames);
        for (const store of stores) {
            if (store === 'sync_meta') continue;
            const tx = offlineDB.transaction(store, 'readwrite');
            tx.objectStore(store).clear();
        }
        utils.showToast('Data lokal dihapus');
        updateSyncBadge();
        if (confirm('Refresh halaman?')) window.location.reload();
    } catch (err) {
        utils.showToast('Gagal reset', 'error');
    } finally {
        utils.hideLoading();
    }
}

async function initOfflineSystem() {
    await initOfflineDB();
    if (offlineDB) {
        console.log('Sistem offline siap');
        updateSyncBadge();
        setInterval(updateSyncBadge, 5000);
    }
}

window.updateSyncBadge = updateSyncBadge;
window.resetLocalData = resetLocalData;
window.initOfflineSystem = initOfflineSystem;