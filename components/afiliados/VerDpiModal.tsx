"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { FileDown, Image, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";

import { createClient } from "@/utils/supabase/client";

import type { Afiliado } from "./esquemas";
import { generarDpiImg, generarDpiPdf } from "./utils/generarDpiPdf";

const BUCKET = "dpis";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  afiliado: Afiliado | null;
  onDataChange: () => void;
}

interface SignedUrls {
  frontal: string | null;
  reverso: string | null;
}

export default function VerDpiModal({ isOpen, onClose, afiliado }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({ frontal: null, reverso: null });
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  const buildSignedUrl = async (path: string | null | undefined) => {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data.signedUrl;
  };

  useEffect(() => {
    if (!isOpen || !afiliado) {
      setSignedUrls({ frontal: null, reverso: null });
      return;
    }
    let cancelled = false;
    setLoadingUrls(true);
    Promise.all([
      buildSignedUrl(afiliado.dpi_frontal_url),
      buildSignedUrl(afiliado.dpi_reverso_url),
    ]).then(([frontal, reverso]) => {
      if (!cancelled) {
        setSignedUrls({ frontal, reverso });
        setLoadingUrls(false);
      }
    });
    return () => { cancelled = true; };
  }, [isOpen, afiliado?.id, afiliado?.dpi_frontal_url, afiliado?.dpi_reverso_url]);

  const handleDownloadPdf = async () => {
    if (!afiliado) return;
    setPdfLoading(true);
    try {
      const [frontal, reverso] = await Promise.all([
        buildSignedUrl(afiliado.dpi_frontal_url),
        buildSignedUrl(afiliado.dpi_reverso_url),
      ]);
      await generarDpiPdf(afiliado, { frontal, reverso });
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadImg = async () => {
    if (!afiliado) return;
    setImgLoading(true);
    try {
      const [frontal, reverso] = await Promise.all([
        buildSignedUrl(afiliado.dpi_frontal_url),
        buildSignedUrl(afiliado.dpi_reverso_url),
      ]);
      await generarDpiImg(afiliado, { frontal, reverso });
    } catch {
      toast.error("No se pudo generar la imagen.");
    } finally {
      setImgLoading(false);
    }
  };

  const tieneAlgunDpi = !!(afiliado?.dpi_frontal_url || afiliado?.dpi_reverso_url);

  const Slot = ({ url }: { url: string | null }) => (
    <div className="flex-1 min-h-0 flex items-center justify-center">
      {loadingUrls ? (
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="DPI" className="w-full h-full object-contain" />
      ) : (
        <span className="text-xs text-gray-400 italic">Sin imagen</span>
      )}
    </div>
  );

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={onClose}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 flex items-center justify-center p-0 sm:p-[5vh]">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full h-full sm:w-[80vw] sm:h-[90vh] sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 shrink-0">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-gray-900 truncate">
                      {afiliado?.nombres} {afiliado?.apellidos}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      DPI: {afiliado?.dpi || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-gray-200 transition shrink-0 ml-3"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
                  <Slot url={signedUrls.frontal} />
                  <Slot url={signedUrls.reverso} />
                </div>

                <div className="shrink-0 flex gap-2 px-4 py-3 border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={!tieneAlgunDpi || pdfLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {pdfLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <FileDown className="w-4 h-4 shrink-0" />
                    )}
                    Descargar PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadImg}
                    disabled={!tieneAlgunDpi || imgLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {imgLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Image className="w-4 h-4 shrink-0" />
                    )}
                    Descargar IMG
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

    </>
  );
}
