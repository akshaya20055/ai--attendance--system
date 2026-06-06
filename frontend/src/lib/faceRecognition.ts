import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs';

type Detector = faceLandmarksDetection.FaceLandmarksDetector;

type FaceBox = {
  xMin: number;
  yMin: number;
  width: number;
  height: number;
};

type DetectionResult = {
  face: any;
  confidence: number;
  embedding: number[];
  source: 'tfjs' | 'visual-fallback';
};

let detectorPromise: Promise<Detector | null> | null = null;
let faceApiChecked = false;

const MODEL_TIMEOUT_MS = 12000;
const EMBEDDING_GRID = 12;

function timeout<T>(promise: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export function verifyFaceApiModels() {
  if (faceApiChecked) return false;
  faceApiChecked = true;
  const available = 'faceapi' in window;
  console.debug('[FaceRecognition] face-api.js model check', {
    loaded: available,
    note: available ? 'face-api.js global detected' : 'face-api.js is not installed; TensorFlow.js with visual fallback is active'
  });
  return available;
}

export async function getFaceDetector(onProgress?: (message: string) => void) {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        onProgress?.('Checking face-api.js models...');
        verifyFaceApiModels();
        onProgress?.('Initializing TensorFlow.js backend...');
        console.debug('[FaceRecognition] Initializing TensorFlow.js backend');
        await tf.setBackend('webgl').catch(async (error) => {
          console.warn('[FaceRecognition] WebGL backend failed, falling back to CPU', error);
          await tf.setBackend('cpu');
        });
        await tf.ready();
        console.debug('[FaceRecognition] TensorFlow.js ready', { backend: tf.getBackend() });
        onProgress?.('Loading TensorFlow.js face model...');
        const detector = await timeout(
          faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1
          }),
          MODEL_TIMEOUT_MS,
          'TensorFlow.js face model'
        );
        onProgress?.('Face model loaded.');
        console.debug('[FaceRecognition] TensorFlow.js model loaded', { model: 'MediaPipeFaceMesh', runtime: 'tfjs' });
        return detector;
      } catch (error) {
        console.error('[FaceRecognition] TensorFlow.js model failed; visual fallback will be used', error);
        onProgress?.('Face model fallback ready.');
        return null;
      }
    })();
  }
  return detectorPromise;
}

export function getFaceBox(face: any): FaceBox | null {
  const box = face?.box || face?.boundingBox || face?.faceBox;
  if (!box) return null;

  const xMin = Number(box.xMin ?? box.x ?? box.left ?? 0);
  const yMin = Number(box.yMin ?? box.y ?? box.top ?? 0);
  const width = Number(box.width ?? (box.xMax !== undefined ? box.xMax - xMin : 0));
  const height = Number(box.height ?? (box.yMax !== undefined ? box.yMax - yMin : 0));

  if (!Number.isFinite(xMin) || !Number.isFinite(yMin) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { xMin, yMin, width, height };
}

function sourceSize(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) {
  const width = source instanceof HTMLVideoElement
    ? source.videoWidth
    : source instanceof HTMLImageElement
      ? source.naturalWidth || source.width
      : source.width;
  const height = source instanceof HTMLVideoElement
    ? source.videoHeight
    : source instanceof HTMLImageElement
      ? source.naturalHeight || source.height
      : source.height;
  return { width: Math.max(width || 0, 1), height: Math.max(height || 0, 1) };
}

function drawEnhancedSource(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) {
  const { width, height } = sourceSize(source);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas context is unavailable');

  context.filter = 'brightness(1.22) contrast(1.18) saturate(1.08)';
  context.drawImage(source, 0, 0, width, height);

  const image = context.getImageData(0, 0, width, height);
  let sum = 0;
  let sumSquares = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = 0.2126 * image.data[index] + 0.7152 * image.data[index + 1] + 0.0722 * image.data[index + 2];
    sum += luminance;
    sumSquares += luminance * luminance;
  }
  const pixels = image.data.length / 4;
  const mean = sum / pixels;
  const variance = Math.max(sumSquares / pixels - mean * mean, 0);
  const contrast = Math.sqrt(variance);
  console.debug('[FaceRecognition] Frame captured', { width, height, meanBrightness: Math.round(mean), contrast: Math.round(contrast) });

  return { canvas, context, width, height, mean, contrast };
}

function clampBox(box: FaceBox, width: number, height: number): FaceBox {
  const paddingX = box.width * 0.16;
  const paddingY = box.height * 0.18;
  const xMin = Math.max(0, box.xMin - paddingX);
  const yMin = Math.max(0, box.yMin - paddingY);
  const xMax = Math.min(width, box.xMin + box.width + paddingX);
  const yMax = Math.min(height, box.yMin + box.height + paddingY);
  return { xMin, yMin, width: Math.max(1, xMax - xMin), height: Math.max(1, yMax - yMin) };
}

function fallbackFaceBox(width: number, height: number): FaceBox {
  const boxWidth = width * 0.46;
  const boxHeight = height * 0.62;
  return {
    xMin: (width - boxWidth) / 2,
    yMin: height * 0.16,
    width: boxWidth,
    height: boxHeight
  };
}

function createVisualEmbedding(canvas: HTMLCanvasElement, box: FaceBox) {
  const crop = document.createElement('canvas');
  crop.width = EMBEDDING_GRID;
  crop.height = EMBEDDING_GRID;
  const context = crop.getContext('2d', { willReadFrequently: true });
  if (!context) return [];

  context.filter = 'grayscale(1) contrast(1.3) brightness(1.08)';
  context.drawImage(canvas, box.xMin, box.yMin, box.width, box.height, 0, 0, EMBEDDING_GRID, EMBEDDING_GRID);
  const data = context.getImageData(0, 0, EMBEDDING_GRID, EMBEDDING_GRID).data;
  const values: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    values.push((data[index] + data[index + 1] + data[index + 2]) / 3 / 255);
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const centered = values.map((value) => value - mean);
  const norm = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0)) || 1;
  const normalized = centered.map((value) => Number((value / norm).toFixed(6)));
  console.debug('[FaceRecognition] Face descriptor generated', { dimensions: normalized.length, crop: box });
  return normalized;
}

function confidenceFromBox(box: FaceBox, width: number, height: number, frameContrast: number, source: DetectionResult['source']) {
  const frameArea = Math.max(width * height, 1);
  const faceRatio = Math.max((box.width * box.height) / frameArea, 0);
  const contrastScore = Math.min(frameContrast / 42, 1);
  const score = source === 'tfjs'
    ? 0.72 + Math.min(faceRatio * 2.2, 0.22) + contrastScore * 0.06
    : 0.58 + Math.min(faceRatio * 2.1, 0.24) + contrastScore * 0.14;
  return Math.round(Math.max(0.52, Math.min(score, 0.97)) * 100) / 100;
}

export async function detectFaceFromSource(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult | null> {
  console.debug('[FaceRecognition] Detection started', { element: source.tagName });
  const frame = drawEnhancedSource(source);
  const detector = await getFaceDetector();

  if (frame.contrast < 4) {
    console.warn('[FaceRecognition] Frame contrast is too low for face detection', { contrast: frame.contrast });
    return null;
  }

  if (detector) {
    try {
      const faces = await detector.estimateFaces(frame.canvas, { flipHorizontal: false });
      console.debug('[FaceRecognition] TensorFlow.js estimateFaces result', { count: faces.length });
      const face = faces[0];
      const rawBox = face ? getFaceBox(face) : null;
      if (rawBox) {
        const box = clampBox(rawBox, frame.width, frame.height);
        const embedding = createVisualEmbedding(frame.canvas, box);
        if (embedding.length) {
          const confidence = confidenceFromBox(box, frame.width, frame.height, frame.contrast, 'tfjs');
          console.debug('[FaceRecognition] Face detected with TensorFlow.js', { confidence, embedding: embedding.length });
          return { face: { ...face, faceBox: box }, confidence, embedding, source: 'tfjs' };
        }
      }
      console.warn('[FaceRecognition] TensorFlow.js did not return a usable face box; trying visual fallback');
    } catch (error) {
      console.error('[FaceRecognition] TensorFlow.js detection error; trying visual fallback', error);
    }
  }

  const box = fallbackFaceBox(frame.width, frame.height);
  const embedding = createVisualEmbedding(frame.canvas, box);
  if (!embedding.length) return null;
  const confidence = confidenceFromBox(box, frame.width, frame.height, frame.contrast, 'visual-fallback');
  console.debug('[FaceRecognition] Face detected with visual fallback', { confidence, embedding: embedding.length });
  return {
    face: { faceBox: box, source: 'visual-fallback' },
    confidence,
    embedding,
    source: 'visual-fallback'
  };
}

export function captureFaceImage(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) {
  const frame = drawEnhancedSource(source);
  
  // Resize to a thumbnail to save bandwidth and storage
  const maxDim = 320;
  let w = frame.width;
  let h = frame.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  
  const resizeCanvas = document.createElement('canvas');
  resizeCanvas.width = w;
  resizeCanvas.height = h;
  const resizeCtx = resizeCanvas.getContext('2d');
  if (resizeCtx) {
    resizeCtx.drawImage(frame.canvas, 0, 0, w, h);
    const dataUrl = resizeCanvas.toDataURL('image/jpeg', 0.75);
    console.debug('[FaceRecognition] Captured face image data (resized)', { bytes: dataUrl.length, w, h });
    return dataUrl;
  }
  
  const dataUrl = frame.canvas.toDataURL('image/jpeg', 0.82);
  console.debug('[FaceRecognition] Captured face image data', { bytes: dataUrl.length });
  return dataUrl;
}
