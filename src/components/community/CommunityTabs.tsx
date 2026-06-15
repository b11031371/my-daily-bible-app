'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import GroupsPanel from '@/components/tree/GroupsPanel'
import ReflectionFeed from '@/components/community/ReflectionFeed'
import ReflectionSearch from '@/components/community/ReflectionSearch'
import { createClient } from '@/lib/supabase/client'
import type { GroupWithMembers, ReflectionWithProfile, ReflectionFilters } from '@/types/app'

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
  todayBibleRange: string | null
}

const PAGE_SIZE = 20

const REFLECTION_SELECT = '*, profiles(display_name, avatar_seed), reflection_likes(user_id, profiles(avatar_seed)), reflection_comments(id, user_id, content, created_at, profiles(display_name, avatar_seed))'
const REFLECTION_SELECT_INNER = '*, profiles!inner(display_name, avatar_seed), reflection_likes(user_id, profiles(avatar_seed)), reflection_comments(id, user_id, content, created_at, profiles(display_name, avatar_seed))'

export default function CommunityTabs({
  myGroups, otherGroups, canCreateOrJoin,
  reflections, currentUserId, currentUserAvatarSeed, currentUserIsAdmin, scrollTo, initialTab, todayBibleRange,
}: Props) {
  const [tab, setTab] = useState<'groups' | 'feed'>(initialTab ?? 'feed')

  // Base (unfiltered) reflections with pagination
  const [baseReflections, setBaseReflections] = useState<ReflectionWithProfile[]>(reflections)
  const [hasMore, setHasMore] = useState(reflections.length === PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  // AI / filter search results
  const [filteredReflections, setFilteredReflections] = useState<ReflectionWithProfile[] | null>(null)
  const [filterLoading, setFilterLoading] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || filteredReflections !== null) return
    const lastItem = baseReflections[baseReflections.length - 1]
    if (!lastItem) return

    setLoadingMore(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('reflections')
      .select(REFLECTION_SELECT)
      .order('created_at', { ascending: false })
      .lt('created_at', lastItem.created_at)
      .limit(PAGE_SIZE)

    if (data && data.length > 0) {
      setBaseReflections(prev => [...prev, ...data as ReflectionWithProfile[]])
      setHasMore(data.length === PAGE_SIZE)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, filteredReflections, baseReflections])

  // Keep loadMore ref fresh so the observer closure is never stale
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreRef.current() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  async function handleFilter(filters: ReflectionFilters | null) {
    if (!filters) {
      setFilteredReflections(null)
      return
    }

    setFilterLoading(true)
    const supabase = createClient()
    const hasUserName = !!filters.user_name?.trim()
    const selectStr = hasUserName ? REFLECTION_SELECT_INNER : REFLECTION_SELECT

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('reflections')
      .select(selectStr)
      .order('created_at', { ascending: false })
      .limit(50)

    if (filters.month) {
      const [y, m] = filters.month.split('-').map(Number)
      const monthStart = `${filters.month}-01`
      const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0]
      query = query.gte('note_date', monthStart).lt('note_date', monthEnd)
    }
    if (filters.bible_book) query = query.ilike('bible_range', `%${filters.bible_book}%`)
    if (filters.keyword)    query = query.ilike('content', `%${filters.keyword}%`)
    if (filters.selfOnly && currentUserId) {
      query = query.eq('user_id', currentUserId)
    } else if (hasUserName) {
      query = query.eq('is_anonymous', false).ilike('profiles.display_name', `%${filters.user_name}%`)
    }

    const { data } = await query
    setFilteredReflections((data ?? []) as ReflectionWithProfile[])
    setFilterLoading(false)
  }

  const displayReflections = filteredReflections ?? baseReflections

  return (
    <div className="w-full overflow-x-hidden space-y-4">
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
        <>
          <ReflectionSearch todayBibleRange={todayBibleRange} onFilter={handleFilter} />
          {filterLoading ? (
            <p className="text-sm text-gray-400 animate-pulse py-4 text-center">載入篩選結果…</p>
          ) : (
            <>
              <ReflectionFeed
                reflections={displayReflections}
                currentUserId={currentUserId}
                currentUserAvatarSeed={currentUserAvatarSeed}
                currentUserIsAdmin={currentUserIsAdmin}
                scrollTo={scrollTo}
              />
              {/* Infinite scroll — only for unfiltered feed */}
              {filteredReflections === null && (
                <>
                  <div ref={sentinelRef} className="h-4" />
                  {loadingMore && (
                    <p className="text-sm text-gray-400 animate-pulse py-3 text-center">載入更多…</p>
                  )}
                  {!hasMore && baseReflections.length > 0 && (
                    <p className="text-xs text-gray-300 py-4 text-center">已顯示全部留言</p>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
