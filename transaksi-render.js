// ==================== transaksi-render.js ====================
// Halaman transaksi: Manajemen Grid Menu, Filter Kategori, Pencarian, dan Integrasi Keranjang

pages.transaksi = {
    menu: [],       // Cache seluruh data menu untuk outlet ini
    categories: [], // Cache kategori aktif
    currentCat: 'all',

    render: async () => {
        try {
            // 1. Ambil data menu dan kategori dari Helper Database
            // dbHelpers.getMenu sudah memfilter berdasarkan outletId & isActive
            pages.transaksi.menu = await dbHelpers.getMenu();
            pages.transaksi.categories = await dbHelpers.getCategories();

            // 2. Render Struktur Layout Utama (Responsive Grid & Sidebar Keranjang)
            els.pageContent.innerHTML = `
                <div class="flex flex-col lg:flex-row gap-6 h-full animate-fade-in">
                    
                    <!-- BAGIAN KIRI: GRID MENU & FILTER -->
                    <div class="lg:w-2/3 flex flex-col">
                        <div class="bg-white dark:bg-gray-800 rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                            
                            <!-- Header Toolbar: Pencarian & Manual Input -->
                            <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                                <h2 class="text-xl font-black text-gray-900 dark:text-white tracking-tight">Katalog Menu</h2>
                                
                                <div class="flex gap-2 w-full sm:w-auto">
                                    <div class="relative flex-1">
                                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                        <input type="text" id="searchMenu" placeholder="Cari menu favorit..." 
                                            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-4 focus:ring-purple-500/10 outline-none transition-all">
                                    </div>
                                    <button id="manualInputBtn" 
                                        class="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-100 transition-all active:scale-95">
                                        <i class="fas fa-keyboard"></i>
                                        <span class="hidden sm:inline">Manual</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Filter Kategori (Horizontal Scroll) -->
                            <div id="categoryFilter" class="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                                <button class="cat-filter active whitespace-nowrap px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none transition-all" 
                                    data-cat="all">Semua</button>
                                ${pages.transaksi.categories.map(c => `
                                    <button class="cat-filter whitespace-nowrap px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 transition-all" 
                                        data-cat="${c.id}">${c.name}</button>
                                `).join('')}
                            </div>

                            <!-- Grid Menu Dinamis -->
                            <div id="menuGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[65vh] overflow-y-auto pb-4 pr-1 custom-scrollbar">
                                ${pages.transaksi.renderMenuGrid('all')}
                            </div>
                        </div>
                    </div>

                    <!-- BAGIAN KANAN: SIDEBAR KERANJANG -->
                    <div class="lg:w-1/3">
                        <div class="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 sticky top-24 flex flex-col min-h-[500px]">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="font-black text-xl text-gray-900 dark:text-white tracking-tight">Keranjang</h2>
                                <span class="bg-purple-100 text-purple-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">Order Aktif</span>
                            </div>
                            
                            <!-- Daftar Item di Keranjang (Scrollable) -->
                            <div id="cartItems" class="flex-1 space-y-4 overflow-y-auto mb-6 pr-1 custom-scrollbar min-h-[200px]">
                                <!-- Konten akan diisi oleh renderCart() di transaksi-cart.js -->
                            </div>

                            <!-- Ringkasan Kalkulasi -->
                            <div class="border-t border-dashed border-gray-200 dark:border-gray-700 pt-5 space-y-3">
                                <div class="flex justify-between text-sm font-medium text-gray-500">
                                    <span>Subtotal</span>
                                    <span id="cartSubtotal" class="text-gray-900 dark:text-white font-bold">Rp 0</span>
                                </div>
                                <div class="flex justify-between items-center text-sm font-medium text-gray-500">
                                    <span>Diskon Manual</span>
                                    <div class="flex items-center bg-gray-50 dark:bg-gray-900 border rounded-xl px-2 py-1">
                                        <span class="text-xs mr-1 text-gray-400">Rp</span>
                                        <input type="text" id="cartDiscountInput" value="0" 
                                            class="w-20 text-right bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-red-500" 
                                            oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                                    </div>
                                </div>
                                <div class="flex justify-between items-center pt-2">
                                    <span class="text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter">Total Akhir</span>
                                    <span id="cartTotal" class="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tighter">Rp 0</span>
                                </div>
                            </div>

                            <!-- Tombol Eksekusi Bayar -->
                            <button id="payBtn" 
                                class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-green-200 dark:shadow-none mt-6 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3">
                                <i class="fas fa-cash-register"></i>
                                PROSES BAYAR
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // 3. Inisialisasi Event Listener
            pages.transaksi.initListeners();

            // 4. Sinkronisasi Keranjang Awal
            renderCart();

        } catch (error) {
            console.error("Gagal Render Halaman Transaksi:", error);
            utils.showToast("Gagal memuat katalog menu", "error");
        }
    },

    initListeners: () => {
        // --- Listener Filter Kategori ---
        document.querySelectorAll('.cat-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update UI Button
                document.querySelectorAll('.cat-filter').forEach(b => {
                    b.classList.remove('active', 'bg-purple-600', 'text-white', 'shadow-lg', 'shadow-purple-200');
                    b.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-400');
                });
                btn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-400');
                btn.classList.add('active', 'bg-purple-600', 'text-white', 'shadow-lg', 'shadow-purple-200');
                
                // Update Grid
                const cat = btn.dataset.cat;
                pages.transaksi.currentCat = cat;
                document.getElementById('menuGrid').innerHTML = pages.transaksi.renderMenuGrid(cat);
                pages.transaksi.attachMenuClicks();
            });
        });

        // --- Listener Pencarian (Real-time dengan Filter Kategori) ---
        const searchInput = document.getElementById('searchMenu');
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const category = pages.transaksi.currentCat;

            // Filter data dari cache memory (lebih cepat)
            const filtered = pages.transaksi.menu.filter(m => {
                const matchName = m.name.toLowerCase().includes(keyword);
                const matchCat = (category === 'all' || m.category === category);
                return matchName && matchCat;
            });

            const grid = document.getElementById('menuGrid');
            if (filtered.length > 0) {
                grid.innerHTML = filtered.map(m => pages.transaksi.renderMenuItem(m)).join('');
                pages.transaksi.attachMenuClicks();
            } else {
                grid.innerHTML = `
                    <div class="col-span-full py-20 text-center">
                        <i class="fas fa-search text-4xl text-gray-200 mb-3"></i>
                        <p class="text-gray-400 font-medium">Menu "${keyword}" tidak ditemukan</p>
                    </div>
                `;
            }
        });

        // --- Listener Tombol Manual ---
        document.getElementById('manualInputBtn').addEventListener('click', () => {
            document.getElementById('manualModal').classList.remove('hidden');
            document.getElementById('manualName').focus();
        });

        // --- Listener Tombol Bayar ---
        document.getElementById('payBtn').addEventListener('click', () => {
            if (state.cart.length === 0) {
                utils.showToast('Pilih menu terlebih dahulu!', 'warning');
                return;
            }
            openPaymentModal();
        });

        // Attach klik menu pertama kali
        pages.transaksi.attachMenuClicks();
    },

    // Fungsi untuk menempelkan event klik ke setiap kartu menu
    attachMenuClicks: () => {
        document.querySelectorAll('.menu-item-card').forEach(el => {
            el.onclick = () => {
                const id = el.dataset.id;
                const menu = pages.transaksi.menu.find(m => m.id === id);
                if (menu) {
                    addToCart(menu); // Panggil fungsi dari transaksi-cart.js
                    // Beri feedback visual singkat
                    el.classList.add('scale-95', 'opacity-70');
                    setTimeout(() => el.classList.remove('scale-95', 'opacity-70'), 100);
                }
            };
        });
    },

    // Render Grid berdasarkan kategori
    renderMenuGrid: (categoryId) => {
        const filtered = categoryId === 'all' 
            ? pages.transaksi.menu 
            : pages.transaksi.menu.filter(m => m.category === categoryId);
        
        if (filtered.length === 0) {
            return `
                <div class="col-span-full py-20 text-center">
                    <i class="fas fa-utensils text-4xl text-gray-200 mb-3"></i>
                    <p class="text-gray-400 font-medium">Belum ada menu di kategori ini</p>
                </div>
            `;
        }
        return filtered.map(m => pages.transaksi.renderMenuItem(m)).join('');
    },

    // Template HTML untuk satu item menu
    renderMenuItem: (m) => {
        // Ambil harga tunai sebagai default tampilan grid
        const displayPrice = m.prices?.tunai || 0;
        
        return `
            <div class="menu-item-card group bg-gray-50 dark:bg-gray-900 rounded-3xl p-3 cursor-pointer hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-purple-500/5 border border-transparent hover:border-purple-100 dark:hover:border-purple-900 transition-all duration-300 active:scale-95" 
                data-id="${m.id}">
                <div class="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-inner bg-gray-200 dark:bg-gray-700">
                    <!-- Image dengan Placeholder jika error/kosong -->
                    <img src="${m.imageUrl || 'https://placehold.co/400x400/bf2c97/ffffff?text='+encodeURIComponent(m.name)}" 
                         alt="${m.name}"
                         class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                         onerror="this.src='https://placehold.co/400x400/bf2c97/ffffff?text=Error+Image'">
                    
                    <!-- Overlay saat di-hover -->
                    <div class="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div class="bg-white p-2 rounded-full shadow-lg">
                            <i class="fas fa-plus text-purple-600"></i>
                        </div>
                    </div>
                </div>
                
                <div class="px-1">
                    <p class="font-bold text-xs text-gray-800 dark:text-gray-200 truncate mb-1" title="${m.name}">${m.name}</p>
                    <div class="flex justify-between items-center">
                        <p class="text-purple-600 dark:text-purple-400 font-black text-sm tracking-tighter">${utils.formatRupiah(displayPrice)}</p>
                        ${m.calculatedHpp ? `<i class="fas fa-shield-alt text-[8px] text-gray-300" title="HPP Terlindungi"></i>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
};