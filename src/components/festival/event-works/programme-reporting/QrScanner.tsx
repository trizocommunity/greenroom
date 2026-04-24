"use client";

import jsQR from "jsqr";
import { AlertCircle, Camera, CheckCircle, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scanAndReportStudentAction } from "@/features/programmes/actions/programme-reporting.actions";

interface QrScannerProps {
  festivalId: string;
  reportingSessionId: string;
  programmeName: string;
  onScanSuccess?: (result: any) => void;
  onScanError?: (error: any) => void;
}

type ScanStatus = "idle" | "scanning" | "processing" | "success" | "error";

interface ScanResult {
  success: boolean;
  message?: string;
  error?: string;
  reason?: string;
  student?: {
    id: string;
    name: string;
    chestNumber: string | null;
    groupName?: string | null;
    categoryName?: string | null;
  };
  programme?: {
    id: string;
    name?: string;
  };
}

export function QrScanner({
  festivalId,
  reportingSessionId,
  programmeName,
  onScanSuccess,
  onScanError,
}: QrScannerProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>(null);

  // Start camera
  const startCamera = async () => {
    try {
      setStatus("scanning");
      setLastResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        scanningRef.current = true;

        // Wait for video to load, then start scanning
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          scanVideoFrame();
        };
      }
    } catch (error) {
      console.error("Camera access failed:", error);
      toast.error(
        "Camera access denied. Please use file upload or manual entry.",
      );
      setStatus("error");
    }
  };

  // Scan video frame for QR code
  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (scanningRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get frame data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Decode QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      console.log("QR Code detected:", code.data);
      const chestNumber = code.data.trim().toUpperCase();

      if (chestNumber) {
        // Stop scanning
        scanningRef.current = false;
        stopCamera();

        // Process the chest number
        processChestNumber(chestNumber);
        return;
      }
    }

    // Continue scanning
    if (scanningRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  // Scan frame from video
  const scanFrame = async () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (scanningRef.current) {
        requestAnimationFrame(scanFrame);
      }
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Note: In production, you'd use a QR code library like jsQR or html5-qrcode
    // For now, we'll rely on manual input as primary method
    // The camera is shown for visual feedback

    if (scanningRef.current) {
      requestAnimationFrame(scanFrame);
    }
  };

  // Process chest number
  const processChestNumber = async (chestNumber: string) => {
    if (!chestNumber.trim()) {
      toast.error("Please enter a chest number");
      return;
    }

    setStatus("processing");

    try {
      const result = await scanAndReportStudentAction(
        festivalId,
        reportingSessionId,
        chestNumber,
      );

      setLastResult(result);

      if (result.success) {
        setStatus("success");
        toast.success(result.message || "Student reported successfully!");
        onScanSuccess?.(result);

        // Reset after 3 seconds for next scan
        setTimeout(() => {
          setStatus("idle");
          setLastResult(null);
          setManualInput("");
        }, 3000);
      } else {
        setStatus("error");
        toast.error(result.error || "Failed to report student");
        onScanError?.(result);
      }
    } catch (error) {
      console.error("Scan processing failed:", error);
      setStatus("error");
      toast.error("Processing failed. Please try again.");
      onScanError?.({ error: "Processing failed" });
    }
  };

  // Handle manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processChestNumber(manualInput);
  };

  // Handle QR code image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setStatus("processing");

    try {
      // Create image element from uploaded file
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);

      img.onload = async () => {
        try {
          // Create canvas to get image data
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (!ctx) {
            throw new Error("Could not get canvas context");
          }

          // Set canvas size to match image
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image on canvas
          ctx.drawImage(img, 0, 0);

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Decode QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          // Clean up
          URL.revokeObjectURL(imageUrl);

          if (code?.data) {
            console.log("QR Code detected:", code.data);

            // Extract chest number from QR code data
            const chestNumber = code.data.trim().toUpperCase();

            if (chestNumber) {
              toast.success(`QR code detected: ${chestNumber}`);

              // Auto-process the chest number
              await processChestNumber(chestNumber);
            } else {
              toast.error("QR code is empty");
              setStatus("error");
            }
          } else {
            toast.error(
              "No QR code found in image. Please try again or enter manually.",
            );
            setStatus("error");
          }

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (error) {
          console.error("QR decoding error:", error);
          toast.error(
            "Failed to decode QR code. Please enter chest number manually.",
          );
          setStatus("error");
          URL.revokeObjectURL(imageUrl);
        }
      };

      img.onerror = () => {
        toast.error("Failed to load image");
        setStatus("error");
        URL.revokeObjectURL(imageUrl);
      };

      img.src = imageUrl;
    } catch (error) {
      console.error("File upload failed:", error);
      toast.error("Failed to process image");
      setStatus("error");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col lg:flex-row items-start gap-1 lg:items-center justify-between">
          <div className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            QR Code Scanner
          </div>
          <form
            onSubmit={handleManualSubmit}
            className="flex items-center gap-2"
          >
            {/* {uploadMode === "file" && ( */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={status === "processing"}
              className="lg:w-1/2 w-full border rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {/* )} */}
            {status !== "scanning" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                disabled={status === "processing"}
                className="lg:w-1/2"
              >
                <Camera className="h-4 w-4 mr-2" />
                <span className="hidden lg:inline-block">Start Camera</span>
              </Button>
            )}
          </form>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden canvas for QR processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera View */}
        {status === "scanning" && (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/50 rounded-lg">
                <div className="w-full h-full border-2 border-primary animate-pulse rounded-lg" />
              </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 text-center">
              <Badge variant="secondary" className="bg-black/70 text-white">
                Point camera at QR code
              </Badge>
            </div>

            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Success State */}
        {status === "success" && lastResult?.student && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900 dark:text-green-100">
                  {lastResult.message}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Student:</span>{" "}
                    {lastResult.student.name}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Chest #:</span>{" "}
                    {lastResult.student.chestNumber}
                  </p>
                  {lastResult.student.groupName && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Group:</span>{" "}
                      {lastResult.student.groupName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === "error" && lastResult && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-red-900 dark:text-red-100">
                  {lastResult.error}
                </p>

                {lastResult.reason === "NOT_ASSIGNED_TO_PROGRAMME" &&
                  lastResult.student && (
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">Student:</span>{" "}
                        {lastResult.student.name}
                      </p>
                      <p>
                        <span className="font-medium">Chest #:</span>{" "}
                        {lastResult.student.chestNumber}
                      </p>
                      {lastResult.student.groupName && (
                        <p>
                          <span className="font-medium">Group:</span>{" "}
                          {lastResult.student.groupName}
                        </p>
                      )}
                      <p className="text-red-600 dark:text-red-400 font-medium mt-2">
                        Not assigned to: {programmeName}
                      </p>
                    </div>
                  )}

                {lastResult.reason === "STUDENT_NOT_FOUND" && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please verify the chest number and try again.
                  </p>
                )}

                {lastResult.reason === "ALREADY_REPORTED" && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    This student has already been marked as present.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {status === "processing" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Processing...</span>
          </div>
        )}

        {/* Manual Entry Form */}
        {status === "scanning" && (
          <p className="text-xs text-muted-foreground text-center">
            Point camera at QR code - auto-detecting...
          </p>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">How it works:</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Student shows their QR code (contains chest number)</li>
            <li>Upload QR image, scan with camera, or enter manually</li>
            <li>System auto-detects chest number from QR code</li>
            <li>Validates student assignment to this programme</li>
            <li>If valid, marks student as present</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
