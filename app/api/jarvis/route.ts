import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const PROMPT = 'Du är Jarvis, AI-assistent för Sibbjäns Ops. Svara alltid på svenska.'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userMessage = body.message
    if (!userMessage) {
      return NextResponse.json({ error: 'message saknas' }, { status: 400 })
    }
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    return NextResponse.json({ reply: text })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'online', model: 'claude-sonnet-4-6' })
}