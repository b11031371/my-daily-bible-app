'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  groupId: string
  groupName: string
  inviteCode: string
  isMember: boolean
  canInvite: boolean
  membersWarning: boolean
  isLastMember: boolean
}

export default function GroupActions({ groupId, groupName, inviteCode, isMember, canInvite, membersWarning, isLastMember }: Props) {
  const router = useRouter()
  const { t } = useI18n()
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(groupName)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  async function handleRename() {
    if (!newName.trim() || newName.trim() === groupName) { setEditingName(false); return }
    await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setEditingName(false)
    router.refresh()
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyShareText() {
    const text = t('group.shareText', { code: inviteCode })
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLeave() {
    setLeaving(true)
    await fetch(`/api/groups/${groupId}/leave`, { method: 'DELETE' })
    router.push('/community')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Rename */}
      {isMember && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-2">{t('group.groupName')}</p>
          {editingName ? (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={20}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button onClick={handleRename} className="text-sm font-medium text-primary-dark px-3 py-2">{t('common.save')}</button>
              <button onClick={() => setEditingName(false)} className="text-sm text-gray-400 px-2 py-2">{t('common.cancel')}</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1.5"
            >
              <span>{groupName}</span>
              <span className="text-gray-300 text-xs">✎</span>
            </button>
          )}
        </div>
      )}

      {/* Invite */}
      {isMember && canInvite && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t('group.inviteTitle')}</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-mono font-bold text-xl tracking-widest text-gray-900 text-center">
              {inviteCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="text-xs bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 font-medium px-3 py-3 rounded-xl hover:brightness-95 transition-[filter]"
            >
              {copied ? '✓' : t('group.copy')}
            </button>
          </div>
          <button
            onClick={handleCopyShareText}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
          >
            {t('group.copyShareText')}
          </button>
        </div>
      )}

      {/* Leave */}
      {isMember && (
        showLeaveConfirm ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-700 mb-3 text-center">
              {isLastMember
                ? t('group.leaveLastMember')
                : membersWarning ? t('group.leaveDormant') : t('group.leaveConfirm')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 text-sm text-red-500 border border-red-200 rounded-xl py-2.5 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {leaving ? t('group.leaving') : t('group.confirmLeave')}
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 text-sm text-gray-600 bg-gray-50 rounded-xl py-2.5"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full text-sm text-gray-400 py-2"
          >
            {t('group.leaveGroup')}
          </button>
        )
      )}
    </div>
  )
}
