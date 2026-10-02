// Playwright configuration for the Interference Archive smoke test.
//
// The app itself has no build step and no runtime dependencies — this config
// only drives a headless browser over the static files. See docs/TESTING.md.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: 'list',
    use: {
        acceptDownloads: true,
        // Bound every wait: a stalled CDN request or unactionable element must
        // fail fast with a clear error instead of hanging until the 60s test
        // timeout (the spec's boot() waits on explicit conditions, not 'load').
        navigationTimeout: 30_000,
        actionTimeout: 20_000,
        // The overlay click is a real (trusted) gesture, but the flag keeps the
        // AudioContext deterministic in headless runs on every platform.
        launchOptions: {
            args: ['--autoplay-policy=no-user-gesture-required']
        }
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ]
});
