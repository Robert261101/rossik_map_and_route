import React from "react";
import { cn } from "./cn";

export default function SectionCard({
  children,
  maxWidth = "md", // "md" | "lg" | "xl"
  className,
  padding = "px-8 py-10",
}) {
  const width =
    maxWidth === "xl" ? "max-w-5xl"
      : maxWidth === "lg" ? "max-w-3xl"
      : "max-w-md";

  return (
    <div
      className={cn(
        "w-full",
        width,
        "bg-white/90 dark:bg-gray-800/80",
        "backdrop-blur-md shadow-xl rounded-2xl",
        padding,
        className
      )}
    >
      {children}
    </div>
  );
}
