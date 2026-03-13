// ==================== setting-nota.js ====================
// Preview nota

async function previewNota() {
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
        logo: document.getElementById('logoPreview').src,
        logoSize: document.getElementById('logoSize').value
    };

    const previewDiv = document.getElementById('notaPreviewContent');
    previewDiv.innerHTML = `
        <div style="text-align:center;">
            ${settings.logo ? `<img src="${settings.logo}" style="width:${settings.logoSize}%; margin:0 auto;">` : ''}
            ${settings.showHeaderName ? `<h3>${settings.headerName || 'Nama Outlet'}</h3>` : ''}
            ${settings.showAddress ? `<p>${settings.address || 'Alamat'}</p>` : ''}
            ${settings.showPhone ? `<p>Telp: ${settings.phone || '-'}</p>` : ''}
        </div>
        <hr>
        <div style="font-family:'Courier New';">
            <p>Item x Qty    Harga</p>
            <p>Contoh x1     10.000</p>
            <p>----------------</p>
            <p>Total         10.000</p>
        </div>
        <hr>
        <div style="text-align:center;">
            ${settings.showFooterThanks ? '<p>Terima kasih</p>' : ''}
            ${settings.showIg ? `<p>IG: ${settings.ig || '-'}</p>` : ''}
            ${settings.showFb ? `<p>FB: ${settings.fb || '-'}</p>` : ''}
            ${settings.showWa ? `<p>WA: ${settings.wa || '-'}</p>` : ''}
        </div>
    `;
    document.getElementById('previewNotaModal').classList.remove('hidden');
}