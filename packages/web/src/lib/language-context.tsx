'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ContentLanguage = 'japanese' | 'tamil' | 'telugu' | 'kannada';

interface LanguageContextType {
  language: ContentLanguage;
  setLanguage: (lang: ContentLanguage) => void;
  isAnime: boolean;
  isMovie: boolean;
  showPicker: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'japanese',
  setLanguage: () => {},
  isAnime: true,
  isMovie: false,
  showPicker: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<ContentLanguage>('japanese');
  const [hasChosen, setHasChosen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('babylon_language') as ContentLanguage | null;
    if (stored && ['japanese', 'tamil', 'telugu', 'kannada'].includes(stored)) {
      setLanguageState(stored);
      setHasChosen(true);
    }
    setHydrated(true);
  }, []);

  const setLanguage = (lang: ContentLanguage) => {
    setLanguageState(lang);
    setHasChosen(true);
    setPickerOpen(false);
    localStorage.setItem('babylon_language', lang);
  };

  const showPicker = () => setPickerOpen(true);

  // Don't render anything until localStorage is read (prevents flash)
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F47521] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show splash picker on first visit or when picker is explicitly opened
  if (!hasChosen || pickerOpen) {
    return (
      <LanguageContext.Provider
        value={{ language, setLanguage, isAnime: language === 'japanese', isMovie: language !== 'japanese', showPicker }}
      >
        <LanguageSplash onSelect={setLanguage} />
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, isAnime: language === 'japanese', isMovie: language !== 'japanese', showPicker }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// ── Splash Screen Component ──

const LANGUAGE_OPTIONS: { value: ContentLanguage; label: string; sublabel: string; color: string }[] = [
  { value: 'japanese', label: 'Anime', sublabel: 'Japanese Animation', color: '#F47521' },
  { value: 'tamil', label: 'Tamil', sublabel: 'Tamil Movies', color: '#E91E63' },
  { value: 'telugu', label: 'Telugu', sublabel: 'Telugu Movies', color: '#9C27B0' },
  { value: 'kannada', label: 'Kannada', sublabel: 'Kannada Movies', color: '#2196F3' },
];

function LanguageSplash({ onSelect }: { onSelect: (lang: ContentLanguage) => void }) {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center px-4">
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-3 text-center">
        What are you watching?
      </h1>
      <p className="text-[#a0a0a0] text-sm mb-12 text-center">
        Choose your content region
      </p>

      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
          >
            <div
              className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold text-white transition-all group-hover:ring-4"
              style={{
                background: `linear-gradient(135deg, ${option.color}33, ${option.color}88)`,
                borderColor: option.color,
                border: `3px solid ${option.color}66`,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.boxShadow = `0 0 30px ${option.color}44`;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {option.label.charAt(0)}
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-semibold">{option.label}</p>
              <p className="text-[#6b6b6b] text-xs">{option.sublabel}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-[#6b6b6b] text-xs mt-16">
        You can change this anytime from the menu
      </p>
    </div>
  );
}
