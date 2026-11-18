import { escapeHtml, formatIdr } from './format';

interface OptionValue {
  id: string;
  name: string;
  additionalPrice: number;
  isDefault: boolean;
}

interface OptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  allowMultiple: boolean;
  values: OptionValue[];
}

interface Addon {
  id: string;
  name: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  basePrice: number;
  availability: 'ACTIVE' | 'OUT_OF_STOCK' | 'INACTIVE';
  category: { id: string; name: string; slug: string };
  optionGroups: OptionGroup[];
  addons: Addon[];
}

interface CartItem {
  key: string;
  productId: string;
  productName: string;
  unitFinalPrice: number;
  quantity: number;
  optionValueIds: string[];
  addonIds: string[];
  optionLabels: string[];
  notes: string;
}

interface TableOrderConfig {
  qrToken: string;
  apiUrl: string;
  taxRatePercent: number;
  serviceChargePercent: number;
  allowPayAtCashier: boolean;
  products: Product[];
}

declare global {
  interface Window {
    __RANUM_TABLE__?: TableOrderConfig;
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
      embed: (
        token: string,
        options: {
          embedId: string;
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const config = window.__RANUM_TABLE__;
if (config) {
  const storageKey = `ranum_cart_${config.qrToken}`;
  let cart: CartItem[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) cart = JSON.parse(raw) as CartItem[];
  } catch {
    cart = [];
  }

  let activeCategory = '';
  let searchQuery = '';
  let modalProduct: Product | null = null;
  let modalQty = 1;
  let isSubmitting = false;
  let currentIdempotencyKey: string | null = null;

  const productMap = new Map(config.products.map((p) => [p.id, p]));

  const saveCart = () => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
    currentIdempotencyKey = null;
    renderCartBar();
    renderCartDrawer();
  };

  let toastTimer: number | undefined;
  const showToast = (msg: string, isError = false) => {
    const toast = document.getElementById('ranum-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `ranum-float-bar is-visible fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium border shadow-lg whitespace-nowrap ${
      isError
        ? 'bg-surface-4 border-danger/50 text-danger'
        : 'bg-surface-4 border-accent/50 text-text-primary'
    }`;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3500);
  };

  const filterProducts = () => {
    const cards = document.querySelectorAll<HTMLElement>('[data-product-card]');
    let visibleCount = 0;
    cards.forEach((card) => {
      const cat = card.dataset.category || '';
      const name = (card.dataset.name || '').toLowerCase();
      const matchCat = !activeCategory || cat === activeCategory;
      const matchQuery = !searchQuery || name.includes(searchQuery);
      const show = matchCat && matchQuery;
      card.classList.toggle('hidden', !show);
      if (show) {
        card.dataset.revealState = 'visible';
        visibleCount++;
      }
    });
    const emptyEl = document.getElementById('menu-empty-state');
    if (emptyEl) emptyEl.classList.toggle('hidden', visibleCount > 0);
  };

  document.querySelectorAll<HTMLButtonElement>('[data-cat-pill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.catPill || '';
      document.querySelectorAll<HTMLButtonElement>('[data-cat-pill]').forEach((b) => {
        const isActive = (b.dataset.catPill || '') === activeCategory;
        b.className = isActive
          ? 'ranum-btn px-4 py-2 rounded-lg text-sm font-medium bg-accent text-bg whitespace-nowrap min-h-[44px]'
          : 'ranum-btn px-4 py-2 rounded-lg text-sm font-medium bg-surface-2 text-text-secondary border border-border hover:border-accent/50 whitespace-nowrap min-h-[44px]';
      });
      filterProducts();
    });
  });

  const searchInput = document.getElementById('menu-search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      filterProducts();
    });
  }

  // Product Detail Modal
  const productModal = document.getElementById('product-modal');
  const openProductModal = (productId: string) => {
    const product = productMap.get(productId);
    if (!product || product.availability !== 'ACTIVE' || !productModal) return;

    modalProduct = product;
    modalQty = 1;

    const titleEl = document.getElementById('pm-title');
    const descEl = document.getElementById('pm-desc');
    const imgEl = document.getElementById('pm-img') as HTMLImageElement | null;
    const optionsEl = document.getElementById('pm-options');
    const notesEl = document.getElementById('pm-notes') as HTMLTextAreaElement | null;
    const qtyEl = document.getElementById('pm-qty');

    if (titleEl) titleEl.textContent = product.name;
    if (descEl) descEl.textContent = product.description;
    if (imgEl) {
      imgEl.src =
        product.imageUrl ||
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80';
      imgEl.alt = product.name;
    }
    if (notesEl) notesEl.value = '';
    if (qtyEl) qtyEl.textContent = '1';

    if (optionsEl) {
      let html = '';
      for (const group of product.optionGroups) {
        const inputType = group.allowMultiple ? 'checkbox' : 'radio';
        html += `<div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">${escapeHtml(group.name)}</span>
            <span class="text-xs text-text-muted">${group.isRequired ? 'Wajib' : 'Opsional'}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
        group.values.forEach((val, idx) => {
          const checked = val.isDefault || (group.isRequired && idx === 0 && !group.values.some((v) => v.isDefault));
          html += `<label class="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-2 border border-border cursor-pointer hover:border-accent/60">
            <span class="flex items-center gap-2.5 text-sm text-text-primary">
              <input type="${inputType}" name="grp_${group.id}" value="${val.id}" data-price="${val.additionalPrice}" data-label="${escapeHtml(val.name)}" ${checked ? 'checked' : ''} class="accent-[#C69B67] w-4 h-4">
              <span>${escapeHtml(val.name)}</span>
            </span>
            <span class="text-xs text-text-secondary tabular-nums">${val.additionalPrice > 0 ? `+${formatIdr(val.additionalPrice)}` : 'Gratis'}</span>
          </label>`;
        });
        html += `</div></div>`;
      }

      if (product.addons.length > 0) {
        html += `<div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">Tambahan (Add-on)</span>
            <span class="text-xs text-text-muted">Opsional</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
        for (const addon of product.addons) {
          html += `<label class="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-2 border border-border cursor-pointer hover:border-accent/60">
            <span class="flex items-center gap-2.5 text-sm text-text-primary">
              <input type="checkbox" name="addon_${addon.id}" value="${addon.id}" data-addon-price="${addon.price}" data-addon-label="${escapeHtml(addon.name)}" class="accent-[#C69B67] w-4 h-4">
              <span>${escapeHtml(addon.name)}</span>
            </span>
            <span class="text-xs text-text-secondary tabular-nums">+${formatIdr(addon.price)}</span>
          </label>`;
        }
        html += `</div></div>`;
      }
      optionsEl.innerHTML = html;
      optionsEl.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('change', updateModalTotal);
      });
    }

    updateModalTotal();
    productModal.classList.add('is-open');
  };

  const updateModalTotal = () => {
    if (!modalProduct) return;
    let extra = 0;
    document.querySelectorAll<HTMLInputElement>('#pm-options input:checked').forEach((inp) => {
      extra += Number(inp.dataset.price || inp.dataset.addonPrice || 0);
    });
    const unitPrice = modalProduct.basePrice + extra;
    const totalEl = document.getElementById('pm-total-price');
    if (totalEl) totalEl.textContent = formatIdr(unitPrice * modalQty);
  };

  document.querySelectorAll<HTMLButtonElement>('[data-open-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.openProduct) openProductModal(btn.dataset.openProduct);
    });
  });

  document.getElementById('pm-close')?.addEventListener('click', () => {
    productModal?.classList.remove('is-open');
  });
  productModal?.addEventListener('click', (e) => {
    if (e.target === productModal) productModal.classList.remove('is-open');
  });

  document.getElementById('pm-qty-dec')?.addEventListener('click', () => {
    if (modalQty > 1) {
      modalQty--;
      const qtyEl = document.getElementById('pm-qty');
      if (qtyEl) qtyEl.textContent = String(modalQty);
      updateModalTotal();
    }
  });

  document.getElementById('pm-qty-inc')?.addEventListener('click', () => {
    modalQty++;
    const qtyEl = document.getElementById('pm-qty');
    if (qtyEl) qtyEl.textContent = String(modalQty);
    updateModalTotal();
  });

  document.getElementById('pm-add-to-cart')?.addEventListener('click', () => {
    if (!modalProduct) return;
    const optionValueIds: string[] = [];
    const addonIds: string[] = [];
    const optionLabels: string[] = [];
    let extra = 0;

    for (const group of modalProduct.optionGroups) {
      const checked = document.querySelectorAll<HTMLInputElement>(
        `#pm-options input[name="grp_${group.id}"]:checked`,
      );
      if (group.isRequired && checked.length === 0) {
        showToast(`Pilih ${group.name} terlebih dahulu.`, true);
        return;
      }
      checked.forEach((inp) => {
        optionValueIds.push(inp.value);
        if (inp.dataset.label) optionLabels.push(inp.dataset.label);
        extra += Number(inp.dataset.price || 0);
      });
    }

    document
      .querySelectorAll<HTMLInputElement>('#pm-options input[name^="addon_"]:checked')
      .forEach((inp) => {
        addonIds.push(inp.value);
        if (inp.dataset.addonLabel) optionLabels.push(`+ ${inp.dataset.addonLabel}`);
        extra += Number(inp.dataset.addonPrice || 0);
      });

    const notesEl = document.getElementById('pm-notes') as HTMLTextAreaElement | null;
    const notes = notesEl?.value.trim() || '';
    const unitFinalPrice = modalProduct.basePrice + extra;
    const key = `${modalProduct.id}|${optionValueIds.sort().join(',')}|${addonIds.sort().join(',')}|${notes}`;

    const existing = cart.find((c) => c.key === key);
    if (existing) {
      existing.quantity += modalQty;
    } else {
      cart.push({
        key,
        productId: modalProduct.id,
        productName: modalProduct.name,
        unitFinalPrice,
        quantity: modalQty,
        optionValueIds,
        addonIds,
        optionLabels,
        notes,
      });
    }

    saveCart();
    productModal?.classList.remove('is-open');
    showToast(`${modalProduct.name} ditambahkan ke keranjang.`);
  });

  const calcTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitFinalPrice * item.quantity, 0);
    const serviceCharge = Math.round((subtotal * config.serviceChargePercent) / 100);
    const tax = Math.round(((subtotal + serviceCharge) * config.taxRatePercent) / 100);
    const total = subtotal + serviceCharge + tax;
    return { subtotal, serviceCharge, tax, total };
  };

  const renderCartBar = () => {
    const bar = document.getElementById('floating-cart-bar');
    const countEl = document.getElementById('fcb-count');
    const totalEl = document.getElementById('fcb-total');
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const { total } = calcTotals();

    if (bar) bar.classList.toggle('is-visible', totalQty > 0);
    if (countEl) countEl.textContent = `${totalQty} item`;
    if (totalEl) totalEl.textContent = formatIdr(total);
  };

  const cartDrawer = document.getElementById('cart-drawer');
  const renderCartDrawer = () => {
    const listEl = document.getElementById('cd-items');
    const subEl = document.getElementById('cd-subtotal');
    const svcEl = document.getElementById('cd-service');
    const taxEl = document.getElementById('cd-tax');
    const totEl = document.getElementById('cd-total');
    const checkoutBtn = document.getElementById('cd-checkout-btn') as HTMLButtonElement | null;

    if (!listEl) return;
    if (cart.length === 0) {
      listEl.innerHTML = `<p class="text-sm text-text-muted text-center py-8">Keranjang masih kosong.</p>`;
    } else {
      listEl.innerHTML = cart
        .map(
          (item, idx) => `<div class="p-3.5 rounded-lg bg-surface-2 border border-border space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-semibold text-text-primary">${escapeHtml(item.productName)}</h4>
              ${item.optionLabels.length > 0 ? `<p class="text-xs text-text-secondary mt-0.5">${escapeHtml(item.optionLabels.join(' • '))}</p>` : ''}
              ${item.notes ? `<p class="text-xs text-accent mt-0.5">Catatan: ${escapeHtml(item.notes)}</p>` : ''}
            </div>
            <span class="text-sm font-semibold text-text-primary tabular-nums">${formatIdr(item.unitFinalPrice * item.quantity)}</span>
          </div>
          <div class="flex items-center justify-between pt-1">
            <div class="flex items-center gap-2">
              <button type="button" data-cart-dec="${idx}" class="ranum-btn w-8 h-8 rounded bg-surface-3 border border-border text-text-primary hover:border-accent">-</button>
              <span class="text-sm tabular-nums w-6 text-center">${item.quantity}</span>
              <button type="button" data-cart-inc="${idx}" class="ranum-btn w-8 h-8 rounded bg-surface-3 border border-border text-text-primary hover:border-accent">+</button>
            </div>
            <button type="button" data-cart-remove="${idx}" class="ranum-btn text-xs text-danger hover:underline">Hapus</button>
          </div>
        </div>`,
        )
        .join('');

      listEl.querySelectorAll<HTMLButtonElement>('[data-cart-dec]').forEach((b) => {
        b.addEventListener('click', () => {
          const i = Number(b.dataset.cartDec);
          if (cart[i].quantity > 1) cart[i].quantity--;
          else cart.splice(i, 1);
          saveCart();
        });
      });
      listEl.querySelectorAll<HTMLButtonElement>('[data-cart-inc]').forEach((b) => {
        b.addEventListener('click', () => {
          const i = Number(b.dataset.cartInc);
          cart[i].quantity++;
          saveCart();
        });
      });
      listEl.querySelectorAll<HTMLButtonElement>('[data-cart-remove]').forEach((b) => {
        b.addEventListener('click', () => {
          const i = Number(b.dataset.cartRemove);
          cart.splice(i, 1);
          saveCart();
        });
      });
    }

    const { subtotal, serviceCharge, tax, total } = calcTotals();
    if (subEl) subEl.textContent = formatIdr(subtotal);
    if (svcEl) svcEl.textContent = formatIdr(serviceCharge);
    if (taxEl) taxEl.textContent = formatIdr(tax);
    if (totEl) totEl.textContent = formatIdr(total);
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0 || isSubmitting;
  };

  document.getElementById('fcb-open-drawer')?.addEventListener('click', () => {
    renderCartDrawer();
    cartDrawer?.classList.add('is-open');
  });
  document.getElementById('cd-close')?.addEventListener('click', () => {
    cartDrawer?.classList.remove('is-open');
  });
  cartDrawer?.addEventListener('click', (e) => {
    if (e.target === cartDrawer) cartDrawer.classList.remove('is-open');
  });

  // Checkout & Midtrans Snap
  document.getElementById('cd-checkout-btn')?.addEventListener('click', async () => {
    if (cart.length === 0 || isSubmitting) return;
    isSubmitting = true;
    const checkoutBtn = document.getElementById('cd-checkout-btn') as HTMLButtonElement | null;
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Memproses pesanan...';
    }

    if (!currentIdempotencyKey) {
      currentIdempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `rnm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    const customerName = (document.getElementById('cd-customer-name') as HTMLInputElement | null)?.value.trim();
    const orderNotes = (document.getElementById('cd-order-notes') as HTMLTextAreaElement | null)?.value.trim();
    const policyRadio = document.querySelector<HTMLInputElement>('input[name="payment_policy"]:checked');
    const paymentPolicy = policyRadio?.value || 'ONLINE_MIDTRANS';

    try {
      const orderRes = await fetch(`${config.apiUrl}/public/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': currentIdempotencyKey,
        },
        body: JSON.stringify({
          qrToken: config.qrToken,
          customerName: customerName || undefined,
          notes: orderNotes || undefined,
          paymentPolicy,
          idempotencyKey: currentIdempotencyKey,
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            optionValueIds: c.optionValueIds,
            addonIds: c.addonIds,
            notes: c.notes || undefined,
          })),
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.message || 'Gagal membuat pesanan.');
      }

      // Clear cart after order is created on server
      localStorage.setItem(`ranum_last_qr_${orderData.accessToken}`, config.qrToken);
      cart = [];
      saveCart();

      if (paymentPolicy === 'PAY_AT_CASHIER') {
        window.location.href = `/order/${orderData.accessToken}`;
        return;
      }

      // Create Midtrans Snap token
      const snapRes = await fetch(
        `${config.apiUrl}/public/orders/${orderData.accessToken}/payments/snap`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      const snapData = await snapRes.json();
      if (!snapRes.ok) {
        window.location.href = `/order/${orderData.accessToken}`;
        return;
      }

      if (snapData.sandboxSimulator) {
        // Show Sandbox Simulator modal when Midtrans keys are not yet configured
        openSandboxModal(orderData.accessToken, orderData.orderNumber, orderData.totalAmount);
        cartDrawer?.classList.remove('is-open');
      } else if (window.snap && snapData.snapToken) {
        cartDrawer?.classList.remove('is-open');
        openSnapEmbedModal(
          snapData.snapToken,
          orderData.accessToken,
          orderData.orderNumber,
          orderData.totalAmount,
        );
      } else if (snapData.snapRedirectUrl) {
        window.location.href = snapData.snapRedirectUrl;
      } else {
        window.location.href = `/order/${orderData.accessToken}`;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Terjadi kesalahan saat checkout.', true);
    } finally {
      isSubmitting = false;
      if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
        checkoutBtn.textContent = 'Kirim Pesanan';
      }
    }
  });

  const openSnapEmbedModal = (
    snapToken: string,
    accessToken: string,
    orderNumber: string,
    totalAmount: number,
  ) => {
    const modal = document.getElementById('midtrans-embed-modal');
    const container = document.getElementById('snap-embed-container');
    const orderNumEl = document.getElementById('mem-order-number');
    const amountEl = document.getElementById('mem-amount');
    const closeBtn = document.getElementById('mem-close');

    if (!modal || !container || !window.snap) {
      window.location.href = `/order/${accessToken}`;
      return;
    }

    if (orderNumEl) orderNumEl.textContent = orderNumber;
    if (amountEl) amountEl.textContent = formatIdr(totalAmount);
    container.innerHTML = '';

    const finishAndTrack = async () => {
      try {
        await fetch(`${config.apiUrl}/public/orders/${accessToken}/payments/sync`, {
          method: 'POST',
        });
      } catch {
        // ignore sync errors, order tracking page will also poll
      }
      modal.classList.remove('is-open');
      window.setTimeout(() => {
        window.location.href = `/order/${accessToken}`;
      }, 220);
    };

    if (closeBtn) {
      closeBtn.onclick = () => {
        void finishAndTrack();
      };
    }

    modal.classList.add('is-open');
    window.snap.embed(snapToken, {
      embedId: 'snap-embed-container',
      onSuccess: () => void finishAndTrack(),
      onPending: () => void finishAndTrack(),
      onError: () => void finishAndTrack(),
      onClose: () => void finishAndTrack(),
    });
  };

  const openSandboxModal = (accessToken: string, orderNumber: string, totalAmount: number) => {
    const modal = document.getElementById('sandbox-pay-modal');
    if (!modal) {
      window.location.href = `/order/${accessToken}`;
      return;
    }
    const orderNumEl = document.getElementById('spm-order-number');
    const amountEl = document.getElementById('spm-amount');
    if (orderNumEl) orderNumEl.textContent = orderNumber;
    if (amountEl) amountEl.textContent = formatIdr(totalAmount);

    const confirmBtn = document.getElementById('spm-confirm-btn');
    const laterBtn = document.getElementById('spm-later-btn');

    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        confirmBtn.textContent = 'Memverifikasi...';
        await fetch(`${config.apiUrl}/public/orders/${accessToken}/payments/simulate-success`, {
          method: 'POST',
        });
        window.location.href = `/order/${accessToken}`;
      };
    }
    if (laterBtn) {
      laterBtn.onclick = () => {
        window.location.href = `/order/${accessToken}`;
      };
    }

    modal.classList.add('is-open');
  };

  // Staff Assistance / Request Bill
  const sendStaffRequest = async (type: 'ASSISTANCE' | 'REQUEST_BILL') => {
    try {
      const res = await fetch(`${config.apiUrl}/public/qr/${config.qrToken}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error('Gagal mengirim permintaan.');
      showToast(
        type === 'ASSISTANCE'
          ? 'Permintaan bantuan staf telah dikirim ke meja Anda.'
          : 'Permintaan tagihan telah dikirim ke kasir.',
      );
    } catch {
      showToast('Gagal mengirim permintaan ke staf.', true);
    }
  };

  document.getElementById('btn-call-staff')?.addEventListener('click', () => sendStaffRequest('ASSISTANCE'));
  document.getElementById('btn-request-bill')?.addEventListener('click', () => sendStaffRequest('REQUEST_BILL'));

  renderCartBar();
}
