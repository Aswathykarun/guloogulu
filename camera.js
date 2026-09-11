/**
 * camera.js - Camera startup, getUserMedia handling, and stream management for Guloogulu
 */

export class CameraManager {
    constructor(videoElement, onStatusUpdate) {
        this.video = videoElement;
        this.onStatusUpdate = onStatusUpdate || (() => {});
        this.stream = null;
        this.isStreaming = false;
    }

    async start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.onStatusUpdate('Camera error: Browser does not support webcam access.', 'error');
            return false;
        }

        try {
            this.onStatusUpdate('Requesting webcam access...', 'info');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });

            this.video.srcObject = this.stream;

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(() => {
                        this.isStreaming = true;
                        this.onStatusUpdate('Camera active. Aligning face...', 'info');
                        resolve(true);
                    }).catch(err => {
                        console.error('Error starting video play:', err);
                        this.onStatusUpdate('Camera error: Unable to start video stream.', 'error');
                        resolve(false);
                    });
                };
            });
        } catch (err) {
            console.error('Webcam permission or hardware error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                this.onStatusUpdate('Camera permission denied. Please allow camera access.', 'error');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                this.onStatusUpdate('No camera device detected.', 'error');
            } else {
                this.onStatusUpdate('Camera unavailable or in use by another app.', 'error');
            }
            return false;
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isStreaming = false;
        this.onStatusUpdate('Camera stopped.', 'info');
    }
}
