export async function claimGeminiRateSlot(admin) {
  const { data, error } = await admin.rpc('claim_gemini_rate_slot')
  if (error) throw new Error('Gemini rate limit is not configured')
  return data === true
}
