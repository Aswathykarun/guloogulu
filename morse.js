/**
 * morse.js
 * Blink duration classifier, Morse buffer manager,
 * character/word timing, and rapid-blink submit detector.
 */

export const MORSE_MAP = {
    '.-': 'A',
    '-...': 'B',
    '-.-.': 'C',
    '-..': 'D',
    '.': 'E',
    '..-.': 'F',
    '--.': 'G',
    '....': 'H',
    '..': 'I',
    '.---': 'J',
    '-.-': 'K',
    '.-..': 'L',
    '--': 'M',
    '-.': 'N',
    '---': 'O',
    '.--.': 'P',
    '--.-': 'Q',
    '.-.': 'R',
    '...': 'S',
    '-': 'T',
    '..-': 'U',
    '...-': 'V',
    '.--': 'W',
    '-..-': 'X',
    '-.--': 'Y',
    '--..': 'Z',

    '-----': '0',
    '.----': '1',
    '..---': '2',
    '...--': '3',
    '....-': '4',
    '.....': '5',
    '-....': '6',
    '--...': '7',
    '---..': '8',
    '----.': '9',

    '.-.-.-': '.',
    '--..--': ',',
    '..--..': '?'
};

export class MorseEngine {
    constructor(callbacks = {}) {
        this.onBufferChange =
            callbacks.onBufferChange || (() => { });

        this.onCharacterDecoded =
            callbacks.onCharacterDecoded || (() => { });

        this.onWordSpace =
            callbacks.onWordSpace || (() => { });

        this.onSubmitGesture =
            callbacks.onSubmitGesture || (() => { });

        this.onInvalidMorse =
            callbacks.onInvalidMorse || (() => { });

        this.currentMorse = '';

        // 0 means the eye is currently open
        this.closeStartTime = 0;

        this.charTimer = null;
        this.wordTimer = null;

        // Recent short blinks used for the 3-blink submit gesture
        this.recentShortBlinks = [];

        // -----------------------------
        // Blink timing
        // -----------------------------

        this.MIN_BLINK_DURATION = 100;

        // Below this = dot
        // Above this = dash
        this.SHORT_BLINK_MAX = 600;

        // Ignore unrealistically long eye closures
        this.LONG_BLINK_MAX = 1800;

        // -----------------------------
        // Morse pause timing
        // -----------------------------

        // After this much silence, decode the current character
        this.CHAR_PAUSE = 900;

        // After this much silence, insert a word space
        this.WORD_PAUSE = 2200;

        // -----------------------------
        // Submit gesture
        // -----------------------------

        // Three short blinks with very small gaps
        // are treated as submit.
        this.SUBMIT_BLINK_GAP = 280;

        this.SUBMIT_TOTAL_TIME = 750;
    }

    handleEyeState(isClosed, timestamp) {

        // ==========================================
        // EYE CLOSED
        // ==========================================

        if (isClosed) {

            // IMPORTANT:
            // Only record the FIRST frame in which
            // the eye becomes closed.
            //
            // Do NOT reset this on every camera frame.
            if (this.closeStartTime === 0) {
                this.closeStartTime = timestamp;

                // A new blink means the user is still
                // actively entering Morse.
                this.clearTimers();
            }

            return;
        }

        // ==========================================
        // EYE OPEN
        // ==========================================

        if (this.closeStartTime === 0) {
            return;
        }

        // Calculate the COMPLETE eye-closure duration.
        const duration = timestamp - this.closeStartTime;

        // Reset immediately so this blink is processed once.
        this.closeStartTime = 0;

        // Ignore tiny detector noise.
        if (duration < this.MIN_BLINK_DURATION) {
            return;
        }

        // Ignore extremely long closures.
        if (duration > this.LONG_BLINK_MAX) {
            this.recentShortBlinks = [];
            return;
        }

        const isShort = duration < this.SHORT_BLINK_MAX;

        // ==========================================
        // RAPID TRIPLE-BLINK SUBMIT
        // ==========================================

        if (isShort) {

            this.recentShortBlinks.push(timestamp);

            // Keep only recent blinks.
            this.recentShortBlinks =
                this.recentShortBlinks.filter(
                    time => timestamp - time <= this.SUBMIT_TOTAL_TIME
                );

            if (this.recentShortBlinks.length >= 3) {

                const count =
                    this.recentShortBlinks.length;

                const first =
                    this.recentShortBlinks[count - 3];

                const second =
                    this.recentShortBlinks[count - 2];

                const third =
                    this.recentShortBlinks[count - 1];

                const gap1 = second - first;
                const gap2 = third - second;

                const totalTime = third - first;

                if (
                    gap1 <= this.SUBMIT_BLINK_GAP &&
                    gap2 <= this.SUBMIT_BLINK_GAP &&
                    totalTime <= this.SUBMIT_TOTAL_TIME
                ) {

                    // Submit gesture recognized.
                    this.recentShortBlinks = [];

                    this.currentMorse = '';

                    this.clearTimers();

                    this.onBufferChange('');

                    this.onSubmitGesture();

                    return;
                }
            }

        } else {
            // A long blink breaks a rapid triple-blink sequence.
            this.recentShortBlinks = [];
        }

        // ==========================================
        // NORMAL MORSE INPUT
        // ==========================================

        const symbol = isShort ? '.' : '-';

        this.currentMorse += symbol;

        this.onBufferChange(this.currentMorse);

        this.scheduleTimers();
    }

    scheduleTimers() {

        this.clearTimers();

        // ==========================================
        // CHARACTER BOUNDARY
        // ==========================================

        this.charTimer = setTimeout(() => {

            if (!this.currentMorse) {
                return;
            }

            const sequence = this.currentMorse;

            const character = MORSE_MAP[sequence];

            if (character) {

                this.onCharacterDecoded(character);

            } else {

                this.onInvalidMorse(sequence);
            }

            this.currentMorse = '';

            this.onBufferChange('');

            this.charTimer = null;

        }, this.CHAR_PAUSE);


        // ==========================================
        // WORD BOUNDARY
        // ==========================================

        this.wordTimer = setTimeout(() => {

            // Only create a word space if there is
            // no unfinished Morse sequence.
            if (this.currentMorse === '') {
                this.onWordSpace();
            }

            this.wordTimer = null;

        }, this.WORD_PAUSE);
    }

    clearTimers() {

        if (this.charTimer !== null) {
            clearTimeout(this.charTimer);
            this.charTimer = null;
        }

        if (this.wordTimer !== null) {
            clearTimeout(this.wordTimer);
            this.wordTimer = null;
        }
    }

    reset() {

        this.currentMorse = '';

        this.closeStartTime = 0;

        this.recentShortBlinks = [];

        this.clearTimers();

        this.onBufferChange('');
    }
}