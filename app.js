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

        if (cleaned === target) {

            this.triggerCloseCommand();

            return;
        }


        // ------------------------------------------
        // IMPORTANT:
        //
        // Do NOT punish merely because a word starts
        // with C.
        //
        // Only consider punishment if the existing
        // text is clearly following the CLOSE prefix.
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
    // SEARCH
    // ==================================================

    triggerSearchSubmit() {

        if (!this.searchInput) {
            return;
        }

        const query =
            this.searchInput.value;


        if (!query || query.trim() === '') {

            this.updateStatus(
                'Empty search query submitted.',
                'warn'
            );

            return;
        }


        // 70% chance of fake malfunction
        if (Math.random() < 0.7) {

            this.startFakeMalfunction(query);

        } else {

            this.updateStatus(
                `Guloogulu search completed for "${query}". Found 0 results.`,
                'active'
            );
        }
    }


    // ==================================================
    // FAKE MALFUNCTION
    // ==================================================

    startFakeMalfunction(originalQuery) {

        if (this.isMalfunctioning) {
            return;
        }

        this.isMalfunctioning = true;


        this.updateStatus(
            '⚡ SYSTEM MALFUNCTION DETECTED... SEARCH FREEZING ⚡',
            'error'
        );


        document.body.style.cursor = 'wait';


        const searchBox =
            document.querySelector('.search-box');


        if (searchBox) {
            searchBox.style.borderColor =
                '#ea4335';
        }


        const durationMs = 15000;


        const scrambleInterval =
            setInterval(() => {

                if (!this.searchInput) {
                    return;
                }

                const characters =
                    this.searchInput.value.split('');


                for (
                    let i = characters.length - 1;
                    i > 0;
                    i--
                ) {

                    const j =
                        Math.floor(
                            Math.random() * (i + 1)
                        );

                    [
                        characters[i],
                        characters[j]
                    ] = [
                            characters[j],
                            characters[i]
                        ];
                }


                this.searchInput.value =
                    characters.join('');

            }, 300);


        setTimeout(() => {

            clearInterval(
                scrambleInterval
            );


            if (this.searchInput) {
                this.searchInput.value =
                    originalQuery;
            }


            this.isMalfunctioning = false;


            document.body.style.cursor =
                'default';


            if (searchBox) {
                searchBox.style.borderColor =
                    '#dfe1e5';
            }


            this.updateStatus(
                'Search recovered. Guloogulu found nothing.',
                'active'
            );

        }, durationMs);
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