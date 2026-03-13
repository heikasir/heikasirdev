// ==================== bluetooth.js ====================
// Manajemen printer Bluetooth

window.bluetoothPrinter = {
    device: null,
    server: null,
    service: null,
    characteristic: null,
    connected: false,

    isSupported: () => !!navigator.bluetooth,

    async connect() {
        if (!this.isSupported()) {
            utils.showToast('Browser tidak mendukung Bluetooth', 'error');
            return false;
        }
        try {
            utils.showLoading();
            const savedId = utils.getLocal('printerDeviceId');
            let device;
            if (savedId) {
                // Coba reconnect (tidak semua browser mendukung)
                const devices = await navigator.bluetooth.getDevices();
                device = devices.find(d => d.id === savedId);
            }
            if (!device) {
                device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // UUID umum printer thermal
                });
            }
            if (!device) throw new Error('Tidak ada perangkat dipilih');

            this.device = device;
            utils.setLocal('printerDeviceId', device.id);

            this.server = await device.gatt.connect();
            this.service = await this.server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            this.characteristic = await this.service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            this.connected = true;
            this.updateUI(true);
            utils.hideLoading();
            utils.showToast('Printer terhubung', 'success');
            return true;
        } catch (err) {
            console.error(err);
            this.connected = false;
            this.updateUI(false);
            utils.hideLoading();
            utils.showToast('Gagal connect: ' + err.message, 'error');
            return false;
        }
    },

    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.connected = false;
        this.updateUI(false);
        utils.showToast('Printer diputus', 'info');
    },

    async printText(text) {
        if (!this.connected || !this.characteristic) {
            utils.showToast('Printer tidak terhubung', 'error');
            return false;
        }
        try {
            const encoder = new TextEncoder();
            await this.characteristic.writeValue(encoder.encode(text));
            return true;
        } catch (err) {
            console.error(err);
            utils.showToast('Gagal mencetak', 'error');
            return false;
        }
    },

    async printReceipt(transaction) {
        let receipt = '\n\n';
        receipt += '      HeiKasir\n';
        receipt += '====================\n';
        receipt += new Date().toLocaleString('id-ID') + '\n';
        receipt += 'Kasir: ' + (transaction.cashier_name || state.employee?.name) + '\n';
        receipt += '====================\n';
        transaction.items.forEach(item => {
            receipt += `${item.name} x${item.qty}\n`;
            receipt += `  @${utils.formatRupiah(item.price)} = ${utils.formatRupiah(item.subtotal)}\n`;
        });
        receipt += '--------------------\n';
        receipt += `Subtotal: ${utils.formatRupiah(transaction.subtotal)}\n`;
        if (transaction.discount) receipt += `Diskon:   ${utils.formatRupiah(transaction.discount)}\n`;
        receipt += `TOTAL:    ${utils.formatRupiah(transaction.total)}\n`;
        receipt += `Metode:   ${transaction.payment_method}\n`;
        receipt += '====================\n';
        receipt += 'Terima kasih\n';
        receipt += '\n\n\n';
        return this.printText(receipt);
    },

    updateUI(connected) {
        const icon = els.printerIcon;
        const status = els.printerStatus;
        const btn = els.bluetoothBtn;
        if (connected) {
            icon.className = 'fas fa-print text-green-500';
            if (status) status.innerText = 'Terhubung';
            if (btn) {
                btn.innerHTML = '<i class="fas fa-bluetooth"></i><span class="hidden sm:inline">Putuskan</span>';
                btn.classList.remove('bg-blue-100', 'text-blue-600');
                btn.classList.add('bg-red-100', 'text-red-600');
                btn.onclick = () => bluetoothPrinter.disconnect();
            }
        } else {
            icon.className = 'fas fa-print text-gray-400';
            if (status) status.innerText = 'Putus';
            if (btn) {
                btn.innerHTML = '<i class="fas fa-bluetooth"></i><span class="hidden sm:inline">Sambungkan</span>';
                btn.classList.remove('bg-red-100', 'text-red-600');
                btn.classList.add('bg-blue-100', 'text-blue-600');
                btn.onclick = () => bluetoothPrinter.connect();
            }
        }
    }
};

// Event listener untuk tombol bluetooth
els.bluetoothBtn?.addEventListener('click', () => {
    if (bluetoothPrinter.connected) bluetoothPrinter.disconnect();
    else bluetoothPrinter.connect();
});