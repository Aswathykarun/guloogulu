/**
 * app.js
 * Main application coordinator for Guloogulu Blink-to-Type.
 */

import { CameraManager } from './camera.js';
import { EyeDetector } from './detector.js';
import { MorseEngine } from './morse.js';

class GulooguluApp {

    constructor() {

        this.searchInput =
            document.getElementById('searchInput');

        this.statusText =
            document.getElementById('status');

        this.statusDot =
            document.getElementById('statusDot');

        this.videoElement = null;

        this.cameraManager = null;

        this.eyeDetector = null;

        this.morseEngine = null;

        this.isMalfunctioning = false;

        this.isPunished = false;

        this.punishmentTimer = null;

        this.punishmentSecondsLeft = 900;

        this.initDOM();

        this.setupKeyboardBlock();

        this.setupMorseEngine();

        this.setupCameraAndDetector();
    }


    // ==================================================
    // MELLOW NOSTALGIC SCREENSAVER (LIFECYCLE TIED TO FAILURE STATE)
    // ==================================================

    startMellowScreensaver() {
        this.stopMellowScreensaver();

        const container = document.createElement('div');
        container.id = 'mellowScreensaverContainer';
        Object.assign(container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '99999',
            overflow: 'hidden'
        });
        document.body.appendChild(container);

        this.mellowContainer = container;
        this.mellowBubbles = [];

        const bubbleCount = 24; // Doubled number of red floating bubbles
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'mellow-failed-bubble';
            bubble.textContent = 'YOU FAILED';

            container.appendChild(bubble);

            const rect = bubble.getBoundingClientRect();
            const w = rect.width || 100;
            const h = rect.height || 30;

            const x = Math.floor(Math.random() * Math.max(viewportW - w - 20, 10));
            const y = Math.floor(Math.random() * Math.max(viewportH - h - 20, 10));

            let vx = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5);
            let vy = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5);

            this.mellowBubbles.push({
                elem: bubble,
                x,
                y,
                vx,
                vy,
                w,
                h,
                isBursting: false,
                burstTimer: Math.floor(120 + Math.random() * 250)
            });
        }

        const updateLoop = () => {
            if (!this.mellowContainer || !document.body.contains(this.mellowContainer)) {
                return;
            }

            const currentW = window.innerWidth;
            const currentH = window.innerHeight;

            this.mellowBubbles.forEach((b) => {
                if (b.isBursting) return;

                b.x += b.vx;
                b.y += b.vy;

                const maxX = currentW - b.w;
                const maxY = currentH - b.h;

                if (b.x <= 0) {
                    b.x = 0;
                    b.vx = Math.abs(b.vx);
                } else if (b.x >= maxX) {
                    b.x = maxX;
                    b.vx = -Math.abs(b.vx);
                }

                if (b.y <= 0) {
                    b.y = 0;
                    b.vy = Math.abs(b.vy);
                } else if (b.y >= maxY) {
                    b.y = maxY;
                    b.vy = -Math.abs(b.vy);
                }

                b.elem.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0)`;

                b.burstTimer--;
                if (b.burstTimer <= 0) {
                    this.triggerSubtleBubbleBurst(b, currentW, currentH);
                }
            });

            this.mellowAnimId = requestAnimationFrame(updateLoop);
        };

        this.mellowAnimId = requestAnimationFrame(updateLoop);
    }

    triggerSubtleBubbleBurst(b, viewportW, viewportH) {
        if (!this.mellowContainer) return;
        b.isBursting = true;
        const elem = b.elem;

        elem.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        elem.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0) scale(1.2)`;
        elem.style.opacity = '0';

        const burstX = b.x + b.w / 2;
        const burstY = b.y + b.h / 2;

        for (let p = 0; p < 4; p++) {
            const pt = document.createElement('div');
            pt.className = 'mellow-bubble-particle';
            pt.style.left = `${burstX}px`;
            pt.style.top = `${burstY}px`;
            this.mellowContainer.appendChild(pt);

            const angle = (p / 4) * Math.PI * 2;
            const dist = 15 + Math.random() * 20;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;

            pt.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 0.6 },
                { transform: `translate(${px}px, ${py}px) scale(0)`, opacity: 0 }
            ], { duration: 600, easing: 'ease-out' });

            setTimeout(() => { if (pt.parentNode) pt.remove(); }, 600);
        }

        const frag = document.createElement('div');
        frag.className = 'mellow-text-fragment';
        frag.textContent = 'YOU FAILED';
        frag.style.left = `${burstX - 30}px`;
        frag.style.top = `${burstY}px`;
        this.mellowContainer.appendChild(frag);

        frag.animate([
            { transform: 'translate(0, 0) scale(0.9)', opacity: 0.8 },
            { transform: 'translate(0, 30px) scale(1)', opacity: 0.9, offset: 0.5 },
            { transform: 'translate(0, 48px) scale(0.6)', opacity: 0 }
        ], { duration: 1100, easing: 'ease-in-out' });

        setTimeout(() => { if (frag.parentNode) frag.remove(); }, 1100);

        setTimeout(() => {
            if (!this.mellowContainer || !document.body.contains(elem)) return;
            b.x = Math.floor(Math.random() * Math.max(viewportW - b.w - 20, 10));
            b.y = Math.floor(Math.random() * Math.max(viewportH - b.h - 20, 10));
            b.vx = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5);
            b.vy = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5);
            b.burstTimer = Math.floor(220 + Math.random() * 300);

            elem.style.transition = 'none';
            elem.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0) scale(0.3)`;
            elem.style.opacity = '0';

            requestAnimationFrame(() => {
                elem.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
                elem.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0) scale(1)`;
                elem.style.opacity = '1';
                setTimeout(() => {
                    elem.style.transition = 'none';
                    b.isBursting = false;
                }, 500);
            });
        }, 1200);
    }

    stopMellowScreensaver() {
        if (this.mellowAnimId) {
            cancelAnimationFrame(this.mellowAnimId);
            this.mellowAnimId = null;
        }

        const container = document.getElementById('mellowScreensaverContainer');
        if (container) {
            container.remove();
        }

        this.mellowContainer = null;
        this.mellowBubbles = [];
    }


    // ==================================================
    // DOM SETUP
    // ==================================================

    initDOM() {

        let video =
            document.getElementById('webcamVideo');

        if (!video) {

            video = document.createElement('video');

            video.id = 'webcamVideo';

            video.autoplay = true;

            video.playsInline = true;

            video.muted = true;

            video.style.display = 'none';

            document.body.appendChild(video);
        }

        this.videoElement = video;


        if (this.searchInput) {
            this.searchInput.readOnly = true;
        }


        // Allow manual recalibration through
        // the existing status element.
        const blinkStatus =
            document.querySelector('.blink-status');

        if (blinkStatus) {

            blinkStatus.style.cursor = 'pointer';

            blinkStatus.title =
                'Click to recalibrate eye detection';

            blinkStatus.addEventListener('click', () => {

                if (
                    this.eyeDetector &&
                    typeof this.eyeDetector.recalibrate === 'function'
                ) {
                    this.eyeDetector.recalibrate();
                }

            });
        }

        // Browser Exit X Button Listener
        const exitBtn = document.getElementById('browserExitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                if (this.isPunished || this.isMalfunctioning) return;
                this.isExitRequested = true;
                this.updateStatus('EXIT REQUESTED: Blink "CLOSE" in Morse code to shutdown web page.', 'warn');
            });
        }
    }


    // ==================================================
    // KEYBOARD BLOCK
    // ==================================================

    setupKeyboardBlock() {

        if (!this.searchInput) {
            return;
        }

        const blockEvent = (event) => {

            event.preventDefault();

            event.stopPropagation();

            return false;
        };


        this.searchInput.addEventListener(
            'keydown',
            blockEvent
        );

        this.searchInput.addEventListener(
            'keypress',
            blockEvent
        );

        this.searchInput.addEventListener(
            'beforeinput',
            blockEvent
        );

        this.searchInput.addEventListener(
            'paste',
            blockEvent
        );
    }


    // ==================================================
    // STATUS
    // ==================================================

    updateStatus(message, state = 'info') {

        if (this.statusText) {
            this.statusText.textContent = message;
        }

        if (!this.statusDot) {
            return;
        }

        switch (state) {

            case 'active':
                this.statusDot.style.background =
                    '#34a853';
                break;

            case 'warn':
                this.statusDot.style.background =
                    '#fbbc05';
                break;

            case 'error':
            case 'punish':
                this.statusDot.style.background =
                    '#ea4335';
                break;

            default:
                this.statusDot.style.background =
                    '#4285f4';
        }
    }


    // ==================================================
    // MORSE ENGINE
    // ==================================================

    setupMorseEngine() {

        this.morseEngine = new MorseEngine({

            // ------------------------------------------
            // Morse buffer changed
            // ------------------------------------------

            onBufferChange: (buffer) => {

                if (
                    this.isMalfunctioning ||
                    this.isPunished
                ) {
                    return;
                }

                if (buffer.length > 0) {

                    this.updateStatus(
                        `Blink-to-type active | Morse input: ${buffer}`,
                        'active'
                    );

                } else {

                    this.updateStatus(
                        'Blink-to-type camera ready',
                        'active'
                    );
                }
            },


            // ------------------------------------------
            // Character decoded
            // ------------------------------------------

            onCharacterDecoded: (character) => {

                if (
                    this.isMalfunctioning ||
                    this.isPunished
                ) {
                    return;
                }

                if (!this.searchInput) {
                    return;
                }

                const previousValue =
                    this.searchInput.value;

                const newValue =
                    previousValue + character;

                this.searchInput.value = newValue;

                // Schedule automatic sentence corruption 15s after typing starts
                if (!this.autoCorruptTimer && !this.isMalfunctioning) {
                    this.autoCorruptTimer = setTimeout(() => {
                        this.autoCorruptTimer = null;
                        this.triggerSearchSubmit();
                    }, 15000);
                }

                this.checkCloseCommand(
                    newValue,
                    previousValue
                );
            },


            // ------------------------------------------
            // Word space
            // ------------------------------------------

            onWordSpace: () => {

                if (
                    this.isMalfunctioning ||
                    this.isPunished
                ) {
                    return;
                }

                if (!this.searchInput) {
                    return;
                }

                const currentValue =
                    this.searchInput.value;

                if (
                    currentValue.length > 0 &&
                    !currentValue.endsWith(' ')
                ) {

                    const newValue =
                        currentValue + ' ';

                    this.searchInput.value = newValue;

                    this.checkCloseCommand(
                        newValue,
                        currentValue
                    );
                }
            },


            // ------------------------------------------
            // Submit gesture
            // ------------------------------------------

            onSubmitGesture: () => {

                if (
                    this.isMalfunctioning ||
                    this.isPunished
                ) {
                    return;
                }

                this.triggerSearchSubmit();
            },


            // ------------------------------------------
            // Invalid Morse
            // ------------------------------------------

            onInvalidMorse: (sequence) => {

                if (
                    this.isMalfunctioning ||
                    this.isPunished
                ) {
                    return;
                }

                this.updateStatus(
                    `Invalid Morse sequence: ${sequence}`,
                    'warn'
                );
            }
        });
    }


    // ==================================================
    // CAMERA + EYE DETECTOR
    // ==================================================

    async setupCameraAndDetector() {

        this.cameraManager =
            new CameraManager(
                this.videoElement,
                (message, state) => {
                    this.updateStatus(message, state);
                }
            );


        this.eyeDetector =
            new EyeDetector(

                // Status callback
                (message, state) => {

                    if (
                        !this.isMalfunctioning &&
                        !this.isPunished
                    ) {
                        this.updateStatus(
                            message,
                            state
                        );
                    }
                },


                // Eye state callback
                (isClosed, timestamp, ear) => {

                    if (
                        this.isMalfunctioning ||
                        this.isPunished
                    ) {
                        return;
                    }

                    this.morseEngine.handleEyeState(
                        isClosed,
                        timestamp
                    );
                }
            );


        const cameraStarted =
            await this.cameraManager.start();


        if (!cameraStarted) {
            return;
        }


        const detectorInitialized =
            await this.eyeDetector.init();


        if (!detectorInitialized) {
            return;
        }


        this.eyeDetector.startDetection(
            this.videoElement
        );
    }


    // ==================================================
    // CLOSE COMMAND
    // ==================================================

    checkCloseCommand(newValue, previousValue) {

        const cleaned =
            newValue.trim().toUpperCase();

        const target = 'CLOSE';


        // ------------------------------------------
        // CLOSE SUCCESS
        // ------------------------------------------

        if (cleaned === target || cleaned.endsWith('CLOSE') || cleaned.endsWith('EXIT')) {

            this.triggerCloseCommand();

            return;
        }


        // ------------------------------------------
        // If Exit X button was clicked, any wrong character
        // triggers 15-minute punishment state!
        // ------------------------------------------

        if (this.isExitRequested) {

            if (!target.startsWith(cleaned) && !cleaned.startsWith('CLOSE')) {

                this.isExitRequested = false;

                this.triggerPunishmentState(
                    'Failed Exit X Attempt! Incorrect Morse CLOSE sequence entered.'
                );

                return;
            }
        }


        // ------------------------------------------
        // Standard CLOSE sequence check
        // ------------------------------------------

        const previousCleaned =
            previousValue.trim().toUpperCase();


        if (
            previousCleaned.length >= 2 &&
            previousCleaned.length < target.length &&
            target.startsWith(previousCleaned)
        ) {

            if (!target.startsWith(cleaned)) {

                this.triggerPunishmentState(
                    'Failed CLOSE attempt detected.'
                );
            }
        }
    }





    // ==================================================
    // SEARCH (Submitting is impossible - Guloogulu is 100% useless)
    // ==================================================

    triggerSearchSubmit() {

        if (!this.searchInput) {
            return;
        }

        const query =
            this.searchInput.value;


        if (!query || query.trim() === '') {

            this.updateStatus(
                'Empty search query entered.',
                'warn'
            );

            return;
        }

        // Submitting real search results is impossible. Always corrupt sentence!
        this.startFakeMalfunction(query);
    }


    // ==================================================
    // FAKE MALFUNCTION (15s active -> 2s still freeze -> random letters shuffled)
    // ==================================================

    startFakeMalfunction(originalQuery) {

        if (this.isMalfunctioning) {
            return;
        }

        if (this.autoCorruptTimer) {
            clearTimeout(this.autoCorruptTimer);
            this.autoCorruptTimer = null;
        }

        this.isMalfunctioning = true;
        this.startMellowScreensaver();


        this.updateStatus(
            '⚡ SEARCH SUBMITTED... PROCESSING QUERY (15s) ⚡',
            'warn'
        );


        const searchBox =
            document.querySelector('.search-box');


        if (searchBox) {
            searchBox.style.borderColor =
                '#fbbc05';
        }


        // Phase 1: 15 seconds active delay after sentence is entered
        setTimeout(() => {

            if (!this.isMalfunctioning) return;

            // Phase 2: Site becomes completely still & frozen for 2 seconds
            this.updateStatus(
                '⚡ SYSTEM STILL & FROZEN (2s) ⚡',
                'error'
            );

            document.body.style.cursor = 'wait';
            document.body.style.pointerEvents = 'none';

            if (searchBox) {
                searchBox.style.borderColor = '#ea4335';
            }

            setTimeout(() => {

                if (!this.isMalfunctioning) return;

                // Phase 3: Shuffled random letters are entered into the sentence
                this.updateStatus(
                    '⚡ MALFUNCTION: SENTENCE SCRAMBLING & SHUFFLING ⚡',
                    'error'
                );

                const scrambleInterval = setInterval(() => {

                    if (!this.searchInput) return;

                    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

                    const characters = this.searchInput.value.split('');

                    for (let i = 0; i < characters.length; i++) {
                        if (Math.random() < 0.5) {
                            characters[i] = randomChars[Math.floor(Math.random() * randomChars.length)];
                        }
                    }

                    this.searchInput.value = characters.join('');

                }, 250);


                // Phase 4: Permanently corrupt sentence (NO RECOVERY)
                setTimeout(() => {

                    clearInterval(scrambleInterval);

                    // Scramble final word characters permanently so sentence is useless
                    if (this.searchInput) {
                        const words = originalQuery.split(' ');
                        const uselessWords = words.map(w => {
                            const chars = w.split('');
                            for (let i = chars.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [chars[i], chars[j]] = [chars[j], chars[i]];
                            }
                            return chars.join('');
                        });
                        this.searchInput.value = uselessWords.join(' ');
                    }

                    this.isMalfunctioning = false;

                    document.body.style.cursor = 'default';
                    document.body.style.pointerEvents = 'auto';

                    this.stopMellowScreensaver();

                    if (searchBox) {
                        searchBox.style.borderColor = '#dfe1e5';
                    }

                    this.updateStatus(
                        'Search failed! Sentence corrupted & permanently useless.',
                        'error'
                    );

                }, 3000);

            }, 2000); // 2 seconds still freeze

        }, 15000); // 15 seconds active after sentence entered
    }


    // ==================================================
    // CLOSE
    // ==================================================

    triggerCloseCommand() {

        this.updateStatus(
            'CLOSE command recognized. Shutting down Guloogulu...',
            'error'
        );


        this.morseEngine.reset();


        const oldOverlay =
            document.getElementById('exitOverlay');


        if (oldOverlay) {
            oldOverlay.remove();
        }


        const exitOverlay =
            document.createElement('div');


        exitOverlay.id =
            'exitOverlay';


        Object.assign(
            exitOverlay.style,
            {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                background: '#000',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '99999',
                fontFamily: 'monospace',
                fontSize: '24px',
                textAlign: 'center'
            }
        );


        exitOverlay.innerHTML = `
            <div style="font-size:72px; margin-bottom:20px;">
                👁️❌
            </div>

            <h2>GULOOGULU CLOSED</h2>

            <p style="
                font-size:16px;
                color:#aaa;
                max-width:500px;
                line-height:1.5;
            ">
                You successfully blinked "CLOSE".
                <br>
                Guloogulu has been shut down.
            </p>

            <button
                onclick="location.reload()"
                style="
                    margin-top:25px;
                    padding:10px 20px;
                    font-size:16px;
                    cursor:pointer;
                    background:#34a853;
                    color:#fff;
                    border:none;
                    border-radius:4px;
                "
            >
                Re-open Guloogulu
            </button>
        `;


        document.body.appendChild(
            exitOverlay
        );
    }


    // ==================================================
    // PUNISHMENT
    // ==================================================

    triggerPunishmentState(reason) {

        if (this.isPunished) {
            return;
        }


        this.isPunished = true;
        this.startMellowScreensaver();

        this.punishmentSecondsLeft = 900;


        this.morseEngine.reset();


        this.updateStatus(
            '⚠️ PUNISHMENT MODE ACTIVATED: 15:00 ⚠️',
            'punish'
        );


        const existingOverlay =
            document.getElementById(
                'punishmentOverlay'
            );


        if (existingOverlay) {
            existingOverlay.remove();
        }


        const overlay =
            document.createElement('div');


        overlay.id =
            'punishmentOverlay';


        Object.assign(
            overlay.style,
            {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                background: 'rgba(234, 67, 53, 0.15)',
                backdropFilter: 'blur(3px)',
                zIndex: '9999',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto'
            }
        );


        const box =
            document.createElement('div');


        Object.assign(
            box.style,
            {
                background: '#fff',
                border: '2px solid #ea4335',
                borderRadius: '12px',
                padding: '30px',
                textAlign: 'center',
                boxShadow:
                    '0 10px 30px rgba(0,0,0,0.2)',
                maxWidth: '500px'
            }
        );


        box.innerHTML = `
            <h1 style="
                color:#ea4335;
                margin-top:0;
            ">
                ⚠️ 15-MINUTE PUNISHMENT ⚠️
            </h1>

            <p style="
                font-size:14px;
                color:#5f6368;
            ">
                ${reason}
            </p>

            <p style="
                font-size:15px;
                font-weight:bold;
            ">
                Incorrect CLOSE command detected!
                Interactions locked.
            </p>

            <div
                id="punishmentTimer"
                style="
                    font-size:48px;
                    font-family:monospace;
                    color:#ea4335;
                    margin:20px 0;
                "
            >
                15:00
            </div>

            <p style="
                font-size:12px;
                color:#80868b;
            ">
                Mouse movement allowed.
                Clicking and typing disabled.
            </p>
        `;


        overlay.appendChild(box);

        document.body.appendChild(
            overlay
        );


        // ------------------------------------------
        // Block clicks
        // ------------------------------------------

        const blockClick = (event) => {

            event.preventDefault();

            event.stopPropagation();

            return false;
        };


        overlay.addEventListener(
            'click',
            blockClick,
            true
        );


        overlay.addEventListener(
            'mousedown',
            blockClick,
            true
        );


        overlay.addEventListener(
            'mouseup',
            blockClick,
            true
        );


        // ------------------------------------------
        // Countdown
        // ------------------------------------------

        this.punishmentTimer =
            setInterval(() => {

                this.punishmentSecondsLeft--;


                const minutes =
                    Math.floor(
                        this.punishmentSecondsLeft / 60
                    )
                        .toString()
                        .padStart(2, '0');


                const seconds =
                    (
                        this.punishmentSecondsLeft % 60
                    )
                        .toString()
                        .padStart(2, '0');


                const timer =
                    document.getElementById(
                        'punishmentTimer'
                    );


                if (timer) {

                    timer.textContent =
                        `${minutes}:${seconds}`;
                }


                if (
                    this.punishmentSecondsLeft <= 0
                ) {

                    clearInterval(
                        this.punishmentTimer
                    );

                    this.punishmentTimer = null;

                    this.isPunished = false;
                    this.stopMellowScreensaver();


                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(
                            overlay
                        );
                    }


                    this.updateStatus(
                        'Punishment ended. Guloogulu restored.',
                        'active'
                    );
                }

            }, 1000);
    }
}


// ==================================================
// GLOBAL SEARCH BUTTON HOOKS
// ==================================================

window.searchNothing = function () {

    if (window.gulooguluApp) {
        window.gulooguluApp.triggerSearchSubmit();
    }
};


window.feelingLucky = function () {

    if (window.gulooguluApp) {
        window.gulooguluApp.triggerSearchSubmit();
    }
};


// ==================================================
// INITIALIZE
// ==================================================

window.addEventListener(
    'DOMContentLoaded',
    () => {
        window.gulooguluApp =
            new GulooguluApp();
    }
);