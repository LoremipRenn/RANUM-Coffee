import { ORDER_STATUS_META, PAYMENT_STATUS_META, escapeHtml, formatIdr } from './format';

interface StaffConfig {
  user: { id: string; name: string; email: string; role: 'ADMIN' | 'CASHIER' | 'BARISTA' | 'WAITER' };
  jwt: string;
  apiUrl: string;
  csrfToken: string;
}

declare global {
  interface Window {
    __RANUM_STAFF__?: StaffConfig;
  }
}

const staff = window.__RANUM_STAFF__;
if (staff) {
  let activeTab = 'queue';
  let statusFilter = '';
  let searchFilter = '';
  let chartPeriod: 'day' | 'month' | 'year' = 'day';

  // Smooth Sidebar Open/Close (Desktop collapse & Mobile slide-over)
  const sidebarEl = document.getElementById('staff-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const openMobileSidebar = () => {
    sidebarEl?.classList.remove('-translate-x-full');
    sidebarBackdrop?.classList.add('is-open');
  };
  const closeMobileSidebar = () => {
    sidebarEl?.classList.add('-translate-x-full');
    sidebarBackdrop?.classList.remove('is-open');
  };

  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => {
    if (window.innerWidth >= 1024) {
      const collapsed = sidebarEl?.getAttribute('data-collapsed') === 'true';
      sidebarEl?.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
    } else {
      const isClosed = sidebarEl?.classList.contains('-translate-x-full');
      if (isClosed) openMobileSidebar();
      else closeMobileSidebar();
    }
  });
  document.getElementById('sidebar-mobile-close')?.addEventListener('click', closeMobileSidebar);
  sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  const proxyFetch = async (path: string, method = 'GET', body?: unknown) => {
    const cleanPath = path.replace(/^\//, '');
    const res = await fetch(`/staff/proxy/${cleanPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': staff.csrfToken,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Permintaan gagal.');
    }
    return data;
  };

  const showNotice = (msg: string, isError = false) => {
    const el = document.getElementById('staff-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium border shadow-lg ${
      isError
        ? 'bg-surface-4 border-danger/50 text-danger'
        : 'bg-surface-4 border-success/50 text-text-primary'
    }`;
    el.classList.remove('hidden');
    window.setTimeout(() => el.classList.add('hidden'), 3500);
  };

  const playChime = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore if audio context blocked before user gesture
    }
  };

  // Tab switching
  const switchTab = (tab: string) => {
    activeTab = tab;
    document.querySelectorAll<HTMLElement>('[data-tab-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.tabPanel !== tab);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-tab-btn]').forEach((btn) => {
      const isActive = btn.dataset.tabBtn === tab;
      btn.className = isActive
        ? 'ranum-btn w-full whitespace-nowrap flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium bg-surface-2 text-accent border-l-2 border-accent'
        : 'ranum-btn w-full whitespace-nowrap flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-2/60 hover:text-text-primary';
    });

    if (window.innerWidth < 1024) {
      closeMobileSidebar();
    }

    if (tab === 'queue') void loadQueue();
    if (tab === 'tables') void loadTables();
    if (tab === 'menu') void loadMenu();
    if (tab === 'reports') void loadReports();
    if (tab === 'settings') void loadSettings();
  };

  document.querySelectorAll<HTMLButtonElement>('[data-tab-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tabBtn) switchTab(btn.dataset.tabBtn);
    });
  });

  // 1. QUEUE TAB
  const loadQueue = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchFilter) params.set('q', searchFilter);
      const [orders, requests] = await Promise.all([
        proxyFetch(`staff/orders?${params.toString()}`),
        proxyFetch('staff/requests'),
      ]);
      renderStaffRequests(requests);
      renderOrders(orders);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal memuat antrean.', true);
    }
  };

  const renderStaffRequests = (
    requests: Array<{
      id: string;
      type: string;
      note?: string | null;
      createdAt: string;
      table: { name: string; area: string };
    }>,
  ) => {
    const container = document.getElementById('staff-requests-box');
    if (!container) return;
    if (!requests || requests.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    container.classList.remove('hidden');
    container.innerHTML = `<div class="p-4 rounded-xl bg-surface-3 border border-warning/40 space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-warning">Permintaan Meja Aktif (${requests.length})</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        ${requests
          .map(
            (r) => `<div class="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-2 border border-border">
            <div>
              <p class="text-sm font-medium text-text-primary">${escapeHtml(r.table.name)} • ${r.type === 'REQUEST_BILL' ? 'Minta Tagihan' : 'Panggil Staf'}</p>
              <p class="text-xs text-text-muted">${new Date(r.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button type="button" data-resolve-req="${r.id}" class="ranum-btn px-3 py-1.5 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-hover">Selesai</button>
          </div>`,
          )
          .join('')}
      </div>
    </div>`;

    container.querySelectorAll<HTMLButtonElement>('[data-resolve-req]').forEach((b) => {
      b.addEventListener('click', async () => {
        try {
          await proxyFetch(`staff/requests/${b.dataset.resolveReq}/resolve`, 'PATCH');
          showNotice('Permintaan meja diselesaikan.');
          void loadQueue();
        } catch (e) {
          showNotice(e instanceof Error ? e.message : 'Gagal menyelesaikan permintaan.', true);
        }
      });
    });
  };

  const renderOrders = (
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      paymentPolicy: string;
      customerName?: string | null;
      notes?: string | null;
      totalAmount: number;
      createdAt: string;
      table: { name: string; area: string };
      items: Array<{
        productName: string;
        quantity: number;
        notes?: string | null;
        options: Array<{ optionName: string }>;
      }>;
      payments: Array<{ status: string; method?: string | null; midtransOrderId?: string | null }>;
    }>,
  ) => {
    const grid = document.getElementById('orders-grid');
    if (!grid) return;

    if (!orders || orders.length === 0) {
      grid.innerHTML = `<div class="col-span-full p-10 text-center rounded-xl bg-surface-2 border border-border text-text-muted">Belum ada pesanan pada filter ini.</div>`;
      return;
    }

    const role = staff.user.role;
    grid.innerHTML = orders
      .map((o) => {
        const sMeta = ORDER_STATUS_META[o.status] ?? {
          label: o.status,
          colorClass: 'bg-surface-3 text-text-primary border-border',
          icon: '•',
        };
        const latestPay = o.payments?.[0];
        const isPaid = o.payments?.some((p) => p.status === 'PAID');
        const pMeta = latestPay
          ? PAYMENT_STATUS_META[latestPay.status] ?? {
              label: latestPay.status,
              colorClass: 'bg-surface-3 text-text-secondary border-border',
            }
          : { label: 'Belum Bayar', colorClass: 'bg-warning/15 text-warning border-warning/30' };

        const actions: string[] = [];
        if (
          !isPaid &&
          o.status !== 'CANCELLED' &&
          (role === 'ADMIN' || role === 'CASHIER')
        ) {
          actions.push(
            `<button type="button" data-cash-pay="${o.id}" class="ranum-btn px-3 py-2 rounded-lg bg-success/20 text-success border border-success/40 text-xs font-semibold hover:bg-success/30">Terima Tunai</button>`,
          );
        }
        if (o.status === 'PENDING' && (role === 'ADMIN' || role === 'CASHIER')) {
          actions.push(
            `<button type="button" data-order-status="${o.id}:CONFIRMED" class="ranum-btn px-3 py-2 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-hover">Konfirmasi</button>`,
          );
        }
        if (o.status === 'CONFIRMED' && (role === 'ADMIN' || role === 'BARISTA')) {
          actions.push(
            `<button type="button" data-order-status="${o.id}:PREPARING" class="ranum-btn px-3 py-2 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-hover">Mulai Buat</button>`,
          );
        }
        if (o.status === 'PREPARING' && (role === 'ADMIN' || role === 'BARISTA')) {
          actions.push(
            `<button type="button" data-order-status="${o.id}:READY" class="ranum-btn px-3 py-2 rounded-lg bg-success text-bg text-xs font-semibold">Siap Saji</button>`,
          );
        }
        if (o.status === 'READY' && (role === 'ADMIN' || role === 'WAITER')) {
          actions.push(
            `<button type="button" data-order-status="${o.id}:SERVED" class="ranum-btn px-3 py-2 rounded-lg bg-olive text-bg text-xs font-semibold">Sudah Diantar</button>`,
          );
        }
        if (o.status === 'SERVED' && isPaid && (role === 'ADMIN' || role === 'CASHIER')) {
          actions.push(
            `<button type="button" data-order-status="${o.id}:COMPLETED" class="ranum-btn px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary text-xs font-semibold hover:border-accent">Selesaikan</button>`,
          );
        }
        if (
          ['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED'].includes(o.status) &&
          (role === 'ADMIN' || role === 'CASHIER')
        ) {
          actions.push(
            `<button type="button" data-cancel-order="${o.id}" class="ranum-btn px-3 py-2 rounded-lg bg-danger/15 text-danger border border-danger/30 text-xs font-semibold hover:bg-danger/25">Batalkan</button>`,
          );
        }

        return `<div class="p-4 rounded-xl bg-surface-2 border border-border flex flex-col justify-between gap-4">
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-text-primary tabular-nums">${escapeHtml(o.orderNumber)}</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-surface-3 text-text-secondary">${escapeHtml(o.table.name)}</span>
                </div>
                <p class="text-xs text-text-muted mt-0.5">${new Date(o.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}${o.customerName ? ` • ${escapeHtml(o.customerName)}` : ''}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium border ${sMeta.colorClass}">${sMeta.icon} ${sMeta.label}</span>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-medium border ${pMeta.colorClass}">${pMeta.label}</span>
              </div>
            </div>

            <div class="border-t border-border pt-2.5 space-y-2">
              ${o.items
                .map(
                  (it) => `<div class="text-sm">
                  <div class="flex justify-between">
                    <span class="font-medium text-text-primary"><span class="tabular-nums text-accent">${it.quantity}x</span> ${escapeHtml(it.productName)}</span>
                  </div>
                  ${it.options.length > 0 ? `<p class="text-xs text-text-secondary pl-5">${escapeHtml(it.options.map((op) => op.optionName).join(', '))}</p>` : ''}
                  ${it.notes ? `<p class="text-xs text-warning pl-5">Catatan: ${escapeHtml(it.notes)}</p>` : ''}
                </div>`,
                )
                .join('')}
              ${o.notes ? `<p class="text-xs text-accent bg-surface-3/60 p-2 rounded">Catatan Order: ${escapeHtml(o.notes)}</p>` : ''}
            </div>
          </div>

          <div class="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-bold text-text-primary tabular-nums">${formatIdr(o.totalAmount)}</span>
            <div class="flex flex-wrap gap-1.5">${actions.join('')}</div>
          </div>
        </div>`;
      })
      .join('');

    grid.querySelectorAll<HTMLButtonElement>('[data-order-status]').forEach((b) => {
      b.addEventListener('click', async () => {
        const [id, status] = (b.dataset.orderStatus || '').split(':');
        try {
          await proxyFetch(`staff/orders/${id}/status`, 'PATCH', { status });
          showNotice('Status pesanan diperbarui.');
          void loadQueue();
        } catch (e) {
          showNotice(e instanceof Error ? e.message : 'Gagal memperbarui status.', true);
        }
      });
    });

    grid.querySelectorAll<HTMLButtonElement>('[data-cash-pay]').forEach((b) => {
      b.addEventListener('click', async () => {
        try {
          await proxyFetch(`staff/orders/${b.dataset.cashPay}/payments/cash`, 'POST', {
            method: 'cash',
          });
          showNotice('Pembayaran tunai dicatat lunas.');
          void loadQueue();
        } catch (e) {
          showNotice(e instanceof Error ? e.message : 'Gagal mencatat pembayaran.', true);
        }
      });
    });

    grid.querySelectorAll<HTMLButtonElement>('[data-cancel-order]').forEach((b) => {
      b.addEventListener('click', async () => {
        const reason = window.prompt('Masukkan alasan pembatalan pesanan:');
        if (!reason || !reason.trim()) return;
        try {
          await proxyFetch(`staff/orders/${b.dataset.cancelOrder}/status`, 'PATCH', {
            status: 'CANCELLED',
            reason: reason.trim(),
          });
          showNotice('Pesanan dibatalkan.');
          void loadQueue();
        } catch (e) {
          showNotice(e instanceof Error ? e.message : 'Gagal membatalkan pesanan.', true);
        }
      });
    });
  };

  document.getElementById('queue-status-filter')?.addEventListener('change', (e) => {
    statusFilter = (e.target as HTMLSelectElement).value;
    void loadQueue();
  });
  document.getElementById('queue-search-input')?.addEventListener('input', (e) => {
    searchFilter = (e.target as HTMLInputElement).value.trim();
    void loadQueue();
  });
  document.getElementById('queue-refresh-btn')?.addEventListener('click', () => void loadQueue());

  // 2. TABLES & QR TAB
  const loadTables = async () => {
    try {
      const tables = await proxyFetch('staff/tables');
      const grid = document.getElementById('tables-grid');
      if (!grid) return;

      grid.innerHTML = tables
        .map(
          (t: {
            id: string;
            code: string;
            name: string;
            area: string;
            capacity: number;
            status: string;
            qrCodes: Array<{ status: string; token: string }>;
            tableSessions: Array<{ id: string; orders: Array<{ orderNumber: string; totalAmount: number }> }>;
          }) => {
            const qr = t.qrCodes?.[0];
            const activeSession = t.tableSessions?.[0];
            const isAdmin = staff.user.role === 'ADMIN';
            const canClose = staff.user.role === 'ADMIN' || staff.user.role === 'CASHIER';

            return `<div class="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="text-base font-semibold text-text-primary">${escapeHtml(t.name)} <span class="text-xs text-text-muted">(${escapeHtml(t.code)})</span></h4>
                  <p class="text-xs text-text-secondary">${escapeHtml(t.area)} • ${t.capacity} kursi</p>
                </div>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  t.status === 'OCCUPIED'
                    ? 'bg-warning/15 text-warning border-warning/30'
                    : 'bg-success/15 text-success border-success/30'
                }">${t.status}</span>
              </div>
              <div class="text-xs text-text-muted">
                QR Status: <span class="${qr?.status === 'ACTIVE' ? 'text-success' : 'text-danger'} font-medium">${qr?.status ?? 'NONE'}</span>
                ${activeSession ? ` • Sesi Aktif (${activeSession.orders.length} order)` : ' • Tidak ada sesi aktif'}
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                ${
                  qr
                    ? `<a href="/t/${qr.token}" target="_blank" class="ranum-btn px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-xs text-text-primary hover:border-accent">Buka Menu QR</a>`
                    : ''
                }
                ${
                  isAdmin || staff.user.role === 'CASHIER'
                    ? `<button type="button" data-show-qr="${t.id}" class="ranum-btn px-3 py-1.5 rounded-lg bg-accent/15 text-accent border border-accent/30 text-xs font-medium hover:bg-accent/25">Lihat / Cetak QR</button>`
                    : ''
                }
                ${
                  activeSession && canClose
                    ? `<button type="button" data-close-session="${activeSession.id}" class="ranum-btn px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-xs text-text-primary hover:border-warning">Tutup Sesi</button>`
                    : ''
                }
                ${
                  isAdmin && qr
                    ? `<button type="button" data-toggle-qr="${t.id}:${qr.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'}" class="ranum-btn px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-xs text-text-secondary">${qr.status === 'ACTIVE' ? 'Nonaktifkan QR' : 'Aktifkan QR'}</button>
                       <button type="button" data-regen-qr="${t.id}" class="ranum-btn px-3 py-1.5 rounded-lg bg-danger/15 text-danger border border-danger/30 text-xs">Regenerasi QR</button>`
                    : ''
                }
              </div>
            </div>`;
          },
        )
        .join('');

      grid.querySelectorAll<HTMLButtonElement>('[data-show-qr]').forEach((b) => {
        b.addEventListener('click', async () => {
          const data = await proxyFetch(`staff/tables/${b.dataset.showQr}/qr/image`);
          const modal = document.getElementById('qr-preview-modal');
          const img = document.getElementById('qr-preview-img') as HTMLImageElement | null;
          const title = document.getElementById('qr-preview-title');
          const url = document.getElementById('qr-preview-url');
          if (title) title.textContent = `${data.tableName} (${data.area})`;
          if (img) img.src = data.dataUrl;
          if (url) url.textContent = data.targetUrl;
          modal?.classList.add('is-open');
        });
      });

      grid.querySelectorAll<HTMLButtonElement>('[data-toggle-qr]').forEach((b) => {
        b.addEventListener('click', async () => {
          const [id, status] = (b.dataset.toggleQr || '').split(':');
          await proxyFetch(`staff/tables/${id}/qr/status`, 'PATCH', { status });
          showNotice(`Status QR diubah menjadi ${status}.`);
          void loadTables();
        });
      });

      grid.querySelectorAll<HTMLButtonElement>('[data-regen-qr]').forEach((b) => {
        b.addEventListener('click', async () => {
          if (!window.confirm('Regenerasi QR akan menonaktifkan QR lama. Lanjutkan?')) return;
          await proxyFetch(`staff/tables/${b.dataset.regenQr}/qr/regenerate`, 'POST');
          showNotice('QR Code baru berhasil dibuat.');
          void loadTables();
        });
      });

      grid.querySelectorAll<HTMLButtonElement>('[data-close-session]').forEach((b) => {
        b.addEventListener('click', async () => {
          try {
            await proxyFetch(`staff/sessions/${b.dataset.closeSession}/close`, 'POST', {});
            showNotice('Sesi meja ditutup.');
            void loadTables();
          } catch (e) {
            showNotice(e instanceof Error ? e.message : 'Gagal menutup sesi.', true);
          }
        });
      });
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal memuat meja.', true);
    }
  };

  document.getElementById('qr-preview-close')?.addEventListener('click', () => {
    document.getElementById('qr-preview-modal')?.classList.remove('is-open');
  });
  document.getElementById('qr-preview-modal')?.addEventListener('click', (e) => {
    const modal = document.getElementById('qr-preview-modal');
    if (e.target === modal) modal?.classList.remove('is-open');
  });

  document.getElementById('create-table-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await proxyFetch('staff/tables', 'POST', {
        code: fd.get('code'),
        name: fd.get('name'),
        area: fd.get('area'),
        capacity: Number(fd.get('capacity') || 4),
      });
      form.reset();
      showNotice('Meja baru & QR berhasil dibuat.');
      void loadTables();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal membuat meja.', true);
    }
  });

  // 3. MENU TAB (Admin)
  const loadMenu = async () => {
    try {
      const [categories, products] = await Promise.all([
        proxyFetch('staff/categories'),
        proxyFetch('staff/products'),
      ]);

      const catSelect = document.getElementById('new-product-category') as HTMLSelectElement | null;
      if (catSelect) {
        catSelect.innerHTML = categories
          .map((c: { id: string; name: string }) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
          .join('');
      }

      const listEl = document.getElementById('staff-products-list');
      if (!listEl) return;
      listEl.innerHTML = products
        .map(
          (p: {
            id: string;
            name: string;
            basePrice: number;
            availability: string;
            category: { name: string };
          }) => `<div class="p-3.5 rounded-xl bg-surface-2 border border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-text-primary">${escapeHtml(p.name)}</p>
            <p class="text-xs text-text-secondary">${escapeHtml(p.category.name)} • <span class="tabular-nums">${formatIdr(p.basePrice)}</span></p>
          </div>
          <div class="flex items-center gap-2">
            <select data-prod-avail="${p.id}" class="px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-xs text-text-primary">
              <option value="ACTIVE" ${p.availability === 'ACTIVE' ? 'selected' : ''}>Tersedia</option>
              <option value="OUT_OF_STOCK" ${p.availability === 'OUT_OF_STOCK' ? 'selected' : ''}>Habis</option>
              <option value="INACTIVE" ${p.availability === 'INACTIVE' ? 'selected' : ''}>Disembunyikan</option>
            </select>
          </div>
        </div>`,
        )
        .join('');

      listEl.querySelectorAll<HTMLSelectElement>('[data-prod-avail]').forEach((sel) => {
        sel.addEventListener('change', async () => {
          await proxyFetch(`staff/products/${sel.dataset.prodAvail}`, 'PATCH', {
            availability: sel.value,
          });
          showNotice('Ketersediaan produk diperbarui.');
        });
      });
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal memuat menu.', true);
    }
  };

  document.getElementById('create-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = String(fd.get('name') || '');
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    try {
      await proxyFetch('staff/products', 'POST', {
        categoryId: fd.get('categoryId'),
        name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        description: fd.get('description'),
        basePrice: Number(fd.get('basePrice')),
        imageUrl: fd.get('imageUrl') || undefined,
      });
      form.reset();
      showNotice('Produk baru ditambahkan.');
      void loadMenu();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal menambah produk.', true);
    }
  });

  // 4. REPORTS & PAYMENTS TAB
  const loadRevenueChart = async (period: 'day' | 'month' | 'year') => {
    chartPeriod = period;
    const subEl = document.getElementById('rev-chart-subtitle');
    if (subEl) {
      subEl.textContent =
        period === 'day'
          ? '14 hari terakhir (transaksi lunas)'
          : period === 'month'
            ? '12 bulan terakhir (transaksi lunas)'
            : '5 tahun terakhir (transaksi lunas)';
    }
    document.querySelectorAll<HTMLButtonElement>('[data-chart-period]').forEach((btn) => {
      const isActive = btn.dataset.chartPeriod === period;
      btn.className = isActive
        ? 'ranum-btn px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-bg'
        : 'ranum-btn px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary';
    });

    const container = document.getElementById('rev-chart-container');
    if (!container) return;

    try {
      const data = await proxyFetch(`staff/reports/timeseries?period=${period}`);
      const series = (data.series || []) as Array<{
        label: string;
        revenue: number;
        ordersCount: number;
      }>;

      if (series.length === 0) {
        container.innerHTML =
          '<div class="h-56 flex items-center justify-center text-xs text-text-muted">Belum ada data pemasukan.</div>';
        return;
      }

      const maxRev = Math.max(...series.map((s) => s.revenue), 10000);
      const chartHeight = 220;
      const topPad = 24;
      const bottomPad = 34;
      const plotHeight = chartHeight - topPad - bottomPad;
      const colWidth = Math.max(46, Math.floor(680 / series.length));
      const svgWidth = Math.max(560, series.length * colWidth + 32);

      const gridLines = [0, 0.25, 0.5, 0.75, 1]
        .map((ratio) => {
          const y = topPad + plotHeight * (1 - ratio);
          const val = Math.round(maxRev * ratio);
          return `<g>
            <line x1="16" y1="${y}" x2="${svgWidth - 16}" y2="${y}" stroke="#393229" stroke-dasharray="3 3" stroke-width="1"/>
            <text x="16" y="${y - 4}" fill="#8D8377" font-size="10">${val > 0 ? formatIdr(val) : 'Rp 0'}</text>
          </g>`;
        })
        .join('');

      const bars = series
        .map((s, idx) => {
          const barW = Math.min(28, Math.max(14, colWidth - 18));
          const x = 24 + idx * colWidth + (colWidth - barW) / 2;
          const barH = s.revenue > 0 ? Math.max(6, (s.revenue / maxRev) * plotHeight) : 2;
          const y = topPad + plotHeight - barH;
          const delay = idx * 25;
          return `<g class="group cursor-pointer">
            <title>${escapeHtml(s.label)}: ${formatIdr(s.revenue)} (${s.ordersCount} order)</title>
            <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5"
                  fill="${s.revenue > 0 ? '#C69B67' : '#393229'}"
                  class="ranum-chart-bar hover:opacity-85 transition-opacity"
                  style="animation-delay: ${delay}ms" />
            <text x="${x + barW / 2}" y="${chartHeight - 12}" text-anchor="middle" fill="#C2B8AA" font-size="10">${escapeHtml(s.label)}</text>
          </g>`;
        })
        .join('');

      container.innerHTML = `<svg viewBox="0 0 ${svgWidth} ${chartHeight}" class="w-full min-w-[520px] h-60 select-none" role="img" aria-label="Grafik Pemasukan">
        ${gridLines}
        ${bars}
      </svg>`;
    } catch {
      container.innerHTML =
        '<div class="h-56 flex items-center justify-center text-xs text-danger">Gagal memuat grafik pemasukan.</div>';
    }
  };

  document.querySelectorAll<HTMLButtonElement>('[data-chart-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.chartPeriod as 'day' | 'month' | 'year' | undefined;
      if (p) void loadRevenueChart(p);
    });
  });

  const loadReports = async () => {
    try {
      const [summary, payments] = await Promise.all([
        proxyFetch('staff/reports/summary'),
        proxyFetch('staff/payments'),
      ]);
      void loadRevenueChart(chartPeriod);

      const revEl = document.getElementById('rep-revenue');
      const ordEl = document.getElementById('rep-orders');
      const paidEl = document.getElementById('rep-paid');
      const topEl = document.getElementById('rep-top-products');
      const payBody = document.getElementById('rep-payments-body');

      if (revEl) revEl.textContent = formatIdr(summary.totalRevenue || 0);
      if (ordEl) ordEl.textContent = String(summary.totalOrders || 0);
      if (paidEl) paidEl.textContent = String(summary.paidOrdersCount || 0);

      if (topEl) {
        topEl.innerHTML =
          (summary.topProducts || [])
            .map(
              (tp: { name: string; quantity: number; revenue: number }) =>
                `<div class="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <span class="text-text-primary">${escapeHtml(tp.name)}</span>
                  <span class="text-text-secondary tabular-nums">${tp.quantity}x (${formatIdr(tp.revenue)})</span>
                </div>`,
            )
            .join('') || '<p class="text-xs text-text-muted">Belum ada data penjualan.</p>';
      }

      if (payBody) {
        payBody.innerHTML =
          payments
            .map(
              (p: {
                method?: string | null;
                provider: string;
                amount: number;
                status: string;
                midtransOrderId?: string | null;
                createdAt: string;
                order: { orderNumber: string; table: { name: string } };
              }) => `<tr class="border-b border-border text-sm">
                <td class="py-2.5 pr-3 font-medium text-text-primary tabular-nums">${escapeHtml(p.order.orderNumber)}</td>
                <td class="py-2.5 pr-3 text-text-secondary">${escapeHtml(p.order.table.name)}</td>
                <td class="py-2.5 pr-3 text-text-secondary">${escapeHtml(p.method || p.provider)}</td>
                <td class="py-2.5 pr-3 text-text-primary tabular-nums">${formatIdr(p.amount)}</td>
                <td class="py-2.5 pr-3"><span class="text-xs font-medium">${p.status}</span></td>
                <td class="py-2.5 text-xs text-text-muted tabular-nums">${escapeHtml(p.midtransOrderId || '-')}</td>
              </tr>`,
            )
            .join('') ||
          '<tr><td colspan="6" class="py-6 text-center text-text-muted text-sm">Belum ada transaksi pembayaran.</td></tr>';
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal memuat laporan.', true);
    }
  };

  // 5. SETTINGS & STAFF TAB (Admin)
  const loadSettings = async () => {
    try {
      const [outlet, users, logs] = await Promise.all([
        proxyFetch('staff/outlet'),
        proxyFetch('staff/users'),
        proxyFetch('staff/audit-logs?limit=20'),
      ]);

      const form = document.getElementById('outlet-settings-form') as HTMLFormElement | null;
      if (form) {
        (form.elements.namedItem('name') as HTMLInputElement).value = outlet.name || '';
        (form.elements.namedItem('openHours') as HTMLInputElement).value = outlet.openHours || '';
        (form.elements.namedItem('taxRatePercent') as HTMLInputElement).value = String(outlet.taxRatePercent ?? 10);
        (form.elements.namedItem('serviceChargePercent') as HTMLInputElement).value = String(outlet.serviceChargePercent ?? 5);
        (form.elements.namedItem('isOpen') as HTMLInputElement).checked = Boolean(outlet.isOpen);
        (form.elements.namedItem('allowPayAtCashier') as HTMLInputElement).checked = Boolean(outlet.allowPayAtCashier);
      }

      const usersList = document.getElementById('staff-users-list');
      if (usersList) {
        usersList.innerHTML = users
          .map(
            (u: { name: string; email: string; role: string; isActive: boolean }) =>
              `<div class="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <div>
                  <p class="font-medium text-text-primary">${escapeHtml(u.name)}</p>
                  <p class="text-xs text-text-muted">${escapeHtml(u.email)}</p>
                </div>
                <span class="px-2.5 py-0.5 rounded bg-surface-3 text-xs text-accent font-medium">${u.role}</span>
              </div>`,
          )
          .join('');
      }

      const logsList = document.getElementById('audit-logs-list');
      if (logsList) {
        logsList.innerHTML = logs
          .map(
            (l: { action: string; entityType: string; createdAt: string; actor?: { name: string } | null }) =>
              `<div class="py-2 border-b border-border last:border-0 text-xs flex justify-between gap-2">
                <span class="text-text-primary font-medium">${escapeHtml(l.action)} (${escapeHtml(l.entityType)})</span>
                <span class="text-text-muted">${escapeHtml(l.actor?.name || 'System')} • ${new Date(l.createdAt).toLocaleTimeString('id-ID')}</span>
              </div>`,
          )
          .join('');
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal memuat pengaturan.', true);
    }
  };

  document.getElementById('outlet-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    try {
      await proxyFetch('staff/outlet', 'PATCH', {
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
        openHours: (form.elements.namedItem('openHours') as HTMLInputElement).value,
        taxRatePercent: Number((form.elements.namedItem('taxRatePercent') as HTMLInputElement).value),
        serviceChargePercent: Number((form.elements.namedItem('serviceChargePercent') as HTMLInputElement).value),
        isOpen: (form.elements.namedItem('isOpen') as HTMLInputElement).checked,
        allowPayAtCashier: (form.elements.namedItem('allowPayAtCashier') as HTMLInputElement).checked,
      });
      showNotice('Pengaturan outlet disimpan.');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.', true);
    }
  });

  // Realtime SSE + fallback polling
  if (typeof EventSource !== 'undefined') {
    const sse = new EventSource(`${staff.apiUrl}/staff/stream?token=${encodeURIComponent(staff.jwt)}`);
    sse.addEventListener('ORDER_CREATED', () => {
      playChime();
      showNotice('Pesanan baru masuk!');
      if (activeTab === 'queue') void loadQueue();
    });
    sse.addEventListener('ORDER_UPDATED', () => {
      if (activeTab === 'queue') void loadQueue();
    });
    sse.addEventListener('PAYMENT_UPDATED', () => {
      if (activeTab === 'queue') void loadQueue();
    });
    sse.addEventListener('STAFF_REQUEST_CREATED', () => {
      playChime();
      showNotice('Permintaan bantuan dari meja!');
      if (activeTab === 'queue') void loadQueue();
    });
    sse.addEventListener('STAFF_REQUEST_RESOLVED', () => {
      if (activeTab === 'queue') void loadQueue();
    });
  }

  window.setInterval(() => {
    if (activeTab === 'queue') void loadQueue();
  }, 10000);

  switchTab('queue');
}
