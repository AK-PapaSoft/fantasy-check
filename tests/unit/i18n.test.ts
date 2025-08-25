import { t, getSupportedLanguages, isLanguageSupported } from '../../src/i18n';

describe('i18n', () => {
  describe('t function', () => {
    it('should return translation for existing key', () => {
      const result = t('greet');
      
      expect(result).toBe('Привіт! Я бот для Sleeper NFL. Додай свій профіль командою /link_sleeper <нікнейм>.');
    });

    it('should return key if translation not found', () => {
      const result = t('non_existent_key' as any);
      
      expect(result).toBe('non_existent_key');
    });

    it('should interpolate variables', () => {
      const result = t('linked_ok', { username: 'test_user' });
      
      expect(result).toBe('Зв\'язав користувача Sleeper: test_user');
    });

    it('should handle multiple variables', () => {
      const result = t('digest_header', { league: 'Test League', week: 10 });
      
      expect(result).toBe('🏈 Sleeper | Ліга: Test League | Тиждень 10');
    });

    it('should handle numeric variables', () => {
      const result = t('digest_score', { myScore: 98.5, oppScore: 87.2 });
      
      expect(result).toBe('Рахунок: 98.5 – 87.2');
    });

    it('should leave unmatched placeholders as is', () => {
      const result = t('linked_ok', { wrongVar: 'test' });
      
      expect(result).toBe('Зв\'язав користувача Sleeper: {username}');
    });

    it('should default to Ukrainian language', () => {
      const result = t('greet');
      
      expect(result).toContain('Привіт');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = getSupportedLanguages();
      
      expect(languages).toBeInstanceOf(Array);
      expect(languages).toContain('uk');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported language', () => {
      expect(isLanguageSupported('uk')).toBe(true);
    });

    it('should return false for unsupported language', () => {
      expect(isLanguageSupported('fr')).toBe(false);
      expect(isLanguageSupported('invalid')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle empty variables object', () => {
      const result = t('linked_ok', {});
      
      expect(result).toBe('Зв\'язав користувача Sleeper: {username}');
    });

    it('should handle null/undefined variables', () => {
      const result = t('linked_ok', { username: null as any });
      
      expect(result).toBe('Зв\'язав користувача Sleeper: {username}');
    });
  });

  describe('message formatting', () => {
    it('should format help message correctly', () => {
      const result = t('help');
      
      expect(result).toContain('🏈 **Команди бота:**');
      expect(result).toContain('/start');
      expect(result).toContain('/link_sleeper');
      expect(result).toContain('/leagues');
      expect(result).toContain('/today');
      expect(result).toContain('/timezone');
      expect(result).toContain('/help');
    });

    it('should format error messages', () => {
      expect(t('error_generic')).toBe('Сталася помилка. Спробуй ще раз пізніше.');
      expect(t('error_sleeper_api')).toBe('Помилка при звертанні до Sleeper API. Спробуй пізніше.');
      expect(t('error_database')).toBe('Помилка бази даних. Зверніться до адміністратора.');
    });

    it('should format success messages', () => {
      expect(t('no_games')).toBe('Сьогодні ігор немає. Гарного дня!');
      expect(t('api_success')).toBe('Операція виконана успішно');
    });
  });
});