// Validate the claimed receipt before downloading any file or sending email.
// Replace this only with the college's verified payment-receipt address.
const recipient = 'aashishmahato8000@gmail.com';
const job = $input.item.json;
const allowedPayments = new Set(['admission', 'semester-1', 'semester-2', 'semester-3', 'semester-4', 'semester-5', 'semester-6']);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  throw new Error('Configure the verified college receipt address before activating this workflow.');
}
if (!allowedPayments.has(job.payment_id) || job.status !== 'processing') {
  throw new Error('Receipt job is not a claimed scheduled payment.');
}
if (!Number.isFinite(Number(job.amount)) || Number(job.amount) <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(job.paid_on)) ||
    !String(job.transaction_id || '').trim() ||
    !String(job.email_body || '').trim()) {
  throw new Error('Receipt job has missing payment details.');
}
const origin = 'https://qozetqmklegcnjgxtgpd.supabase.co';
const url = new URL(String(job.signed_receipt_url || ''));
const expectedPath = '/storage/v1/object/sign/payment-receipts/' +
  String(job.receipt_path || '').split('/').map(encodeURIComponent).join('/');
if (url.origin !== origin || decodeURI(url.pathname) !== decodeURI(expectedPath) ||
    !url.searchParams.has('token')) {
  throw new Error('Receipt URL does not match the private Supabase file path.');
}
if (!['application/pdf', 'image/jpeg', 'image/png'].includes(job.receipt_mime)) {
  throw new Error('Receipt file type is not allowed.');
}
const subject = 'Herald College payment receipt — ' + String(job.payment_title).slice(0, 120);
const details = [
  '',
  'Payment details',
  'Fee: ' + job.payment_title,
  'Amount: NPR ' + Number(job.amount).toLocaleString('en-US'),
  'Paid on: ' + job.paid_on,
  'Method: ' + job.payment_type,
  'Transaction ID: ' + job.transaction_id,
];
return { json: {
  jobId: job.id,
  recipient,
  subject,
  message: String(job.email_body).trim() + '\n' + details.join('\n'),
  receiptUrl: url.toString(),
  receiptName: String(job.receipt_name || 'receipt').slice(0, 180),
} };

