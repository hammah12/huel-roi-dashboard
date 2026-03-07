// Helper module to sync with the deployed Google Apps Script Web App

// The user must provide their unique Apps Script Web App URL
export const getSyncUrl = () => {
    return localStorage.getItem('googleSheetsSyncUrl');
};

export const setSyncUrl = (url) => {
    if (url) {
        localStorage.setItem('googleSheetsSyncUrl', url);
    } else {
        localStorage.removeItem('googleSheetsSyncUrl');
    }
};

/**
 * Fetches dynamic pricing and product costs from the Google Sheet
 */
export const fetchPricingData = async () => {
    const url = getSyncUrl();
    if (!url) return null;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data; // { pricingTiers: {...}, products: {...} }
    } catch (error) {
        console.error("Error fetching pricing data from Google Sheets:", error);
        return null;
    }
};

/**
 * Posts a saved client profile to the Google Sheet 'Saved Clients' tab
 */
export const syncClientToSheet = async (clientData) => {
    const url = getSyncUrl();
    if (!url) return { success: false, error: 'No Sync URL provided' };

    try {
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Opaque response, but forces the POST without strict CORS preflight issues sometimes
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clientData)
        });

        // When using no-cors, we can't read the JSON response, we just assume it was sent if it doesn't throw
        return { success: true };
    } catch (error) {
        console.error("Error syncing client to Google Sheets:", error);
        return { success: false, error: error.message };
    }
};
