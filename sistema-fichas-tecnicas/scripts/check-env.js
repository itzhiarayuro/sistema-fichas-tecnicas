const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: '.env.local' });
console.log('--- ENV CHECK ---');
console.log('FIREBASE_SERVICE_ACCOUNT_KEY defined:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.log('Value starts with:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(0, 20));
    try {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
        JSON.parse(raw);
        console.log('JSON parse: SUCCESS');
    } catch (e) {
        console.log('JSON parse: FAILED', e.message);
    }
}
