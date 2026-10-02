// @ts-check
// Smoke test for Interference Archive.
//
// Ported from the ad-hoc Chrome DevTools Protocol harness used while
// implementing Spatial Residue. It is deliberately white-box in places: the
// app is a single script scope, and `page.evaluate()` shares that scope, so
// the test can read the live Web Audio nodes and render state directly.
//
// Two robustness rules learned the hard way:
//  - page.goto waits only for navigation 'commit'; every dependency (app.js,
//    the Tailwind stylesheet) is then awaited explicitly with a bounded
//    timeout, so a stalled CDN request can never hang a test for minutes.
//  - Audio-param assertions poll the live nodes until they converge instead of
//    sleeping a fixed interval, so a briefly stalled audio clock or a slow CI
//    runner cannot produce a false failure.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PAGE_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

// setTargetAtTime convergence: a 0.5s time constant is >99% settled after
// ~2.5s. 15s also absorbs a briefly stalled audio clock and slow machines.
const CONVERGE_MS = 15_000;

/** Dispatch a real `input` event so the inline oninput handler runs. */
async function setSlider(page, id, value) {
    await page.evaluate(({ id, value }) => {
        const el = document.getElementById(id);
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, { id, value });
}

/** Wait until the dry signal reaches the analyser (RMS above the smoke floor). */
function waitForDrySignal(page) {
    return page.waitForFunction(() => {
        if (typeof analyser === 'undefined' || !analyser) return false;
        const a = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(a);
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += a[i] * a[i];
        return Math.sqrt(sum / a.length) > 0.005;
    }, null, { timeout: CONVERGE_MS });
}

async function boot(page) {
    // 'commit' returns as soon as the file:// navigation starts, so a stalled
    // CDN request can never hang page.goto() itself.
    await page.goto(PAGE_URL, { waitUntil: 'commit', timeout: 15_000 });

    // app.js has executed AND the Tailwind stylesheet is applied — the capture
    // modal starts with the `.hidden` utility class, so every visibility
    // assertion below depends on the stylesheet actually loading.
    await page.waitForFunction(() =>
        typeof initializeSystem === 'function' &&
        getComputedStyle(document.getElementById('modal-backdrop')).display === 'none'
    , null, { timeout: CONVERGE_MS });

    await expect(page.locator('#initialize-overlay')).toBeVisible();
    await page.click('#initialize-overlay');

    await page.waitForFunction(() =>
        typeof audioContext !== 'undefined' && audioContext && audioContext.state === 'running'
    , null, { timeout: CONVERGE_MS });

    // initializeSystem() waits 600ms before initAudio(); the first draw fills
    // the residue ring buffer, then the dry signal must reach the analyser.
    // A stalled audio clock surfaces here as a bounded, explicit timeout.
    await page.waitForFunction(() => waveHistoryFilled > 0, null, { timeout: CONVERGE_MS });
    await waitForDrySignal(page);
}

async function readRms(page, analyserVar) {
    return page.evaluate(`(() => {
        const a = new Float32Array(window.${analyserVar}.fftSize);
        window.${analyserVar}.getFloatTimeDomainData(a);
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += a[i] * a[i];
        return Math.sqrt(sum / a.length);
    })()`);
}

async function readDryRms(page) {
    return page.evaluate(`(() => {
        const a = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(a);
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += a[i] * a[i];
        return Math.sqrt(sum / a.length);
    })()`);
}

let pageErrors;
let consoleErrors;

test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
});

test.afterEach(() => {
    // CDN/resource noise is environmental; anything else is a regression.
    const benign = /favicon|Failed to load resource|net::ERR|tailwind/i;
    expect(pageErrors.filter((e) => !benign.test(e))).toEqual([]);
    expect(consoleErrors.filter((e) => !benign.test(e))).toEqual([]);
});

test('boots the engine and builds the Spatial Residue stage', async ({ page }) => {
    await boot(page);

    const state = await page.evaluate(() => ({
        ctxState: audioContext.state,
        residueNodes: [
            residueSendHP, residueSendLP, residueConvolver, residueWetGain, residueTapsGain,
            residueDelayL, residueDelayR, residuePanL, residuePanR
        ].map((n) => (n ? n.constructor.name : null)),
        irChannels: residueConvolver.buffer.numberOfChannels,
        irSeconds: Math.round(residueConvolver.buffer.duration * 10) / 10,
        historyFilled: waveHistoryFilled,
        particles: particles.length,
        powered: isPowered,
        muted: isMuted,
        residue: params.residue
    }));

    expect(state.ctxState).toBe('running');
    expect(state.residueNodes.every((n) => typeof n === 'string')).toBe(true);
    expect(state.irChannels).toBe(2);
    expect(state.irSeconds).toBeCloseTo(1.8, 1);
    expect(state.historyFilled).toBeGreaterThan(0);
    expect(state.particles).toBe(80);
    expect(state.powered).toBe(true);
    expect(state.muted).toBe(false);
    expect(state.residue).toBe(59);

    // The dry signal reaches the analyser (boot already waited for it).
    const dryRms = await readDryRms(page);
    expect(dryRms).toBeGreaterThan(0.005);
});

test('residue slider drives the wet path, stereo spread, and bypasses at 0', async ({ page }) => {
    await boot(page);

    // Attach probe analysers to the wet outputs (test-only).
    await page.evaluate(() => {
        window.__wetAnalyser = audioContext.createAnalyser();
        window.__wetAnalyser.fftSize = 2048;
        residueWetGain.connect(window.__wetAnalyser);

        window.__tapL = audioContext.createAnalyser();
        window.__tapR = audioContext.createAnalyser();
        window.__tapL.fftSize = 2048;
        window.__tapR.fftSize = 2048;
        const split = audioContext.createChannelSplitter(2);
        residueTapsGain.connect(split);
        split.connect(window.__tapL, 0);
        split.connect(window.__tapR, 1);
    });

    // End-to-end UI path: click the far right of the range input, then poll
    // until the wet gain has ramped past the click threshold.
    const slider = page.locator('#slider-residue');
    const box = await slider.boundingBox();
    await slider.click({ position: { x: box.width - 1, y: box.height / 2 } });
    await page.waitForFunction(() => residueWetGain.gain.value > 0.2, null, { timeout: CONVERGE_MS });

    const afterClick = await page.evaluate(() => ({
        residue: params.residue,
        readout: Number(document.getElementById('val-residue').textContent),
        wet: residueWetGain.gain.value
    }));
    expect(afterClick.residue).toBeGreaterThanOrEqual(95);
    expect(afterClick.readout).toBe(Math.round(afterClick.residue));
    expect(afterClick.wet).toBeGreaterThan(0.2);

    // Pin exact values and verify the full transfer function.
    await setSlider(page, 'slider-residue', 100);
    await page.waitForFunction(() =>
        residueWetGain.gain.value > 0.23 &&
        residueDelayR.delayTime.value > 0.05 &&
        residuePanL.pan.value < -0.87
    , null, { timeout: CONVERGE_MS });
    const high = await page.evaluate(() => ({
        wet: residueWetGain.gain.value,
        taps: residueTapsGain.gain.value,
        dL: residueDelayL.delayTime.value,
        dR: residueDelayR.delayTime.value,
        pL: residuePanL.pan.value,
        pR: residuePanR.pan.value
    }));
    expect(high.wet).toBeGreaterThan(0.22);
    expect(high.wet).toBeLessThan(0.30);
    expect(high.taps).toBeGreaterThan(0.14);
    expect(high.taps).toBeLessThan(0.18);
    expect(high.dL).toBeGreaterThan(0.034);   // ~36ms at r=1
    expect(high.dR).toBeGreaterThan(0.049);   // ~51ms at r=1
    expect(high.pL).toBeCloseTo(-0.9, 1);
    expect(high.pR).toBeCloseTo(0.9, 1);

    // The wet path actually carries signal (the 1.8s IR tail needs a moment),
    // and L/R are decorrelated.
    await expect.poll(() => readRms(page, '__wetAnalyser'), { timeout: CONVERGE_MS })
        .toBeGreaterThan(0.003);

    const stereo = await page.evaluate(`(() => {
        const l = new Float32Array(window.__tapL.fftSize);
        const r = new Float32Array(window.__tapR.fftSize);
        window.__tapL.getFloatTimeDomainData(l);
        window.__tapR.getFloatTimeDomainData(r);
        let maxDiff = 0, energy = 0;
        for (let i = 0; i < l.length; i++) {
            maxDiff = Math.max(maxDiff, Math.abs(l[i] - r[i]));
            energy += Math.abs(l[i]) + Math.abs(r[i]);
        }
        return { maxDiff, energy: energy / l.length };
    })()`);
    expect(stereo.maxDiff).toBeGreaterThan(0.001);
    expect(stereo.energy).toBeGreaterThan(0.001);

    // updateParam(3, 0) bypasses the stage (the slider's own min is 10).
    await page.evaluate(() => updateParam(3, 0));
    await page.waitForFunction(() =>
        residueWetGain.gain.value < 0.01 && residueTapsGain.gain.value < 0.01
    , null, { timeout: CONVERGE_MS });
    // The convolver tail decays over ~1.8s, so poll the wet RMS down.
    await expect.poll(() => readRms(page, '__wetAnalyser'), { timeout: CONVERGE_MS })
        .toBeLessThan(0.0005);

    // The dry signal is unaffected.
    await waitForDrySignal(page);
    const dryRms = await readDryRms(page);
    expect(dryRms).toBeGreaterThan(0.005);
});

test('residue scales the visual afterimage and stays in frame budget', async ({ page }) => {
    await boot(page);
    await page.waitForFunction(() => waveHistoryFilled === residueHistoryFrames, null, { timeout: CONVERGE_MS });

    // Count drawCanvas path builds at low vs high residue: the difference is
    // exactly the 6-vs-1 ghost strokes.
    const probe = await page.evaluate(() => {
        function countPaths(residue) {
            params.residue = residue;
            let n = 0;
            const orig = ctx.beginPath;
            ctx.beginPath = function () { n += 1; return orig.apply(this, arguments); };
            drawCanvas();
            delete ctx.beginPath;
            return n;
        }
        const base = countPaths(10);
        const high = countPaths(100);
        params.residue = 59;
        return { base, high };
    });
    expect(probe.base).toBeGreaterThan(0);
    expect(probe.high - probe.base).toBe(5);

    // Frame budget: three batches of 40 draws at maximum residue, best batch
    // must stay under 4ms per draw (best-of guards against a stray GC pause).
    const perFrame = await page.evaluate(() => {
        params.residue = 100;
        let best = Infinity;
        for (let b = 0; b < 3; b++) {
            const t0 = performance.now();
            for (let i = 0; i < 40; i++) drawCanvas();
            best = Math.min(best, (performance.now() - t0) / 40);
        }
        params.residue = 59;
        return best;
    });
    expect(perFrame).toBeLessThan(4);

    // The render loop keeps changing the image (poll instead of a fixed sleep).
    const urlA = await page.evaluate(() => document.getElementById('main-canvas').toDataURL());
    expect(urlA.length).toBeGreaterThan(5000);
    await expect.poll(
        () => page.evaluate(() => document.getElementById('main-canvas').toDataURL()),
        { timeout: CONVERGE_MS }
    ).not.toBe(urlA);
});

test('all six parameter mappings still reach the audio graph', async ({ page }) => {
    await boot(page);

    await setSlider(page, 'slider-cohesion', 30);
    await setSlider(page, 'slider-voice', 20);
    await setSlider(page, 'slider-decay', 80);
    await setSlider(page, 'slider-contam', 60);
    await setSlider(page, 'slider-integrity', 40);

    // The delay line has the slowest constant (0.4s); wait for it to pass the
    // assertion threshold rather than guessing a sleep interval.
    await page.waitForFunction(() => delayNode.delayTime.value > 0.75, null, { timeout: CONVERGE_MS });

    const targets = await page.evaluate(() => ({
        cutoff: filterNode.frequency.value,
        delay: delayNode.delayTime.value,
        feedback: feedbackGain.gain.value,
        noise: noiseGain.gain.value,
        master: masterGain.gain.value,
        readouts: ['cohesion', 'decay', 'contam', 'integrity']
            .map((k) => Number(document.getElementById('val-' + k).textContent))
    }));

    // cohesion 30 + voice 20 → cutoff = 400 + 540 + 160 = 1100Hz
    expect(targets.cutoff).toBeGreaterThan(400);
    expect(targets.cutoff).toBeLessThanOrEqual(4200);
    // decay 80 → delay ≈ 0.83s, feedback ≈ 0.44 (clamped 0.15–0.65)
    expect(targets.delay).toBeGreaterThan(0.7);
    expect(targets.feedback).toBeGreaterThanOrEqual(0.15);
    expect(targets.feedback).toBeLessThanOrEqual(0.65);
    // contamination 60 → noise ≈ 0.27
    expect(targets.noise).toBeGreaterThan(0.15);
    expect(targets.noise).toBeLessThan(0.4);
    // integrity 40 → master ≈ 0.6
    expect(targets.master).toBeGreaterThan(0.5);
    expect(targets.master).toBeLessThan(0.75);
    expect(targets.readouts).toEqual([30, 80, 60, 40]);
});

test('randomize (button and Cmd+K) reshuffles every parameter', async ({ page }) => {
    await boot(page);

    const before = await page.evaluate(() => JSON.stringify(params));
    await page.getByText('RANDOMIZE PARAMETERS').click();

    const afterButton = await page.evaluate(() => ({
        params: { ...params },
        log: document.getElementById('console-log').textContent.includes('PARAMETERS RANDOMIZED'),
        slider: Number(document.getElementById('slider-residue').value)
    }));
    expect(JSON.stringify(afterButton.params)).not.toBe(before);
    expect(afterButton.params.residue).toBeGreaterThanOrEqual(25);
    expect(afterButton.params.residue).toBeLessThanOrEqual(100);
    expect(afterButton.log).toBe(true);
    expect(Math.abs(afterButton.slider - Math.round(afterButton.params.residue))).toBeLessThanOrEqual(1);

    const beforeKey = await page.evaluate(() => JSON.stringify(params));
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(300);
    const afterKey = await page.evaluate(() => JSON.stringify(params));
    expect(afterKey).not.toBe(beforeKey);
});

test('site selection applies presets and accent', async ({ page }) => {
    await boot(page);

    // The demo auto-switch fires 6.5s after init; act on it before then.
    await page.click('#site-2');
    const chamber = await page.evaluate(() => ({
        residue: params.residue,
        accent: currentAccent,
        code: document.getElementById('current-site-code').textContent,
        slider: Number(document.getElementById('slider-residue').value),
        activeBorder: document.getElementById('site-2').style.borderColor
    }));
    expect(chamber.residue).toBe(80);
    expect(chamber.slider).toBe(80);
    expect(chamber.accent).toBe('#f7c95a');
    expect(chamber.code).toBe('C09');
    expect(chamber.activeBorder).not.toBe('transparent');

    await page.click('#site-4');
    const nullSite = await page.evaluate(() => ({
        accent: currentAccent,
        code: document.getElementById('current-site-code').textContent
    }));
    expect(nullSite.accent).toBe('#ff2a6d');
    expect(nullSite.code).toBe('NULL');
});

test('mute and power gate the output, including during slider moves', async ({ page }) => {
    await boot(page);

    // Mute via the real toggle; poll the ramp (0.1s constant) to its floor.
    await page.click('#mute-text');
    await page.waitForFunction(() => masterGain.gain.value < 0.05, null, { timeout: CONVERGE_MS });
    const muted = await page.evaluate(() => ({
        gain: masterGain.gain.value,
        label: document.getElementById('mute-text').textContent
    }));
    expect(muted.gain).toBeLessThan(0.05);
    expect(muted.label).toBe('AUDIO MUTED');

    // Regression guard: moving a slider must not fight mute back up.
    await setSlider(page, 'slider-decay', 30);
    await setSlider(page, 'slider-integrity', 95);
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => masterGain.gain.value)).toBeLessThan(0.05);

    // Unmute restores the nominal level.
    await page.click('#mute-text');
    await page.waitForFunction(() => masterGain.gain.value > 0.5, null, { timeout: CONVERGE_MS });
    expect(await page.evaluate(() => document.getElementById('mute-text').textContent)).toBe('AUDIO ON');

    // Power offline ramps to zero while visuals keep running.
    await page.click('#power-status');
    await page.waitForFunction(() =>
        isPowered === false && masterGain.gain.value < 0.05
    , null, { timeout: CONVERGE_MS });
    const offline = await page.evaluate(() => ({
        powered: isPowered,
        gain: masterGain.gain.value,
        status: document.getElementById('power-status').textContent.trim()
    }));
    expect(offline.powered).toBe(false);
    expect(offline.gain).toBeLessThan(0.05);
    expect(offline.status).toContain('OFFLINE');

    const elapsedBefore = await page.evaluate(() => elapsedTime);
    await page.waitForTimeout(500);
    const elapsedAfter = await page.evaluate(() => elapsedTime);
    expect(elapsedAfter - elapsedBefore).toBeGreaterThan(250);

    // Sliders while offline must not resurrect the audio.
    await setSlider(page, 'slider-cohesion', 95);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => masterGain.gain.value)).toBeLessThan(0.05);

    // Back online (0.8s linear ramp).
    await page.click('#power-status');
    await page.waitForFunction(() =>
        isPowered === true && masterGain.gain.value > 0.5
    , null, { timeout: CONVERGE_MS });
    const online = await page.evaluate(() => ({
        powered: isPowered,
        gain: masterGain.gain.value,
        status: document.getElementById('power-status').textContent.trim()
    }));
    expect(online.powered).toBe(true);
    expect(online.gain).toBeGreaterThan(0.5);
    expect(online.status).toContain('CONNECTED');
});

test('capture mints a case file and downloads the txt + png pair', async ({ page }) => {
    await boot(page);

    await page.getByRole('button', { name: 'CAPTURE' }).click();
    const modal = page.locator('#modal-backdrop');
    await expect(modal).toBeVisible();

    const capture = await page.evaluate(() => ({
        image: document.getElementById('modal-image').src.slice(0, 22),
        id: document.getElementById('modal-archive-id').textContent,
        classification: document.getElementById('modal-classification').textContent,
        report: document.getElementById('modal-report').textContent,
        timestamp: document.getElementById('modal-timestamp').textContent
    }));
    expect(capture.image).toBe('data:image/png;base64,');
    expect(capture.id).toMatch(/^IA-(R04|N17|C09|R31|NULL)-\d{4}$/);
    expect(capture.classification.length).toBeGreaterThan(3);
    expect(capture.report.length).toBeGreaterThan(10);
    expect(capture.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);

    // Download the paired artifacts (the PNG click is deferred by 120ms).
    const downloads = [];
    page.on('download', (d) => downloads.push(d));
    await page.evaluate(() => downloadCaseFile());
    await expect.poll(() => downloads.length, { timeout: CONVERGE_MS }).toBe(2);
    const names = await Promise.all(downloads.map((d) => d.suggestedFilename()));
    expect(names[0]).toBe(capture.id + '.txt');
    expect(names[1]).toBe(capture.id + '.png');
    await expect(modal).toBeHidden();

    // "/" shortcut opens the capture modal again.
    await page.keyboard.press('/');
    await expect(modal).toBeVisible();
    await page.evaluate(() => hideCaptureModal());
    await expect(modal).toBeHidden();

    // Log clear still works.
    await page.evaluate(() => clearLog());
    expect(await page.evaluate(() =>
        document.getElementById('console-log').textContent.includes('LOG CLEARED')
    )).toBe(true);
});
