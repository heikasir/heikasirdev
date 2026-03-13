// ==================== attendance.js ====================
// Absensi check-in/check-out dengan selfie

let attendanceId = null; // id dokumen attendance yang sedang berlangsung

/**
 * Check-in dengan foto
 * @param {string} photoId ID foto yang tersimpan
 * @returns {Promise<boolean>}
 */
async function checkIn(photoId) {
    if (!state.employee || !state.shift) return false;
    const data = {
        employeeId: state.employee.id,
        shiftId: state.shift.id,
        outletId: state.employee.outletId,
        checkIn: firebase.firestore.Timestamp.fromMillis(Date.now()), // client timestamp
        checkInPhotoId: photoId,
        date: new Date().toISOString().slice(0, 10)
    };
    try {
        const result = await saveWithQueue('attendances', data, 'create');
        if (result.success) {
            attendanceId = result.id;
            return true;
        } else {
            console.error('Gagal checkIn:', result.error);
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

/**
 * Check-out dengan foto
 * @param {string} photoId ID foto yang tersimpan
 * @returns {Promise<boolean>}
 */
async function checkOut(photoId) {
    if (!attendanceId) return false;
    const updateData = {
        checkOutPhotoId: photoId
    };
    // Coba online dulu dengan serverTimestamp
    if (utils.isOnline()) {
        try {
            await db.collection('Owners').doc(state.ownerId).collection('Attendances').doc(attendanceId).update({
                checkOut: firebase.firestore.FieldValue.serverTimestamp(),
                checkOutPhotoId: photoId
            });
            return true;
        } catch (err) {
            console.warn('Gagal update online, beralih ke offline', err);
        }
    }
    // Offline atau gagal online: gunakan client timestamp dan queue
    updateData.checkOut = firebase.firestore.Timestamp.fromMillis(Date.now());
    await offline.addToQueue('attendances', { id: attendanceId, ...updateData }, 'update');
    return true;
}

// Halaman absen (akan dipanggil oleh nav)
window.pages = window.pages || {};
pages.absen = {
    render: async () => {
        els.pageContent.innerHTML = `
            <div class="p-4">
                <h2 class="text-2xl font-black mb-4">Absen ${attendanceId ? 'Check Out' : 'Check In'}</h2>
                <div id="cameraContainer">
                    <video id="cameraPreview" autoplay playsinline class="w-full rounded-xl bg-black mb-4" style="display: none;"></video>
                </div>
                <canvas id="cameraCanvas" class="hidden"></canvas>
                <div class="flex gap-2">
                    <button id="captureBtn" class="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold">
                        <i class="fas fa-camera mr-2"></i>Ambil Foto
                    </button>
                    <button id="skipBtn" class="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-bold">
                        Lewati
                    </button>
                </div>
                <div id="photoPreview" class="hidden mt-4">
                    <img id="previewImg" class="w-full rounded-xl mb-2">
                    <div class="flex gap-2">
                        <button id="confirmBtn" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Konfirmasi</button>
                        <button id="retakeBtn" class="flex-1 bg-gray-600 text-white py-3 rounded-xl font-bold">Ulang</button>
                    </div>
                </div>
                <div id="cameraError" class="hidden mt-4 p-4 bg-red-100 text-red-700 rounded-xl text-center">
                    <p>Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.</p>
                    <div class="flex gap-2 mt-3 justify-center">
                        <button id="retryCameraBtn" class="bg-red-600 text-white px-4 py-2 rounded-xl">Coba Lagi</button>
                        <button id="skipCameraBtn" class="bg-gray-600 text-white px-4 py-2 rounded-xl">Lanjutkan Tanpa Foto</button>
                    </div>
                </div>
            </div>
        `;

        const video = document.getElementById('cameraPreview');
        const canvas = document.getElementById('cameraCanvas');
        const cameraError = document.getElementById('cameraError');

        let capturedPhoto = null;
        let cameraStarted = false;

        // Fungsi untuk memulai kamera dan update UI
        const initCamera = async () => {
            cameraStarted = await camera.startCamera(video);
            if (cameraStarted) {
                video.style.display = 'block';
                cameraError.classList.add('hidden');
            } else {
                video.style.display = 'none';
                cameraError.classList.remove('hidden');
            }
        };

        await initCamera();

        document.getElementById('captureBtn').addEventListener('click', () => {
            if (!cameraStarted) {
                utils.showToast('Kamera tidak tersedia', 'error');
                return;
            }
            capturedPhoto = camera.capturePhoto(video, canvas);
            document.getElementById('previewImg').src = capturedPhoto;
            document.getElementById('photoPreview').classList.remove('hidden');
            video.classList.add('hidden');
            camera.stopCamera();
            cameraStarted = false;
        });

        document.getElementById('retakeBtn').addEventListener('click', async () => {
            document.getElementById('photoPreview').classList.add('hidden');
            video.classList.remove('hidden');
            capturedPhoto = null;
            await initCamera();
        });

        document.getElementById('confirmBtn').addEventListener('click', async () => {
            if (!capturedPhoto) {
                utils.showToast('Ambil foto terlebih dahulu', 'warning');
                return;
            }
            utils.showLoading();
            const photoId = await photoStorage.savePhoto(capturedPhoto);
            let success;
            if (attendanceId) {
                success = await checkOut(photoId);
            } else {
                success = await checkIn(photoId);
            }
            utils.hideLoading();
            if (success) {
                utils.showToast('Absen berhasil', 'success');
                nav.load('transaksi');
            } else {
                utils.showToast('Gagal absen', 'error');
            }
        });

        document.getElementById('skipBtn').addEventListener('click', () => {
            nav.load('transaksi');
        });

        document.getElementById('retryCameraBtn')?.addEventListener('click', async () => {
            await initCamera();
        });

        document.getElementById('skipCameraBtn')?.addEventListener('click', async () => {
            utils.showLoading();
            let success;
            if (attendanceId) {
                success = await checkOut(null);
            } else {
                success = await checkIn(null);
            }
            utils.hideLoading();
            if (success) {
                utils.showToast('Absen berhasil (tanpa foto)', 'success');
                nav.load('transaksi');
            } else {
                utils.showToast('Gagal absen', 'error');
            }
        });
    }
};