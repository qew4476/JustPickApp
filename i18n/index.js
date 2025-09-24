import { translations } from './translations';

let language = 'en';

export function setLanguage(nextLanguage) {
  if (typeof nextLanguage !== 'string') {
    return;
  }
  language = nextLanguage;
}

export function getLanguage() {
  return language;
}

export function getWord(key, fallback) {
  if (key == null) return '';
  const source = String(key);
  
  // For English, directly return the key
  if (language === 'en') {
    return source;
  }
  
  const dictForLang = translations[language] || {};
  // If a translation exists for the key, return it; otherwise use fallback or the key itself
  if (Object.prototype.hasOwnProperty.call(dictForLang, source)) {
    return dictForLang[source];
  }
  return fallback != null ? String(fallback) : source;
}



