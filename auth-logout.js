// ==================== auth-logout.js ====================
// Fungsi logout untuk kasir dan owner

window.logout = async () => {
    try {
        // Hentikan stock alert interval
        if (typeof stopStockAlert === 'function') stopStockAlert();

        // Hentikan semua listener yang masih aktif
        if (state.unsubscribers && state.unsubscribers.length) {
            state.unsubscribers.forEach(unsub => unsub());
            state.unsubscribers = [];
        }

        // Hentikan kamera jika masih aktif
        if (typeof camera !== 'undefined' && camera.stopCamera) {
            camera.stopCamera();
        }

        // Sign out dari Firebase
        await auth.signOut();

        // Reset state
        state.user = null;
        state.ownerId = null;
        state.employee = null;
        state.shift = null;
        state.outlet = null;
        state.cart = [];
        state.printer.connected = false;

        // Hapus session
        sessionStorage.clear();

        // Tampilkan modal owner, sembunyikan yang lain
        if (els.ownerLoginModal) els.ownerLoginModal.classList.remove('hidden');
        if (els.pinModal) els.pinModal.classList.add('hidden');
        if (els.app) els.app.classList.add('hidden');
        if (els.lockOverlay) els.lockOverlay.classList.add('hidden');

        utils.showToast('Berhasil logout', 'info');
    } catch (err) {
        console.error('Logout error:', err);
        utils.showToast('Gagal logout', 'error');
    }
};