// ==================== auth-pin.js ====================
// Login kasir dengan username dan PIN

/**
 * Login kasir dengan username dan PIN
 * @param {string} username 
 * @param {string} pin 
 * @returns {Promise<boolean>} true jika sukses
 */
async function loginCashier(username, pin) {
    if (!state.ownerId) {
        utils.showToast('Owner belum login', 'error');
        return false;
    }

    utils.showLoading();
    try {
        // Validasi input
        if (!username || !pin) {
            document.getElementById('pinError').innerText = 'Username dan PIN harus diisi';
            document.getElementById('pinError').classList.remove('hidden');
            utils.hideLoading();
            return false;
        }

        // Cari employee dengan username dan pin yang cocok
        const employeesRef = db.collection('Owners').doc(state.ownerId).collection('Employees');
        const snapshot = await employeesRef
            .where('username', '==', username)
            .where('pin', '==', pin)
            .where('isDeleted', '==', false)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            document.getElementById('pinError').innerText = 'Username atau PIN salah';
            document.getElementById('pinError').classList.remove('hidden');
            utils.hideLoading();
            return false;
        }

        const empDoc = snapshot.docs[0];
        const empData = empDoc.data();
        state.employee = {
            id: empDoc.id,
            name: empData.name,
            username: empData.username,
            outletId: empData.outletId,
            role: empData.role,
            shift: empData.shift,
        };

        // Ambil data outlet
        try {
            const outletDoc = await db.collection('Owners').doc(state.ownerId).collection('Outlets').doc(state.employee.outletId).get();
            if (outletDoc.exists) {
                state.outlet = { id: outletDoc.id, ...outletDoc.data() };
            } else {
                state.outlet = { id: 'global', name: 'Pusat' };
            }
        } catch (err) {
            console.warn('Gagal ambil outlet, menggunakan default', err);
            state.outlet = { id: 'global', name: 'Pusat' };
        }

        // Simpan ke sessionStorage
        sessionStorage.setItem('kasir_employee', JSON.stringify(state.employee));
        sessionStorage.setItem('kasir_outlet', JSON.stringify(state.outlet));

        // Sembunyikan error
        document.getElementById('pinError').classList.add('hidden');
        utils.hideLoading();
        return true;
    } catch (err) {
        console.error('Error loginCashier:', err);
        utils.hideLoading();
        document.getElementById('pinError').innerText = 'Terjadi kesalahan: ' + err.message;
        document.getElementById('pinError').classList.remove('hidden');
        return false;
    }
}

/**
 * Muat data ingredients dan menu ke state untuk akses cepat
 */
async function loadInitialData() {
    if (!state.ownerId || !state.employee) return;
    try {
        console.log('📥 Memuat data ingredients ke state...');
        const ingSnap = await db.collection('Owners').doc(state.ownerId).collection('Ingredients')
            .where('isDeleted', '==', false)
            .get();
        state.ingredients = {};
        ingSnap.forEach(doc => {
            const ing = doc.data();
            if (ing.outletId === 'global' || ing.outletId === state.employee.outletId) {
                state.ingredients[doc.id] = ing;
            }
        });
        console.log(`✅ Ingredients dimuat: ${Object.keys(state.ingredients).length}`);

        console.log('📥 Memuat data menu ke state...');
        const menuSnap = await db.collection('Owners').doc(state.ownerId).collection('Menu')
            .where('isDeleted', '==', false)
            .where('isActive', '==', true)
            .get();
        state.menu = [];
        menuSnap.forEach(doc => {
            const m = doc.data();
            if (m.outletId === 'global' || m.outletId === state.employee.outletId) {
                state.menu.push({ id: doc.id, ...m });
            }
        });
        // Urutkan berdasarkan gridIndex
        state.menu.sort((a, b) => (a.gridIndex || 0) - (b.gridIndex || 0));
        console.log(`✅ Menu dimuat: ${state.menu.length}`);
    } catch (err) {
        console.error('❌ Gagal muat data awal:', err);
        utils.showToast('Gagal memuat data menu & stok', 'error');
    }
}

/**
 * Mendapatkan shift yang masih open untuk employee hari ini
 * @param {string} employeeId 
 * @returns {Promise<object|null>} shift object atau null
 */
async function getOpenShift(employeeId) {
    if (!state.ownerId) return null;
    try {
        const today = new Date().toISOString().slice(0, 10);
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const snapshot = await db.collection('Owners').doc(state.ownerId).collection('Shifts')
            .where('employeeId', '==', employeeId)
            .where('status', '==', 'open')
            .where('startTime', '>=', startOfDay)
            .where('startTime', '<=', endOfDay)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (err) {
        console.error('Error getOpenShift:', err);
        return null;
    }
}

// ========== Event Listener untuk tombol login PIN ==========
document.getElementById('pinLoginBtn')?.addEventListener('click', async () => {
    const username = document.getElementById('pinUsername').value.trim();
    const pin = document.getElementById('pinCode').value.trim();
    if (!username || !pin) {
        document.getElementById('pinError').innerText = 'Isi username dan PIN';
        document.getElementById('pinError').classList.remove('hidden');
        return;
    }

    const success = await loginCashier(username, pin);
    if (!success) return;

    // Cek apakah ada shift open
    const openShift = await getOpenShift(state.employee.id);
    if (openShift) {
        state.shift = openShift;
        sessionStorage.setItem('kasir_shift', JSON.stringify(openShift));

        // Update header
        if (els.outletName) els.outletName.innerText = state.outlet?.name || '-';
        if (els.cashierName) els.cashierName.innerText = state.employee.name;
        if (els.shiftInfo) els.shiftInfo.innerText = `Shift ${state.employee.shift}`;

        // Muat data ingredients & menu ke state
        await loadInitialData();

        // Mulai stock alert interval
        if (typeof startStockAlert === 'function') startStockAlert();

        // Masuk ke aplikasi utama
        els.pinModal.classList.add('hidden');
        els.app.classList.remove('hidden');

        // Inisialisasi navigasi dan muat halaman transaksi
        if (typeof nav !== 'undefined' && nav.init) {
            nav.init();
            nav.load('transaksi');
        } else {
            console.error('nav tidak ditemukan');
            utils.showToast('Gagal memuat navigasi', 'error');
        }
    } else {
        // Tidak ada shift open, tampilkan modal buka kasir
        els.pinModal.classList.add('hidden');
        const cashierModal = document.getElementById('cashierModal');
        if (cashierModal) cashierModal.classList.remove('hidden');
    }
});

// Optional: Enter key pada input PIN
document.getElementById('pinCode')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('pinLoginBtn').click();
    }
});