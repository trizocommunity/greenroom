"use client";

import {
  AlertCircle,
  Camera,
  CheckCircle,
  FileImage,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scanAndReportStudentAction } from "@/server/actions/programme-reporting.actions";

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
  const [uploadMode, setUploadMode] = useState<"camera" | "file">("file"); // Default to file upload
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        // Start scanning loop
        requestAnimationFrame(scanFrame);
      }
    } catch (error) {
      console.error("Camera access failed:", error);
      toast.error("Camera access denied. Please use manual entry.");
      setStatus("error");
    }
  };

  // Stop camera
  const stopCamera = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  };

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
          setStatus("scanning");
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
      // In production, you would use a QR code decoding library here
      // For now, we'll prompt user to enter chest number from the QR image
      toast.info(
        "QR decoding coming soon! Please enter the chest number manually.",
        {
          duration: 5000,
        },
      );

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setStatus("idle");
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
  }, []);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          QR Code Scanner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Scan student QR codes or enter chest number manually
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.toUpperCase())}
              placeholder="Enter chest number (e.g., 01CS)"
              disabled={status === "processing"}
              className="flex-1 px-3 py-2 border rounded-md text-sm uppercase tracking-wider font-mono"
            />
            <Button
              type="submit"
              disabled={status === "processing" || !manualInput.trim()}
            >
              {status === "processing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Report"
              )}
            </Button>
          </div>

          {/* Upload Mode Toggle */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Button
              type="button"
              variant={uploadMode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadMode("file")}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload QR Image
            </Button>
            <Button
              type="button"
              variant={uploadMode === "camera" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadMode("camera")}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Use Camera
            </Button>
          </div>

          {/* File Upload Section */}
          {uploadMode === "file" && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={status === "processing"}
                className="w-full px-3 py-2 border rounded-md text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-xs text-muted-foreground">
                Upload a photo of the student's QR code
              </p>
            </div>
          )}

          {/* Camera Section */}
          {uploadMode === "camera" && status !== "scanning" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startCamera}
              disabled={status === "processing"}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          )}

          {status === "scanning" && (
            <p className="text-xs text-muted-foreground text-center">
              Camera active - use manual entry for now
            </p>
          )}
        </form>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">How it works:</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Student shows their QR code (contains chest number)</li>
            <li>Upload QR image, use camera, or enter chest number manually</li>
            <li>System validates student assignment to this programme</li>
            <li>If valid, marks student as present</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
