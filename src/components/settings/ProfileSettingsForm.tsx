'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BibleAvatar from '@/components/avatar/BibleAvatar'

const AVATAR_SEEDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu']

interface Props {
  userId: string
  initialName: string
  initialSeed: string
}

export default function ProfileSettingsForm({ userId, initialName, initialSeed }: Props) {
  const supabase = createClient()
  const router = useRouter()

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
    setNameMsg(error ? '儲存失敗，請再試' : '已更新暱稱 ✓')
    if (!error) router.refresh()
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function saveAvatar(newSeed: string) {
    setSeed(newSeed)
    setLoading('avatar')
    const { error } = await supabase.from('profiles').update({ avatar_seed: newSeed }).eq('id', userId)
    setLoading(null)
    setAvatarMsg(error ? '儲存失敗，請再試' : '已更新頭像 ✓')
    if (!error) router.refresh()
    setTimeout(() => setAvatarMsg(''), 3000)
  }

  async function savePassword() {
    if (newPassword.length < 6) { setPwMsg('密碼至少需要 6 個字元'); return }
    if (newPassword !== confirmPassword) { setPwMsg('兩次密碼不一致'); return }
    setLoading('pw')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(null)
    if (error) {
      setPwMsg('更新失敗，請再試')
    } else {
      setPwMsg('密碼已更新 ✓')
      setNewPassword('')
      setConfirmPassword('')
    }
    setTimeout(() => setPwMsg(''), 3000)
  }

  return (
    <div className="space-y-6">
      {/* 暱稱 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">暱稱</h2>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="你的暱稱"
          maxLength={20}
        />
        <div className="flex items-center justify-between">
          {nameMsg ? <span className="text-xs text-gray-700">{nameMsg}</span> : <span />}
          <button
            onClick={saveName}
            disabled={loading === 'name' || !name.trim() || name.trim() === initialName}
            className="bg-primary text-gray-900 text-sm px-4 py-2 rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            {loading === 'name' ? '儲存中...' : '儲存'}
          </button>
        </div>
      </section>

      {/* 頭像 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">頭像</h2>
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
      <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">變更密碼</h2>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="新密碼（至少 6 個字元）"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="確認新密碼"
        />
        <div className="flex items-center justify-between">
          {pwMsg ? <span className="text-xs text-gray-700">{pwMsg}</span> : <span />}
          <button
            onClick={savePassword}
            disabled={loading === 'pw' || !newPassword}
            className="bg-primary text-gray-900 text-sm px-4 py-2 rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            {loading === 'pw' ? '更新中...' : '更新密碼'}
          </button>
        </div>
      </section>
    </div>
  )
}
