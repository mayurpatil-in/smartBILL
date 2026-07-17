import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
          i18n.language === 'en'
            ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('mr')}
        className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
          i18n.language === 'mr'
            ? 'bg-white dark:bg-gray-600 text-purple-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        मराठी
      </button>
    </div>
  );
}
