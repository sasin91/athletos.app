import type { BarTrackingProgress } from './bar-decoder';
import type { BarCalibration, BarTrackingResult } from './bar-path';

export type TechniqueTarget = {
	workoutId: string;
	setPosition: number;
	/** Stable identity for editable sessions; setPosition is a retained legacy handle. */
	setId?: string;
	exercise: 'squat';
};

export type RecorderCapabilities = {
	secure: boolean;
	camera: boolean;
	recorder: boolean;
	supported: boolean;
};

export type CaptureSettings = { width: number; height: number; frameRate: number | null };

export type CapturedClip = CaptureSettings & {
	blob: Blob;
	mimeType: string;
	durationMs: number;
	rotationDegrees: 0 | 90 | 180 | 270;
};

export type RecorderPort = {
	capabilities(): RecorderCapabilities;
	requestPreview(video: HTMLVideoElement): Promise<CaptureSettings>;
	start(): Promise<void>;
	recordingResult(): Promise<CapturedClip>;
	stop(): Promise<CapturedClip>;
	dispose(): Promise<void>;
};

export type BarReviewState =
	| { kind: 'idle' }
	| { kind: 'ready'; result: BarTrackingResult }
	| { kind: 'failure'; message: string };

export type TechniqueBarProgress = BarTrackingProgress;

export type TechniqueReviewState =
	| { phase: 'checking' }
	| { phase: 'unsupported'; reason: string }
	| { phase: 'permission'; error: string | null }
	| { phase: 'preview'; settings: CaptureSettings }
	| { phase: 'countdown'; remaining: 3 | 2 | 1 }
	| { phase: 'recording'; startedAt: number }
	| { phase: 'review'; clip: CapturedClip; url: string; bar: BarReviewState }
	| { phase: 'calibrating'; clip: CapturedClip; url: string }
	| { phase: 'tracking'; clip: CapturedClip; url: string; progress: TechniqueBarProgress }
	| { phase: 'failure'; stage: 'camera' | 'recording' | 'review'; message: string }
	| { phase: 'closed' };

export type TechniqueReviewIntent =
	| { type: 'request-camera'; video?: HTMLVideoElement }
	| { type: 'start-countdown' }
	| { type: 'countdown-tick'; remaining: 2 | 1 }
	| { type: 'countdown-finished' }
	| { type: 'stop' }
	| { type: 'record-again'; video?: HTMLVideoElement }
	| { type: 'start-bar-calibration' }
	| { type: 'calibrate-bar'; calibration: BarCalibration }
	| { type: 'cancel-bar-calibration' }
	| { type: 'recalibrate-bar' }
	| { type: 'discard' };

export type TechniqueReviewSnapshot = TechniqueReviewState;
