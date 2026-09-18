import { useState, useEffect, useRef } from 'react';
import { Save, DatabaseBackup, ChevronDown, ChevronUp, RefreshCw, Eye } from 'lucide-react';


function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [lastBackup, setLastBackup] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pinError, setPinError] = useState('');
  const [security, setSecurity] = useState({
    page_lock_enabled: 'on',
    lock_dashboard: 'on',
    lock_reports: 'on',
    lock_customers: 'off',
    lock_stock: 'off',
    lock_settings: 'off',
  });
  const [securityPin, setSecurityPin] = useState('');
  const [showSecurityPin, setShowSecurityPin] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [securityMsg, setSecurityMsg] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [pinExpanded, setPinExpanded] = useState(false);
  const [shopExpanded, setShopExpanded] = useState(false);
  const [invoiceExpanded, setInvoiceExpanded] = useState(false);
  const [backupExpanded, setBackupExpanded] = useState(false);
  const messageTimersRef = useRef([]);

  useEffect(() => () => {
    messageTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  const clearMessageTimers = () => {
    messageTimersRef.current.forEach((timer) => clearTimeout(timer));
    messageTimersRef.current = [];
  };

  useEffect(() => {
    loadSettings();
  }, []);

const loadSettings = async () => {
  setLoading(true);
  setErrorMsg('');

  try {
    const data = await window.api.settings.getAll();

    setSettings(data);
    setSecurity((current) => ({
      ...current,
      page_lock_enabled: data.page_lock_enabled || 'on',
      lock_dashboard: data.lock_dashboard || 'on',
      lock_reports: data.lock_reports || 'on',
      lock_customers: data.lock_customers || 'off',
      lock_stock: data.lock_stock || 'off',
      lock_settings: data.lock_settings || 'off',
    }));

    if (data.last_backup) {
      setLastBackup(
        new Date(data.last_backup).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
    } else {
      setLastBackup('');
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    setErrorMsg('Could not load settings. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    setSavedMsg('');
    setErrorMsg('');
    try {
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'invoice_number_next') continue;
        await window.api.settings.update(key, value);
      }
      setSavedMsg('Settings saved successfully.');
      clearMessageTimers();
      messageTimersRef.current.push(setTimeout(() => setSavedMsg(''), 3000));
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrorMsg(error.message || 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePinChange = async (event) => {
    event.preventDefault();
    setPinMsg('');
    setPinError('');
    if (!/^\d{4,6}$/.test(newPin) || newPin !== confirmPin) {
      setPinError('New PIN must be 4 to 6 matching digits.');
      return;
    }
    try {
      if (!(await window.api.security.verifyPin(currentPin))) {
        setPinError('Current PIN is incorrect.');
        return;
      }
      await window.api.security.setPin(newPin);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinMsg('Security PIN changed successfully.');
    } catch (error) {
      setPinError(error.message || 'Could not change security PIN.');
    }
  };

  const saveSecurity = async (event) => {
    event.preventDefault();
    setSecurityMsg('');
    setSecurityError('');
    try {
      if (!(await window.api.security.verifyPin(securityPin))) {
        setSecurityError('Current PIN is incorrect.');
        return;
      }
      for (const [key, value] of Object.entries(security)) {
        await window.api.settings.update(key, value);
      }
      setSecurityPin('');
      setSecurityMsg('Page security settings saved.');
    } catch (error) {
      setSecurityError(error.message || 'Could not save page security settings.');
    }
  };

  if (loading) {
    return <div className="ui-card ui-loading">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={loadSettings}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-slate-200 bg-white text-slate-600 text-sm font-medium px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {errorMsg && (
        <div className="ui-alert-error text-sm px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}
      {savedMsg && (
        <div className="ui-alert-success text-sm px-4 py-3 mb-4">
          {savedMsg}
        </div>
      )}

      {/* Shop Info */}
      <div className="ui-card p-6 mb-6">
        <button
          type="button"
          onClick={() => setSecurityExpanded((expanded) => !expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Page Security</h3>
            <p className="text-xs text-gray-500 mt-1">
              {security.page_lock_enabled === 'on' ? 'PIN protection is enabled' : 'PIN protection is disabled'}
            </p>
          </div>
          {securityExpanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </button>
        {securityExpanded && (
          <form onSubmit={saveSecurity} className="space-y-3 mt-5 pt-5 border-t border-gray-100">
          {[
            ['page_lock_enabled', 'Page Lock Security'],
            ['lock_dashboard', 'Dashboard'],
            ['lock_reports', 'Reports'],
            ['lock_customers', 'Customers'],
            ['lock_stock', 'Stock'],
            ['lock_settings', 'Settings'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm text-gray-700">
              <span>{label}</span>
              <input type="checkbox" checked={security[key] === 'on'}
                onChange={(e) => setSecurity({ ...security, [key]: e.target.checked ? 'on' : 'off' })}
                className="h-4 w-4 accent-blue-600" />
            </label>
          ))}
          <div className="pt-3 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Authorize security changes
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Enter your current Security PIN to save these settings.
            </p>
            <div className="relative">
              <input type={showSecurityPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Current Security PIN"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowSecurityPin((visible) => !visible)}
                aria-label={showSecurityPin ? 'Hide security PIN' : 'Show security PIN'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showSecurityPin ? 'text-blue-400' : 'text-gray-400 hover:text-gray-700'}`}>
                <Eye size={16} />
              </button>
            </div>
          </div>
          {securityError && <div className="text-sm text-red-600">{securityError}</div>}
          {securityMsg && <div className="text-sm text-green-700">{securityMsg}</div>}
          <button type="submit" className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">
            Save Page Security
          </button>
          </form>
        )}
      </div>

      {/* Shop Info */}
      <div className="ui-card p-6 mb-6">
        <button
          type="button"
          onClick={() => setPinExpanded((expanded) => !expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Change Security PIN</h3>
            <p className="text-xs text-gray-500 mt-1">Update the PIN used to unlock protected pages.</p>
          </div>
          {pinExpanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </button>
        {pinExpanded && (
        <form onSubmit={handlePinChange} className="space-y-3 mt-5 pt-5 border-t border-gray-100">
          <div className="relative">
            <input type={showCurrentPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Current PIN" className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm" />
            <button type="button" onClick={() => setShowCurrentPin((visible) => !visible)}
              aria-label={showCurrentPin ? 'Hide current PIN' : 'Show current PIN'}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showCurrentPin ? 'text-blue-400' : 'text-gray-400 hover:text-gray-700'}`}>
              <Eye size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <input type={showNewPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New PIN (4-6 digits)" className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowNewPin((visible) => !visible)}
                aria-label={showNewPin ? 'Hide new PIN' : 'Show new PIN'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showNewPin ? 'text-blue-400' : 'text-gray-400 hover:text-gray-700'}`}>
                <Eye size={16} />
              </button>
            </div>
            <div className="relative">
              <input type={showConfirmPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm new PIN" className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowConfirmPin((visible) => !visible)}
                aria-label={showConfirmPin ? 'Hide confirmation PIN' : 'Show confirmation PIN'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showConfirmPin ? 'text-blue-400' : 'text-gray-400 hover:text-gray-700'}`}>
                <Eye size={16} />
              </button>
            </div>
          </div>
          {pinError && <div className="text-sm text-red-600">{pinError}</div>}
          {pinMsg && <div className="text-sm text-green-700">{pinMsg}</div>}
          <button type="submit" className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">
            Change Security PIN
          </button>
        </form>
        )}
      </div>

      {/* Shop Info */}
      <div className="ui-card p-6 mb-6">
        <button type="button" onClick={() => setShopExpanded((expanded) => !expanded)}
          className="w-full flex items-center justify-between text-left">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Shop Information</h3>
            <p className="text-xs text-gray-500 mt-1">This appears on your printed invoices</p>
          </div>
          {shopExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {shopExpanded && (<div className="space-y-3 mt-5 pt-5 border-t border-gray-100">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Shop Name</label>
            <input
              type="text"
              value={settings.shop_name || ''}
              onChange={(e) => handleChange('shop_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone Number</label>
            <input
              type="text"
              value={settings.shop_phone || ''}
              onChange={(e) => handleChange('shop_phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Address</label>
            <input
              type="text"
              value={settings.shop_address || ''}
              onChange={(e) => handleChange('shop_address', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>)}
      </div>

      {/* Invoice Settings */}
      <div className="ui-card p-6 mb-6">
        <button type="button" onClick={() => setInvoiceExpanded((expanded) => !expanded)}
          className="w-full flex items-center justify-between text-left">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Invoice Settings</h3>
            <p className="text-xs text-gray-500 mt-1">Controls how invoice numbers are generated</p>
          </div>
          {invoiceExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {invoiceExpanded && (<div className="mt-5 pt-5 border-t border-gray-100">
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Invoice Number Prefix
          </label>
          <input
            type="text"
            value={settings.invoice_prefix || ''}
            onChange={(e) => handleChange('invoice_prefix', e.target.value)}
            className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <p className="text-xs text-gray-400 mt-1">
            e.g. "INV-" makes invoices like INV-0000000001
          </p>
        </div>)}
      </div>

{/* Backup Settings */}
<div className="ui-card p-6 mb-6">
  <button type="button" onClick={() => setBackupExpanded((expanded) => !expanded)}
    className="w-full flex items-start justify-between gap-4 text-left">
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        Backup
      </h3>

      <p className="text-xs text-gray-500">
        Keep your billing data safe with backups
      </p>
    </div>

    <div className="flex items-center gap-3">
      <DatabaseBackup size={20} className="text-gray-400" />
      {backupExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
    </div>
  </button>

  <div className="mt-5 pt-5 border-t border-gray-100" style={{ display: backupExpanded ? 'block' : 'none' }}>
  {/* Automatic Backup */}
  <div className="mt-5 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-700">
        Automatic Backup
      </p>

      <p className="text-xs text-gray-400 mt-1">
        Automatically backup your database once per day
      </p>
    </div>

    <button
      type="button"
      onClick={() =>
        handleChange(
          'automatic_backup',
          settings.automatic_backup === 'on' ? 'off' : 'on'
        )
      }
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        settings.automatic_backup === 'on'
          ? 'bg-blue-600'
          : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          settings.automatic_backup === 'on'
            ? 'translate-x-6'
            : 'translate-x-1'
        }`}
      />
    </button>
  </div>

  {/* Backup Message */}
  {backupMsg && (
    <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
      {backupMsg}
    </div>
  )}

  {/* Manual Backup */}
  <div className="mt-5 pt-5 border-t border-gray-100">
    <button
      type="button"
      disabled={backupLoading}
      onClick={async () => {
        try {
          setBackupLoading(true);
          setBackupMsg('');

          const result = await window.api.backup.create();

          if (result?.success) {
            setBackupMsg('Backup created successfully.');

            if (result.backupTime) {
             setLastBackup(new Date(result.backupTime).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      );
          }

           clearMessageTimers();
           messageTimersRef.current.push(setTimeout(() => setBackupMsg(''), 3000));
          }
        } catch (error) {
          console.error('Backup failed:', error);
          setBackupMsg('Backup failed. Please try again.');
        } finally {
          setBackupLoading(false);
        }
      }}
      className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      <DatabaseBackup size={16} />

      {backupLoading ? 'Creating Backup...' : 'Backup Now'}
    </button>

    {lastBackup && (
      <p className="text-xs text-gray-400 mt-3">
        Last backup: {lastBackup}
      </p>
    )}

    <button
  type="button"
  onClick={async () => {
    if (!showBackups) {
      setBackupsLoading(true);

      try {
        const data = await window.api.backup.getAll();
        console.log('Available backups:', data);
        setBackups(data);
      } catch (error) {
        console.error('Failed to load backups:', error);
      } finally {
        setBackupsLoading(false);
      }
    }

    setShowBackups((prev) => !prev);
  }}
  className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
>
  {backupsLoading
    ? 'Loading backups...'
    : showBackups
      ? 'Hide Available Backups'
      : 'View Available Backups'}
</button>

{showBackups && (
  <div className="mt-4 border-t border-gray-100 pt-4">
    {backups.length === 0 ? (
      <p className="text-sm text-gray-400">
        No backups found.
      </p>
    ) : (
      <div className="space-y-2">
        {backups.map((backup) => (
          <div
            key={backup.fileName}
            className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">
                {backup.fileName}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                {Math.round(backup.size / 1024)} KB
              </p>
            </div>

          <button
  type="button"
  disabled={restoreLoading}
  onClick={async () => {
  const confirmed = window.confirm(
    `Restore Backup?\n\n` +
    `This will restore your database to the selected backup:\n` +
    `"${backup.fileName}"\n\n` +
    `Any customers, products, bills, payments, or other changes ` +
    `made after this backup will be replaced.\n\n` +
    `A safety backup of your current data will be created first.\n\n` +
    `The application will restart after restore.\n\n` +
    `Are you sure you want to continue?`
  );

  if (!confirmed) {
    return;
  }

  try {
    setRestoreLoading(true);
    setBackupMsg('');

    const result = await window.api.backup.restore(
      backup.fileName
    );

    if (result?.success) {
      setBackupMsg(
        'Backup restored successfully. Restarting application...'
      );
    }
  } catch (error) {
    console.error('Restore failed:', error);
    setBackupMsg(
      'Restore failed. Your current data was not replaced.'
    );
    setRestoreLoading(false);
  }
}}
  className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
>
  {restoreLoading ? 'Restoring...' : 'Restore'}
</button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
    </div>
  </div>
</div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

export default Settings;