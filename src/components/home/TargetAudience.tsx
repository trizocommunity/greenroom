"use client";

import { motion } from "framer-motion";
import { GraduationCap, Music, BookOpen, School } from "lucide-react";

const audiences = [
  {
    title: "Campuses",
    icon: GraduationCap,
    desc: "Manage large-scale university fests with ease.",
  },
  {
    title: "Arts",
    icon: Music,
    desc: "Coordinate multi-venue cultural performances.",
  },
  {
    title: "Literature",
    icon: BookOpen,
    desc: "Schedule panels, readings, and workshops seamlessly.",
  },
  {
    title: "Schools",
    icon: School,
    desc: "Simplify inter-house and inter-school competitions.",
  },
];

export default function TargetAudience() {
  return (
    <section className="py-32 bg-black border-t border-white/10">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter max-w-2xl">
            Built For <br/> Every Stage
          </h2>
          <p className="text-xl text-gray-500 max-w-md mb-2">
            Scalable architecture for events of any size.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {audiences.map((item, i) => (
            <motion.div
              key={i}
              className="group border border-white/10 p-8 hover:bg-white hover:text-black transition-colors duration-500"
            >
              <div className="mb-6 p-4 border border-white/20 inline-block group-hover:border-black">
                <item.icon size={32} strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold uppercase mb-4 tracking-wide">{item.title}</h3>
              <p className="text-gray-400 font-medium leading-relaxed group-hover:text-gray-600">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
