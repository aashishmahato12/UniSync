export type CalendarState = 'Pending' | 'Added' | 'Ignored'
export type EventCategory = 'Exam' | 'Deadline' | 'College event' | 'Holiday'
export type CustomEventInput = { title: string; date: string; time?: string; location?: string; category: EventCategory; description?: string }
export type EventItem = { id: string; title: string; date: string; time?: string; location?: string; category: EventCategory; description: string; source: string; isCustom?: boolean; gmailMessageId?: string; sourceUrl?: string; calendarState: CalendarState; googleCalendarEventId?: string }
export const normalizeEventCategory = (title: string, category: string): EventCategory => {
  // Correct clear extraction mistakes without guessing at less obvious notices.
  if (/\b(holiday|day of mourning|martyrs?['’]?(?:s)? day)\b/i.test(title)) return 'Holiday'
  if (/\b(deadline|due date|last date)\b/i.test(title) && category === 'College event') return 'Deadline'
  return category === 'Exam' || category === 'Deadline' || category === 'Holiday'
    ? category
    : 'College event'
}
export type Notice = { id: string; title: string; date: string; receivedAt?: string; category: string; priority: 'High' | 'Normal'; summary: string; bodyText?: string; attachment?: string; attachmentNames?: string[]; gmailMessageId?: string; sourceUrl?: string; source: string }
export type PaymentStatus = 'Due' | 'Paid' | 'Receipt Uploaded' | 'Receipt Sent' | 'Awaiting Confirmation' | 'Confirmed'
export type Payment = {
  id: string
  title: string
  amount: number
  dueDate: string
  dateLabel: string
  status: PaymentStatus
  year?: number
  semester?: number
  admissionFee: number
  universityExamFee: number
  collegeFee: number
  details: string
  transactionId?: string
}
export type DocumentItem = { id: string; name: string; category: string; date: string; size: string; type: string; mimeType: string; storagePath: string; storageBucket?: 'college-attachments' | 'user-documents'; gmailMessageId: string; emailSubject: string; sender: string; noticeSummary?: string; extractedText?: string; extractionStatus?: 'Pending' | 'Ready' | 'No text'; sourceUrl: string }

const year = new Date().getFullYear()
const month = new Date().getMonth()
const iso = (day: number, monthOffset = 0) => { const d = new Date(year, month + monthOffset, day); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export const today = iso(new Date().getDate())
export const events: EventItem[] = [
  { id: 'e1', title: '1st semester fee · tentative date', date: '2026-09-15', category: 'Deadline', description: 'Autumn 2026 batch schedule lists NPR 264,500 before the 1st semester. Confirm the final payment date with the college before paying.', source: 'Printed Autumn 2026 fee schedule', calendarState: 'Pending' },
  { id: 'e2', title: 'Physics practical examination', date: iso(17), time: '9:00 AM', location: 'Science Lab 2', category: 'Exam', description: 'Bring your lab record and college ID. Reporting time is 8:30 AM.', source: 'Practical exam schedule · Examination Office', calendarState: 'Added' },
  { id: 'e3', title: 'Student innovation showcase', date: iso(25), time: '11:00 AM', location: 'Main Auditorium', category: 'College event', description: 'Student project presentations and a short talk from alumni founders.', source: 'Campus events circular · Student Affairs', calendarState: 'Pending' },
  { id: 'e4', title: 'Constitution Day holiday', date: iso(20), category: 'Holiday', description: 'All regular classes will remain closed for the public holiday.', source: 'Academic calendar · Registrar', calendarState: 'Ignored' },
  { id: 'e5', title: 'Course registration opens', date: iso(3, 1), category: 'Deadline', description: 'Review next semester’s elective offerings and complete registration through the college portal.', source: 'Registration advisory · Academic Office', calendarState: 'Pending' },
]
export const notices: Notice[] = [
  { id: 'n1', title: 'Autumn 2026 batch fee schedule', date: iso(12), category: 'Payments', priority: 'High', summary: 'The printed schedule lists NPR 264,500 before the 1st semester, tentatively on 15 September 2026. Dates may change; confirm the latest notice with the college.', source: 'Printed fee schedule · Reference' },
  { id: 'n2', title: 'Practical examination schedule published', date: iso(11), category: 'Exams', priority: 'High', summary: 'The Physics practical is scheduled for the 17th at 9:00 AM in Science Lab 2. Arrive 30 minutes early with your lab record and college ID.', attachment: 'Practical timetable.pdf', source: 'Examination Office · Email' },
  { id: 'n3', title: 'Updated class routine for this semester', date: iso(10), category: 'Academics', priority: 'Normal', summary: 'The revised class routine includes room changes for two afternoon sessions. Check the attached schedule before your next class.', attachment: 'Revised routine.pdf', source: 'Academic Office · Email' },
  { id: 'n4', title: 'Innovation showcase registration', date: iso(8), category: 'Campus life', priority: 'Normal', summary: 'Students may register teams for the innovation showcase by the 22nd. The event takes place in the Main Auditorium on the 25th.', source: 'Student Affairs · Email' },
]
// Autumn 2026 batch fee schedule supplied by the student. All dates are tentative.
export const payments: Payment[] = [
  { id: 'admission', title: 'Admission & registration', amount: 140000, dueDate: '', dateLabel: 'At admission', status: 'Paid', admissionFee: 140000, universityExamFee: 0, collegeFee: 0, details: 'One-time, non-refundable admission fee.' },
  { id: 'semester-1', title: '1st semester', amount: 264500, dueDate: '2026-09-15', dateLabel: 'Before 1st semester', status: 'Due', year: 1, semester: 1, admissionFee: 0, universityExamFee: 110000, collegeFee: 154500, details: '1st year university fee + 1st semester fee + MOE fee (NPR 1,500).' },
  { id: 'semester-2', title: '2nd semester', amount: 153000, dueDate: '2027-02-20', dateLabel: 'Before 2nd semester', status: 'Due', year: 1, semester: 2, admissionFee: 0, universityExamFee: 0, collegeFee: 153000, details: '2nd semester fee.' },
  { id: 'semester-3', title: '3rd semester', amount: 264500, dueDate: '2027-09-15', dateLabel: 'Before 3rd semester', status: 'Due', year: 2, semester: 3, admissionFee: 0, universityExamFee: 110000, collegeFee: 154500, details: '2nd year university fee + 3rd semester fee + MOE fee (NPR 1,500).' },
  { id: 'semester-4', title: '4th semester', amount: 153000, dueDate: '2028-02-19', dateLabel: 'Before 4th semester', status: 'Due', year: 2, semester: 4, admissionFee: 0, universityExamFee: 0, collegeFee: 153000, details: '4th semester fee.' },
  { id: 'semester-5', title: '5th semester', amount: 264500, dueDate: '2028-09-01', dateLabel: 'Before 5th semester', status: 'Due', year: 3, semester: 5, admissionFee: 0, universityExamFee: 110000, collegeFee: 154500, details: '3rd year university fee + 5th semester fee + MOE fee (NPR 1,500).' },
  { id: 'semester-6', title: '6th / final semester', amount: 153000, dueDate: '2029-02-19', dateLabel: 'Before 6th semester', status: 'Due', year: 3, semester: 6, admissionFee: 0, universityExamFee: 0, collegeFee: 153000, details: '6th / final semester fee.' },
]
export const paymentScheduleTotals = { admissionFee: 140000, universityExamFee: 330000, collegeFee: 922500, total: 1392500 }

export const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', options)
export const money = (value: number) => `NPR ${value.toLocaleString('en-US')}`
