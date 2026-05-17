"use client";

import { useState } from "react";
import type { Afiliado } from "../esquemas";
import EstadisticasEdades from "./Edades";
import EstadisticasPoliticas from "./Politicas";
import EstadisticasLugares from "./Lugares";
import EstadisticasCondicionEspecial from "./CondicionEspecial";
import EstadisticasReligiones from "./Religion";

const TABS = [
  { id: "edades", label: "Edades", emoji: "👥" },
  { id: "ubicacion", label: "Ubicación", emoji: "📍" },
  { id: "condicion", label: "Condición", emoji: "🩺" },
  { id: "religion", label: "Religión", emoji: "⛪" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  afiliados: Afiliado[];
}

export default function EstadisticasTabs({ afiliados }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("edades");

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── Pestañas ── */}
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 overflow-x-auto shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[10px] md:text-xs font-bold transition-all flex-1 min-w-0 text-center leading-tight ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            <span className="hidden md:inline">{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="w-full">
        {activeTab === "edades" && (
          <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm h-[500px] flex flex-col w-full">
            <EstadisticasEdades afiliados={afiliados} />
          </div>
        )}

        {activeTab === "ubicacion" && (
          <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm w-full">
            <EstadisticasLugares afiliados={afiliados} />
          </div>
        )}

        {activeTab === "condicion" && (
          <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm w-full">
            <EstadisticasCondicionEspecial afiliados={afiliados} />
          </div>
        )}

        {activeTab === "religion" && (
          <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm h-[500px] flex flex-col w-full">
            <EstadisticasReligiones afiliados={afiliados} />
          </div>
        )}
      </div>
    </div>
  );
}
