import { LANGUAGE_LABELS, LANGUAGES } from '@/shared/constants'
import { LanguageCode, LanguageOption } from '@/shared/models'

export class ConfigPageServices {
  public static buildSongLanguageOptions(): { value: LanguageOption; label: string }[] {
    const languageOptions = [{ value: 'all' as LanguageOption, label: 'Toutes' }]
    const languageCodes = LANGUAGES.map((language: LanguageCode) => {
      return { value: language, label: LANGUAGE_LABELS[language] }
    })

    return languageOptions.concat(languageCodes)
  }
}
