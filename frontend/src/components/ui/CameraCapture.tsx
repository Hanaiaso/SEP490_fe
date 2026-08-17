import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, Upload, X, AlertTriangle } from 'lucide-react';

interface CameraCaptureProps {
  /** Gọi khi người dùng đã chọn xong 1 ảnh (từ camera hoặc từ file, xem fallback bên dưới). */
  onCapture: (file: File) => void;
  /** Nhãn nút mở camera. */
  label?: string;
}

type Mode = 'idle' | 'opening' | 'camera' | 'preview' | 'unavailable';

/**
 * Chụp ảnh trực tiếp từ camera thiết bị (getUserMedia + <video> preview + canvas snapshot) — không
 * phải file picker thường. Luôn có lối thoát "Chọn ảnh từ thiết bị" nếu camera bị từ chối quyền hoặc
 * máy không có camera (desktop kho không webcam), để không bao giờ tắc luồng nghiệp vụ.
 */
export default function CameraCapture({ onCapture, label = 'Chụp ảnh' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('unavailable');
      return;
    }
    setMode('opening');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setMode('camera');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      // Từ chối quyền hoặc không có camera -> không được để tắc luồng, chuyển sang chọn file thường.
      setMode('unavailable');
    }
  };

  const closeCamera = () => {
    stopStream();
    setMode('idle');
  };

  const takeShot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedFile(file);
      setPreviewUrl(URL.createObjectURL(blob));
      setMode('preview');
      stopStream();
    }, 'image/jpeg', 0.9);
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedFile(null);
    openCamera();
  };

  const confirmUse = () => {
    if (capturedFile) onCapture(capturedFile);
    setMode('idle');
    setCapturedFile(null);
    setPreviewUrl(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      onCapture(file);
      setMode('idle');
    }
  };

  if (mode === 'idle' || mode === 'opening') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCamera}
          disabled={mode === 'opening'}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          <Camera className="w-3.5 h-3.5" /> {mode === 'opening' ? 'Đang mở camera...' : label}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-600 rounded border border-gray-200 hover:bg-gray-50"
        >
          <Upload className="w-3.5 h-3.5" /> Chọn ảnh từ thiết bị
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
      </div>
    );
  }

  if (mode === 'unavailable') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Không thể mở camera (thiết bị không hỗ trợ hoặc quyền bị từ chối). Vui lòng chọn ảnh từ thiết bị.
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700 w-fit"
        >
          <Upload className="w-3.5 h-3.5" /> Chọn ảnh từ thiết bị
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative rounded overflow-hidden border border-gray-200 bg-black">
          <video ref={videoRef} className="w-full max-h-64 object-contain" muted playsInline />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={takeShot}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700"
          >
            <Camera className="w-3.5 h-3.5" /> Chụp
          </button>
          <button
            type="button"
            onClick={closeCamera}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-600 rounded border border-gray-200 hover:bg-gray-50"
          >
            <X className="w-3.5 h-3.5" /> Hủy
          </button>
        </div>
      </div>
    );
  }

  // mode === 'preview'
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded overflow-hidden border border-gray-200">
        {previewUrl && <img src={previewUrl} alt="Ảnh vừa chụp" className="w-full max-h-64 object-contain bg-gray-50" />}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={confirmUse}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700"
        >
          <Check className="w-3.5 h-3.5" /> Dùng ảnh này
        </button>
        <button
          type="button"
          onClick={retake}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-600 rounded border border-gray-200 hover:bg-gray-50"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Chụp lại
        </button>
      </div>
    </div>
  );
}
