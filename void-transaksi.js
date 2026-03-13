// ==================== void-transaksi.js (FIXED) ====================
// Void transaksi dengan PIN, pengembalian stok, dan koreksi daily summary

async function voidTransaction(transactionId) {
    const pin = prompt('Masukkan PIN Owner/Head untuk void:');
    if (!pin) return;
    const valid = await validatePin(pin, 'head');
    if (!valid) {
        utils.showToast('PIN salah', 'error');
        return;
    }

    utils.showLoading();
    try {
        const transRef = db.collection('Owners').doc(state.ownerId).collection('Transactions').doc(transactionId);
        const transDoc = await transRef.get();
        if (!transDoc.exists) {
            utils.showToast('Transaksi tidak ditemukan', 'error');
            return;
        }
        const trans = transDoc.data();

        // Hitung total item yang dijual dalam transaksi ini
        const itemsSold = trans.items ? trans.items.reduce((sum, i) => sum + (i.qty || 0), 0) : 0;

        const batch = db.batch();
        // Tandai void
        batch.update(transRef, { is_void: true, voidedAt: firebase.firestore.FieldValue.serverTimestamp() });

        // Kembalikan stok (tambah stok bahan)
        for (const item of trans.items) {
            if (!item.menu_id) continue;
            const menuDoc = await db.collection('Owners').doc(state.ownerId).collection('Menu').doc(item.menu_id).get();
            if (menuDoc.exists) {
                const recipe = menuDoc.data().recipe || [];
                for (const ing of recipe) {
                    const ingRef = db.collection('Owners').doc(state.ownerId).collection('Ingredients').doc(ing.ingId);
                    batch.set(ingRef, {
                        currentStock: firebase.firestore.FieldValue.increment(ing.qty * item.qty)
                    }, { merge: true }); // gunakan set dengan merge agar aman
                }
            }
        }

        // Update daily summary
        const dateStr = trans.timestamp.toDate().toISOString().slice(0, 10);
        const sumRef = db.collection('Owners').doc(state.ownerId).collection('DailySummaries').doc(dateStr);
        const increment = firebase.firestore.FieldValue.increment;
        batch.set(sumRef, {
            totalIncome: increment(-trans.total),
            totalHpp: increment(-(trans.total_hpp || 0)),
            voidCount: increment(1),
            itemsSold: increment(-itemsSold)
        }, { merge: true });

        await batch.commit();
        utils.showToast('Transaksi berhasil divoid', 'success');
    } catch (err) {
        console.error(err);
        utils.showToast('Gagal void transaksi', 'error');
    } finally {
        utils.hideLoading();
    }
}

window.voidTransaction = voidTransaction;