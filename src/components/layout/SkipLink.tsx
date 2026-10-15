'use client'

import { useI18n } from '@/components/i18n/I18nProvider'

export default function SkipLink() {
  const { t } = useI18n()
  return <a href="#main-content" className="skip-link">{t('common.skipToContent')}</a>
}
