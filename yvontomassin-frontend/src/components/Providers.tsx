"use client";

import { ProfileProvider } from "@/src/context/ProfileContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
