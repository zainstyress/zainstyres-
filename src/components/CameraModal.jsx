import React, { useEffect, useRef, useState } from 'react';
import { Camera, Repeat, X, Check } from 'lucide-react';

export default function CameraModal({ isOpen, onClose, onPhotosCapture, remainingSlots = 10 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState('');
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support camera access.');
      return;
    }

    try {
      setError('');
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('Camera access denied. Please allow camera permission in your browser settings and try again.');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    startStream();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  const handleClose = () => {
    capturedPhotos.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    stopStream();
    setCapturedPhotos([]);
    setError('');
    setFacingMode('environment');
    onClose();
  };

  const capturePhoto = () => {
    if (capturedPhotos.length >= remainingSlots) {
      setError('Maximum photos reached.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(file);
      setCapturedPhotos((current) => [...current, { file, previewUrl }]);
    }, 'image/jpeg', 0.8);
  };

  const removeCapturedPhoto = (indexToRemove) => {
    setCapturedPhotos((current) => {
      const target = current[indexToRemove];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleDone = () => {
    onPhotosCapture(capturedPhotos.map((item) => item.file));
    handleClose();
  };

  if (!isOpen) return null;

  const photosTaken = capturedPhotos.length;
  const limitReached = photosTaken >= remainingSlots;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-stretch bg-black/80 backdrop-blur-sm p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#09090b] sm:h-[80vh] sm:max-h-[80vh] sm:max-w-[600px] sm:rounded-[28px] sm:border sm:border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <h3 className="text-lg font-black text-white">Take Photo</h3>
            <p className="text-xs text-zinc-500">Use your camera to capture a product image</p>
          </div>
          <button onClick={handleClose} className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex h-full flex-1 flex-col">
          <div className="relative basis-[65%] bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {error && (
            <div className="absolute left-4 right-4 top-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 sm:left-6 sm:right-6">
              {error}
            </div>
          )}

          <div className="flex basis-[15%] items-center justify-center border-y border-white/10 bg-[#0f0f12] px-4 py-3 text-center text-sm font-semibold text-zinc-300 sm:px-6">
            <span>{photosTaken} photos taken</span>
          </div>

          <div className="basis-[20%] overflow-hidden border-b border-white/10 bg-[#0f0f12] px-4 py-3 sm:px-6">
            {capturedPhotos.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-zinc-500">
                No photos yet — tap Capture to take one
              </div>
            ) : (
              <div className="flex h-full gap-3 overflow-x-auto pb-1">
                {capturedPhotos.map((photo, index) => (
                  <div key={photo.previewUrl} className="relative h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
                    <img src={photo.previewUrl} alt={`Captured ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeCapturedPhoto(index)} className="absolute right-0 top-0 rounded-bl-lg bg-black/70 p-1 text-white hover:bg-black">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#0f0f12] p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={capturePhoto}
                disabled={limitReached}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera size={16} /> Capture {photosTaken > 0 ? `(${photosTaken})` : ''}
              </button>
              <button onClick={() => setFacingMode((current) => (current === 'environment' ? 'user' : 'environment'))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">
                <Repeat size={16} /> Switch Camera
              </button>
              <button onClick={handleDone} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400">
                <Check size={16} /> Done
              </button>
            </div>
            {limitReached && <p className="mt-3 text-center text-xs font-semibold text-amber-300">Maximum photos reached</p>}
            <button onClick={handleClose} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">
              <X size={16} /> Close / Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
