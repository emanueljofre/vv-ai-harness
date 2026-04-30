#!/usr/bin/env node

/**
 * Refresh testing/config/auth-state-pw.json for the currently-active
 * environment (per .env.json activeServer/activeCustomer).
 *
 * Standalone — does not run global-setup's record-creation phase.
 * Useful when switching active environments and only the auth half is needed.
 *
 * Usage:
 *   node tools/runners/refresh-auth-state.js
 *   node tools/runners/refresh-auth-state.js --headed   # visible browser for debugging
 */

const path = require('path');
const fs = require('fs');

async function main() {
    const headed = process.argv.includes('--headed');
    const { vvConfig, AUTH_STATE_PATH } = require('../../testing/fixtures/vv-config');
    const { chromium } = require('@playwright/test');

    console.log(`Refreshing auth-state for ${vvConfig.customerAlias}/${vvConfig.databaseAlias}`);
    console.log(`Login URL: ${vvConfig.loginUrl}`);
    console.log(`Output:    ${AUTH_STATE_PATH}`);

    const browser = await chromium.launch({ headless: !headed });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(vvConfig.loginUrl);
        await page.getByRole('textbox', { name: 'User Name' }).fill(vvConfig.username);
        await page.getByRole('textbox', { name: 'Password' }).fill(vvConfig.password);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.waitForFunction(
            () => !document.location.pathname.includes('login') && document.location.pathname !== '/',
            { timeout: 15000 }
        );
        await context.storageState({ path: AUTH_STATE_PATH });
        console.log('Auth state saved.');
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error('Refresh failed:', err && err.message ? err.message : err);
    process.exit(1);
});
