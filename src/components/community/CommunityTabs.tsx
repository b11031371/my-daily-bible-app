'use client'
import { useState } from 'react'
import GroupsPanel from '@/components/tree/GroupsPanel'
import ReflectionFeed from '@/components/community/ReflectionFeed'
import type { GroupWithMembers, ReflectionWithProfile } from '@/types/app'

interface Props {
  myGroups: GroupWithMembers[]
  otherGroups: GroupWithMembers[]
  canCreateOrJoin: boolean
  reflections: ReflectionWithProfile[]
  currentUserId: string | null
  currentUserAvatarSeed: string | null
  currentUserIsAdmin: boolean
  scrollTo?: string
  initialTab?: 'groups' | 'feed'
}

export default function CommunityTabs({
  myGroups, otherGroups, canCreateOrJoin,
  reflections, currentUserId, currentUserAvatarSeed, currentUserIsAdmin, scrollTo, initialTab,
}: Props) {
  const [tab, setTab] = useState<'groups' | 'feed'>(initialTab ?? 'feed')

  return (
    <>
      {/* Tab bar */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors
            ${tab === 'feed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          反思留言
        </button>
        <button
          onClick={() => setTab('groups')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors
            ${tab === 'groups' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          種樹群組
        </button>
      </div>

      {/* Content */}
      {tab === 'groups' ? (
        <GroupsPanel
          myGroups={myGroups}
          otherGroups={otherGroups}
          canCreateOrJoin={canCreateOrJoin}
        />
      ) : (
        <ReflectionFeed
          reflections={reflections}
          currentUserId={currentUserId}
          currentUserAvatarSeed={currentUserAvatarSeed}
          currentUserIsAdmin={currentUserIsAdmin}
          scrollTo={scrollTo}
        />
      )}
    </>
  )
}
