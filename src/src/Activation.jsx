import { useState } from 'react';

function Activation({ appVersion, onActivated }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async (e) => {
    e.preventDefault();

    if (!licenseKey.trim()) {
      setError('Please enter your license key.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const deviceId = await window.api.license.getDeviceId();
      const appVersion = await window.api.license.getAppVersion();

      const result = await window.api.license.activate(
        licenseKey.trim(),
        deviceId,
        appVersion
      );

      if (!result.success) {
        throw new Error(result.message || 'Activation failed.');
      }

      localStorage.setItem(
        'tradeflow_license',
        JSON.stringify(result.license)
      );

      onActivated(result.license);
    } catch (error) {
      setError(error.message || 'Could not activate TradeFlow.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">

          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              T
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-gray-800 text-center">
            Activate TradeFlow
          </h1>

          <p className="text-sm text-gray-500 text-center mt-2">
            Enter your license key to activate this application.
          </p>

          <form onSubmit={handleActivate} className="mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Key
            </label>

            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="TF-XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />

            {error && (
              <div className="mt-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-lg transition"
            >
              {loading ? 'Activating...' : 'Activate TradeFlow'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            TradeFlow v{appVersion || '...'}
          </p>

        </div>
      </div>
    </div>
  );
}

export default Activation;