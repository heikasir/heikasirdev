// ==================== shift.js ====================
// Manajemen shift kasir

async function openShift(startingCash) {
    if (!state.employee) return null;
    const shiftData = {
        employeeId: state.employee.id,
        outletId: state.employee.outletId,
        startTime: firebase.firestore.Timestamp.fromMillis(Date.now()), // client timestamp
        startingCash: parseInt(startingCash) || 0,
        status: 'open',
        createdAt: firebase.firestore.Timestamp.fromMillis(Date.now())
    };
    try {
        const result = await saveWithQueue('shifts', shiftData, 'create');
        if (result.success) {
            shiftData.id = result.id;
            state.shift = shiftData;
            sessionStorage.setItem('kasir_shift', JSON.stringify(shiftData));
            return shiftData;
        } else {
            console.error('Gagal buka shift:', result.error);
            utils.showToast('Gagal membuka shift', 'error');
            return null;
        }
    } catch (err) {
        console.error(err);
        utils.showToast('Gagal membuka shift', 'error');
        return null;
    }
}

async function closeShift(endingCash) {
    if (!state.shift || !state.shift.id) return false;
    const updateData = {
        endingCash: parseInt(endingCash) || 0,
        status: 'closed'
    };
    // Coba online dulu
    if (utils.isOnline()) {
        try {
            await db.collection('Owners').doc(state.ownerId).collection('Shifts').doc(state.shift.id).update({
                endTime: firebase.firestore.FieldValue.serverTimestamp(),
                endingCash: parseInt(endingCash) || 0,
                status: 'closed'
            });
            state.shift = null;
            sessionStorage.removeItem('kasir_shift');
            return true;
        } catch (err) {
            console.warn('Gagal update shift online, beralih ke offline', err);
        }
    }
    // Offline atau gagal online
    updateData.endTime = firebase.firestore.Timestamp.fromMillis(Date.now());
    await offline.addToQueue('shifts', { id: state.shift.id, ...updateData }, 'update');
    state.shift = null;
    sessionStorage.removeItem('kasir_shift');
    return true;
}

// Event listener untuk modal kasir
document.getElementById('modalKasirBuka')?.addEventListener('click', async () => {
    const nominal = document.getElementById('modalKasirNominal').value.trim();
    const pin = document.getElementById('modalKasirPin').value.trim();
    if (!nominal || !pin) {
        utils.showToast('Isi nominal dan PIN', 'error');
        return;
    }
    // Validasi PIN (owner atau head)
    const valid = await validatePin(pin, 'owner'); // bisa juga head, tergantung kebijakan
    if (!valid) {
        utils.showToast('PIN salah', 'error');
        return;
    }
    const shift = await openShift(nominal);
    if (shift) {
        document.getElementById('cashierModal').classList.add('hidden');
        // Buka halaman absen
        nav.load('absen');
    }
});

document.getElementById('modalKasirTutup')?.addEventListener('click', async () => {
    const nominal = document.getElementById('modalKasirNominal').value.trim();
    const pin = document.getElementById('modalKasirPin').value.trim();
    if (!nominal || !pin) {
        utils.showToast('Isi nominal akhir dan PIN', 'error');
        return;
    }
    const valid = await validatePin(pin, 'owner');
    if (!valid) {
        utils.showToast('PIN salah', 'error');
        return;
    }
    await closeShift(nominal);
    document.getElementById('cashierModal').classList.add('hidden');
    utils.showToast('Shift ditutup', 'success');
    // Logout kasir?
    logout();
});