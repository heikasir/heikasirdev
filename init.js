// ==================== init.js ====================
// Inisialisasi aplikasi dengan logging lengkap

// Tangkap error postMessage Firebase Auth (origin null vs file://)
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('postMessage') || 
         event.reason.message.includes('target origin'))) {
        event.preventDefault();
        console.warn('⚠️ Ignored Firebase iframe postMessage error (origin mismatch)');
    }
});

window.addEventListener('load', async () => {
    console.log('🚀 [INIT] Aplikasi dimulai (load event)');
    
    // Inisialisasi offline, tapi jangan blok proses
    console.log('🔄 [INIT] Memulai inisialisasi offlineDB...');
    const offlineReady = await initOfflineDB();
    
    if (!offlineReady) {
        console.warn('⚠️ [INIT] offlineDB tidak siap');
        utils.showToast('Mode offline tidak tersedia. Transaksi hanya dapat dilakukan saat online.', 'warning');
    } else {
        console.log('✅ [INIT] offlineDB siap');
        if (typeof initOfflineSystem === 'function') {
            console.log('🔄 [INIT] Memanggil initOfflineSystem');
            initOfflineSystem(); // untuk badge dll
        }
    }

    // Cek session
    const savedEmployee = sessionStorage.getItem('kasir_employee');
    console.log('🔍 [INIT] Cek session employee:', savedEmployee ? 'ada' : 'tidak ada');
    
    if (savedEmployee) {
        try {
            state.employee = JSON.parse(savedEmployee);
            state.outlet = JSON.parse(sessionStorage.getItem('kasir_outlet'));
            state.shift = JSON.parse(sessionStorage.getItem('kasir_shift'));
            console.log('✅ [INIT] Session dipulihkan:', state.employee);
        } catch (e) {
            console.error('❌ [INIT] Gagal parse session:', e);
            sessionStorage.clear();
        }
    }

    // Listener auth
    auth.onAuthStateChanged(async (user) => {
        console.log('🔐 [AUTH] Auth state changed:', user ? `user ${user.uid}` : 'tidak ada user');
        
        if (user) {
            state.user = user;
            state.ownerId = user.uid;
            console.log('👤 [AUTH] Owner ID:', state.ownerId);
            
            console.log('🔄 [AUTH] Memeriksa lisensi...');
            const license = await checkLicense(state.ownerId);
            console.log('🔑 [AUTH] Status lisensi:', license);
            
            if (license !== 'valid') {
                console.warn('⚠️ [AUTH] Lisensi tidak valid');
                els.ownerLoginModal.classList.add('hidden');
                els.lockOverlay.classList.remove('hidden');
                return;
            }
            els.lockOverlay.classList.add('hidden');

            if (state.employee) {
                console.log('👤 [AUTH] Kasir sudah login, menampilkan app');
                // Sudah login kasir, tampilkan app
                els.ownerLoginModal.classList.add('hidden');
                els.pinModal.classList.add('hidden');
                els.app.classList.remove('hidden');
                
                // Update header
                if (els.outletName) els.outletName.innerText = state.outlet?.name || '-';
                if (els.cashierName) els.cashierName.innerText = state.employee.name;
                if (els.shiftInfo) els.shiftInfo.innerText = `Shift ${state.employee.shift}`;
                
                // Inisialisasi navigasi
                if (typeof nav !== 'undefined' && nav.init) {
                    console.log('🔄 [AUTH] Memanggil nav.init()');
                    nav.init();
                    console.log('🔄 [AUTH] Memuat halaman transaksi');
                    nav.load('transaksi');
                } else {
                    console.error('❌ [AUTH] nav tidak ditemukan');
                    utils.showToast('Gagal memuat navigasi', 'error');
                }
            } else {
                console.log('👤 [AUTH] Owner login, menampilkan modal PIN kasir');
                // Owner login, tapi belum pilih kasir
                els.ownerLoginModal.classList.add('hidden');
                els.pinModal.classList.remove('hidden');
            }
        } else {
            console.log('👤 [AUTH] Tidak ada user, tampilkan modal owner');
            // Belum login owner
            els.ownerLoginModal.classList.remove('hidden');
            els.pinModal.classList.add('hidden');
            els.app.classList.add('hidden');
            state.ownerId = null;
            state.employee = null;
            sessionStorage.clear();
        }
    });
    
    console.log('✅ [INIT] Selesai');
});