import { NextResponse } from 'next/server'
import { fetchAvailableDates } from '@/lib/github/api'

export async function GET() {
  const dates = await fetchAvailableDates()
  return NextResponse.json(dates)
}
