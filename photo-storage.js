// ==================== photo-storage.js ====================
// Simpan foto ke IndexedDB

async function savePhoto(dataUrl) {
    const id = 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    await offline.save('photos', { id, dataUrl, timestamp: Date.now() });
    return id;
}

async function getPhoto(id) {
    const photo = await offline.get('photos', id);
    return photo ? photo.dataUrl : null;
}

async function deletePhoto(id) {
    await offline.delete('photos', id);
}

window.photoStorage = { savePhoto, getPhoto, deletePhoto };