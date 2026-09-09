"use client";

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
  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-gray-100 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl">{fallback}</div>
      )}
    </div>
  );
}
