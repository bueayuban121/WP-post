"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassPanel({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof motion.div>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("glass-panel p-6", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
