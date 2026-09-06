const readline = require('readline');

const LICENSE_SERVER_URL =
    'https://tradeflow-license.asapuremallikarjun23.workers.dev';

const ADMIN_SECRET = process.env.TRADEFLOW_ADMIN_SECRET;

if (!ADMIN_SECRET) {
    console.error('Error: TRADEFLOW_ADMIN_SECRET is not set.');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function createLicense() {
    try {
        const customerName = (await ask('Customer Name: ')).trim();
        const shopName = (await ask('Shop Name: ')).trim();
        const purchasedVersion = (await ask('Purchased Version: ')).trim();

        if (!customerName || !shopName || !purchasedVersion) {
            console.log('\nAll fields are required.');
            return;
        }

        const response = await fetch(
            `${LICENSE_SERVER_URL}/api/admin/create-license`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${ADMIN_SECRET}`,
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    shop_name: shopName,
                    purchased_version: purchasedVersion,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.log(
                '\nLicense creation failed:',
                data.message || 'Unknown error.'
            );
            return;
        }

        console.log('\n================================');
        console.log('LICENSE CREATED SUCCESSFULLY');
        console.log('================================');
        console.log(`Customer : ${data.license.customer_name}`);
        console.log(`Shop     : ${data.license.shop_name}`);
        console.log(`Version  : ${data.license.purchased_version}`);
        console.log(`License  : ${data.license.license_key}`);
        console.log('================================\n');
    } catch (error) {
        console.error('\nServer error:', error.message);
    } finally {
        rl.close();
    }
}

createLicense();