'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { useI18n } from '@/components/i18n/I18nProvider'

const AVATAR_SEEDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu']

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

  const [nameMsg, setNameMsg] = useState('')
  const [avatarMsg, setAvatarMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [loading, setLoading] = useState<'name' | 'avatar' | 'pw' | null>(null)

  async function saveName() {
    if (!name.trim()) return
    setLoading('name')
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId)
    setLoading(null)
    setNameMsg(error ? t('settings.saveFail') : t('settings.nameUpdated'))
    if (!error) router.refresh()
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function saveAvatar(newSeed: string) {
    setSeed(newSeed)
    setLoading('avatar')
    const { error } = await supabase.from('profiles').update({ avatar_seed: newSeed }).eq('id', userId)
    setLoading(null)
    setAvatarMsg(error ? t('settings.saveFail') : t('settings.avatarUpdated'))
    if (!error) router.refresh()
    setTimeout(() => setAvatarMsg(''), 3000)
  }

  async function savePassword() {
    if (newPassword.length < 6) { setPwMsg(t('auth.pwTooShort')); return }
    if (newPassword !== confirmPassword) { setPwMsg(t('settings.pwMismatch')); return }
    setLoading('pw')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(null)
    if (error) {
      setPwMsg(t('settings.updateFail'))
    } else {
      setPwMsg(t('settings.pwUpdated'))
      setNewPassword('')
      setConfirmPassword('')
    }
    setTimeout(() => setPwMsg(''), 3000)
  }

  return (
    <div className="space-y-6">
      {/* 暱稱 */}
      <section className="bg-surface rounded-2xl p-5 shadow-sm space-y-3">
        <div className="-mx-5 -mt-5 section-band px-5 py-3 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">{t('settings.nickname')}</h2>
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('settings.nicknamePlaceholder')}
          maxLength={20}
        />
        <div className="flex items-center justify-between">
          {nameMsg ? <span className="text-xs text-gray-700">{nameMsg}</span> : <span />}
          <button
            onClick={saveName}
            disabled={loading === 'name' || !name.trim() || name.trim() === initialName}
            className="btn-gradient text-gray-900 text-sm px-4 py-2 rounded-xl font-medium hover:brightness-95 transition-[filter] disabled:opacity-40"
          >
            {loading === 'name' ? t('settings.saving') : t('common.save')}
          </button>
        </div>
      </section>

      {/* 頭像 */}
      <section className="bg-surface rounded-2xl p-5 shadow-sm space-y-3">
        <div className="-mx-5 -mt-5 section-band px-5 py-3 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">{t('settings.avatar')}</h2>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_SEEDS.map(s => (
            <button
              key={s}
              onClick={() => saveAvatar(s)}
              className={`rounded-full border-2 transition-colors ${seed === s ? 'border-primary' : 'border-transparent'}`}
            >
              <BibleAvatar seed={s} className="w-full aspect-square" />
            </button>
          ))}
        </div>
        {avatarMsg && <p className="text-xs text-gray-700">{avatarMsg}</p>}
      </section>

      {/* 密碼 */}
      <section className="bg-surface rounded-2xl p-5 shadow-sm space-y-3">
        <div className="-mx-5 -mt-5 section-band px-5 py-3 rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">{t('settings.changePassword')}</h2>
        </div>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('settings.newPwPlaceholder')}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('settings.confirmPwPlaceholder')}
        />
        <div className="flex items-center justify-between">
          {pwMsg ? <span className="text-xs text-gray-700">{pwMsg}</span> : <span />}
          <button
            onClick={savePassword}
            disabled={loading === 'pw' || !newPassword}
            className="btn-gradient text-gray-900 text-sm px-4 py-2 rounded-xl font-medium hover:brightness-95 transition-[filter] disabled:opacity-40"
          >
            {loading === 'pw' ? t('settings.updating') : t('settings.updatePassword')}
          </button>
        </div>
      </section>
    </div>
  )
}
