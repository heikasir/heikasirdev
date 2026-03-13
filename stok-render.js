// ==================== stok-render.js ====================
// Halaman monitoring stok

pages.stok = {
    ingredients: [],

    render: async () => {
        pages.stok.ingredients = await dbHelpers.getIngredients();
        
        // Hitung stok menipis
        const lowStock = pages.stok.ingredients.filter(i => (i.currentStock || 0) <= (i.minStock || 0));

        els.pageContent.innerHTML = `
            <div class="p-4">
                <h2 class="text-2xl font-black mb-4">Monitoring Stok</h2>
                <div class="bg-yellow-100 dark:bg-yellow-900/20 rounded-2xl p-4 mb-4">
                    <p class="font-bold text-yellow-800 dark:text-yellow-200">Stok Menipis: ${lowStock.length}</p>
                </div>
                <div id="stockList" class="space-y-3">
                    ${pages.stok.ingredients.map(ing => {
                        const current = ing.currentStock || 0;
                        const min = ing.minStock || 0;
                        const percent = min > 0 ? (current / min) * 100 : 100;
                        let statusColor = 'text-green-600';
                        let bgColor = 'bg-green-100';
                        if (current <= 0) {
                            statusColor = 'text-red-600';
                            bgColor = 'bg-red-100';
                        } else if (current <= min) {
                            statusColor = 'text-orange-600';
                            bgColor = 'bg-orange-100';
                        }
                        return `
                            <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <p class="font-bold">${ing.name}</p>
                                        <p class="text-sm text-gray-500">${ing.unit}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-black ${statusColor}">${current}</p>
                                        <p class="text-xs text-gray-400">Min: ${min}</p>
                                    </div>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div class="${bgColor} h-2 rounded-full" style="width: ${Math.min(percent, 100)}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
};