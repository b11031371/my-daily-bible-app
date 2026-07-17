'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

type State = 'loading' | 'unsupported' | 'subscribed' | 'unsubscribed'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`

interface Props {
  initialHour: number
}

export default function PushSubscribeButton({ initialHour }: Props) {
  const { t } = useI18n()
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [hour, setHour] = useState(initialHour)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? 'subscribed' : 'unsubscribed')
      })
    })
  }, [])

  async function subscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('unsubscribed'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
      })
      setState('subscribed')
    } catch {
      setState('unsubscribed')
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const json = sub.toJSON() as { endpoint: string }
        await sub.unsubscribe()
        await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint }),
        })
      }
      setState('unsubscribed')
    } finally {
      setBusy(false)
    }
  }

  async function updateHour(newHour: number) {
    setHour(newHour)
    await fetch('/api/subscribe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hour: newHour }),
    })
  }

  if (state === 'loading' || state === 'unsupported') return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{t('push.title')}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {state === 'subscribed' ? t('push.remindAt', { time: formatHour(hour) }) : t('push.enableHint')}
          </p>
        </div>
        <button
          onClick={state === 'subscribed' ? unsubscribe : subscribe}
          disabled={busy}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${state === 'subscribed' ? 'bg-primary' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${state === 'subscribed' ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {state === 'subscribed' && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{t('push.reminderTime')}</p>
          <select
            value={hour}
            onChange={e => updateHour(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-surface"
          >
            {HOURS.map(h => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
