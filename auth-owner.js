// ==================== auth-owner.js ====================
// Login owner dan cek lisensi

async function checkLicense(uid) {
    try {
        const doc = await db.collection('Master_Owners').doc(uid).get();
        if (!doc.exists) return 'not_found';
        const data = doc.data();
        if (data.status !== 'active') return 'inactive';
        if (data.expiryDate) {
            const expiry = data.expiryDate.toDate();
            if (expiry < new Date()) return 'expired';
        }
        return 'valid';
    } catch (e) {
        console.error(e);
        return 'error';
    }
}

async function loginOwner(email, password) {
    utils.showLoading();
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        state.user = cred.user;
        state.ownerId = cred.user.uid;
        const status = await checkLicense(state.ownerId);
        if (status !== 'valid') {
            els.ownerLoginModal.classList.add('hidden');
            els.lockOverlay.classList.remove('hidden');
            let msg = '';
            if (status === 'not_found') msg = 'Akun owner tidak ditemukan.';
            else if (status === 'inactive') msg = 'Lisensi owner belum aktif.';
            else if (status === 'expired') msg = 'Masa aktif lisensi telah habis.';
            else msg = 'Terjadi kesalahan lisensi.';
            els.lockMessage.innerText = msg;
            utils.hideLoading();
            return false;
        }
        // Owner valid, sembunyikan modal owner
        els.ownerLoginModal.classList.add('hidden');
        // Listener auth akan menampilkan modal PIN
        utils.hideLoading();
        return true;
    } catch (err) {
        utils.hideLoading();
        document.getElementById('ownerLoginError').innerText = err.message;
        document.getElementById('ownerLoginError').classList.remove('hidden');
        return false;
    }
}

document.getElementById('ownerLoginBtn')?.addEventListener('click', () => {
    const email = document.getElementById('ownerEmail').value.trim();
    const pass = document.getElementById('ownerPassword').value.trim();
    if (!email || !pass) {
        document.getElementById('ownerLoginError').innerText = 'Email dan password harus diisi';
        document.getElementById('ownerLoginError').classList.remove('hidden');
        return;
    }
    loginOwner(email, pass);
});