"use client";

import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background">
      
      {/* Background Marquee Text - subtle */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none overflow-hidden whitespace-nowrap">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 50, ease: "linear" }}
          className="text-[20vw] font-black uppercase leading-none text-white/5"
        >
          Greenroom Festival  Greenroom Festival  Greenroom Festival
        </motion.div>
      </div>

      <div className="container max-w-7xl px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter mb-8 leading-[0.9]"
        >
          Paperless <br/>
          <motion.span 
             initial={{ clipPath: "polygon(0 0, 0 100%, 0 100%, 0 0)" }}
             animate={{ clipPath: "polygon(0 0, 0 100%, 100% 100%, 100% 0)" }}
             transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
             className="text-transparent bg-clip-text bg-linear-to-r from-gray-400 to-white inline-block"
          >
             Management
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-lg md:text-2xl text-gray-400 uppercase font-medium tracking-widest mb-12 max-w-3xl"
        >
          The future of large-scale event coordination is here. <br className="hidden md:block" />
          100% Digital. 100% Reliable.
        </motion.p>

        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 1 }}
           className="flex flex-col sm:flex-row gap-6"
        >
          <Link href="/contact">
            <Button size="lg" className="h-14 px-10 text-lg uppercase font-bold tracking-wider rounded-none border-2 border-primary hover:bg-transparent hover:text-primary transition-all">
              Request Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="h-14 px-10 text-lg uppercase font-bold tracking-wider rounded-none border-2 border-white/20 hover:border-white hover:bg-white hover:text-black transition-all">
              Contact Us
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
