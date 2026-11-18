export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const ORDER_STATUS_META: Record<
  string,
  { label: string; colorClass: string; icon: string }
> = {
  AWAITING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    colorClass: 'bg-warning/15 text-warning border-warning/30',
    icon: '⏳',
  },
  PENDING: {
    label: 'Menunggu Konfirmasi',
    colorClass: 'bg-info/15 text-info border-info/30',
    icon: '•',
  },
  CONFIRMED: {
    label: 'Diterima Barista',
    colorClass: 'bg-accent/15 text-accent border-accent/30',
    icon: '✓',
  },
  PREPARING: {
    label: 'Sedang Dibuat',
    colorClass: 'bg-warning/15 text-warning border-warning/30',
    icon: '☕',
  },
  READY: {
    label: 'Siap Disajikan',
    colorClass: 'bg-success/15 text-success border-success/30',
    icon: '★',
  },
  SERVED: {
    label: 'Telah Disajikan',
    colorClass: 'bg-olive/15 text-olive border-olive/30',
    icon: '✓',
  },
  COMPLETED: {
    label: 'Selesai',
    colorClass: 'bg-success/15 text-success border-success/30',
    icon: '✓',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    colorClass: 'bg-danger/15 text-danger border-danger/30',
    icon: '✕',
  },
};

export const PAYMENT_STATUS_META: Record<string, { label: string; colorClass: string }> = {
  CREATED: { label: 'Menunggu Bayar', colorClass: 'bg-warning/15 text-warning border-warning/30' },
  PENDING: { label: 'Pending', colorClass: 'bg-warning/15 text-warning border-warning/30' },
  PAID: { label: 'Lunas', colorClass: 'bg-success/15 text-success border-success/30' },
  FAILED: { label: 'Gagal', colorClass: 'bg-danger/15 text-danger border-danger/30' },
  EXPIRED: { label: 'Kedaluwarsa', colorClass: 'bg-danger/15 text-danger border-danger/30' },
  CANCELLED: { label: 'Dibatalkan', colorClass: 'bg-danger/15 text-danger border-danger/30' },
  REFUNDED: { label: 'Refund', colorClass: 'bg-info/15 text-info border-info/30' },
  PARTIALLY_REFUNDED: {
    label: 'Refund Sebagian',
    colorClass: 'bg-info/15 text-info border-info/30',
  },
};
