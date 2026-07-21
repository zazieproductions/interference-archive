// Tailwind script run
        function initializeTailwind() {
            tailwind.config = {
                content: [],
                theme: {
                    extend: {}
                }
            }
        }
        
        // Variables
        let audioContext;
        let analyser;
        let masterGain;
        let isMuted = false;
        let isPowered = true;
        let currentSiteIndex = 4;
        let animationFrame;
        let lastTime = Date.now();
        let elapsedTime = 0;
        let oscillators = [];
        let noiseBuffer;
        let noiseSource;
        let noiseGain;
        let filterNode;
        let delayNode;
        let feedbackGain;
        let params = {
            cohesion: 68,
            decay: 44,
            contamination: 31,
            residue: 59,
            voice: 77,
            integrity: 82
        };
        
        const sites = [
            {
                id: 0,
                code: "R04",
                name: "ROOM 04",
                fullName: "Pediatric Sleep Laboratory",
                accent: "#67ff9c",
                baseFreq: 110,
                noiseBand: 420,
                anomalyType: "LULLABY RESONANCE",
                logPhrases: [
                    "shallow breathing detected",
                    "heartbeat synchronization",
                    "whisper at 180Hz",
                    "lullaby fragment recovered"
                ]
            },
            {
                id: 1,
                code: "N17",
                name: "NODE 17",
                fullName: "Flooded Telephone Exchange",
                accent: "#22e0ff",
                baseFreq: 65,
                noiseBand: 1200,
                anomalyType: "HYDROPHONIC ECHO",
                logPhrases: [
                    "dial tone submerged",
                    "water displacement 340ms",
                    "voice through pipes",
                    "distorted ring signal"
                ]
            },
            {
                id: 2,
                code: "C09",
                name: "CHAMBER 09",
                fullName: "Decommissioned Animal Cognition Unit",
                accent: "#f7c95a",
                baseFreq: 240,
                noiseBand: 2800,
                anomalyType: "PRIMATE RESONANCE",
                logPhrases: [
                    "ultrasonic bark pattern",
                    "primate cognition spike",
                    "click train at 8kHz",
                    "subject 4 responding"
                ]
            },
            {
                id: 3,
                code: "R31",
                name: "RELAY 31",
                fullName: "Unknown Residential Structure",
                accent: "#ff6b9d",
                baseFreq: 180,
                noiseBand: 950,
                anomalyType: "DOMESTIC HAUNT",
                logPhrases: [
                    "television static burst",
                    "distant child laughter",
                    "refrigerator hum cycle",
                    "door latch anomaly"
                ]
            },
            {
                id: 4,
                code: "NULL",
                name: "NULL SITE",
                fullName: "Coordinates Removed",
                accent: "#ff2a6d",
                baseFreq: 85,
                noiseBand: 1800,
                anomalyType: "VOID TRANSMISSION",
                logPhrases: [
                    "non-euclidean resonance",
                    "observer detected",
                    "impossible frequency",
                    "signal inversion"
                ]
            }
        ];
        
        let canvas, ctx;
        let particles = [];
        let waveformData = new Uint8Array(128);
        let frequencyData = new Uint8Array(64);
        let logMessages = [];
        let currentAccent = "#67ff9c";
        
        // Fake reports for capture
        const classifications = [
            "RECIPROCAL OCCUPANCY EVENT",
            "PHASE SHIFT ECHO",
            "NONLOCAL RESONANCE",
            "MEMORY BLEED",
            "SUBAURAL MIMICRY",
            "TEMPORAL FRACTURE"
        ];
        
        function createNoiseBuffer() {
            if (!audioContext) return;
            const bufferSize = audioContext.sampleRate * 4;
            noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        }
        
        function initAudio() {
            if (audioContext) return;
            
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Master chain
                masterGain = audioContext.createGain();
                masterGain.gain.value = 0.6;
                
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.75;
                
                filterNode = audioContext.createBiquadFilter();
                filterNode.type = 'lowpass';
                filterNode.frequency.value = 1200;
                filterNode.Q.value = 2;
                
                delayNode = audioContext.createDelay(2);
                delayNode.delayTime.value = 0.45;
                
                feedbackGain = audioContext.createGain();
                feedbackGain.gain.value = 0.35;
                
                // Connect delay feedback loop
                delayNode.connect(feedbackGain);
                feedbackGain.connect(delayNode);
                
                // Noise
                createNoiseBuffer();
                noiseGain = audioContext.createGain();
                noiseGain.gain.value = 0.2;
                
                // Create oscillators
                oscillators = [];
                const baseFreqs = [85, 128, 210, 340];
                
                baseFreqs.forEach((freq, i) => {
                    const osc = audioContext.createOscillator();
                    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
                    osc.type = i === 3 ? 'sawtooth' : 'sine';
                    const gain = audioContext.createGain();
                    gain.gain.value = i < 2 ? 0.3 : 0.1;
                    osc.connect(gain);
                    oscillators.push({
                        osc: osc,
                        gain: gain,
                        baseFreq: freq
                    });
                });
                
                // Connect everything
                const droneMix = audioContext.createGain();
                
                oscillators.forEach(comp => {
                    comp.gain.connect(droneMix);
                    comp.osc.start();
                });
                
                // Noise source
                noiseSource = audioContext.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                noiseSource.loop = true;
                noiseSource.connect(noiseGain);
                noiseSource.start();
                
                // Route
                droneMix.connect(filterNode);
                noiseGain.connect(filterNode);
                
                filterNode.connect(delayNode);
                delayNode.connect(analyser);
                analyser.connect(masterGain);
                masterGain.connect(audioContext.destination);
                
                // Add a little feedback from delay to filter too
                feedbackGain.connect(filterNode);
                
            } catch(e) {
                console.error("Audio init failed", e);
            }
        }
        
        function updateAudioFromParams() {
            if (!audioContext || !filterNode || !delayNode) return;
            
            const site = sites[currentSiteIndex];
            
            // Map cohesion to frequency spread
            const spread = (100 - params.cohesion) * 1.2;
            oscillators.forEach((comp, i) => {
                const targetFreq = site.baseFreq + (i * spread * 0.6);
                comp.osc.frequency.setTargetAtTime(targetFreq, audioContext.currentTime, 0.1);
                comp.gain.gain.setTargetAtTime(0.25 + (params.integrity / 300), audioContext.currentTime, 0.2);
            });
            
            // Filter cutoff from cohesion + voice
            const cutoff = 400 + (params.cohesion * 18) + (params.voice * 8);
            filterNode.frequency.setTargetAtTime(Math.min(cutoff, 4200), audioContext.currentTime, 0.3);
            
            // Noise gain from contamination
            if (noiseGain) {
                noiseGain.gain.setTargetAtTime(params.contamination / 220, audioContext.currentTime, 0.2);
            }
            
            // Delay from memory decay
            const delayTime = 0.1 + (params.decay / 110);
            delayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.4);
            
            // Feedback
            const feedbackAmount = params.decay / 180;
            feedbackGain.gain.setTargetAtTime(Math.max(0.15, Math.min(0.65, feedbackAmount)), audioContext.currentTime, 0.3);
            
            // Master gain affected by integrity
            if (masterGain) {
                masterGain.gain.setTargetAtTime(0.5 + (params.integrity / 400), audioContext.currentTime, 0.2);
            }
        }
        
        function evolveAudio(t) {
            if (!oscillators.length || !audioContext) return;
            
            const site = sites[currentSiteIndex];
            const time = t / 1000;
            
            // Slow modulation on the last oscillator (the voice)
            if (oscillators[3]) {
                const voiceMod = Math.sin(time * 1.8) * 90 * (params.voice / 100);
                oscillators[3].osc.frequency.setTargetAtTime(
                    site.baseFreq * 2.8 + voiceMod, 
                    audioContext.currentTime, 
                    0.08
                );
            }
            
            // Occasional noise filter sweep
            if (filterNode && Math.random() > 0.96) {
                const sweep = site.noiseBand + Math.sin(time * 0.6) * 700;
                filterNode.frequency.setTargetAtTime(sweep, audioContext.currentTime, 1.2);
            }
            
            // Random anomaly event
            if (Math.random() > 0.97 && params.contamination > 30) {
                if (oscillators[2]) {
                    const current = oscillators[2].osc.frequency.value;
                    oscillators[2].osc.frequency.setValueAtTime(current * 2.4, audioContext.currentTime);
                    setTimeout(() => {
                        if (oscillators[2]) oscillators[2].osc.frequency.setTargetAtTime(current, audioContext.currentTime, 0.6);
                    }, 120);
                }
                addToLog("TRANSIENT ANOMALY", true);
            }
        }
        
        function createParticles() {
            particles = [];
            for (let i = 0; i < 80; i++) {
                particles.push({
                    x: Math.random() * 720,
                    y: Math.random() * 420,
                    size: Math.random() * 3.5 + 1,
                    speed: Math.random() * 0.6 + 0.2,
                    angle: Math.random() * Math.PI * 2,
                    life: Math.random() * 100 + 40
                });
            }
        }
        
        function drawCanvas() {
            if (!canvas || !ctx) return;
            
            ctx.save();
            ctx.fillStyle = "#050a05";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Subtle grid
            ctx.strokeStyle = "rgba(60, 120, 70, 0.13)";
            ctx.lineWidth = 1;
            for (let x = 40; x < canvas.width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 20);
                ctx.lineTo(x, canvas.height - 40);
                ctx.stroke();
            }
            for (let y = 40; y < canvas.height - 40; y += 35) {
                ctx.beginPath();
                ctx.moveTo(30, y);
                ctx.lineTo(canvas.width - 30, y);
                ctx.stroke();
            }
            
            // Get data from analyser
            if (analyser) {
                analyser.getByteTimeDomainData(waveformData);
                analyser.getByteFrequencyData(frequencyData);
            }
            
            const w = canvas.width;
            const h = canvas.height;
            
            // Draw oscilloscope waveform
            ctx.shadowBlur = 22;
            ctx.shadowColor = currentAccent;
            
            ctx.strokeStyle = currentAccent;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            
            const sliceWidth = w / waveformData.length;
            let x = 30;
            
            for (let i = 0; i < waveformData.length; i++) {
                const v = waveformData[i] / 128.0;
                const y = (v * h / 2.4) + (h / 4.5);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }
            ctx.stroke();
            
            // Glow layer 2
            ctx.shadowBlur = 8;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Frequency bars on the right
            const barWidth = 9;
            const startX = w - 140;
            
            ctx.shadowBlur = 0;
            for (let i = 0; i < 24; i++) {
                const barHeight = (frequencyData[i * 2] / 255) * 150;
                const alpha = 0.6 + (i / 40);
                
                ctx.fillStyle = `rgba(100, 255, 170, ${alpha})`;
                ctx.fillRect(startX + i * (barWidth + 3), h - 70 - barHeight, barWidth, barHeight);
                
                // Little caps
                if (barHeight > 6) {
                    ctx.fillRect(startX + i * (barWidth + 3), h - 74 - barHeight, barWidth, 3);
                }
            }
            
            // Particle field
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#aaffcc";
            
            const avgVol = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
            
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                
                p.x += Math.cos(p.angle) * p.speed * (avgVol * 4 + 0.4);
                p.y += Math.sin(p.angle) * p.speed * 0.6;
                p.life--;
                p.angle += 0.01;
                
                if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
                    p.x = Math.random() * w * 0.6 + 50;
                    p.y = Math.random() * (h * 0.6) + 60;
                    p.life = 80 + Math.random() * 60;
                }
                
                const intensity = (p.life / 120);
                ctx.globalAlpha = intensity * 0.7;
                ctx.fillStyle = currentAccent;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
            ctx.globalAlpha = 1;
            
            // Center vignette
            const gradient = ctx.createRadialGradient(w/2, h/2, 80, w/2, h/2, 380);
            gradient.addColorStop(0, "transparent");
            gradient.addColorStop(1, "rgba(5, 10, 5, 0.6)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            
            // Fake text labels inside canvas
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(120, 255, 150, 0.1)";
            ctx.font = "700 72px VT323";
            ctx.textAlign = "center";
            ctx.fillText("SIGNAL", w / 2, h / 2 + 24);
            
            // Scan line
            const scanY = ((Date.now() % 2200) / 2200) * (h - 80) + 30;
            ctx.fillStyle = "rgba(160, 255, 180, 0.15)";
            ctx.fillRect(0, scanY, w, 4);
            
            // Peak frequency label
            const peakBin = Math.floor(Math.random() * 12) + 8;
            const peakVal = Math.floor(120 + frequencyData[peakBin] / 2.2);
            document.getElementById("peak-freq").textContent = peakVal + "Hz";
            
            ctx.restore();
        }
        
        function animate() {
            const now = Date.now();
            const delta = now - lastTime;
            lastTime = now;
            elapsedTime += delta;
            
            // Update timestamp
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById("timestamp").textContent = displayTime;
            
            if (audioContext && isPowered) {
                evolveAudio(elapsedTime);
                updateAudioFromParams();
            }
            
            drawCanvas();
            
            // Random log entry
            if (Math.random() < 0.03 && logMessages.length < 7) {
                const site = sites[currentSiteIndex];
                const phrase = site.logPhrases[Math.floor(Math.random() * site.logPhrases.length)];
                addToLog(phrase);
            }
            
            // Live cohesion display
            document.getElementById("live-cohesion").textContent = Math.floor(params.cohesion * (0.7 + Math.random() * 0.3));
            
            // Occasional glitch on null site
            if (currentSiteIndex === 4 && Math.random() > 0.8) {
                const center = document.getElementById("center-text");
                center.classList.add("glitch");
                setTimeout(() => {
                    center.classList.remove("glitch");
                }, 400);
            }
            
            animationFrame = requestAnimationFrame(animate);
        }
        
        function addToLog(text, isAnomaly = false) {
            const logContainer = document.getElementById("console-log");
            const time = new Date().toLocaleTimeString('en-US', {hour12: false, hour: "2-digit", minute:"2-digit"}).replace(/^0+/, '');
            
            const entry = document.createElement("div");
            entry.className = `flex gap-x-3 log-line ${isAnomaly ? 'text-red-400' : ''}`;
            entry.innerHTML = `
                <span class="text-zinc-500 w-14">[${time}]</span>
                <span>${text.toUpperCase()}</span>
            `;
            logContainer.appendChild(entry);
            
            // Trim log
            logMessages.push(entry);
            if (logMessages.length > 7) {
                const old = logMessages.shift();
                if (old && old.parentNode) old.parentNode.removeChild(old);
            }
            
            logContainer.scrollTop = 9999;
        }
        
        function clearLog() {
            const container = document.getElementById("console-log");
            container.innerHTML = '';
            logMessages = [];
            addToLog("LOG CLEARED");
        }
        
        function selectSite(index) {
            currentSiteIndex = index;
            const site = sites[index];
            
            // Update active UI
            document.querySelectorAll('.site-button').forEach((el, i) => {
                if (i === index) {
                    el.style.borderColor = site.accent;
                    el.style.backgroundColor = "#05260f";
                } else {
                    el.style.borderColor = 'transparent';
                    el.style.backgroundColor = '';
                }
            });
            
            currentAccent = site.accent;
            document.getElementById("current-site-code").textContent = site.code;
            document.getElementById("visual-site").textContent = site.name;
            document.getElementById("overlay-site").textContent = site.fullName.toUpperCase();
            document.getElementById("site-fullname").innerHTML = `${site.name}<br><span class="text-xs text-zinc-400">${site.fullName}</span>`;
            
            // Change canvas accent by redrawing
            if (ctx) {
                drawCanvas();
            }
            
            // Change some parameters automatically
            if (index === 0) {
                params.cohesion = 85;
                params.voice = 90;
            } else if (index === 1) {
                params.decay = 75;
                params.contamination = 55;
            } else if (index === 2) {
                params.cohesion = 40;
                params.residue = 80;
            } else if (index === 4) {
                params.contamination = 70;
                params.integrity = 30;
            }
            
            syncSliderValues();
            updateAudioFromParams();
            
            // Log the selection
            addToLog(`SITE SELECTED: ${site.name}`, true);
        }
        
        function syncSliderValues() {
            document.getElementById("slider-cohesion").value = params.cohesion;
            document.getElementById("slider-decay").value = params.decay;
            document.getElementById("slider-contam").value = params.contamination;
            document.getElementById("slider-residue").value = params.residue;
            document.getElementById("slider-voice").value = params.voice;
            document.getElementById("slider-integrity").value = params.integrity;
            
            document.getElementById("val-cohesion").textContent = Math.round(params.cohesion);
            document.getElementById("val-decay").textContent = Math.round(params.decay);
            document.getElementById("val-contam").textContent = Math.round(params.contamination);
            document.getElementById("val-residue").textContent = Math.round(params.residue);
            document.getElementById("val-voice").textContent = Math.round(params.voice);
            document.getElementById("val-integrity").textContent = Math.round(params.integrity);
        }
        
        function updateParam(index, value) {
            const numVal = parseFloat(value);
            
            switch(index) {
                case 0:
                    params.cohesion = numVal;
                    document.getElementById("val-cohesion").textContent = Math.round(numVal);
                    break;
                case 1:
                    params.decay = numVal;
                    document.getElementById("val-decay").textContent = Math.round(numVal);
                    break;
                case 2:
                    params.contamination = numVal;
                    document.getElementById("val-contam").textContent = Math.round(numVal);
                    break;
                case 3:
                    params.residue = numVal;
                    document.getElementById("val-residue").textContent = Math.round(numVal);
                    break;
                case 4:
                    params.voice = numVal;
                    document.getElementById("val-voice").textContent = Math.round(numVal);
                    break;
                case 5:
                    params.integrity = numVal;
                    document.getElementById("val-integrity").textContent = Math.round(numVal);
                    break;
            }
            
            updateAudioFromParams();
        }
        
        function randomizeParams() {
            params.cohesion = 30 + Math.random() * 70;
            params.decay = 20 + Math.random() * 70;
            params.contamination = Math.random() * 75;
            params.residue = 25 + Math.random() * 75;
            params.voice = 10 + Math.random() * 85;
            params.integrity = 45 + Math.random() * 55;
            
            syncSliderValues();
            updateAudioFromParams();
            addToLog("PARAMETERS RANDOMIZED", true);
        }
        
        function toggleMute() {
            isMuted = !isMuted;
            
            if (masterGain) {
                masterGain.gain.setTargetAtTime(isMuted ? 0.02 : 0.6, audioContext.currentTime, 0.1);
            }
            
            const ind = document.getElementById("mute-indicator");
            if (isMuted) {
                ind.style.transform = "translateX(12px)";
                document.getElementById("mute-text").textContent = "AUDIO MUTED";
            } else {
                ind.style.transform = "translateX(0)";
                document.getElementById("mute-text").textContent = "AUDIO ON";
            }
        }
        
        function togglePower() {
            isPowered = !isPowered;
            
            const statusEl = document.getElementById("power-status");
            
            if (!isPowered) {
                statusEl.innerHTML = `● OFFLINE`;
                statusEl.classList.remove("text-emerald-400");
                statusEl.classList.add("text-zinc-500");
                if (masterGain) masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);
            } else {
                statusEl.innerHTML = `● CONNECTED`;
                statusEl.classList.add("text-emerald-400");
                statusEl.classList.remove("text-zinc-500");
                if (masterGain) masterGain.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.8);
            }
        }
        
        function captureTransmission() {
            if (!canvas) return;
            
            const modal = document.getElementById("modal-backdrop");
            const site = sites[currentSiteIndex];
            
            // Generate archive ID
            const archiveNum = Math.floor(1000 + Math.random() * 8000);
            const archiveId = `IA-${site.code}-${archiveNum}`;
            document.getElementById("modal-archive-id").textContent = archiveId;
            
            // Snapshot
            const snapshot = canvas.toDataURL("image/png");
            document.getElementById("modal-image").src = snapshot;
            
            // Site info
            document.getElementById("modal-site").innerHTML = `${site.name}<br><span class="text-xs">${site.fullName}</span>`;
            
            // Timestamp
            const now = new Date();
            const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            document.getElementById("modal-timestamp").textContent = ts;
            
            // Random classification
            const cls = classifications[Math.floor(Math.random() * classifications.length)];
            document.getElementById("modal-classification").textContent = cls;
            
            // Random report
            const reports = [
                `The signal began imitating the observer’s breathing approximately ${Math.floor(Math.random()*60)+15} seconds after activation.`,
                `An unknown presence was recorded modulating the 220Hz band. The tone matched a child’s voice from 1994.`,
                `Frequency collapse observed. Archive integrity at ${Math.floor(params.integrity)}%.`,
                `The transmission contained fragments of a phone conversation that ended 11 years ago.`,
                `Particle density in the chamber increased by 300% during the 4th minute of recording.`
            ];
            document.getElementById("modal-report").textContent = reports[Math.floor(Math.random() * reports.length)];
            
            // Show modal
            modal.classList.remove("hidden");
            modal.classList.add("flex");
            
            // Add log
            addToLog("TRANSMISSION CAPTURED", true);
        }
        
        function hideCaptureModal() {
            const modal = document.getElementById("modal-backdrop");
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }
        
        function downloadCaseFile() {
            const archiveId = document.getElementById("modal-archive-id").textContent;
            
            // Create a simple text report
            const reportText = `${archiveId}\n` +
                `SITE: ${document.getElementById("modal-site").innerText}\n` +
                `CLASSIFICATION: ${document.getElementById("modal-classification").innerText}\n` +
                `TIMESTAMP: ${document.getElementById("modal-timestamp").innerText}\n\n` +
                document.getElementById("modal-report").innerText + `\n\n` +
                `--- END OF TRANSMISSION ---\n` +
                `Generated at ${new Date().toISOString()}\n`;
            
            const blob = new Blob([reportText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${archiveId}.txt`;
            link.click();
            URL.revokeObjectURL(url);
            
            // Also download the image
            const imgLink = document.createElement('a');
            imgLink.href = document.getElementById("modal-image").src;
            imgLink.download = `${archiveId}.png`;
            setTimeout(() => {
                imgLink.click();
            }, 120);
            
            hideCaptureModal();
        }
        
        function showHelp() {
            const messages = [
                "THIS IS A WORK OF FICTION",
                "ALL SIGNALS ARE PROCEDURAL",
                "NO REAL ROOMS WERE HARMED",
                "ADJUST SLIDERS TO HEAR THE PAST"
            ];
            let i = 0;
            const interval = setInterval(() => {
                addToLog(messages[i % messages.length]);
                i++;
                if (i > 12) clearInterval(interval);
            }, 220);
        }
        
        function initializeSystem() {
            const overlay = document.getElementById("initialize-overlay");
            overlay.style.opacity = 0;
            
            setTimeout(() => {
                overlay.style.display = "none";
                
                // Initialize audio
                initAudio();
                
                // Select default site
                selectSite(4);
                
                // Start visuals
                canvas = document.getElementById("main-canvas");
                ctx = canvas.getContext("2d", { alpha: true });
                
                createParticles();
                
                // Populate fake spectrogram bars
                const specContainer = document.getElementById("fake-spectrogram");
                for (let i = 0; i < 12; i++) {
                    const bar = document.createElement("div");
                    bar.className = "signal-bar bg-gradient-to-t from-cyan-400 to-transparent w-2";
                    bar.style.height = (20 + Math.random() * 70) + "px";
                    specContainer.append(bar);
                }
                
                // Add some starter logs
                setTimeout(() => addToLog("SYSTEM ONLINE"), 400);
                setTimeout(() => addToLog("LOCKING TO NULL SITE"), 1100);
                setTimeout(() => addToLog("ANOMALY THRESHOLD EXCEEDED"), 2100);
                
                // Start animation loop
                animate();
                
                // Make sliders look nicer
                const ranges = document.querySelectorAll("input[type='range']");
                ranges.forEach(range => {
                    range.style.height = "3px";
                });
                
                // Keyboard shortcuts
                document.addEventListener('keydown', function(e) {
                    if (e.metaKey && e.key === "k") {
                        e.preventDefault();
                        randomizeParams();
                    }
                    if (e.key === "/" && document.getElementById("modal-backdrop").classList.contains("hidden")) {
                        captureTransmission();
                    }
                });
                
                // Demo: change site automatically once
                setTimeout(() => {
                    if (currentSiteIndex === 4) {
                        selectSite(0);
                    }
                }, 6500);
                
            }, 600);
        }
        
        // Boot the application
        function boot() {
            initializeTailwind();
            
            // Make sure the initialize overlay is visible
            const overlay = document.getElementById("initialize-overlay");
            overlay.style.transition = "opacity 800ms cubic-bezier(0.23, 1, 0.32, 1)";
            
            // Preload a couple logs
            setTimeout(() => {
                const fakeLog = document.getElementById("console-log");
                const starter = document.createElement("div");
                starter.className = "text-amber-200/60 text-[13px]";
                starter.textContent = "WAITING FOR USER GESTURE...";
                fakeLog.appendChild(starter);
            }, 120);
            
            // Make body font consistent
            document.documentElement.style.setProperty(
                'font-family', 
                "'VT323', system-ui, monospace"
            );
        }
        
        window.onload = boot;
