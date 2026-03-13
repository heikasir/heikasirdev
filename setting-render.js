// ==================== setting-render.js ====================
// Halaman setting nota

pages.setting = {
    settings: {},

    render: async () => {
        pages.setting.settings = await dbHelpers.getOutletSettings();

        els.pageContent.innerHTML = `
            <div class="p-4">
                <h2 class="text-2xl font-black mb-4">Pengaturan Nota</h2>
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="showHeaderName" ${pages.setting.settings.showHeaderName ? 'checked' : ''}>
                            <span>Tampilkan Nama Outlet</span>
                        </label>
                        <input type="text" id="headerName" value="${pages.setting.settings.headerName || ''}" placeholder="Nama Outlet" class="w-full p-2 rounded border mt-1">
                    </div>
                    <div>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="showAddress" ${pages.setting.settings.showAddress ? 'checked' : ''}>
                            <span>Tampilkan Alamat</span>
                        </label>
                        <textarea id="address" rows="2" class="w-full p-2 rounded border mt-1">${pages.setting.settings.address || ''}</textarea>
                    </div>
                    <div>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="showPhone" ${pages.setting.settings.showPhone ? 'checked' : ''}>
                            <span>Tampilkan Telepon</span>
                        </label>
                        <input type="text" id="phone" value="${pages.setting.settings.phone || ''}" class="w-full p-2 rounded border mt-1">
                    </div>
                    <div class="border-t pt-4">
                        <h3 class="font-bold mb-2">Footer</h3>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="showFooterThanks" ${pages.setting.settings.showFooterThanks ? 'checked' : ''}>
                            <span>Tampilkan "Terima kasih"</span>
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="showIg" ${pages.setting.settings.showIg ? 'checked' : ''}>
                            <span>Instagram</span>
                        </label>
                        <input type="text" id="ig" value="${pages.setting.settings.ig || ''}" placeholder="@username" class="w-full p-2 rounded border mt-1">
                        <label class="flex items-center gap-2 mt-2">
                            <input type="checkbox" id="showFb" ${pages.setting.settings.showFb ? 'checked' : ''}>
                            <span>Facebook</span>
                        </label>
                        <input type="text" id="fb" value="${pages.setting.settings.fb || ''}" placeholder="facebook.com/..." class="w-full p-2 rounded border mt-1">
                        <label class="flex items-center gap-2 mt-2">
                            <input type="checkbox" id="showWa" ${pages.setting.settings.showWa ? 'checked' : ''}>
                            <span>WhatsApp</span>
                        </label>
                        <input type="text" id="wa" value="${pages.setting.settings.wa || ''}" placeholder="08..." class="w-full p-2 rounded border mt-1">
                    </div>
                    <div class="border-t pt-4">
                        <h3 class="font-bold mb-2">Logo</h3>
                        <img id="logoPreview" class="w-32 h-32 object-contain border rounded mb-2" src="${pages.setting.settings.logo || 'https://placehold.co/200x200/bf2c97/white?text=Logo'}">
                        <input type="file" id="logoInput" accept="image/*">
                        <label class="flex items-center gap-2 mt-2">
                            <span>Ukuran Logo (%)</span>
                            <input type="range" id="logoSize" min="20" max="100" value="${pages.setting.settings.logoSize || 50}">
                        </label>
                    </div>
                    <button id="previewNotaBtn" class="w-full bg-purple-100 text-purple-700 py-3 rounded-xl font-bold">Preview Nota</button>
                    <button id="saveSettingsBtn" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Simpan Perubahan</button>
                </div>
            </div>
        `;

        // Event listener preview - panggil melalui window
        document.getElementById('previewNotaBtn').addEventListener('click', () => {
            if (typeof window.previewNota === 'function') {
                window.previewNota();
            } else {
                utils.showToast('Fungsi preview belum tersedia', 'error');
            }
        });

        // Simpan
        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            // Validasi PIN
            const pin = prompt('Masukkan PIN Owner/Head untuk menyimpan setting:');
            if (!pin) return;
            const valid = await validatePin(pin, 'head');
            if (!valid) {
                utils.showToast('PIN salah', 'error');
                return;
            }

            const settings = {
                showHeaderName: document.getElementById('showHeaderName').checked,
                headerName: document.getElementById('headerName').value,
                showAddress: document.getElementById('showAddress').checked,
                address: document.getElementById('address').value,
                showPhone: document.getElementById('showPhone').checked,
                phone: document.getElementById('phone').value,
                showFooterThanks: document.getElementById('showFooterThanks').checked,
                showIg: document.getElementById('showIg').checked,
                ig: document.getElementById('ig').value,
                showFb: document.getElementById('showFb').checked,
                fb: document.getElementById('fb').value,
                showWa: document.getElementById('showWa').checked,
                wa: document.getElementById('wa').value,
                logoSize: document.getElementById('logoSize').value
            };

            // Logo (jika ada file baru)
            const fileInput = document.getElementById('logoInput');
            if (fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    settings.logo = e.target.result;
                    await dbHelpers.saveOutletSettings(settings);
                    utils.showToast('Setting disimpan', 'success');
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                settings.logo = pages.setting.settings.logo;
                await dbHelpers.saveOutletSettings(settings);
                utils.showToast('Setting disimpan', 'success');
            }
        });
    }
};