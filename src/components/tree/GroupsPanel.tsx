'use client'
import { useState } from 'react'
import Link from 'next/link'
import GroupTreeCard from './GroupTreeCard'
import JoinGroupModal from './JoinGroupModal'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { GroupWithMembers } from '@/types/app'

interface Props {
  myGroups: GroupWithMembers[]
  otherGroups: GroupWithMembers[]
  canCreateOrJoin: boolean
}

function fuzzyMatch(name: string, query: string): boolean {
  const n = name.toLowerCase()
  const q = query.toLowerCase()
  let qi = 0
  for (let ni = 0; ni < n.length && qi < q.length; ni++) {
    if (n[ni] === q[qi]) qi++
  }
  return qi === q.length
}

export default function GroupsPanel({ myGroups, otherGroups, canCreateOrJoin }: Props) {
  const [query, setQuery] = useState('')

  const filteredMine = query ? myGroups.filter(g => fuzzyMatch(g.name, query)) : myGroups
  const filteredOther = query ? otherGroups.filter(g => fuzzyMatch(g.name, query)) : otherGroups

  return (
    <section className="space-y-4">
      {/* Search + actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <MagnifyingGlass size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋群組"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
        </div>
        {canCreateOrJoin && (
          <>
            <JoinGroupModal />
            <Link
              href="/community/groups/new"
              className="text-xs font-medium bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 px-3 py-2.5 rounded-xl hover:brightness-95 transition-[filter] shrink-0"
            >
              ＋ 建立
            </Link>
          </>
        )}
      </div>

      {/* Unified scrollable group list */}
      {myGroups.length === 0 && otherGroups.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
          <p className="text-gray-500 text-sm">還沒有加入任何群組</p>
          <p className="text-xs text-gray-400">邀請至少一位朋友，一起種一棵樹 🌱</p>
          <div className="flex gap-2 justify-center">
            <JoinGroupModal />
            <Link
              href="/community/groups/new"
              className="text-sm font-medium bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 px-4 py-2 rounded-xl hover:brightness-95 transition-[filter]"
            >
              建立群組
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMine.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-400 px-1">我的群組</p>
              {filteredMine.map(g => <GroupTreeCard key={g.id} group={g} />)}
            </>
          )}
          {filteredOther.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-400 px-1 pt-1">其他群組</p>
              {filteredOther.map(g => <GroupTreeCard key={g.id} group={g} />)}
            </>
          )}
          {query && filteredMine.length === 0 && filteredOther.length === 0 && (
            <p className="text-xs text-gray-400 px-1">無符合結果</p>
          )}
        </div>
      )}
    </section>
  )
}
