'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ContentLanguage = 'japanese' | 'tamil' | 'telugu' | 'kannada';

interface LanguageContextType {
  language: ContentLanguage;
  setLanguage: (lang: ContentLanguage) => void;
  isAnime: boolean;  // true when language === 'japanese'
  isMovie: boolean;  // true for tamil/telugu/kannada
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'japanese',
  setLanguage: () => {},
  isAnime: true,
  isMovie: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<ContentLanguage>('japanese');

  useEffect(() => {
    const stored = localStorage.getItem('babylon_language') as ContentLanguage | null;
    if (stored && ['japanese', 'tamil', 'telugu', 'kannada'].includes(stored)) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: ContentLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('babylon_language', lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        isAnime: language === 'japanese',
        isMovie: language !== 'japanese',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
