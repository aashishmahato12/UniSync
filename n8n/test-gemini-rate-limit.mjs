import assert from 'node:assert/strict'
import test from 'node:test'
import { claimGeminiRateSlot } from '../gemini-rate-limit.mjs'

test('shared Gemini slot claims distinguish available, full, and broken limiter', async () => {
  assert.equal(await claimGeminiRateSlot({ rpc: async () => ({ data: true, error: null }) }), true)
  assert.equal(await claimGeminiRateSlot({ rpc: async () => ({ data: false, error: null }) }), false)
  await assert.rejects(claimGeminiRateSlot({ rpc: async () => ({ data: null, error: { code: 'PGRST202' } }) }),
    /not configured/)
})
