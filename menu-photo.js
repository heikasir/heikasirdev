// ==================== menu-photo.js ====================
// Upload foto menu (lokal)

let currentMenuId = null;

// Buka modal upload foto
window.openUploadMenuModal = (menuId) => {
    currentMenuId = menuId;
    document.getElementById('uploadMenuPhotoModal').classList.remove('hidden');
};

// Preview foto
document.getElementById('menuPhotoInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('menuPhotoPreview').src = e.target.result;
            document.getElementById('menuPhotoPreview').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Simpan foto (ke IndexedDB)
document.getElementById('uploadMenuPhotoSave')?.addEventListener('click', async () => {
    const preview = document.getElementById('menuPhotoPreview');
    if (!preview.src || preview.src === '#') {
        utils.showToast('Pilih foto terlebih dahulu', 'warning');
        return;
    }
    if (!currentMenuId) return;
    
    // Simpan dataUrl ke IndexedDB dengan key menuId
    await offline.save('menu_photos', { id: currentMenuId, dataUrl: preview.src });
    utils.showToast('Foto menu disimpan lokal', 'success');
    closeUploadMenuModal();
    // Update tampilan menu jika perlu
});

// Fungsi untuk mengambil foto menu (dipanggil saat render)
async function getMenuPhoto(menuId) {
    const photo = await offline.get('menu_photos', menuId);
    return photo ? photo.dataUrl : null;
}

window.getMenuPhoto = getMenuPhoto;
window.openUploadMenuModal = openUploadMenuModal;