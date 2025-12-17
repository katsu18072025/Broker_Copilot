import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import app from '../server.js';
import http from 'http';

describe('API Integration Tests', () => {
    let server;
    let baseURL;

    before(async () => {
        // Start server on random port
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, resolve));
        const port = server.address().port;
        baseURL = `http://localhost:${port}`;
    });

    after(() => {
        server.close();
    });

    it('GET / should return health status', async () => {
        const res = await axios.get(`${baseURL}/`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.status, 'running');
    });

    it('GET /api/token-health should return token status', async () => {
        const res = await axios.get(`${baseURL}/api/token-health`);
        assert.strictEqual(res.status, 200);
        assert.ok(res.data.timestamp);
        assert.ok(typeof res.data.encryptionEnabled === 'boolean');
    });

    it('GET /api/renewals should return items', async () => {
        const res = await axios.get(`${baseURL}/api/renewals`);
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data.items));

        if (res.data.items.length > 0) {
            const firstItem = res.data.items[0];
            assert.ok(firstItem.id, 'Item should have an ID');
            assert.ok(firstItem.priorityScore !== undefined, 'Item should have a priority score');
        }
    });

});
