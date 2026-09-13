"use client";

import { useState } from "react";

export default function SquareMealImage({
  src,
  alt,
  className = "",
  fallback = "🍽️",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-slate-100 ${className}`}>
      {src && !error ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-slate-200" />
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl sm:text-4xl text-slate-300">
          {fallback}
        </div>
      )}
    </div>
  );
}
