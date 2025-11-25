
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/utils/logger';

interface QRScannerComponentProps {
  onScan: (result: string) => void;
  onError: (error: unknown) => void;
}

const QRScannerComponent: React.FC<QRScannerComponentProps> = ({ onScan, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scanningRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        streamRef.current = mediaStream;
        scanningRef.current = true;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startScanning();
        };
      }
    } catch (err) {
      logger.error('Error accessing camera', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      onError(err);
    }
  }, [onError]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const scan = () => {
      if (!scanningRef.current || !video.videoWidth || !video.videoHeight) {
        if (scanningRef.current) {
          requestAnimationFrame(scan);
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        context.getImageData(0, 0, canvas.width, canvas.height);
        // Simple QR code detection simulation
        // In a real implementation, you would use a QR code library here
        // For now, we'll simulate a scan by checking if user clicks on the video
        
        requestAnimationFrame(scan);
      } catch (err) {
        logger.error('Scanning error', err);
        requestAnimationFrame(scan);
      }
    };

    scan();
  };

  // Simulate QR code detection when user clicks on video
  const handleVideoClick = () => {
    // Simulate scanning different equipment QR codes
    const mockQRCodes = ['1', '2', '3', 'equipqr://equipment/1'];
    const randomCode = mockQRCodes[Math.floor(Math.random() * mockQRCodes.length)];
    onScan(randomCode);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full h-64 bg-black rounded-lg cursor-pointer"
        playsInline
        muted
        onClick={handleVideoClick}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Scanning overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-4 border-2 border-white rounded-lg">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
        </div>
      </div>
      
      <div className="absolute bottom-2 left-2 right-2 text-center">
        <p className="text-white text-sm bg-black bg-opacity-50 rounded px-2 py-1">
          Click on video to simulate QR scan
        </p>
      </div>
    </div>
  );
};

export default QRScannerComponent;
