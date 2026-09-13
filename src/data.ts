export type CalendarState = 'Pending' | 'Added' | 'Ignored'
export type EventCategory = 'Exam' | 'Deadline' | 'College event' | 'Holiday'
export type EventItem = { id: string; title: string; date: string; time?: string; location?: string; category: EventCategory; description: string; source: string; calendarState: CalendarState; googleCalendarEventId?: string }
export type Notice = { id: string; title: string; date: string; category: string; priority: 'High' | 'Normal'; summary: string; attachment?: string; source: string }
export type PaymentStatus = 'Due' | 'Paid' | 'Receipt Uploaded' | 'Receipt Sent' | 'Awaiting Confirmation' | 'Confirmed'
export type Payment = { id: string; title: string; amount: number; dueDate: string; status: PaymentStatus; transactionId?: string }
export type DocumentItem = { id: string; name: string; category: string; date: string; size: string; type: string }

const year = new Date().getFullYear()
const month = new Date().getMonth()
const iso = (day: number, monthOffset = 0) => { const d = new Date(year, month + monthOffset, day); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export const today = iso(new Date().getDate())
export const events: EventItem[] = [
  { id: 'e1', title: 'Semester fee deadline', date: iso(18), category: 'Deadline', description: 'Submit the semester tuition payment and email the mobile banking receipt to the accounts office.', source: 'Fee payment notice · Accounts Office', calendarState: 'Pending' },
  { id: 'e2', title: 'Physics practical examination', date: iso(17), time: '9:00 AM', location: 'Science Lab 2', category: 'Exam', description: 'Bring your lab record and college ID. Reporting time is 8:30 AM.', source: 'Practical exam schedule · Examination Office', calendarState: 'Added' },
  { id: 'e3', title: 'Student innovation showcase', date: iso(25), time: '11:00 AM', location: 'Main Auditorium', category: 'College event', description: 'Student project presentations and a short talk from alumni founders.', source: 'Campus events circular · Student Affairs', calendarState: 'Pending' },
  { id: 'e4', title: 'Constitution Day holiday', date: iso(20), category: 'Holiday', description: 'All regular classes will remain closed for the public holiday.', source: 'Academic calendar · Registrar', calendarState: 'Ignored' },
  { id: 'e5', title: 'Course registration opens', date: iso(3, 1), category: 'Deadline', description: 'Review next semester’s elective offerings and complete registration through the college portal.', source: 'Registration advisory · Academic Office', calendarState: 'Pending' },
]
export const notices: Notice[] = [
  { id: 'n1', title: 'Semester fee payment window is open', date: iso(12), category: 'Payments', priority: 'High', summary: 'Pay your semester fee by the 18th. After paying through mobile banking, send a receipt with your student ID and transaction details to the accounts office.', attachment: 'Fee payment instructions.pdf', source: 'Accounts Office · Email' },
  { id: 'n2', title: 'Practical examination schedule published', date: iso(11), category: 'Exams', priority: 'High', summary: 'The Physics practical is scheduled for the 17th at 9:00 AM in Science Lab 2. Arrive 30 minutes early with your lab record and college ID.', attachment: 'Practical timetable.pdf', source: 'Examination Office · Email' },
  { id: 'n3', title: 'Updated class routine for this semester', date: iso(10), category: 'Academics', priority: 'Normal', summary: 'The revised class routine includes room changes for two afternoon sessions. Check the attached schedule before your next class.', attachment: 'Revised routine.pdf', source: 'Academic Office · Email' },
  { id: 'n4', title: 'Innovation showcase registration', date: iso(8), category: 'Campus life', priority: 'Normal', summary: 'Students may register teams for the innovation showcase by the 22nd. The event takes place in the Main Auditorium on the 25th.', source: 'Student Affairs · Email' },
]
export const payments: Payment[] = [
  { id: 'p1', title: 'Semester tuition', amount: 28500, dueDate: iso(18), status: 'Due' },
  { id: 'p2', title: 'Library renewal', amount: 1200, dueDate: iso(5), status: 'Confirmed', transactionId: 'MB-842791' },
  { id: 'p3', title: 'Lab fee', amount: 3500, dueDate: iso(2), status: 'Awaiting Confirmation', transactionId: 'MB-842610' },
]
export const documents: DocumentItem[] = [
  { id: 'd1', name: 'Practical timetable.pdf', category: 'Academic', date: iso(11), size: '238 KB', type: 'PDF' },
  { id: 'd2', name: 'Revised class routine.pdf', category: 'Academic', date: iso(10), size: '184 KB', type: 'PDF' },
  { id: 'd3', name: 'Fee payment instructions.pdf', category: 'Finance', date: iso(12), size: '312 KB', type: 'PDF' },
  { id: 'd4', name: 'Student ID card.png', category: 'Personal', date: iso(1), size: '1.4 MB', type: 'Image' },
  { id: 'd5', name: 'Semester registration.pdf', category: 'Forms', date: iso(4), size: '428 KB', type: 'PDF' },
]
export const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', options)
export const money = (value: number) => `NPR ${value.toLocaleString('en-US')}`
