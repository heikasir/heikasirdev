// ==================== auth-head.js ====================
// Validasi PIN untuk level head/owner

async function validatePin(pin, level = 'head') {
    // level: 'head' (kepala toko) atau 'owner' (owner)
    if (!state.ownerId) return false;

    if (level === 'owner') {
        // Validasi ke Master_Owners
        try {
            const doc = await db.collection('Master_Owners').doc(state.ownerId).get();
            return doc.exists && doc.data().pin === pin;
        } catch {
            return false;
        }
    } else {
        // Validasi ke Employees dengan role head
        try {
            const snap = await db.collection('Owners').doc(state.ownerId).collection('Employees')
                .where('outletId', '==', state.employee?.outletId || '')
                .where('role', '==', 'head')
                .where('pin', '==', pin)
                .where('isActive', '==', true)
                .limit(1)
                .get();
            return !snap.empty;
        } catch {
            return false;
        }
    }
}

// Modal PIN umum (bisa dipanggil dari berbagai tempat)
async function requestPin(level = 'head', message = 'Masukkan PIN') {
    return new Promise((resolve) => {
        const modal = document.getElementById('pinModal');
        // Ubah judul dan deskripsi sesuai kebutuhan
        document.querySelector('#pinModal h2').innerText = level === 'owner' ? 'PIN Owner' : 'PIN Kepala Toko';
        document.querySelector('#pinModal p').innerText = message;
        // Tampilkan modal
        modal.classList.remove('hidden');
        // Hapus event listener sebelumnya
        const btn = document.getElementById('pinLoginBtn');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', async () => {
            const pin = document.getElementById('pinCode').value.trim();
            const valid = await validatePin(pin, level);
            if (valid) {
                modal.classList.add('hidden');
                document.getElementById('pinCode').value = '';
                document.getElementById('pinError').classList.add('hidden');
                resolve(true);
            } else {
                document.getElementById('pinError').innerText = 'PIN salah';
                document.getElementById('pinError').classList.remove('hidden');
            }
        });
    });
}