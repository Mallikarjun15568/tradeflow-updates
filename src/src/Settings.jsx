import { useState, useEffect } from 'react';
import { Save, DatabaseBackup } from 'lucide-react';


function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [lastBackup, setLastBackup] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);


  useEffect(() => {
    loadSettings();
  }, []);

const loadSettings = async () => {
  setLoading(true);

  const data = await window.api.settings.getAll();

  setSettings(data);

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

  setLoading(false);
};

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'invoice_number_next') continue;
      await window.api.settings.update(key, value);
    }
    setSaving(false);
    setSavedMsg('Settings saved successfully.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-10">Loading...</div>;
  }

  return (
    <div className="max-w-2xl">
      {savedMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          {savedMsg}
        </div>
      )}

      {/* Shop Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Shop Information</h3>
        <p className="text-xs text-gray-500 mb-4">This appears on your printed invoices</p>

        <div className="space-y-3">
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
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Invoice Settings</h3>
        <p className="text-xs text-gray-500 mb-4">Controls how invoice numbers are generated</p>

        <div>
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
        </div>
      </div>

{/* Backup Settings */}
<div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        Backup
      </h3>

      <p className="text-xs text-gray-500">
        Keep your billing data safe with backups
      </p>
    </div>

    <DatabaseBackup size={20} className="text-gray-400" />
  </div>

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

           setTimeout(() => {setBackupMsg('');}, 3000);
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