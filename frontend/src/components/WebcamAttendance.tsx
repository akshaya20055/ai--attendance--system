import { Camera, CheckCircle2, Loader2, ScanFace } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { detectFaceFromSource, getFaceBox, getFaceDetector } from '../lib/faceRecognition';

type DetectionState = {
  confidence: number;
  detected: boolean;
  embedding: number[];
  face?: any;
};

type ScanResult = {
  saved?: boolean;
  duplicate?: boolean;
  message?: string;
};

const AUTO_ATTENDANCE_CONFIDENCE = 0.8;
const AUTO_ATTENDANCE_COOLDOWN_MS = 30000;

export function WebcamAttendance({
  onScan,
  matchedStudentName,
  attendanceEnabled = true,
  disabledReason = 'Face attendance is not ready yet.'
}: {
  onScan: (payload: { confidence: number; embedding: number[] }) => Promise<ScanResult | void> | ScanResult | void;
  matchedStudentName?: string;
  attendanceEnabled?: boolean;
  disabledReason?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);
  const autoMarkingRef = useRef(false);
  const lastAutoMarkRef = useRef(0);
  const onScanRef = useRef(onScan);
  const isMountedRef = useRef(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Camera idle');
  const [confidence, setConfidence] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    if (attendanceEnabled) {
      startCamera().catch((err) => console.error('[FaceRecognition] Auto-start camera failed', err));
    }
    return () => {
      isMountedRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [attendanceEnabled]);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!cameraReady || !modelReady) return undefined;
    const timer = window.setInterval(() => {
      detectFace(false).catch((error) => {
        console.error('[FaceRecognition] Detection failed', error);
        setStatus('Face detection failed. Check browser console for details.');
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [cameraReady, modelReady]);

  async function loadDetector() {
    if (!modelReady) setStatus('Loading TensorFlow.js face model...');
    const detector = await getFaceDetector((message) => setStatus(message));
    setModelReady(true);
    console.debug('[FaceRecognition] Detector ready', { mode: detector ? 'tfjs' : 'visual-fallback' });
    if (!detector) setStatus('Face detection fallback ready. Start camera and center your face.');
    return detector;
  }

  function drawFace(face: any, nextConfidence: number) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);

    const box = getFaceBox(face);
    if (!box || box.xMin === undefined || box.yMin === undefined || !box.width || !box.height) return;

    context.strokeStyle = '#2dd4bf';
    context.lineWidth = 4;
    context.strokeRect(box.xMin, box.yMin, box.width, box.height);
    context.fillStyle = 'rgba(15, 23, 42, 0.82)';
    context.fillRect(box.xMin, Math.max(box.yMin - 30, 0), 170, 26);
    context.fillStyle = '#ffffff';
    context.font = '16px Inter, Arial, sans-serif';
    context.fillText(`Face ${Math.round(nextConfidence * 100)}%`, box.xMin + 10, Math.max(box.yMin - 11, 19));
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function startCamera() {
    try {
      setStatus('Requesting camera...');
      await loadDetector();
      if (!isMountedRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      console.debug('[FaceRecognition] Camera permission granted', stream.getVideoTracks()[0]?.getSettings());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setStatus('Camera ready. Looking for face...');
        console.debug('[FaceRecognition] Camera started');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[FaceRecognition] Camera/model startup failed', error);
      const permissionDenied = error instanceof DOMException && error.name === 'NotAllowedError';
      setStatus(permissionDenied ? 'Camera permission denied. Allow webcam access and try again.' : 'Camera or model could not start. Check console logs.');
    }
  }

  async function autoMarkAttendance(result: DetectionState) {
    const now = Date.now();
    if (autoMarkingRef.current || saving) return;
    if (!attendanceEnabled) {
      if (isMountedRef.current) setStatus(disabledReason);
      return;
    }
    if (!result.detected || result.confidence < AUTO_ATTENDANCE_CONFIDENCE || !result.embedding.length) return;
    if (now - lastAutoMarkRef.current < AUTO_ATTENDANCE_COOLDOWN_MS) return;

    autoMarkingRef.current = true;
    lastAutoMarkRef.current = now;
    setSaving(true);
    try {
      console.debug('[FaceRecognition] Face detected', { confidence: result.confidence, autoAttendance: true });
      setStatus('Face detected. Matching enrollment...');
      const scanResult = await onScanRef.current({ confidence: result.confidence, embedding: result.embedding });
      if (!isMountedRef.current) return;
      console.debug('[FaceRecognition] Face matched');
      console.debug('[FaceRecognition] Attendance saved', { confidence: result.confidence, result: scanResult });
      setStatus(scanResult?.message || 'Attendance marked successfully.');
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[FaceRecognition] Auto attendance failed', error);
      lastAutoMarkRef.current = Date.now();
      const statusCode = (error as any)?.response?.status;
      const apiMessage = (error as any)?.response?.data?.message;
      const message = statusCode === 429
        ? (apiMessage || 'Too many attendance attempts. Waiting before trying again.')
        : apiMessage || (error as Error)?.message || 'Face detected, but attendance could not be saved.';
      setStatus(message);
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
        autoMarkingRef.current = false;
      }
    }
  }

  async function detectFace(forceStatus: boolean): Promise<DetectionState> {
    const video = videoRef.current;
    await loadDetector();
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (forceStatus && isMountedRef.current) setStatus('Camera frame is not ready yet.');
      return { confidence: 0, detected: false, embedding: [] };
    }
    if (detectingRef.current) return { confidence, detected: faceDetected, embedding: [] };

    detectingRef.current = true;
    try {
      const result = await detectFaceFromSource(video);
      if (!isMountedRef.current) return { confidence: 0, detected: false, embedding: [] };
      if (!result) {
        clearCanvas();
        setFaceDetected(false);
        setConfidence(0);
        if (forceStatus) setStatus('No face detected. Center your face and try again.');
        return { confidence: 0, detected: false, embedding: [] };
      }

      const { face, confidence: nextConfidence, embedding } = result;
      setConfidence(nextConfidence);
      setFaceDetected(nextConfidence > 0.5 && embedding.length > 0);
      drawFace(face, nextConfidence);
      console.debug('[FaceRecognition] Face detected', { embeddings: embedding.length, source: result.source });
      console.debug('[FaceRecognition] Face confidence', nextConfidence);

      if (nextConfidence > 0.5 && embedding.length) {
        if (!attendanceEnabled) {
          setStatus(disabledReason);
        } else {
          setStatus(`Face detected. Confidence ${Math.round(nextConfidence * 100)}%. Ready to match ${matchedStudentName || 'student'}.`);
        }
        if (attendanceEnabled && nextConfidence >= AUTO_ATTENDANCE_CONFIDENCE) {
          void autoMarkAttendance({ confidence: nextConfidence, detected: true, embedding, face });
        }
      } else if (forceStatus) {
        setStatus(`Face found, but confidence is too low (${Math.round(nextConfidence * 100)}%).`);
      }
      return { confidence: nextConfidence, detected: nextConfidence > 0.5 && embedding.length > 0, embedding, face };
    } finally {
      detectingRef.current = false;
    }
  }

  async function scanFace() {
    if (!cameraReady) {
      setStatus('Start the camera first.');
      return;
    }
    if (!attendanceEnabled) {
      setStatus(disabledReason);
      return;
    }
    setSaving(true);
    try {
      setStatus('Capturing current frame...');
      const result = await detectFace(true);
      if (!isMountedRef.current) return;
      if (!result.detected || result.confidence <= 0.5) {
        setStatus('No face detected with enough confidence. Attendance not marked.');
        return;
      }
      setStatus('Face detected. Matching enrollment...');
      const scanResult = await onScanRef.current({ confidence: result.confidence, embedding: result.embedding });
      if (!isMountedRef.current) return;
      console.debug('[FaceRecognition] Face matched');
      console.debug('[FaceRecognition] Attendance saved', { confidence: result.confidence, result: scanResult });
      setStatus(scanResult?.message || 'Attendance marked successfully.');
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[FaceRecognition] Attendance save failed', error);
      const message = (error as any)?.response?.data?.message || (error as Error)?.message || 'Face detected, but attendance could not be saved.';
      setStatus(message);
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Face Recognition</h2>
          <p className="text-sm text-slate-500">Continuous TensorFlow.js detection with automatic attendance save</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft" onClick={() => startCamera()} disabled={saving}>
            <Camera size={17} /> Camera
          </button>
          <button className="btn-primary" onClick={scanFace} disabled={!cameraReady || !modelReady || !faceDetected || saving || !attendanceEnabled}>
            {saving ? <Loader2 className="animate-spin" size={17} /> : <ScanFace size={17} />}
            Scan
          </button>
        </div>
      </div>
      <div className="relative mt-4 overflow-hidden rounded-lg bg-slate-950">
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm font-semibold ${faceDetected ? 'text-teal-700 dark:text-mint' : 'text-slate-500 dark:text-slate-400'}`}>
          {faceDetected && <CheckCircle2 className="mr-1 inline" size={17} />}
          {status}
        </p>
        <span className="rounded-lg bg-white/70 px-3 py-1 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">
          Confidence: {Math.round(confidence * 100)}%
        </span>
      </div>
    </div>
  );
}
