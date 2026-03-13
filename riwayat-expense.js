// ==================== riwayat-expense.js ====================
// Modal tambah/edit pengeluaran

function openExpenseModal(expense = null) {
    // Gunakan modal sederhana dengan prompt untuk sementara
    // Nanti bisa dibuat modal yang lebih baik
    const name = prompt('Nama pengeluaran:', expense?.itemName || '');
    if (name === null) return;
    const amount = prompt('Nominal (Rp):', expense?.amount || '');
    if (amount === null) return;
    const notes = prompt('Catatan:', expense?.notes || '');

    const data = {
        itemName: name,
        amount: parseInt(amount.replace(/[^0-9]/g, '')) || 0,
        notes: notes,
        inputBy: 'kasir',
        outletId: state.employee.outletId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        isDeleted: false
    };
    if (expense) data.id = expense.id;

    saveWithQueue('expenses', data, expense ? 'update' : 'create');
    utils.showToast(expense ? 'Pengeluaran diperbarui' : 'Pengeluaran ditambahkan');
    // Refresh halaman
    pages.riwayat.render();
}