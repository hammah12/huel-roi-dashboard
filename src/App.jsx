import React, { useState, useEffect } from 'react';
import DashboardOverview from './components/DashboardOverview';
import ClientForm from './components/ClientForm';
import PlacementsForecast from './components/PlacementsForecast';
import Settings from './components/Settings';
import { getConfig as getAirtableConfig, fetchPricingData as fetchAirtablePricing, syncClientToAirtable } from './utils/airtableSync';
import { getSyncUrl as getGSheetsUrl, fetchPricingData as fetchGSheetsPricing, syncClientToSheet } from './utils/googleSheetsSync';
import { updateDynamicPricing } from './utils/calculations';
import { loadProducts, saveProducts } from './components/Settings';

function App() {
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('huelClients');
    return saved ? JSON.parse(saved) : [];
  });
  const [availableProducts, setAvailableProducts] = useState(() => {
    const products = loadProducts();
    // Sync into calculations module on first load
    const productMap = {};
    products.forEach(p => { productMap[p.name] = { cogs: Number(p.cogs), defaultSrp: Number(p.defaultSrp) }; });
    updateDynamicPricing({}, productMap);
    return products;
  });
  const [view, setView] = useState('dashboard');
  const [editingClientIndex, setEditingClientIndex] = useState(null);

  // Attempt to fetch dynamic pricing on app load
  useEffect(() => {
    async function loadPricing() {
      // 1. Try Google Sheets first (most recent)
      if (getGSheetsUrl()) {
        try {
          const data = await fetchGSheetsPricing();
          if (data) {
            updateDynamicPricing(data.pricingTiers, data.products);
            return; // Exit if GSheets succeeds
          }
        } catch (e) { console.warn("GSheets fetch failed", e); }
      }

      // 2. Fallback to Airtable
      if (getAirtableConfig()) {
        try {
          const data = await fetchAirtablePricing();
          if (data) updateDynamicPricing(data.pricingTiers, data.products);
        } catch (e) { console.warn("Airtable fetch failed", e); }
      }
    }
    loadPricing();
  }, []);

  const handleSaveClient = async (clientData) => {
    let newClients;
    if (editingClientIndex !== null) {
      newClients = [...clients];
      newClients[editingClientIndex] = clientData;
    } else {
      newClients = [...clients, clientData];
    }
    setClients(newClients);
    localStorage.setItem('huelClients', JSON.stringify(newClients));
    setView('dashboard');
    setEditingClientIndex(null);

    // Sync to Google Sheets if configured
    if (getGSheetsUrl()) {
      await syncClientToSheet(clientData);
    }

    // Sync to Airtable if configured
    if (getAirtableConfig()) {
      await syncClientToAirtable(clientData);
    }
  };

  const handleEditClient = (index) => {
    setEditingClientIndex(index);
    setView('add_client');
  };

  const handleDuplicateClient = (index) => {
    const duplicated = { ...clients[index], retailerName: `${clients[index].retailerName} (Copy)` };
    const newClients = [...clients, duplicated];
    setClients(newClients);
    localStorage.setItem('huelClients', JSON.stringify(newClients));
  };

  const handleRemoveClient = (index) => {
    if (window.confirm('Are you sure you want to remove this retailer profile?')) {
      const newClients = clients.filter((_, i) => i !== index);
      setClients(newClients);
      localStorage.setItem('huelClients', JSON.stringify(newClients));
    }
  };

  const handleConvertLead = (index) => {
    const newClients = [...clients];
    newClients[index] = { ...newClients[index], pipelineStatus: 'Closed' };
    setClients(newClients);
    localStorage.setItem('huelClients', JSON.stringify(newClients));
  };

  const handleCancel = () => {
    setView('dashboard');
    setEditingClientIndex(null);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        {/* Huel wordmark */}
        <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            {/* Huel "H" mark */}
            <div style={{
              width: 32, height: 32,
              background: 'var(--huel-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem',
              color: 'var(--huel-dark)', flexShrink: 0
            }}>H</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--huel-light)', margin: 0 }}>
              Huel ROI
            </h2>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--huel-mid-gray)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Commercial Strategy
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            className={`btn ${view === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start' }}
            onClick={() => setView('dashboard')}
          >
            Dashboard Overview
          </button>
          <button
            className={`btn ${view === 'add_client' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start' }}
            onClick={() => setView('add_client')}
          >
            + Add New Retailer
          </button>
          <button
            className={`btn ${view === 'placements' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start' }}
            onClick={() => setView('placements')}
          >
            Placements Forecast
          </button>
          <button
            className={`btn ${view === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', marginTop: '2rem' }}
            onClick={() => setView('settings')}
          >
            Settings
          </button>
        </nav>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        {view === 'dashboard' && (
          <DashboardOverview
            clients={clients}
            onEdit={handleEditClient}
            onDuplicate={handleDuplicateClient}
            onRemove={handleRemoveClient}
            onConvert={handleConvertLead}
          />
        )}

        {view === 'add_client' && (
          <ClientForm
            onSave={handleSaveClient}
            onCancel={handleCancel}
            initialData={editingClientIndex !== null ? clients[editingClientIndex] : null}
            availableProducts={availableProducts}
          />
        )}

        {view === 'placements' && (
          <PlacementsForecast />
        )}

        {view === 'settings' && (
          <Settings
            onDataLoaded={() => setView('dashboard')}
            onProductsUpdated={(products) => setAvailableProducts(products)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
