import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from '../locales/vi.json';
import en from '../locales/en.json';

const STORAGE_KEY = 'floodsight_admin_lang';

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || 'vi' : 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export function persistLanguage(lng) {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
}

export default i18n;
