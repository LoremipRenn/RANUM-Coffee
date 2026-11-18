import { ORDER_STATUS_META, PAYMENT_STATUS_META, formatIdr } from './format';

interface OrderTrackConfig {
  accessToken: string;
  apiUrl: string;
  initialStatus: string;
  orderNumber: string;
  totalAmount: number;
}

declare global {
  interface Window {
    __RANUM_TRACK__?: OrderTrackConfig;
  }
}

const trackConfig = window.__RANUM_TRACK__;
if (trackConfig) {
  const STEPS = [
    'AWAITING_PAYMENT',
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'SERVED',
    'COMPLETED',
  ];

  // Restore "Pesan Tambahan" link if customer came from a QR table page
  const savedQr = localStorage.getItem(`ranum_last_qr_${trackConfig.accessToken}`);
  const addMoreLink = document.getElementById('btn-order-more') as HTMLAnchorElement | null;
  if (savedQr && addMoreLink) {
    addMoreLink.href = `/t/${savedQr}`;
    addMoreLink.classList.remove('hidden');
  }

  const renderOrderState = (order: {
    status: string;
    payments?: Array<{ status: string; method?: string | null; midtransOrderId?: string | null }>;
  }) => {
    const statusBadge = document.getElementById('track-order-badge');
    const meta = ORDER_STATUS_META[order.status] ?? {
      label: order.status,
      colorClass: 'bg-surface-3 text-text-primary border-border',
      icon: '•',
    };
    if (statusBadge) {
      statusBadge.textContent = `${meta.icon} ${meta.label}`;
      statusBadge.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${meta.colorClass}`;
    }

    const latestPayment = order.payments?.[0];
    const payBadge = document.getElementById('track-payment-badge');
    if (payBadge && latestPayment) {
      const pMeta = PAYMENT_STATUS_META[latestPayment.status] ?? {
        label: latestPayment.status,
        colorClass: 'bg-surface-3 text-text-secondary border-border',
      };
      payBadge.textContent = pMeta.label;
      payBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${pMeta.colorClass}`;
    }

    const payActionBox = document.getElementById('track-pay-actions');
    const isPaid = order.payments?.some((p) => p.status === 'PAID');
    if (payActionBox) {
      payActionBox.classList.toggle('hidden', Boolean(isPaid) || order.status === 'CANCELLED');
    }

    // Highlight timeline steps
    const currentIdx = STEPS.indexOf(order.status);
    document.querySelectorAll<HTMLElement>('[data-step-status]').forEach((el) => {
      const stepStatus = el.dataset.stepStatus || '';
      const stepIdx = STEPS.indexOf(stepStatus);
      const dot = el.querySelector<HTMLElement>('[data-step-dot]');
      const label = el.querySelector<HTMLElement>('[data-step-label]');

      if (order.status === 'CANCELLED') {
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-danger/50';
        if (label) label.className = 'text-sm text-text-muted';
        return;
      }

      const reached = stepIdx !== -1 && currentIdx >= stepIdx;
      const isCurrent = stepStatus === order.status;
      if (dot) {
        dot.className = isCurrent
          ? 'w-3.5 h-3.5 rounded-full bg-accent ring-4 ring-accent/20'
          : reached
            ? 'w-3 h-3 rounded-full bg-success'
            : 'w-3 h-3 rounded-full bg-surface-3 border border-border';
      }
      if (label) {
        label.className = isCurrent
          ? 'text-sm font-semibold text-accent'
          : reached
            ? 'text-sm font-medium text-text-primary'
            : 'text-sm text-text-muted';
      }
    });
  };

  const refreshOrder = async () => {
    try {
      const res = await fetch(`${trackConfig.apiUrl}/public/orders/${trackConfig.accessToken}`);
      if (!res.ok) return;
      const data = await res.json();
      renderOrderState(data);
    } catch {
      // silent retry on next tick
    }
  };

  // Realtime SSE + fallback polling
  if (typeof EventSource !== 'undefined') {
    const sse = new EventSource(
      `${trackConfig.apiUrl}/public/orders/${trackConfig.accessToken}/stream`,
    );
    sse.addEventListener('ORDER_UPDATED', () => {
      void refreshOrder();
    });
    sse.addEventListener('PAYMENT_UPDATED', () => {
      void refreshOrder();
    });
  }

  window.setInterval(() => {
    void refreshOrder();
  }, 8000);

  // Retry or Pay Now button
  document.getElementById('btn-pay-now')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-pay-now') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Memuat pembayaran...';
    }
    try {
      const res = await fetch(
        `${trackConfig.apiUrl}/public/orders/${trackConfig.accessToken}/payments/snap`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceNew: true }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memuat pembayaran');

      if (data.sandboxSimulator) {
        const modal = document.getElementById('sandbox-pay-modal');
        const orderNumEl = document.getElementById('spm-order-number');
        const amountEl = document.getElementById('spm-amount');
        if (orderNumEl) orderNumEl.textContent = trackConfig.orderNumber;
        if (amountEl) amountEl.textContent = formatIdr(trackConfig.totalAmount);
        const confirmBtn = document.getElementById('spm-confirm-btn');
        if (confirmBtn) {
          confirmBtn.onclick = async () => {
            await fetch(
              `${trackConfig.apiUrl}/public/orders/${trackConfig.accessToken}/payments/simulate-success`,
              { method: 'POST' },
            );
            modal?.classList.remove('is-open');
            await refreshOrder();
          };
        }
        document.getElementById('spm-later-btn')?.addEventListener('click', () => {
          modal?.classList.remove('is-open');
        });
        modal?.classList.add('is-open');
      } else if (window.snap && data.snapToken) {
        const modal = document.getElementById('midtrans-embed-modal');
        const container = document.getElementById('snap-embed-container');
        const orderNumEl = document.getElementById('mem-order-number');
        const amountEl = document.getElementById('mem-amount');
        const closeBtn = document.getElementById('mem-close');

        if (modal && container) {
          if (orderNumEl) orderNumEl.textContent = trackConfig.orderNumber;
          if (amountEl) amountEl.textContent = formatIdr(trackConfig.totalAmount);
          container.innerHTML = '';

          const closeAndSync = async () => {
            modal.classList.remove('is-open');
            try {
              await fetch(
                `${trackConfig.apiUrl}/public/orders/${trackConfig.accessToken}/payments/sync`,
                { method: 'POST' },
              );
            } catch {
              // ignore
            }
            await refreshOrder();
          };

          if (closeBtn) {
            closeBtn.onclick = () => void closeAndSync();
          }

          modal.classList.add('is-open');
          window.snap.embed(data.snapToken, {
            embedId: 'snap-embed-container',
            onSuccess: () => void closeAndSync(),
            onPending: () => void closeAndSync(),
            onError: () => void closeAndSync(),
            onClose: () => void closeAndSync(),
          });
        } else {
          window.snap.pay(data.snapToken, {
            onSuccess: () => void refreshOrder(),
            onPending: () => void refreshOrder(),
            onError: () => void refreshOrder(),
            onClose: () => void refreshOrder(),
          });
        }
      } else if (data.snapRedirectUrl) {
        window.location.href = data.snapRedirectUrl;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Bayar Sekarang';
      }
    }
  });

  document.getElementById('btn-sync-payment')?.addEventListener('click', async () => {
    await fetch(`${trackConfig.apiUrl}/public/orders/${trackConfig.accessToken}/payments/sync`, {
      method: 'POST',
    });
    await refreshOrder();
  });
}
