"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Check,
  Loader2,
  RotateCcw,
  RotateCw,
  Square,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "react-toastify";

import { getCroppedFile } from "./cropImage";

type AspectKey = "free" | "1:1" | "4:3" | "16:9" | "85:54";

interface AspectOption {
  key: AspectKey;
  label: string;
  value: number | undefined;
}

const ASPECT_OPTIONS: AspectOption[] = [
  { key: "free", label: "Libre", value: undefined },
  { key: "85:54", label: "DPI 85x54", value: 85 / 54 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
  { key: "1:1", label: "1:1", value: 1 },
];

interface Props {
  file: File | null;
  onConfirm: (file: File) => void | Promise<void>;
  onCancel: () => void;
  defaultAspect?: AspectKey;
}

export default function ImageEditorModal({
  file,
  onConfirm,
  onCancel,
  defaultAspect = "85:54",
}: Props) {
  const isOpen = !!file;

  const objectUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState<AspectKey>(defaultAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspectKey(defaultAspect);
      setCroppedAreaPixels(null);
    }
  }, [isOpen, defaultAspect]);

  const aspect = ASPECT_OPTIONS.find((o) => o.key === aspectKey)?.value;

  const handleCropComplete = useCallback(
    (_: Area, areaPixels: Area) => setCroppedAreaPixels(areaPixels),
    [],
  );

  const rotate = (delta: number) =>
    setRotation((r) => {
      const next = (r + delta) % 360;
      return next < 0 ? next + 360 : next;
    });

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleConfirm = async () => {
    if (!file || !croppedAreaPixels) {
      toast.error("Selecciona el área a recortar.");
      return;
    }
    setIsProcessing(true);
    try {
      const cropped = await getCroppedFile(file, croppedAreaPixels, rotation);
      await onConfirm(cropped);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo recortar la imagen.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (isProcessing) return;
    onCancel();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={handleCancel}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
              <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                <h3 className="text-sm font-black uppercase text-gray-800">
                  Editar imagen
                </h3>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="p-1.5 rounded-full hover:bg-gray-200 transition disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="relative bg-black h-[55vh] min-h-[320px]">
                {objectUrl && (
                  <Cropper
                    image={objectUrl}
                    crop={crop}
                    zoom={zoom}
                    minZoom={0.1}
                    maxZoom={10}
                    rotation={rotation}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={handleCropComplete}
                    restrictPosition={false}
                    showGrid
                  />
                )}
              </div>

              <div className="px-5 py-3 border-t bg-gray-50 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-gray-500">
                    Aspecto
                  </span>
                  {ASPECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAspectKey(opt.key)}
                      disabled={isProcessing}
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition ${
                        aspectKey === opt.key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <ZoomIn className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type="range"
                      min={0.1}
                      max={10}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      disabled={isProcessing}
                      className="w-full accent-blue-600"
                    />
                    <span className="text-[10px] font-bold w-10 text-right text-gray-600">
                      {zoom.toFixed(2)}x
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => rotate(-90)}
                      disabled={isProcessing}
                      title="Rotar -90°"
                      className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotate(90)}
                      disabled={isProcessing}
                      title="Rotar +90°"
                      className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                    >
                      <RotateCw className="w-4 h-4 text-gray-700" />
                    </button>
                    <span className="text-[10px] font-bold w-10 text-center text-gray-600">
                      {rotation}°
                    </span>
                    <button
                      type="button"
                      onClick={reset}
                      disabled={isProcessing}
                      title="Restablecer"
                      className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Square className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-stretch gap-2 px-5 py-3 border-t bg-white">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-xs font-bold uppercase hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing || !croppedAreaPixels}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isProcessing ? "Procesando..." : "Aplicar y subir"}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
