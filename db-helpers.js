// ==================== db-helpers.js ====================
// Database Helper - Pengambil Data Firestore dengan Pengaman Macet (Timeout)

/**
 * Fungsi pembungkus query agar tidak hang selamanya jika internet bermasalah.
 */
async function wrapQuery(promise, timeoutMs = 5000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Timeout")), timeoutMs))
    ]);
}

async function getMenu() {
    if (!state.ownerId || !state.employee) {
        console.warn("⚠️ state.ownerId atau employee kosong saat getMenu.");
        return [];
    }
    const outletId = state.employee.outletId;
    
    try {
        console.log("📥 Mengambil data menu dari Firestore...");
        
        // Ambil data tanpa orderBy (Safe Mode dari Index Error)
        const snap = await wrapQuery(
            db.collection('Owners').doc(state.ownerId).collection('Menu')
            .where('isDeleted', '==', false)
            .where('isActive', '==', true)
            .get()
        );
            
        let menuList = [];
        snap.forEach(doc => {
            const m = doc.data();
            // Filter: Hanya menu Global atau yang spesifik milik Outlet ini
            if (m.outletId === 'global' || m.outletId === outletId) {
                menuList.push({ id: doc.id, ...m });
            }
        });

        // Urutkan manual berdasarkan gridIndex (JavaScript Sort)
        return menuList.sort((a, b) => (a.gridIndex || 0) - (b.gridIndex || 0));
    } catch (e) {
        console.error("❌ getMenu Gagal:", e);
        return [];
    }
}

async function getCategories() {
    if (!state.ownerId) return [];
    
    try {
        console.log("📥 Mengambil data kategori...");
        const snap = await wrapQuery(
            db.collection('Owners').doc(state.ownerId).collection('Categories')
            .where('isDeleted', '==', false)
            .get()
        );
            
        const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Urutkan manual berdasarkan sortIndex
        return cats.sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0));
    } catch (e) {
        console.error("❌ getCategories Gagal:", e);
        return [];
    }
}

async function getIngredients() {
    if (!state.ownerId || !state.employee) return [];
    const outletId = state.employee.outletId;

    try {
        console.log("📥 Mengambil data bahan baku...");
        const snap = await wrapQuery(
            db.collection('Owners').doc(state.ownerId).collection('Ingredients')
            .where('isDeleted', '==', false)
            .get()
        );
            
        let ingredients = [];
        snap.forEach(doc => {
            const ing = doc.data();
            if (ing.outletId === 'global' || ing.outletId === outletId) {
                ingredients.push({ id: doc.id, ...ing });
            }
        });
        
        return ingredients.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("❌ getIngredients Gagal:", e);
        return [];
    }
}

async function getExpenses(date) {
    if (!state.ownerId || !state.employee) return [];
    
    try {
        const start = new Date(date); start.setHours(0,0,0,0);
        const end = new Date(date); end.setHours(23,59,59,999);

        const snap = await wrapQuery(
            db.collection('Owners').doc(state.ownerId).collection('Expenses')
            .where('outletId', '==', state.employee.outletId)
            .where('timestamp', '>=', start)
            .where('timestamp', '<=', end)
            .where('isDeleted', '==', false)
            .get()
        );
            
        const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort terbaru di atas
        return expenses.sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : 0;
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : 0;
            return timeB - timeA;
        });
    } catch (e) {
        console.error("❌ getExpenses Gagal:", e);
        return [];
    }
}

async function getOutletSettings() {
    if (!state.ownerId || !state.employee) return {};
    try {
        const doc = await wrapQuery(
            db.collection('Owners').doc(state.ownerId).collection('Outlets').doc(state.employee.outletId).collection('Settings').doc('settings').get()
        );
        return doc.exists ? doc.data() : {};
    } catch (e) {
        console.error("❌ getOutletSettings Gagal:", e);
        return {};
    }
}

async function saveOutletSettings(settings) {
    if (!state.ownerId || !state.employee) return;
    try {
        const ref = db.collection('Owners').doc(state.ownerId).collection('Outlets').doc(state.employee.outletId).collection('Settings').doc('settings');
        await ref.set(settings, { merge: true });
    } catch (e) {
        console.error("❌ saveOutletSettings Gagal:", e);
        throw e;
    }
}

window.dbHelpers = { getMenu, getCategories, getIngredients, getExpenses, getOutletSettings, saveOutletSettings };