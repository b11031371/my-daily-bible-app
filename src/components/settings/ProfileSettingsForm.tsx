'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Check } from '@phosphor-icons/react'
import { cardClass } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const AVATAR_SEEDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu']

// 成敗狀態獨立成欄位，不再靠訊息尾端的 ✓ 判斷（先前失敗訊息與成功訊息同色同樣式，
// 那個勾是唯一的區別）。
type Msg = { ok: boolean; text: string } | null

function StatusMsg({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <span role={msg.ok ? 'status' : 'alert'} aria-live={msg.ok ? 'polite' : 'assertive'} className={`text-xs inline-flex items-center gap-1 ${msg.ok ? 'text-gray-700' : 'text-danger'}`}>
      {msg.ok && <Check size={12} weight="bold" />}
      {msg.text}
    </span>
  )
}

interface Props {
  userId: string
  initialName: string
  initialSeed: string
}

export default function ProfileSettingsForm({ userId, initialName, initialSeed }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { t } = useI18n()

  const [name, setName] = useState(initialName)
  const [seed, setSeed] = useState(initialSeed)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [nameMsg, setNameMsg] = useState<Msg>(null)
  const [avatarMsg, setAvatarMsg] = useState<Msg>(null)
  const [pwMsg, setPwMsg] = useState<Msg>(null)
  const [loading, setLoading] = useState<'name' | 'avatar' | 'pw' | null>(null)

  async function saveName() {
    if (!name.trim()) return
    setLoading('name')
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId)
    setLoading(null)
    setNameMsg(error ? { ok: false, text: t('settings.saveFail') } : { ok: true, text: t('settings.nameUpdated') })
    if (!error) router.refresh()
    setTimeout(() => setNameMsg(null), 3000)
  }

  async function saveAvatar(newSeed: string) {
    setSeed(newSeed)
    setLoading('avatar')
    const { error } = await supabase.from('profiles').update({ avatar_seed: newSeed }).eq('id', userId)
    setLoading(null)
    setAvatarMsg(error ? { ok: false, text: t('settings.saveFail') } : { ok: true, text: t('settings.avatarUpdated') })
    if (!error) router.refresh()
    setTimeout(() => setAvatarMsg(null), 3000)
  }

  async function savePassword() {
    if (newPassword.length < 6) { setPwMsg({ ok: false, text: t('auth.pwTooShort') }); return }
    if (newPassword !== confirmPassword) { setPwMsg({ ok: false, text: t('settings.pwMismatch') }); return }
    setLoading('pw')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(null)
    if (error) {
      setPwMsg({ ok: false, text: t('settings.updateFail') })
    } else {
      setPwMsg({ ok: true, text: t('settings.pwUpdated') })
      setNewPassword('')
      setConfirmPassword('')
    }
    setTimeout(() => setPwMsg(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* 暱稱 */}
      <section className={cardClass({ className: 'space-y-3' })}>
        <div className="-mx-5 -mt-5 section-band px-5 py-3 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">{t('settings.nickname')}</h2>
        </div>
        <label htmlFor="profile-display-name" className="sr-only">{t('settings.nickname')}</label>
        <input
          id="profile-display-name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder={t('settings.nicknamePlaceholder')}
          maxLength={20}
        />
        <div className="flex items-center justify-between">
          {nameMsg ? <StatusMsg msg={nameMsg} /> : <span />}
          <Button
            onClick={saveName}
            disabled={loading === 'name' || !name.trim() || name.trim() === initialName}
            size="sm"
          >
            {loading === 'name' ? t('settings.saving') : t('common.save')}
          </Button>
        </div>
      </section>

      {/* 頭像 */}
      <section className={cardClass({ className: 'space-y-3' })}>
        <div className="-mx-5 -mt-5 section-band px-5 py-3 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">{t('settings.avatar')}</h2>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_SEEDS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => saveAvatar(s)}
              aria-label={`${t('settings.avatar')} ${AVATAR_SEEDS.indexOf(s) + 1}`}
              aria-pressed={seed === s}
              className={`rounded-full border-2 transition-colors ${seed === s ? 'border-primary' : 'border-transparent'}`}
            >
              <BibleAvatar seed={s} className="w-full aspect-square" />
            </button>
          ))}
        </div>
        {avatarMsg && <p><StatusMsg msg={avatarMsg} /></p>}
      </section>

      {/* 密碼 */}
      <section className={cardClass({ className: 'space-y-3' })}>
        <div className="-mx-5 -mt-5 section-band px-5 py-3 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">{t('settings.changePassword')}</h2>
        </div>
        <label htmlFor="settings-new-password" className="sr-only">{t('settings.newPwPlaceholder')}</label>
        <input
          id="settings-new-password"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder={t('settings.newPwPlaceholder')}
        />
        <label htmlFor="settings-confirm-password" className="sr-only">{t('settings.confirmPwPlaceholder')}</label>
        <input
          id="settings-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder={t('settings.confirmPwPlaceholder')}
        />
        <div className="flex items-center justify-between">
          {pwMsg ? <StatusMsg msg={pwMsg} /> : <span />}
          <Button
            onClick={savePassword}
            disabled={loading === 'pw' || !newPassword}
            size="sm"
          >
            {loading === 'pw' ? t('settings.updating') : t('settings.updatePassword')}
          </Button>
        </div>
      </section>
    </div>
  )
}
