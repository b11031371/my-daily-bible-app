import PlayPinEntry from '@/components/quiz/PlayPinEntry'

// /play 與 /play/[pin] 刻意放在 (app) 群組之外：訪客也要進得來，
// 而且不該看到底部導覽列。middleware 的 isPublicPage 有對應的白名單。
export default function PlayEntryPage() {
  return <PlayPinEntry />
}
