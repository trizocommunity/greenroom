"use client";

import jsQR from "jsqr";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Loader2,
  Upload,
  X,
  Zap,
  ZapOff,
  SwitchCamera,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";
import { scanAndReportParticipantAction } from "@/features/programmes/actions/programme-reporting.actions";
import { QuickAddScanForm } from "./QuickAddScanForm";

interface QrScannerProps {
  festivalId: string;
  reportingSessionId: string;
  programmeName: string;
  onScanSuccess?: (result: unknown) => void;
  onScanError?: (error: unknown) => void;
  /** Tighter layout, no footer help — use inside reporting panel */
  variant?: "default" | "embedded";
  /**
   * Which controls this instance renders:
   * - "full": manual chest#, photo upload, and camera (default embedded).
   * - "camera": only the square camera surface (the live-check-in hero).
   * - "manual": only chest# and photo upload (fallback in the manual section).
   */
  mode?: "full" | "camera" | "manual";
  /** Camera mode only — try to open the camera as soon as it mounts. */
  autoStart?: boolean;
  /** Hide the internal success/error result cards (parent shows its own). */
  hideResults?: boolean;
}

type ScanStatus = "idle" | "scanning" | "processing" | "success" | "error";

interface ScanResult {
  success: boolean;
  message?: string;
  error?: string;
  reason?: string;
  participant?: {
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
async function getVideoStreamWithMode(
  mode: "environment" | "user",
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: mode } },
  });
}

export function QrScanner({
  festivalId,
  reportingSessionId,
  programmeName,
  onScanSuccess,
  onScanError,
  variant = "default",
  mode = "full",
  autoStart = false,
  hideResults = false,
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
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );

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

  const startCamera = async (
    constraints: "default" | "any" = "default",
    mode: "environment" | "user" = facingMode,
  ) => {
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
    setLastResult(null);
    setStatus("scanning");

    try {
      const stream =
        constraints === "any"
          ? await navigator.mediaDevices.getUserMedia({ video: true })
          : await getVideoStreamWithMode(mode);

      const track = stream.getVideoTracks()[0];
      if (track && "getCapabilities" in track) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const capabilities = (track as any).getCapabilities();
          setTorchSupported(!!capabilities?.torch);
        } catch {
          setTorchSupported(false);
        }
      } else {
        setTorchSupported(false);
      }

      if (session !== cameraSessionRef.current) {
        stream.getTracks().forEach((t) => {
          t.stop();
        });
        return;
      }

      setCameraGate(null);

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => {
          t.stop();
        });
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
            stream.getTracks().forEach((t) => {
              t.stop();
            });
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

  const toggleTorch = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      const nextTorch = !torchOn;
      track
        .applyConstraints({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advanced: [{ torch: nextTorch } as any],
        })
        .then(() => {
          setTorchOn(nextTorch);
        })
        .catch((err) => {
          console.error("Failed to toggle torch", err);
        });
    }
  }, [torchOn]);

  const toggleCamera = useCallback(() => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    void startCamera("default", nextMode);
  }, [facingMode]);

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
      const result = await scanAndReportParticipantAction(
        festivalId,
        reportingSessionId,
        chestNumber,
      );

      setLastResult(result);

      if (result.success) {
        setStatus("success");
        toast.success(result.message || "Participant reported successfully!");
        onScanSuccess?.(result);

        setTimeout(() => {
          if (streamRef.current) {
            setStatus("scanning");
            setLastResult(null);
            setManualInput("");
            scanningRef.current = true;
            scanVideoFrame();
          } else {
            setStatus("idle");
            setLastResult(null);
            setManualInput("");
          }
        }, 3000);
      } else {
        setStatus("error");
        toast.error(result.error || "Failed to report participant");
        onScanError?.(result);

        setTimeout(() => {
          if (streamRef.current) {
            setStatus("scanning");
            setLastResult(null);
            setManualInput("");
            scanningRef.current = true;
            scanVideoFrame();
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Scan processing failed:", error);
      setStatus("error");
      toast.error("Processing failed. Please try again.");
      onScanError?.({ error: "Processing failed" });

      setTimeout(() => {
        if (streamRef.current) {
          setStatus("scanning");
          setLastResult(null);
          setManualInput("");
          scanningRef.current = true;
          scanVideoFrame();
        }
      }, 3000);
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

  // Camera-hero: open the camera automatically on mount. Guarded so it fires
  // once; if the browser blocks it (no prior grant / lost gesture) the idle
  // square still offers a tap-to-open button.
  const autoStartedRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot mount trigger; startCamera is intentionally excluded.
  useEffect(() => {
    if (!autoStart || mode !== "camera" || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startCamera();
  }, [autoStart, mode]);

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

      {embedded && mode !== "camera" ? (
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
          hideCamera={mode === "manual"}
        />
      ) : !embedded ? (
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
      ) : null}

      {mode === "camera" && status !== "scanning" && status !== "processing" ? (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="mx-auto flex aspect-square w-full max-w-[300px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Camera className="h-10 w-10" aria-hidden />
          <span className="text-sm font-semibold">Open camera</span>
        </button>
      ) : null}

      {cameraGate ? (
        <output
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
        </output>
      ) : null}

      {["scanning", "processing", "success", "error"].includes(status) &&
        mode !== "manual" && (
          <div
            ref={scannerSurfaceRef}
            className="fixed inset-0 z-[100] flex flex-col bg-black h-[100dvh] w-screen"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute top-16 left-4 right-4 z-10 flex flex-col items-center">
              {status === "success" && lastResult && (
                <div className="w-full max-w-sm rounded-xl border border-green-500/30 bg-green-500/90 backdrop-blur-md p-4 text-white shadow-xl animate-in slide-in-from-top-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 shrink-0 h-5 w-5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{lastResult.message}</p>
                      {lastResult.participant && (
                        <div className="mt-2 space-y-1 text-sm text-green-50">
                          <p>
                            <span className="font-medium text-white">
                              Participant:
                            </span>{" "}
                            {lastResult.participant.name}
                          </p>
                          <p>
                            <span className="font-medium text-white">
                              Chest #:
                            </span>{" "}
                            {lastResult.participant.chestNumber}
                          </p>
                          {lastResult.participant.groupName && (
                            <p>
                              <span className="font-medium text-white">
                                Group:
                              </span>{" "}
                              {lastResult.participant.groupName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {status === "error" && lastResult && (
                <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-red-500/90 backdrop-blur-md p-4 text-white shadow-xl animate-in slide-in-from-top-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 shrink-0 h-5 w-5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {lastResult.error || "Failed to process scan"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {status === "processing" && (
                <div className="rounded-full bg-black/70 backdrop-blur-md px-4 py-2 text-white flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-3xl" />
              </div>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-6 z-20">
              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className="p-4 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 transition-colors"
                >
                  {torchOn ? (
                    <Zap className="h-6 w-6 text-yellow-400" />
                  ) : (
                    <ZapOff className="h-6 w-6" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={toggleCamera}
                className="p-4 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 transition-colors"
              >
                <SwitchCamera className="h-6 w-6" />
              </button>
            </div>

            <div className="absolute right-4 top-4 z-20 flex gap-2">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full bg-black/50 text-white hover:bg-black/70 border-0"
                onClick={stopCamera}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close camera</span>
              </Button>
            </div>
          </div>
        )}

      {!hideResults && status === "success" && lastResult?.participant && (
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
                  <span className="font-medium">Participant:</span>{" "}
                  {lastResult.participant.name}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Chest #:</span>{" "}
                  {lastResult.participant.chestNumber}
                </p>
                {lastResult.participant.groupName && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Group:</span>{" "}
                    {lastResult.participant.groupName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!hideResults && status === "error" && lastResult && (
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
                lastResult.participant && (
                  <div
                    className={cn(
                      "space-y-1 text-muted-foreground",
                      embedded ? "mt-1.5 text-xs" : "mt-2 text-sm",
                    )}
                  >
                    <p>
                      <span className="font-medium">Participant:</span>{" "}
                      {lastResult.participant.name}
                    </p>
                    <p>
                      <span className="font-medium">Chest #:</span>{" "}
                      {lastResult.participant.chestNumber}
                    </p>
                    {lastResult.participant.groupName && (
                      <p>
                        <span className="font-medium">Group:</span>{" "}
                        {lastResult.participant.groupName}
                      </p>
                    )}
                    <p className="mt-2 font-medium text-red-600 dark:text-red-400">
                      Not assigned to: {programmeName}
                    </p>
                  </div>
                )}

              {lastResult.reason === "PARTICIPANT_NOT_FOUND" && (
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
                  This participant is already marked present.
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
