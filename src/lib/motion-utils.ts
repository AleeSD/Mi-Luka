const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

export const supportsHover =
  typeof window !== 'undefined'
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : true

// True on touch-only devices (coarse pointer = finger, no hover).
// Used to gate positional animation variants that leave paint trails on
// mobile Chromium GPUs when intermediate frames are not cleared.
export const isMobile =
  typeof window !== 'undefined'
    ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
    : false

// Shared entry variants — desktop: fade + translate; mobile: fade only.
export const fadeUp = isMobile
  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.32 } } }
  : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE } } }

export const scaleIn = isMobile
  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.38 } } }
  : { hidden: { opacity: 0, scale: 0.94, y: 10 }, show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.42, ease: EASE } } }
