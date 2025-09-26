import React from "react";
import { cn } from "./cn";
import RossikLogo from "../VektorLogo_Rossik_rot.gif";

export default function AppShell({
  children,
  withLogo = true,
  className,
}) {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center",
        "bg-gradient-to-br from-red-600 via-white to-gray-300",
        "dark:from-gray-800 dark:via-gray-900 dark:to-black",
        "transition-colors",
        className
      )}
    >
      {withLogo && (
        <div className="fixed top-0 right-0 px-6 py-5">
          <img src={RossikLogo} alt="Rossik Logo" className="h-16 object-contain" />
        </div>
      )}
      {children}
    </div>
  );
}
