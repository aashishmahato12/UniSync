import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSpeechTranscript } from './src/services/speechTranscript.ts'

const result = (transcript, isFinal = false) => ({ 0: { transcript }, isFinal })
const spoken = entries => {
  const { final, interim } = readSpeechTranscript(entries)
  return [final, interim].filter(Boolean).join(' ')
}

test('uses the latest changing hypothesis without repeating its older versions', () => {
  assert.equal(spoken([
    result('hello', true), result('hello', true),
    result('hello how'), result('hello how are'),
    result('hello how are you doing'),
  ]), 'hello hello how are you doing')
})

test('merges overlapping finalized snapshots without duplicating words', () => {
  assert.equal(spoken([
    result('hello how', true), result('hello how are', true),
    result('are you doing', true),
  ]), 'hello how are you doing')
})

test('keeps distinct phrases and intentional repeated one-word final results', () => {
  assert.equal(spoken([
    result('hello', true), result('hello', true), result('how are you', true),
  ]), 'hello hello how are you')
})

test('ignores an old interim hypothesis already covered by confirmed words', () => {
  assert.equal(spoken([
    result('hello how are you', true), result('hello how'),
  ]), 'hello how are you')
})
