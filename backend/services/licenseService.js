const LICENSE_SERVER_URL =
    'https://tradeflow-license.asapuremallikarjun23.workers.dev';

async function activateLicense({ licenseKey, deviceId, appVersion }) {
    const response = await fetch(`${LICENSE_SERVER_URL}/api/activate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_key: licenseKey,
            device_id: deviceId,
            app_version: appVersion,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'License activation failed.');
    }

    return data;
}

module.exports = {
    activateLicense,
};