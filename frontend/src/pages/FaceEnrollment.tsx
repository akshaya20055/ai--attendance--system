import { Camera, CheckCircle2, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { captureFaceImage, detectFaceFromSource, getFaceDetector } from '../lib/faceRecognition';

type EnrollmentSample = {
  id: string;
  label: string;
  confidence: number;
  embedding: number[];
  image: string;
};

export function FaceEnrollment() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [samples, setSamples] = useState<EnrollmentSample[]>([]);
  const [status, setStatus] = useState('Add 5 face samples to enroll.');
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    api.get('/face/enrollment').then((res) => {
      if (isMountedRef.current) {
        setSavedCount(res.data.count || 0);
      }
      console.debug('[FaceEnrollment] Existing enrollment loaded', res.data);
    }).catch((error) => {
      console.error('[FaceEnrollment] Existing enrollment load failed', error);
    });
    return () => {
      isMountedRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setLoading(true);
    try {
      setStatus('Loading face model...');
      console.debug('[FaceEnrollment] Loading model before camera start');
      await getFaceDetector((message) => setStatus(message));
      if (!isMountedRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      console.debug('[FaceEnrollment] Camera permission granted', stream.getVideoTracks()[0]?.getSettings());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setStatus('Camera ready. Capture 5 clear face samples.');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[FaceEnrollment] Camera/model failed', error);
      const permissionDenied = error instanceof DOMException && error.name === 'NotAllowedError';
      setStatus(permissionDenied ? 'Camera permission denied. Allow webcam access and try again.' : 'Camera or model could not start. Check console logs.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

  async function addSample(source: HTMLVideoElement | HTMLImageElement, label: string) {
    setLoading(true);
    try {
      const result = await detectFaceFromSource(source);
      if (!result || result.confidence <= 0.5 || !result.embedding.length) {
        console.warn('[FaceEnrollment] No usable face detected', result);
        setStatus('Face not detected. Use a clear, front-facing image with enough light.');
        return;
      }
      const image = captureFaceImage(source);
      if (!image.startsWith('data:image/')) {
        throw new Error('Captured image data is invalid');
      }
      setSamples((items) => {
        const nextSamples = [
          ...items,
          {
            id: crypto.randomUUID(),
            label,
            confidence: result.confidence,
            embedding: result.embedding,
            image
          }
        ].slice(0, 10);
        setStatus(`Face detected. Sample ${nextSamples.length} added with ${Math.round(result.confidence * 100)}% confidence.`);
        return nextSamples;
      });
      console.debug('[FaceEnrollment] Face embedding generated', {
        confidence: result.confidence,
        dimensions: result.embedding.length,
        detector: result.source,
        imageBytes: image.length
      });
    } catch (error) {
      console.error('[FaceEnrollment] Sample capture failed', error);
      setStatus('Face sample could not be processed. Check browser console for details.');
    } finally {
      setLoading(false);
    }
  }

  async function captureSample() {
    if (!videoRef.current) return;
    await addSample(videoRef.current, `Capture ${samples.length + 1}`);
  }

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 10 - samples.length);
    for (const file of files) {
      const image = new Image();
      image.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      await addSample(image, file.name);
      URL.revokeObjectURL(image.src);
    }
    event.target.value = '';
  }

  async function saveEnrollment() {
    if (samples.length < 5) {
      setStatus('Please add 5 face samples before saving.');
      return;
    }
    setLoading(true);
    try {
      console.debug('[FaceEnrollment] Saving enrollment', { samples: samples.length, dimensions: samples.map((sample) => sample.embedding.length) });
      const res = await api.post('/face/enrollment', {
        embeddings: samples.map((sample) => sample.embedding),
        images: samples.map((sample) => sample.image)
      });
      setSavedCount(res.data.count || samples.length);
      setStatus('Enrollment successful. Face samples saved.');
      window.dispatchEvent(new CustomEvent('face-enrollment:updated', { detail: { count: res.data.count || samples.length } }));
      console.debug('[FaceEnrollment] Enrollment saved', {
        userId: res.data.userId,
        studentId: res.data.studentId,
        count: res.data.count,
        imageCount: res.data.imageCount
      });
    } catch (error: any) {
      console.error('[FaceEnrollment] Enrollment save failed', error);
      setStatus(error.response?.data?.message || 'Face enrollment could not be saved.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Face Enrollment</h1>
        <p className="text-slate-500">Capture or upload 5 to 10 face images to enable matched face attendance.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Capture Face Samples</h2>
              <p className="text-sm text-slate-500">Use clear front-facing images with one face visible.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-soft" onClick={startCamera} disabled={loading}>
                <Camera size={17} /> Camera
              </button>
              <button className="btn-primary" onClick={captureSample} disabled={!cameraReady || loading || samples.length >= 10}>
                {loading ? <Loader2 className="animate-spin" size={17} /> : <Camera size={17} />}
                Capture
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg bg-slate-950">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{status}</p>
        </section>

        <section className="card">
          <h2 className="text-lg font-black">Enrollment Samples</h2>
          <p className="mt-1 text-sm text-slate-500">Saved enrollment count: {savedCount}</p>
          <label className="btn-soft mt-4 w-full cursor-pointer">
            <ImagePlus size={17} /> Upload Face Images
            <input className="hidden" type="file" accept="image/*" multiple onChange={uploadImages} />
          </label>
          <div className="mt-4 space-y-2">
            {samples.map((sample, index) => (
              <div key={sample.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 p-3 text-sm dark:bg-white/5">
                <span className="font-bold">{index + 1}. {sample.label}</span>
                <span>{Math.round(sample.confidence * 100)}%</span>
                <button className="text-rose-600" onClick={() => setSamples((items) => items.filter((item) => item.id !== sample.id))} aria-label={`Remove ${sample.label}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-4 w-full" onClick={saveEnrollment} disabled={loading || samples.length < 5}>
            {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            Save Enrollment
          </button>
          {samples.length >= 5 && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-teal-700 dark:text-mint"><CheckCircle2 size={17} /> Ready to save face embeddings.</p>}
        </section>
      </div>
    </div>
  );
}
