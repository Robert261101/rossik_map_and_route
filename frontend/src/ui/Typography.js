import React from "react";
import { cn } from "./cn";

export function H1({ className, ...p }) {
  return (
    <h1
      className={cn(
        "text-5xl font-bold text-center mb-6",
        "text-gray-800 dark:text-white",
        className
      )}
      {...p}
    />
  );
}

export function Label({ className, ...p }) {
  return (
    <label
      className={cn(
        "block text-sm font-medium mb-1",
        "text-gray-700 dark:text-gray-300",
        className
      )}
      {...p}
    />
  );
}

export function Body({ className, ...p }) {
  return (
    <p
      className={cn("text-gray-700 dark:text-gray-300", className)}
      {...p}
    />
  );
}
