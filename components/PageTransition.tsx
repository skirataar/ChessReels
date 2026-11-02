"use client";

import React from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex-1 flex flex-col items-center">
      {children}
    </div>
  );
}
