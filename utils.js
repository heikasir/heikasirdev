// ==================== utils.js ====================
// Elemen DOM yang sering digunakan
const els = {
    toast: document.getElementById('toast'),
    loading: document.getElementById('loadingOverlay'),
    pageContent: document.getElementById('pageContent'),
    app: document.getElementById('app'),
    ownerLoginModal: document.getElementById('ownerLoginModal'),
    pinModal: document.getElementById('pinModal'),
    lockOverlay: document.getElementById('lockOverlay'),
    lockMessage: document.getElementById('lockMessage'),
    outletName: document.getElementById('outletName'),
    cashierName: document.getElementById('cashierName'),
    shiftInfo: document.getElementById('shiftInfo'),
    printerIcon: document.getElementById('printerIcon'),
    printerStatus: document.getElementById('printerStatus'),
    bluetoothBtn: document.getElementById('bluetoothBtn')
};
window.els = els;

// Utilitas umum
window.utils = {
    showToast: (msg, type = 'success') => {
        const toast = els.toast;
        if (!toast) return;
        toast.className = 'toast';
        toast.style.display = 'flex';
        let icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-times-circle';
        else if (type === 'warning') icon = 'fa-exclamation-triangle';
        else if (type === 'info') icon = 'fa-info-circle';
        toast.innerHTML = `<i class="fas ${icon} text-xl mr-3"></i><span class="flex-1">${msg}</span>`;
        toast.classList.add(type);
        requestAnimationFrame(() => toast.classList.add('show'));
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.style.display = 'none';
                toast.classList.remove(type);
            }, { once: true });
        }, 3500);
    },

    showLoading: () => {
        if (els.loading) els.loading.classList.remove('hidden');
    },
    hideLoading: () => {
        if (els.loading) els.loading.classList.add('hidden');
    },

    formatRupiah: (num) => {
        if (num === undefined || num === null || isNaN(num)) num = 0;
        return 'Rp ' + Math.floor(num).toLocaleString('id-ID');
    },

    formatRupiahDec: (num, decimals = 0) => {
        if (num === undefined || num === null || isNaN(num)) num = 0;
        return 'Rp ' + Number(num).toLocaleString('id-ID', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    formatDate: (ts) => {
        if (!ts) return '-';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatDateTime: (ts) => {
        if (!ts) return '-';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    cleanNumber: (value) => {
        if (typeof value !== 'string') value = String(value);
        return value.replace(/[^0-9]/g, '');
    },

    generateId: () => {
        const prefix = 'HK';
        const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
        const timestamp = Date.now().toString().slice(-3);
        return `${prefix}${randomStr}${timestamp}`;
    },

    setLocal: (key, value) => {
        try {
            localStorage.setItem('kasir_' + key, JSON.stringify(value));
        } catch (e) {
            console.error('Gagal menyimpan ke localStorage', e);
        }
    },
    getLocal: (key) => {
        try {
            const data = localStorage.getItem('kasir_' + key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Gagal membaca localStorage', e);
            return null;
        }
    },
    removeLocal: (key) => {
        localStorage.removeItem('kasir_' + key);
    },

    isOnline: () => navigator.onLine,

    withTimeout: (promise, ms, context) => {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Timeout after ${ms}ms: ${context}`));
            }, ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    }
};