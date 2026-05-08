"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Hero() {
  //comentario  
  const router = useRouter();
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setMostrarBienvenida(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex flex-col items-center w-full gap-8 relative">
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: mostrarBienvenida ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/sign-in")}
        className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-neutral-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl p-6 w-full text-left cursor-pointer border border-gray-200 dark:border-neutral-700"
      >
        <motion.div
          className="mb-6 md:mb-0 md:mr-6 w-[160px] h-[160px] flex justify-center items-center rounded-full bg-transparent"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Image
            src="/gif/afiliados/gif1.gif"
            alt="Ícono escribiendo"
            width={400}
            height={400}
            className="shrink-0 "
          />
        </motion.div>

        <div className="flex-1 text-center md:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: mostrarBienvenida ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mb-5 text-xl md:text-4xl font-extrabold text-gray-900 dark:text-white  transition-colors"
          >
            Miembros CLM
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: mostrarBienvenida ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="text-xl font-medium text-[#06c]"
          >
            Toca aquí para iniciar sesión y administrar los afiliados de
            Concepción Las Minas.
          </motion.p>
        </div>
      </motion.button>
    </div>
  );
}
