"use client";

/**
 * ProfileContext
 * ──────────────
 * Stores the current user's profileImage URL and name in React state so
 * that both the public Header and admin dashboard header update immediately
 * when Settings/Profile page saves changes.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { getImageUrl } from "@/src/lib/imageUrl";

const IMG_KEY  = "profile_image";
const NAME_KEY = "profile_name";

interface ProfileCtx {
  profileImage: string | null;
  profileName:  string | null;
  setProfileImage: (path: string | null) => void;
  setProfileName:  (name: string | null) => void;
}

const ProfileContext = createContext<ProfileCtx>({
  profileImage: null,
  profileName:  null,
  setProfileImage: () => {},
  setProfileName:  () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profileImage, setProfileImageState] = useState<string | null>(null);
  const [profileName,  setProfileNameState]  = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedImg  = localStorage.getItem(IMG_KEY);
    const storedName = localStorage.getItem(NAME_KEY);
    if (storedImg)  setProfileImageState(getImageUrl(storedImg));
    if (storedName) setProfileNameState(storedName);
  }, []);

  const setProfileImage = (rawPath: string | null) => {
    if (rawPath) {
      localStorage.setItem(IMG_KEY, rawPath);
      setProfileImageState(getImageUrl(rawPath));
    } else {
      localStorage.removeItem(IMG_KEY);
      setProfileImageState(null);
    }
  };

  const setProfileName = (name: string | null) => {
    if (name) {
      localStorage.setItem(NAME_KEY, name);
      setProfileNameState(name);
    } else {
      localStorage.removeItem(NAME_KEY);
      setProfileNameState(null);
    }
  };

  return (
    <ProfileContext.Provider value={{ profileImage, profileName, setProfileImage, setProfileName }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
