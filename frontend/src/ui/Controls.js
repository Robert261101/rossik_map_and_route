import React from "react";
import { cn } from "./cn";

const baseInput =
  "w-full px-4 py-2 rounded-lg " +
  "border border-gray-300 dark:border-gray-600 " +
  "bg-white dark:bg-gray-700 " +
  "text-gray-900 dark:text-white " +
  "focus:outline-none focus:ring-2 focus:ring-red-600";

export function Input({ className, ...p }) {
  return <input className={cn(baseInput, className)} {...p} />;
}

export function Select({ className, children, ...p }) {
  return (
    <select className={cn(baseInput, className)} {...p}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...p }) {
  return <textarea className={cn(baseInput, className)} {...p} />;
}

export function ButtonPrimary({ className, ...p }) {
  return (
    <button
      className={cn(
        "w-full py-2 px-4 bg-red-600 hover:bg-red-700",
        "text-white font-semibold rounded-lg shadow transition",
        className
      )}
      {...p}
    />
  );
}

export function ButtonSecondary({ className, ...p }) {
  return (
    <button
      className={cn(
        "py-2 px-4 rounded-lg transition",
        "bg-gray-200 hover:bg-gray-300 text-gray-900",
        "dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white",
        className
      )}
      {...p}
    />
  );
}

export function LinkAction({ className, ...p }) {
  return (
    <a
      className={cn("text-blue-600 underline font-medium dark:text-blue-400", className)}
      {...p}
    />
  );
}

export function ErrorAlert({ className, ...p }) {
  return (
    <div
      className={cn(
        "text-sm text-red-600 bg-red-100 border border-red-300",
        "dark:text-red-300 dark:bg-red-900/40 dark:border-red-800",
        "rounded p-2 text-center",
        className
      )}
      {...p}
    />
  );
}
