// ==================== camera.js ====================
// Helper untuk mengakses kamera dengan fallback

let cameraStream = null;

/**
 * Memulai kamera pada elemen video
 * @param {HTMLVideoElement} videoElement 
 * @returns {Promise<boolean>} true jika berhasil
 */
async function startCamera(videoElement) {
    // Hentikan stream sebelumnya jika ada
    stopCamera();

    try {
        // Coba dengan facingMode 'user' (kamera depan)
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
    } catch (err) {
        console.warn('Gagal akses kamera depan, coba tanpa facingMode...', err);
        try {
            // Fallback: kamera belakang atau mana saja yang tersedia
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        } catch (err2) {
            console.error('Gagal akses kamera sama sekali:', err2);
            utils.showToast('Tidak dapat mengakses kamera. Periksa izin.', 'error');
            return false;
        }
    }

    if (cameraStream) {
        videoElement.srcObject = cameraStream;
        // Pastikan video diputar
        try {
            await videoElement.play();
        } catch (playErr) {
            console.warn('Gagal memutar video:', playErr);
            // Jika gagal play, mungkin browser butuh interaksi user? Tapi autoplay seharusnya jalan.
        }
        return true;
    }
    return false;
}

/**
 * Menghentikan kamera dan melepas resource
 */
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

/**
 * Mengambil foto dari video
 * @param {HTMLVideoElement} videoElement 
 * @param {HTMLCanvasElement} canvasElement 
 * @returns {string} dataURL gambar
 */
function capturePhoto(videoElement, canvasElement) {
    const context = canvasElement.getContext('2d');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    return canvasElement.toDataURL('image/png');
}

// Ekspor fungsi ke global
window.camera = { startCamera, stopCamera, capturePhoto };