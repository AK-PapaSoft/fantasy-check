import { uk } from './uk';

// Language map - ready for expansion
const languages = {
  uk,
  // en: {} // Add English later
};

type Language = keyof typeof languages;
type TranslationKey = keyof typeof uk;

/**
 * Translation function with variable interpolation
 * @param key Translation key
 * @param vars Variables to interpolate in the translation
 * @param lang Language code (defaults to 'uk')
 * @returns Translated string with interpolated variables
 */
export function t(
  key: TranslationKey,
  vars: Record<string, string | number> = {},
  lang: Language = 'uk'
): string {
  const translation = languages[lang]?.[key] || languages.uk[key];
  
  if (!translation) {
    console.error(`Missing translation for key: ${key}`);
    return key;
  }

  // Replace variables in format {variable}
  return translation.replace(/\{(\w+)\}/g, (match, variable) => {
    const value = vars[variable];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): Language[] {
  return Object.keys(languages) as Language[];
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(lang: string): lang is Language {
  return lang in languages;
}

// Export types for use in other modules
export type { Language, TranslationKey };