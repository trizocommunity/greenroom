"use client";

import jsQR from "jsqr";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Loader2,
  Maximize2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";
import { scanAndReportStudentAction } from "@/features/programmes/actions/programme-reporting.actions";
import { QuickAddScanForm } from "./QuickAddScanForm";

interface QrScannerProps {
  festivalId: string;
  reportingSessionId: string;
  programmeName: string;
  onScanSuccess?: (result: unknown) => void;
  onScanError?: (error: unknown) => void;
  /** Tighter layout, no footer help — use inside reporting panel */
  variant?: "default" | "embedded";
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

function isSecureCameraContext(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

type CameraGateReason =
  | "denied"
  | "insecure"
  | "unsupported"
  | "nodevice"
  | "busy"
  | "constraint"
  | "other";

function mapGetUserMediaError(error: unknown): CameraGateReason {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "nodevice";
  if (name === "NotReadableError" || name === "TrackStartError") return "busy";
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError")
    return "constraint";
  return "other";
}

function cameraGateCopy(reason: CameraGateReason): string {
  switch (reason) {
    case "denied":
      return "Camera is blocked for this page. Use chest number or photo upload, or allow camera in your browser settings for this site.";
    case "insecure":
      return "Camera needs a secure (HTTPS) connection. Use chest number or photo upload.";
    case "unsupported":
      return "This browser does not expose the camera here. Use chest number or photo upload.";
    case "nodevice":
      return "No usable camera was found. Use chest number or photo upload.";
    case "busy":
      return "The camera may be in use elsewhere. Close other tabs or apps, or use upload / manual entry.";
    case "constraint":
      return "This device could not open the camera with the requested settings. Use upload or manual entry.";
    default:
      return "Camera could not start. Use chest number or photo upload.";
  }
}

function isPermissionDenied(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")
  );
}

/**
 * Single getUserMedia call: a second call after await often loses user activation
 * and Chrome may reject with NotAllowedError even when the user would allow.
 */
async function getVideoStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
  });
}

export function QrScanner({
  festivalId,
  reportingSessionId,
  programmeName,
  onScanSuccess,
  onScanError,
  variant = "default",
}: QrScannerProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scannerSurfaceRef = useRef<HTMLDivElement | null>(null);
  const cameraSessionRef = useRef(0);
  const [cameraGate, setCameraGate] = useState<CameraGateReason | null>(null);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [simpleCameraHint, setSimpleCameraHint] = useState(false);

  useEffect(() => {
    let perm: PermissionStatus | undefined;
    let onChange: (() => void) | undefined;

    void (async () => {
      try {
        perm = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        onChange = () => {
          if (perm?.state === "denied") setCameraGate("denied");
          if (perm?.state === "granted") setCameraGate(null);
        };
        perm.addEventListener("change", onChange);
        if (perm.state === "denied") setCameraGate("denied");
      } catch {
        /* Permissions API may not support camera (e.g. some Safari) */
      }
    })();

    return () => {
      if (perm && onChange) perm.removeEventListener("change", onChange);
    };
  }, []);

  const startCamera = async (constraints: "default" | "any" = "default") => {
    setCameraGate(null);
    setSimpleCameraHint(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraGate("unsupported");
      return;
    }

    if (!isSecureCameraContext()) {
      setCameraGate("insecure");
      return;
    }

    const session = ++cameraSessionRef.current;

    // Commit the <video> mount synchronously so videoRef is set after await
    // getUserMedia() (fast grant paths used to leave ref null).
    try {
      flushSync(() => {
        setLastResult(null);
        setStatus("scanning");
      });
    } catch {
      /* flushSync can throw if nested in another update; fall back */
      setLastResult(null);
      setStatus("scanning");
    }

    try {
      const stream =
        constraints === "any"
          ? await navigator.mediaDevices.getUserMedia({ video: true })
          : await getVideoStream();

      if (session !== cameraSessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      setCameraGate(null);

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        console.error("QrScanner: video element missing after mount");
        setStatus("idle");
        setCameraGate("other");
        return;
      }

      video.srcObject = stream;
      streamRef.current = stream;
      scanningRef.current = true;

      video.onloadedmetadata = () => {
        void video
          .play()
          .then(() => {
            scanVideoFrame();
          })
          .catch((playErr) => {
            if (!isPermissionDenied(playErr)) {
              console.error("Video play failed:", playErr);
            }
            scanningRef.current = false;
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            video.onloadedmetadata = null;
            video.srcObject = null;
            setStatus("idle");
            setCameraGate("other");
          });
      };
    } catch (error) {
      if (session !== cameraSessionRef.current) return;
      const mapped = mapGetUserMediaError(error);
      const denied = isPermissionDenied(error);
      const canRetrySimple =
        !denied &&
        constraints === "default" &&
        (mapped === "constraint" || mapped === "nodevice");

      if (canRetrySimple) {
        setSimpleCameraHint(true);
      }

      if (!denied) {
        console.error("Camera access failed:", error);
      }

      setLastResult(null);
      setStatus("idle");
      setCameraGate(denied || !canRetrySimple ? mapped : null);
    }
  };

  const enterScannerFullscreen = useCallback(() => {
    const surface = scannerSurfaceRef.current;
    if (!surface || !document.fullscreenEnabled || document.fullscreenElement) {
      return;
    }
    void surface.requestFullscreen().catch(() => {});
  }, []);

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      const chestNumber = code.data.trim().toUpperCase();

      if (chestNumber) {
        scanningRef.current = false;
        stopCamera();
        void processChestNumber(chestNumber);
        return;
      }
    }

    if (scanningRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    scanningRef.current = false;
    const surface = scannerSurfaceRef.current;
    if (
      surface &&
      document.fullscreenElement &&
      document.fullscreenElement === surface
    ) {
      void document.exitFullscreen().catch(() => {});
    }
    if (animationFrameRef.current != null) {
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
      videoRef.current.onloadedmetadata = null;
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void processChestNumber(manualInput.trim().toUpperCase());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setStatus("processing");

    try {
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);

      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (!ctx) {
            throw new Error("Could not get canvas context");
          }

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          URL.revokeObjectURL(imageUrl);

          if (code?.data) {
            const chestNumber = code.data.trim().toUpperCase();

            if (chestNumber) {
              toast.success(`QR code detected: ${chestNumber}`);
              await processChestNumber(chestNumber);
            } else {
              toast.error("QR code is empty");
              setStatus("error");
            }
          } else {
            toast.error(
              "No QR code found in image. Try another photo or enter the chest number.",
            );
            setStatus("error");
          }

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (err) {
          console.error("QR decoding error:", err);
          toast.error(
            "Failed to decode QR code. Enter the chest number manually.",
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const embedded = variant === "embedded";
  const sectionGap = embedded ? "gap-3" : "gap-5";
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

  const fieldStatus =
    status === "scanning"
      ? "scanning"
      : status === "processing"
        ? "processing"
        : "idle";

  return (
    <div className={cn(embedded ? "space-y-2" : "space-y-5")}>
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {embedded ? (
        <QuickAddScanForm
          manualInput={manualInput}
          onManualInputChange={setManualInput}
          onManualSubmit={handleManualSubmit}
          fileInputRef={fileInputRef}
          onFileChange={handleFileUpload}
          onOpenCamera={() => void startCamera()}
          onOpenCameraFallback={() => void startCamera("any")}
          showCameraFallback={simpleCameraHint}
          fieldStatus={fieldStatus}
        />
      ) : (
        <div className={cn("grid", sectionGap)}>
          <div className="space-y-2">
            <p className={labelClass}>Chest number</p>
            <form
              onSubmit={handleManualSubmit}
              className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-stretch"
            >
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                placeholder="e.g. A12"
                autoComplete="off"
                disabled={status === "processing" || status === "scanning"}
                className="h-10 min-w-0 flex-1 font-mono text-base sm:text-sm"
              />
              <Button
                type="submit"
                disabled={
                  status === "processing" ||
                  status === "scanning" ||
                  !manualInput.trim()
                }
                className="h-10 shrink-0 px-5 font-semibold min-[400px]:w-auto w-full"
              >
                Add to roster
              </Button>
            </form>
          </div>

          <div className="h-px bg-border/80" aria-hidden />

          <div className="space-y-2">
            <p className={labelClass}>QR in a photo</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <label
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "h-10 cursor-pointer gap-2 px-4",
                  status === "processing" && "pointer-events-none opacity-50",
                )}
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>Upload image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={status === "processing"}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-muted-foreground leading-snug">
                PNG or JPG — we read the QR code from the picture.
              </p>
            </div>
          </div>

          <div className="h-px bg-border/80" aria-hidden />

          <div className="space-y-2">
            <p className={labelClass}>Live camera</p>
            {status !== "scanning" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void startCamera()}
                  disabled={status === "processing"}
                  className="h-10 w-full gap-2 border-2 font-medium sm:w-auto sm:min-w-[10rem]"
                >
                  <Camera className="h-4 w-4" />
                  Open camera
                </Button>
                {simpleCameraHint ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void startCamera("any")}
                    disabled={status === "processing"}
                    className="h-10 w-full font-medium sm:w-auto"
                  >
                    Use any camera (fallback)
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Camera active below.
              </p>
            )}
          </div>
        </div>
      )}

      {cameraGate ? (
        <div
          role="status"
          className={cn(
            "flex rounded-md border border-amber-400/90 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500/70 dark:bg-amber-950/95 dark:text-amber-50",
            embedded
              ? "gap-2 px-2.5 py-2 text-xs"
              : "gap-3 rounded-lg px-3 py-3 text-sm",
          )}
        >
          <AlertCircle
            className={cn(
              "shrink-0 text-amber-700 dark:text-amber-300",
              embedded ? "h-4 w-4 mt-0.5" : "h-5 w-5",
            )}
            aria-hidden
          />
          <p className="min-w-0 leading-snug">{cameraGateCopy(cameraGate)}</p>
        </div>
      ) : null}

      {status === "scanning" && (
        <div
          ref={scannerSurfaceRef}
          className={cn(
            "relative aspect-video rounded-lg bg-black",
            embedded ? "max-h-[min(32vh,220px)]" : "max-h-[min(50vh,360px)]",
            "[&:fullscreen]:aspect-auto [&:fullscreen]:h-full [&:fullscreen]:max-h-none [&:fullscreen]:min-h-[100dvh] [&:fullscreen]:w-full",
          )}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            className="h-full w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "rounded-lg border-2 border-white/50",
                embedded
                  ? "h-36 w-36 sm:h-44 sm:w-44"
                  : "h-48 w-48 sm:h-64 sm:w-64",
              )}
            >
              <div className="h-full w-full animate-pulse rounded-lg border-2 border-primary" />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center">
            <Badge variant="secondary" className="bg-black/70 text-white">
              Point at QR code
            </Badge>
          </div>

          <div className="absolute right-2 top-2 flex gap-1">
            {fullscreenAvailable ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="bg-black/70 text-white hover:bg-black/85"
                onClick={enterScannerFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
                <span className="sr-only">Full screen</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close camera</span>
            </Button>
          </div>
        </div>
      )}

      {status === "scanning" && (
        <p
          className={cn(
            "text-center text-muted-foreground",
            embedded ? "text-[11px] leading-tight" : "text-xs",
          )}
        >
          {embedded
            ? "Hold QR steady — or close and use Photo / #."
            : "Scanning… hold the QR steady, or close the camera and use upload / manual entry."}
        </p>
      )}

      {status === "success" && lastResult?.student && (
        <div
          className={cn(
            "space-y-2 rounded-md border border-green-500/30 bg-green-500/10",
            embedded ? "p-2.5" : "space-y-3 rounded-lg p-4",
          )}
        >
          <div className={cn("flex items-start", embedded ? "gap-2" : "gap-3")}>
            <CheckCircle
              className={cn(
                "mt-0.5 shrink-0 text-green-600",
                embedded ? "h-4 w-4" : "h-5 w-5",
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium text-green-900 dark:text-green-100",
                  embedded && "text-sm",
                )}
              >
                {lastResult.message}
              </p>
              <div
                className={cn(
                  "space-y-1 text-muted-foreground",
                  embedded ? "mt-1.5 text-xs" : "mt-2 text-sm",
                )}
              >
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

      {status === "error" && lastResult && (
        <div
          className={cn(
            "space-y-2 rounded-md border border-red-500/30 bg-red-500/10",
            embedded ? "p-2.5" : "space-y-3 rounded-lg p-4",
          )}
        >
          <div className={cn("flex items-start", embedded ? "gap-2" : "gap-3")}>
            <AlertCircle
              className={cn(
                "mt-0.5 shrink-0 text-red-600",
                embedded ? "h-4 w-4" : "h-5 w-5",
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium text-red-900 dark:text-red-100",
                  embedded && "text-sm",
                )}
              >
                {lastResult.error}
              </p>

              {lastResult.reason === "NOT_ASSIGNED_TO_PROGRAMME" &&
                lastResult.student && (
                  <div
                    className={cn(
                      "space-y-1 text-muted-foreground",
                      embedded ? "mt-1.5 text-xs" : "mt-2 text-sm",
                    )}
                  >
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
                    <p className="mt-2 font-medium text-red-600 dark:text-red-400">
                      Not assigned to: {programmeName}
                    </p>
                  </div>
                )}

              {lastResult.reason === "STUDENT_NOT_FOUND" && (
                <p
                  className={cn(
                    "mt-2 text-muted-foreground",
                    embedded ? "text-xs" : "text-sm",
                  )}
                >
                  Verify the chest number and try again.
                </p>
              )}

              {lastResult.reason === "ALREADY_REPORTED" && (
                <p
                  className={cn(
                    "mt-2 text-muted-foreground",
                    embedded ? "text-xs" : "text-sm",
                  )}
                >
                  This student is already marked present.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div
          className={cn(
            "flex items-center justify-center",
            embedded ? "py-2" : "py-6",
          )}
        >
          <Loader2
            className={cn(
              "animate-spin text-primary",
              embedded ? "h-6 w-6" : "h-8 w-8",
            )}
          />
          <span
            className={cn(
              "ml-2 text-muted-foreground",
              embedded ? "text-xs" : "ml-3",
            )}
          >
            Processing…
          </span>
        </div>
      )}
    </div>
  );
}
