import type { Payment } from '../data'

// Personal payment checklist only. No receipt or banking details are stored here.
const key = 'unisync:autumn-2026-payment-statuses:v1'

export function loadPaymentStatuses(schedule: Payment[]): Payment[] {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, unknown>
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return schedule
    return schedule.map(payment => {
      const status = stored[payment.id]
      return status === 'Due' || status === 'Paid' ? { ...payment, status } : payment
    })
  } catch {
    return schedule
  }
}

export function savePaymentStatuses(schedule: Payment[]): void {
  try {
    const statuses = Object.fromEntries(
      schedule
        .filter(payment => payment.status === 'Due' || payment.status === 'Paid')
        .map(payment => [payment.id, payment.status])
    )
    localStorage.setItem(key, JSON.stringify(statuses))
  } catch {
    // The schedule still works if browser storage is unavailable.
  }
}
