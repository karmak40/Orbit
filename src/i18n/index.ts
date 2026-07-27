import * as Localization from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { SUPPORTED_LOCALES, type Settings, type SupportedLocale } from '../core/model';
import de from './locales/de.json';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

const resources = {
  en: { translation: en },
  de: { translation: de },
  ru: { translation: ru },
  uk: { translation: uk },
};

/** The device's most-preferred language that Orbit actually has a translation for, else English. */
export function detectDeviceLocale(): SupportedLocale {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase();
    const match = SUPPORTED_LOCALES.find((l) => l === code);
    if (match) return match;
  }
  return 'en';
}

/** `settings.language` → the locale i18next should actually be running in. */
export function resolveLocale(language: Settings['language']): SupportedLocale {
  return language === 'system' ? detectDeviceLocale() : language;
}

void i18next.use(initReactI18next).init({
  resources,
  lng: detectDeviceLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;
