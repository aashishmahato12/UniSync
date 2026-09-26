import type { Payment } from '../data'
// Personal payment checklist only. No receipt or banking details are stored here.
const storageKey = (email: string) => `unisync:payment-statuses:v3:${email.trim().toLowerCase()}`

export function paymentScheduleForAccount(schedule: Payment[], _email: string): Payment[] {
  // The fee amounts are shared by this batch; payment status is personal.
  return schedule.map(payment => ({ ...payment,
    status: 'Due' as const,
  }))
}

export function loadPaymentStatuses(schedule: Payment[], email: string): Payment[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(email)) || '{}') as Record<string, unknown>
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return schedule
    return schedule.map(payment => {
      const status = stored[payment.id]
      return status === 'Due' || status === 'Paid' ? { ...payment, status } : payment
    })
  } catch {
    return schedule
  }
}

export function savePaymentStatuses(schedule: Payment[], email: string): void {
  try {
    const statuses = Object.fromEntries(
      schedule
        .filter(payment => payment.status === 'Due' || payment.status === 'Paid')
        .map(payment => [payment.id, payment.status])
    )
    localStorage.setItem(storageKey(email), JSON.stringify(statuses))
  } catch {
    // The schedule still works if browser storage is unavailable.
  }
}
