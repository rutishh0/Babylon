'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PinState {
  pin: string;
  setPin: (pin: string) => void;
  clearPin: () => void;
}

export const usePinStore = create<PinState>()(
  persist(
    (set) => ({
      pin: '',
      setPin: (pin: string) => {
        set({ pin });
        if (typeof window !== 'undefined') {
          localStorage.setItem('babylon-pin', pin);
        }
      },
      clearPin: () => {
        set({ pin: '' });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('babylon-pin');
        }
      },
    }),
    {
      name: 'babylon-pin-store',
    },
  ),
);
