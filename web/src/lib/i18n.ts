import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { ru } from "@/locales/ru"
import { en } from "@/locales/en"

export type Lang = "ru" | "en"

const LANG_KEY = "orbit_lang"

export function savedLang(): Lang {
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ru"
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: savedLang(),
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
})

export function setLanguage(lng: Lang) {
  localStorage.setItem(LANG_KEY, lng)
  document.documentElement.lang = lng
  i18n.changeLanguage(lng)
}

export function isEn(): boolean {
  return i18n.language === "en"
}

export function localeTag(): string {
  return isEn() ? "en-US" : "ru-RU"
}

export default i18n
