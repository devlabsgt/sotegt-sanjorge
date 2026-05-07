"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  Hash,
  XCircle,
  MessageCircle,
  Crown,
  Heart,
  Eye,
  Download,
} from "lucide-react";

import { eliminar } from "./acciones";
import type { Afiliado, Lider } from "./esquemas";
import GestionDpiModal from "./GestionDpiModal";
import VerDpiModal from "./VerDpiModal";

interface Props {
  lider: Lider;
  afiliados: Afiliado[];
  onEditar: (afiliado: Afiliado) => void;
  onDataChange: () => void;
  rolUsuarioSesion: string;
  config?: any;
  totalEnCelula?: number;
}

export default function Tabla({
  lider,
  afiliados,
  onEditar,
  onDataChange,
  rolUsuarioSesion,
  config,
  totalEnCelula,
}: Props) {
  const puedeVerAcciones = true;
  const totalAfiliados = totalEnCelula ?? afiliados.length;

  const [verDpiAfiliado, setVerDpiAfiliado] = useState<Afiliado | null>(null);
  const [gestionDpiAfiliado, setGestionDpiAfiliado] = useState<Afiliado | null>(null);

  const descargarCarnet = (afiliado: Afiliado) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1000;
    canvas.height = 630;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    ctx.fillStyle = "#1e40af";
    ctx.fillRect(30, 30, 100, 10);
    ctx.fillRect(30, 30, 10, 100);
    ctx.fillRect(canvas.width - 130, 30, 100, 10);
    ctx.fillRect(canvas.width - 40, 30, 10, 100);
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CONSTANCIA DE AFILIACIÓN", canvas.width / 2, 75);
    ctx.fillStyle = "#111827";
    ctx.font = "900 40px sans-serif";
    ctx.fillText(config?.nombre_candidato?.toUpperCase() || "AFILIACIÓN", canvas.width / 2, 125);
    ctx.beginPath();
    ctx.moveTo(100, 155);
    ctx.lineTo(900, 155);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("NOMBRE DEL AFILIADO:", 100, 210);
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(`${afiliado.nombres} ${afiliado.apellidos}`.toUpperCase(), 100, 265);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("DOCUMENTO PERSONAL DE IDENTIFICACIÓN (DPI):", 100, 340);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 38px monospace";
    ctx.fillText(afiliado.dpi || "0000 00000 0000", 100, 390);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("NO. DE PADRÓN:", 100, 460);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(afiliado.no_padron || "N/A", 100, 505);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("MUNICIPIO / LUGAR:", 550, 460);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(afiliado.lugar_nombre || config?.lugar || "—", 550, 505);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "italic 18px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Afiliado el: ${new Date(afiliado.created_at).toLocaleDateString("es-GT")}`, 900, 580);
    const link = document.createElement("a");
    link.download = `carnet_${afiliado.nombres.replace(/\s/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const obtenerColorDpi = (afiliado: Afiliado) => {
    const f = !!afiliado.dpi_frontal_url;
    const r = !!afiliado.dpi_reverso_url;
    if (f && r) return "bg-green-600 hover:bg-green-700";
    if (f || r) return "bg-amber-500 hover:bg-amber-600";
    return "bg-gray-400 hover:bg-gray-500";
  };

  if (afiliados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500 bg-gray-50 rounded border border-dashed">
        <p className="text-sm">No hay afiliados en esta célula aún.</p>
      </div>
    );
  }

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return "—";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  const generarLinkWhatsapp = (telefono: string) => {
    if (!telefono) return "#";
    const numeroLimpio = telefono.replace(/\D/g, "");
    const numeroFinal =
      numeroLimpio.length === 8 ? `502${numeroLimpio}` : numeroLimpio;
    return `https://wa.me/${numeroFinal}`;
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "—";
    const d = new Date(fecha);
    const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    const diaSemana = dias[d.getDay()];
    const dia = d.getDate().toString().padStart(2, "0");
    const mes = (d.getMonth() + 1).toString().padStart(2, "0");
    const anio = d.getFullYear().toString().slice(-2);
    let horas = d.getHours();
    const minutos = d.getMinutes().toString().padStart(2, "0");
    const ampm = horas >= 12 ? "PM" : "AM";
    horas = horas % 12;
    horas = horas ? horas : 12;
    const horasStr = horas.toString().padStart(2, "0");

    return `${diaSemana} ${dia}/${mes}/${anio}, ${horasStr}:${minutos} ${ampm}`;
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {afiliados.map((afiliado, index) => {
        const esLider = !!afiliado.es_lider;
        const esFamiliar = !!afiliado.familiar && !esLider;
        const puedeEliminar = !(esLider && totalAfiliados > 1);
        const colorDpi = obtenerColorDpi(afiliado);

        return (
          <div
            key={afiliado.id}
            className={`group relative bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col ${
              esLider
                ? "border-orange-300 ring-1 ring-orange-200"
                : esFamiliar
                  ? "border-purple-200"
                  : "border-gray-200"
            }`}
          >
            {esLider && (
              <div className="absolute -top-2.5 left-3 z-10">
                <span className="flex items-center gap-1 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                  <Crown className="w-2.5 h-2.5" /> Líder
                </span>
              </div>
            )}
            {esFamiliar && (
              <div className="absolute -top-2.5 left-3 z-10">
                <span className="flex items-center gap-1 bg-purple-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                  <Heart className="w-2.5 h-2.5" /> Familiar
                </span>
              </div>
            )}

            {/* Tooltip Personalizado */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] whitespace-nowrap">
              <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-md shadow-xl border border-blue-400">
                {afiliado.nombres} {afiliado.apellidos}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-600"></div>
              </div>
            </div>

            <div className="p-4 flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-3 gap-1 md:gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex items-center justify-center font-bold text-xs h-6 w-6 rounded-md shrink-0 ${
                      esLider
                        ? "bg-orange-100 text-orange-700"
                        : esFamiliar
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <h3 className="text-xs font-bold text-gray-900 uppercase leading-tight truncate group-hover:text-blue-600 transition-colors">
                    {afiliado.nombres} {afiliado.apellidos}
                  </h3>
                </div>
                <div className="text-xs italic text-slate-400 shrink-0 md:text-right">
                  Afiliado el:{" "}
                  <span className="font-bold">
                    {formatearFecha(afiliado.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-500 shrink-0">DPI:</span>
                  <span className="font-mono font-medium truncate">
                    {afiliado.dpi || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="font-bold text-[10px]">
                    {calcularEdad(afiliado.nacimiento)}
                  </span>
                </div>

                <div className="shrink-0">
                  {afiliado.sexo === "M" ? (
                    <span className="flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] h-6 w-6 rounded-md">
                      M
                    </span>
                  ) : (
                    <span className="flex items-center justify-center bg-pink-50 text-pink-700 border border-pink-200 font-bold text-[10px] h-6 w-6 rounded-md">
                      F
                    </span>
                  )}
                </div>
              </div>

              {/* LÍNEA 3: WHATSAPP + UBICACIÓN */}
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <a
                  href={generarLinkWhatsapp(afiliado.telefono || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 shrink-0 text-green-600 hover:text-green-700 hover:underline transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="font-bold font-mono">
                    {afiliado.telefono || "—"}
                  </span>
                </a>

                <div className="h-4 w-px bg-gray-200 shrink-0"></div>

                {/* Ubicación: Ahora solo depende de afiliado.lugar_nombre */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span
                    className="truncate"
                    title={afiliado.lugar_nombre || "Ubicación no definida"}
                  >
                    {afiliado.lugar_nombre || "—"}
                  </span>
                </div>
              </div>

              {/* LÍNEA 4: PADRÓN */}
              <div className="pt-1">
                {afiliado.empadronado ? (
                  <div className="bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2 text-green-800">
                    <Hash className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <div className="text-[10px]">
                      <span className="font-bold uppercase mr-1">Padrón:</span>
                      <span className="font-mono font-bold">
                        {afiliado.no_padron || "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-2 flex items-center gap-2 text-red-700">
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-[10px] font-bold uppercase">
                      NO EMPADRONADO
                    </span>
                  </div>
                )}
              </div>
            </div>

            {puedeVerAcciones && (
              <div className="bg-gray-50 p-3 border-t border-gray-100 flex flex-col gap-2 mt-auto rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setVerDpiAfiliado(afiliado)}
                  className={`w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg text-white text-xs font-black uppercase transition ${colorDpi}`}
                >
                  <Eye className="w-4 h-4" />
                  Ver DPI
                </button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 h-8 text-xs font-bold"
                    onClick={() => setGestionDpiAfiliado(afiliado)}
                  >
                    Subir/Editar DPI
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-white text-green-600 border-gray-200 hover:bg-green-50 hover:text-green-700 h-8 text-xs font-bold"
                    onClick={() => descargarCarnet(afiliado)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Carnet
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white text-blue-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700 h-8 text-xs"
                    onClick={() => onEditar(afiliado)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!puedeEliminar}
                    title={
                      !puedeEliminar
                        ? "No se puede eliminar al líder mientras tenga integrantes"
                        : undefined
                    }
                    className="flex-1 bg-white text-red-600 border-gray-200 hover:bg-red-50 hover:text-red-700 h-8 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() =>
                      puedeEliminar && eliminar(afiliado, onDataChange)
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>

    <VerDpiModal
      isOpen={!!verDpiAfiliado}
      onClose={() => setVerDpiAfiliado(null)}
      afiliado={verDpiAfiliado}
      onDataChange={onDataChange}
    />

    <GestionDpiModal
      isOpen={!!gestionDpiAfiliado}
      onClose={() => setGestionDpiAfiliado(null)}
      afiliado={gestionDpiAfiliado}
      onSaved={() => {
        onDataChange();
      }}
    />
  </>
  );
}
