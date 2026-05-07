"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, RefreshCw, Trash2, Camera } from "lucide-react";
import { toast } from "react-toastify";

import { createClient } from "@/utils/supabase/client";

import ImageEditorModal from "./ImageEditorModal";

interface Props {
  bucketName: string;
  currentImagePath: string | null;
  onUploadSuccess: (newPath: string) => void | Promise<void>;
  onDeleteSuccess: () => void | Promise<void>;
  disabled?: boolean;
  signedUrlExpiresIn?: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const COMPRESSION_OPTS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
} as const;

export default function ImageUploader({
  bucketName,
  currentImagePath,
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false,
  signedUrlExpiresIn = 60 * 60,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSignedUrl = async () => {
      if (!currentImagePath) {
        setPreviewUrl(null);
        return;
      }
      setPreviewLoading(true);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(currentImagePath, signedUrlExpiresIn);
      if (cancelled) return;
      if (error) {
        console.warn("No se pudo crear signed URL:", error.message);
        setPreviewUrl(null);
      } else {
        setPreviewUrl(data.signedUrl);
      }
      setPreviewLoading(false);
    };
    fetchSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [currentImagePath, bucketName, supabase, signedUrlExpiresIn]);

  const isLocked = disabled || isProcessing;

  const buildUniqueName = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const rand = Math.random().toString(36).slice(2, 10);
    return `${Date.now()}-${rand}.${ext}`;
  };

  const removeFromStorage = async (path: string) => {
    const { error } = await supabase.storage.from(bucketName).remove([path]);
    if (error) {
      console.warn("No se pudo eliminar el archivo previo:", error.message);
    }
  };

  const triggerSelect = () => {
    if (isLocked) return;
    inputRef.current?.click();
  };

  const triggerCamera = () => {
    if (isLocked) return;
    cameraRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      toast.error("Formato no permitido. Use JPG, PNG o WEBP.");
      return;
    }

    setEditingFile(file);
  };

  const uploadEditedFile = async (edited: File) => {
    setIsProcessing(true);
    let uploadedPath: string | null = null;

    try {
      const compressed = await imageCompression(edited, {
        ...COMPRESSION_OPTS,
        fileType: edited.type,
      });

      const newPath = buildUniqueName(
        compressed instanceof File ? compressed : edited,
      );

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(newPath, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: edited.type,
        });

      if (uploadError) throw uploadError;
      uploadedPath = newPath;

      if (currentImagePath) await removeFromStorage(currentImagePath);

      await onUploadSuccess(newPath);
      setEditingFile(null);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error al subir la imagen.";
      console.error(e);
      toast.error(message);
      if (uploadedPath) await removeFromStorage(uploadedPath);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImagePath || isLocked) return;
    setIsProcessing(true);
    try {
      await removeFromStorage(currentImagePath);
      await onDeleteSuccess();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error al eliminar la imagen.";
      console.error(e);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {currentImagePath ? (
        <div className="flex flex-col gap-3">
          <div className="relative w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center min-h-[260px] max-h-[460px]">
            {previewLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Imagen subida"
                className="max-h-[460px] w-auto object-contain"
              />
            ) : (
              <p className="text-xs text-gray-400 font-bold uppercase px-4 text-center">
                No se pudo cargar la vista previa.
              </p>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={triggerSelect}
              disabled={isLocked}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 rounded-md bg-blue-600 text-white text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Galería
            </button>
            <button
              type="button"
              onClick={triggerCamera}
              disabled={isLocked}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 rounded-md bg-green-600 text-white text-xs font-bold uppercase hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              Cámara
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLocked}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 rounded-md bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 px-4 flex flex-col items-center justify-center gap-4">
          {isProcessing ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-xs font-bold uppercase text-gray-500">Procesando...</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase text-gray-400">Selecciona una opción</p>
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={triggerSelect}
                  disabled={isLocked}
                  className="flex-1 inline-flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Upload className="w-7 h-7" />
                  Galería
                </button>
                <button
                  type="button"
                  onClick={triggerCamera}
                  disabled={isLocked}
                  className="flex-1 inline-flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold uppercase hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Camera className="w-7 h-7" />
                  Cámara
                </button>
              </div>
              <p className="text-[10px] text-gray-400 uppercase">JPG · PNG · WEBP</p>
            </>
          )}
        </div>
      )}

      <ImageEditorModal
        file={editingFile}
        onConfirm={uploadEditedFile}
        onCancel={() => setEditingFile(null)}
      />
    </div>
  );
}
