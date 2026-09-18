import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  Warehouse,
  BarChart3,
  Settings as SettingsIcon,
  Info,
  Eye,
} from 'lucide-react';
import Products from './Products';
import Customers from './Customers';
import Billing from './Billing';
import Invoice from './Invoice';
import Stock from './Stock';
import Settings from './Settings';
import Dashboard from './Dashboard';
import CustomerDetails from './CustomerDetails';
import Reports from './Reports';
import Activation from './Activation';
import About from './About';

function SecurityGate({ pageLabel, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [configured, setConfigured] = useState(null);
  const [resetMode, setResetMode] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  useEffect(() => {
    window.api.security.getPinState()
      .then((state) => setConfigured(state.configured))
      .catch((err) => setError(err.message || 'Could not load security settings.'));
  }, []);

  if (configured === null) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center">
        <div className="bg-white rounded-xl px-6 py-5 text-sm text-gray-600">Loading security settings...</div>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!configured || resetMode) {
        if (resetMode) {
          const deviceId = await window.api.license.getDeviceId();
          const appVersion = await window.api.license.getAppVersion();
          await window.api.license.verify(licenseKey.trim(), deviceId, appVersion);
        }
        if (!/^\d{4,6}$/.test(newPin) || newPin !== confirmPin) {
          throw new Error('Enter matching 4 to 6 digit PINs.');
        }
        await window.api.security.setPin(newPin);
        setConfigured(true);
        onSuccess();
        return;
      }
      if (!/^\d{4,6}$/.test(pin) || !(await window.api.security.verifyPin(pin))) {
        throw new Error('Incorrect PIN.');
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Security verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
          {!configured || resetMode
            ? (resetMode ? 'Reset Security PIN' : 'Set Security PIN')
            : `Unlock ${pageLabel}`}
          </h2>
          {configured && (
            <button type="button" onClick={onCancel} aria-label="Close"
              className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Dashboard and Reports are protected.
        </p>
        {!configured || resetMode ? (
          <>
            {resetMode && (
              <input type="text" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Activation key" className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
            )}
            <div className="relative mb-3">
              <input type={showNewPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New PIN (4-6 digits)" className="w-full border rounded-lg px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowNewPin((visible) => !visible)}
                aria-label={showNewPin ? 'Hide new PIN' : 'Show new PIN'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showNewPin ? 'text-blue-400' : 'text-gray-400 hover:text-gray-700'}`}>
                <Eye size={16} />
              </button>
            </div>
            <div className="relative">
              <input type={showConfirmPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm PIN" className="w-full border rounded-lg px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowConfirmPin((visible) => !visible)}
                aria-label={showConfirmPin ? 'Hide confirmation PIN' : 'Show confirmation PIN'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showConfirmPin ? 'text-blue-400' : 'text-gray-400 hover:text-gray-700'}`}>
                <Eye size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="relative">
            <input autoFocus type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter PIN" className="w-full border rounded-lg px-3 py-2 pr-10 text-sm" />
            <button type="button" onClick={() => setShowPin((visible) => !visible)}
              aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showPin ? 'text-blue-400' : 'text-gray-400 hover:text-gray-700'}`}>
              <Eye size={16} />
            </button>
          </div>
        )}
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
        <button disabled={busy} className="w-full mt-5 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
          {busy ? 'Please wait...' : resetMode ? 'Reset PIN' : configured ? 'Unlock' : 'Save PIN'}
        </button>
        {configured && !resetMode && (
          <button type="button" onClick={() => { setResetMode(true); setError(''); }}
            className="w-full mt-3 text-sm text-blue-600 hover:underline">
            Forgot PIN?
          </button>
        )}
        {configured && resetMode && (
          <button type="button" onClick={() => { setResetMode(false); setError(''); }}
            className="w-full mt-3 text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'stock', label: 'Stock', icon: Warehouse },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'about', label: 'About', icon: Info },
];

function App() {
  const [activeSection, setActiveSection] = useState('billing');
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);
  const [invoiceViewOnly, setInvoiceViewOnly] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const activeItem = menuItems.find((item) => item.id === activeSection);
  const [viewingCustomerId, setViewingCustomerId] = useState(null);
  const [isActivated, setIsActivated] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [appVersion, setAppVersion] = useState(null);
  const [securityTarget, setSecurityTarget] = useState(null);
  const [securitySettings, setSecuritySettings] = useState({});

  const openInvoiceEditor = (invoiceId) => {
    setViewingInvoiceId(null);
    setInvoiceViewOnly(false);
    setEditingInvoiceId(invoiceId);
    setActiveSection('billing');
  };

  const openSection = (sectionId) => {
    window.api.settings.getAll().then((settings) => {
      setSecuritySettings(settings);
      const securityEnabled = settings.page_lock_enabled !== 'off';
      const defaultLocked = sectionId === 'dashboard' || sectionId === 'reports';
      const pageLocked = settings[`lock_${sectionId}`] === 'on' ||
        (settings[`lock_${sectionId}`] === undefined && defaultLocked);
      if (securityEnabled && pageLocked) {
        setSecurityTarget(sectionId);
      } else {
        setActiveSection(sectionId);
      }
    }).catch((error) => console.error('Could not load page security settings:', error));
  };

  useEffect(() => {
    const isLicenseExpired = (license) => {
      if (!license || !license.expires_at) {
        return false;
      }

      const expiryTime = new Date(
        license.expires_at
      ).getTime();

      return (
        Number.isFinite(expiryTime) &&
        expiryTime <= Date.now()
      );
    };

    const checkSavedLicense = () => {
      const savedLicense = localStorage.getItem(
        'tradeflow_license'
      );

      if (!savedLicense) {
        setIsActivated(false);
        return;
      }

      try {
        const license = JSON.parse(savedLicense);

        if (isLicenseExpired(license)) {
          localStorage.removeItem('tradeflow_license');
          setIsActivated(false);
          return;
        }

        setIsActivated(true);
      } catch (error) {
        console.error(
          'Could not read saved license:',
          error
        );
        localStorage.removeItem('tradeflow_license');
        setIsActivated(false);
      }
    };

    const loadAppState = async () => {
      checkSavedLicense();

      try {
        const version = await window.api.license.getAppVersion();
        setAppVersion(version);
      } catch (error) {
        console.error('Could not load app version:', error);
      } finally {
        setCheckingLicense(false);
      }
    };

    loadAppState();

    const licenseCheckInterval = window.setInterval(
      checkSavedLicense,
      60 * 1000
    );

    return () => {
      window.clearInterval(licenseCheckInterval);
    };
  }, []);

  if (checkingLicense) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading TradeFlow...
        </div>
      </div>
    );
  }

  if (!isActivated) {
    return (
      <Activation
        appVersion={appVersion}
        onActivated={() => setIsActivated(true)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-[2px_0_12px_rgba(15,23,42,0.03)]">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-600/25">
                T
          </div>

<div>
  <div className="text-slate-800 font-semibold leading-tight tracking-tight">
    TradeFlow
  </div>
  <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
    Business Management
  </div>
</div>
        </div>

        <nav aria-label="Main navigation" className="flex-1 px-3 py-5 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => openSection(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 focus:outline-none ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">
          TradeFlow v{appVersion || '...'}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-base font-semibold text-slate-800 tracking-tight">{activeItem.label}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeSection === 'billing' ? 'Create and manage your invoices' : 'Manage your business securely'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 ring-4 ring-blue-50/60 flex items-center justify-center font-semibold text-sm">
              M
            </div>
          </div>
        </header>

        {/* Page content */}
        {securityTarget && (
          <SecurityGate
            pageLabel={menuItems.find((item) => item.id === securityTarget)?.label || 'Page'}
            onSuccess={() => {
            setActiveSection(securityTarget);
            setSecurityTarget(null);
            }}
            onCancel={() => setSecurityTarget(null)}
          />
        )}
<main className="flex-1 overflow-y-auto p-6 lg:p-8">
         {viewingInvoiceId ? (
  <Invoice
    invoiceId={viewingInvoiceId}
    readOnly={invoiceViewOnly}
    onBack={() => {
      setViewingInvoiceId(null);
      setInvoiceViewOnly(false);
    }}
    onEdit={() => openInvoiceEditor(viewingInvoiceId)}
  />
) : viewingCustomerId ? (
  <CustomerDetails
    customerId={viewingCustomerId}
    onBack={() => setViewingCustomerId(null)}
  />
) :
 activeSection === 'dashboard' ? (
  <Dashboard />
) : activeSection === 'products' ? (
  <Products />
) : activeSection === 'customers' ? (
  <Customers 
  onViewCustomer={(id) => setViewingCustomerId(id)}
  />
) : activeSection === 'billing' ? (
  <Billing
    onInvoiceCreated={(id) => {
      setInvoiceViewOnly(false);
      setViewingInvoiceId(id);
    }}
    onViewInvoice={(id) => {
      setInvoiceViewOnly(true);
      setViewingInvoiceId(id);
    }}
    editInvoiceId={editingInvoiceId}
    onEditComplete={() => setEditingInvoiceId(null)}
    onEditInvoice={openInvoiceEditor}
  />
) : activeSection === 'stock' ? (
  <Stock />
) : activeSection === 'settings' ? (
  <Settings />
) : activeSection === 'reports' ? (
  <Reports />
) : activeSection === 'about' ? (
<About appVersion={appVersion} />
) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
