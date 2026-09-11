/**
 * detector.js - MediaPipe Face Landmarker integration & Eye Openness (EAR) calculation
 */

import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

export class EyeDetector {
    constructor(onStatusUpdate, onEyeStateChange) {
        this.onStatusUpdate = onStatusUpdate || (() => {});
        this.onEyeStateChange = onEyeStateChange || (() => {});
        this.landmarker = null;
        this.isInitialized = false;
        this.lastVideoTime = -1;
        this.animFrameId = null;

        // Calibration state
        this.calibrationSamples = [];
        this.isCalibrated = false;
        this.baselineOpenEAR = 0.28;
        this.closedThreshold = 0.18;

        // Current state
        this.isClosed = false;
        this.currentEAR = 0;
    }

    recalibrate() {
        this.calibrationSamples = [];
        this.isCalibrated = false;
        this.onStatusUpdate('Recalibrating eyes... Keep eyes open.', 'info');
    }

    async init() {
        try {
            this.onStatusUpdate('Loading MediaPipe AI models...', 'info');
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
            );

            this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numFaces: 2
            });

            this.isInitialized = true;
            this.onStatusUpdate('AI Model loaded. Starting face detection...', 'info');
            return true;
        } catch (err) {
            console.error('Failed to initialize Face Landmarker:', err);
            this.onStatusUpdate('Failed to load face detection model. Check network connection.', 'error');
            return false;
        }
    }

    startDetection(videoElement) {
        if (!this.isInitialized) return;

        const processFrame = () => {
            if (videoElement.currentTime !== this.lastVideoTime && videoElement.readyState >= 2) {
                this.lastVideoTime = videoElement.currentTime;
                const startTimeMs = performance.now();
                const results = this.landmarker.detectForVideo(videoElement, startTimeMs);
                this.handleLandmarkResults(results);
            }
            this.animFrameId = requestAnimationFrame(processFrame);
        };

        processFrame();
    }

    stopDetection() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    handleLandmarkResults(results) {
        const faceLandmarks = results.faceLandmarks;

        if (!faceLandmarks || faceLandmarks.length === 0) {
            this.onStatusUpdate('No face detected. Position face in camera view.', 'warn');
            return;
        }

        if (faceLandmarks.length > 1) {
            this.onStatusUpdate('Multiple faces detected! Please ensure only 1 face is visible.', 'warn');
            return;
        }

        const landmarks = faceLandmarks[0];

        // Check if eyes landmarks exist and face is reasonably close
        if (!landmarks || landmarks.length < 468) {
            this.onStatusUpdate('Face landmarks incomplete or eyes not visible.', 'warn');
            return;
        }

        const leftEAR = this.calculateEAR(landmarks, 159, 145, 160, 144, 33, 133);
        const rightEAR = this.calculateEAR(landmarks, 386, 374, 385, 373, 362, 263);

        if (isNaN(leftEAR) || isNaN(rightEAR)) {
            this.onStatusUpdate('Eyes not sufficiently visible.', 'warn');
            return;
        }

        this.currentEAR = (leftEAR + rightEAR) / 2.0;

        // Handle dynamic auto-calibration
        if (!this.isCalibrated) {
            this.calibrationSamples.push(this.currentEAR);
            this.onStatusUpdate(`Calibrating eyes... Keep eyes open (${this.calibrationSamples.length}/30)`, 'info');

            if (this.calibrationSamples.length >= 30) {
                // Calculate average open EAR excluding outliers
                const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
                // take middle 60%
                const trimmed = sorted.slice(6, 24);
                const avgOpen = trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;

                this.baselineOpenEAR = avgOpen;
                this.closedThreshold = Math.max(0.12, avgOpen * 0.65);
                this.isCalibrated = true;
                this.onStatusUpdate('Calibration complete! Blink to type.', 'active');
            }
            return;
        }

        // Slow adaptive drift adjustment when eyes are clearly open
        if (this.currentEAR > this.baselineOpenEAR * 0.85) {
            this.baselineOpenEAR = this.baselineOpenEAR * 0.98 + this.currentEAR * 0.02;
            this.closedThreshold = Math.max(0.12, this.baselineOpenEAR * 0.65);
        }

        // State detection: OPEN vs CLOSED
        const currentlyClosed = this.currentEAR < this.closedThreshold;
        if (currentlyClosed !== this.isClosed) {
            this.isClosed = currentlyClosed;
            this.onEyeStateChange(this.isClosed, performance.now(), this.currentEAR);
        }
    }

    calculateEAR(landmarks, p1, p2, p3, p4, corner1, corner2) {
        const v1 = this.distance(landmarks[p1], landmarks[p2]);
        const v2 = this.distance(landmarks[p3], landmarks[p4]);
        const horiz = this.distance(landmarks[corner1], landmarks[corner2]);
        if (horiz === 0) return 0;
        return (v1 + v2) / (2.0 * horiz);
    }

    distance(pt1, pt2) {
        if (!pt1 || !pt2) return 0;
        const dx = pt1.x - pt2.x;
        const dy = pt1.y - pt2.y;
        return Math.hypot(dx, dy);
    }
}
