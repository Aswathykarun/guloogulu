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
    // PLAYFUL FLOATING SPEECH BUBBLES - YOU FAILED ANIMATION
    // ==================================================

    triggerYouFailedAnimation(reason = 'SUBMIT FAILED!', autoDismissSeconds = 6) {

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.85);

            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.85);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.85);
        } catch (e) {
            // Audio Context prevented or unavailable
        }

        const existingOverlay =
            document.getElementById('youFailedOverlay');

        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay =
            document.createElement('div');

        overlay.id =
            'youFailedOverlay';

        overlay.className =
            'you-failed-overlay';

        // Center card with message
        const centerCard = document.createElement('div');
        centerCard.className = 'failed-center-card';
        centerCard.innerHTML = `
            <div class="failed-card-icon">💥</div>
            <div class="failed-card-title">YOU FAILED</div>
            <div class="failed-card-sub">${reason}</div>
            <button class="failed-card-btn" onclick="document.getElementById('youFailedOverlay')?.remove()">
                Try Again
            </button>
        `;
        overlay.appendChild(centerCard);

        document.body.appendChild(overlay);

        // Floating speech bubble text variations
        const bubbleTexts = [
            'YOU FAILED',
            'FAILED!',
            'TRY AGAIN',
            'NOPE 😭',
            'YOU FAILED',
            'FAILED!',
            'NOPE 😭',
            'TRY AGAIN',
            'WRONG! ❌',
            'BLINK BETTER! 👁️',
            'OOF 🙈',
            'NOPE 😭',
            'YOU FAILED',
            'FAIL 💥',
            'TRY AGAIN',
            'FAILED!',
            'NOPE 😭',
            'TRY AGAIN',
            'YOU FAILED',
            'WRONG! ❌'
        ];

        // Spawn multiple floating speech bubbles around the screen
        const totalBubbles = 24;

        for (let i = 0; i < totalBubbles; i++) {
            const text = bubbleTexts[i % bubbleTexts.length];
            const delay = Math.random() * 2.2; // 0s to 2.2s random delay
            const floatDuration = 3.8 + Math.random() * 2.0; // 3.8s to 5.8s
            const leftPos = 4 + Math.random() * 86; // 4% to 90% horizontal position
            const startBottom = 4 + Math.random() * 28; // 4% to 32% start height
            const rotationDeg = (Math.random() - 0.5) * 36; // -18deg to +18deg
            const scaleFactor = 0.85 + Math.random() * 0.45; // 0.85x to 1.3x size
            const fontSize = Math.floor(13 + Math.random() * 6); // 13px to 18px font
            const tailSide = Math.random() > 0.5 ? 'tail-left' : 'tail-right';
            const variantClass = `variant-${(i % 4) + 1}`;

            setTimeout(() => {
                if (!document.body.contains(overlay)) return;

                const bubble = document.createElement('div');
                bubble.className = `failed-speech-bubble ${tailSide} ${variantClass}`;
                bubble.textContent = text;

                bubble.style.left = `${leftPos}%`;
                bubble.style.bottom = `${startBottom}%`;
                bubble.style.fontSize = `${fontSize}px`;
                bubble.style.setProperty('--rot', `${rotationDeg}deg`);
                bubble.style.animationDuration = `${floatDuration}s`;
                bubble.style.transform = `scale(${scaleFactor})`;

                overlay.appendChild(bubble);
            }, delay * 1000);
        }

        if (autoDismissSeconds > 0) {
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    overlay.style.transition = 'opacity 0.6s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(overlay)) {
                            overlay.remove();
                        }
                    }, 600);
                }
            }, autoDismissSeconds * 1000);
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

            this.triggerYouFailedAnimation(
                'SEARCH SUBMIT FAILED!\nCannot submit an empty query.',
                4
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

                    if (searchBox) {
                        searchBox.style.borderColor = '#dfe1e5';
                    }

                    this.updateStatus(
                        'Search failed! Sentence corrupted & permanently useless.',
                        'error'
                    );

                    this.triggerYouFailedAnimation(
                        'SEARCH SUBMIT FAILED!\nSentence corrupted & Guloogulu remains 100% useless.',
                        6
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

        this.punishmentSecondsLeft = 900;


        this.morseEngine.reset();


        this.updateStatus(
            '⚠️ PUNISHMENT MODE ACTIVATED: 15:00 ⚠️',
            'punish'
        );

        this.triggerYouFailedAnimation(
            `PUNISHMENT MODE ACTIVATED!\n${reason}`,
            7
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