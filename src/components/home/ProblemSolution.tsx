"use client";

import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";

const problems = [
  "Paper trails & lost sheets",
  "Late night manual tabulations",
  "Calculation errors & disputes",
  "Zero transparency for teams"
];

const solutions = [
  "100% Digital & Cloud-based",
  "Instant real-time results",
  "Automated error-free math",
  "Full audit logs & insights"
];

export default function ProblemSolution() {
  return (
    <section className="py-24 bg-background text-foreground overflow-hidden border-t border-border">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-6"
          >
            Chaos <span className="text-gray-500 mx-4">vs</span> Control
          </motion.h2>
          <p className="text-xl text-gray-500 uppercase tracking-widest">Stop Managing. Start Orchestrating.</p>
        </div>

        <div className="grid md:grid-cols-2 relative group border border-gray-100">
          
          {/* Divider */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block z-20" />

          {/* Left: The Old Way */}
          <motion.div 
            className="p-12 md:p-20 bg-card border-b md:border-b-0 md:border-r border-border relative overflow-hidden transition-colors hover:bg-muted/50 group"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <X size={200} strokeWidth={0.5} />
            </div>
            
            <h3 className="text-3xl font-black uppercase tracking-widest text-red-500 mb-12 flex items-center gap-4 relative z-10">
              <span className="w-12 h-12 border border-red-900/50 rounded-full flex items-center justify-center bg-red-950/20">
                 <X size={24} />
              </span>
              The Old Way
            </h3>

            <ul className="space-y-8 relative z-10">
              {problems.map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="flex items-center gap-6 text-xl text-gray-400 font-medium"
                >
                  <div className="w-1.5 h-1.5 bg-red-900 rounded-full" />
                  <span className="decoration-gray-500 line-through decoration-2">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: The New Way */}
          <motion.div 
            className="p-12 md:p-20 bg-card text-foreground relative overflow-hidden transition-colors hover:bg-muted/50 group"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
             {/* Abstract shape */}
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute -right-20 -top-20 w-96 h-96 bg-gray-50 rounded-full blur-3xl opacity-50 pointer-events-none"
             />

            <h3 className="text-3xl font-black uppercase tracking-widest mb-12 flex items-center gap-4 relative z-10">
              <span className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center">
                 <Check size={24} />
              </span>
              Greenroom
            </h3>

            <ul className="space-y-8 relative z-10">
              {solutions.map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex items-center gap-6 text-xl font-bold"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-foreground flex items-center justify-center text-xs">
                    <Check size={14} strokeWidth={4} />
                  </div>
                  {item}
                </motion.li>
              ))}
            </ul>

            <div className="mt-16 relative z-10">
               <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest underline decoration-2 underline-offset-4 cursor-pointer hover:opacity-70 transition-opacity">
                  See how it works <ArrowRight size={16} />
               </div>
            </div>
          </motion.div>
        
        </div>
      </div>
    </section>
  );
}
