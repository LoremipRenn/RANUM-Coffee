@extends('layouts.app')

@section('title', $table['name'] . ' — Pesan Menu RANUM Coffee')
@section('hide-footer', true)

@section('nav-badge')
<div class="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-2 border border-accent/40 text-xs font-medium text-accent max-w-[155px] sm:max-w-none truncate">
    <span class="truncate">{{ $table['name'] }}</span>
    <span class="text-text-muted hidden sm:inline">•</span>
    <span class="text-text-secondary hidden sm:inline">{{ $table['area'] }}</span>
</div>
@endsection

@push('head')
@if($midtransClientKey)
    <script src="{{ $midtransIsProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js' }}"
            data-client-key="{{ $midtransClientKey }}"></script>
@endif
@endpush

@section('content')
<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
    {{-- Table Header & Quick Actions --}}
    <div class="ranum-enter-1 p-4 sm:p-5 rounded-2xl bg-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
            <p class="text-xs uppercase tracking-widest text-olive font-medium">Pemesanan Meja</p>
            <h1 class="font-display text-2xl sm:text-3xl font-semibold text-text-primary">
                {{ $table['name'] }} <span class="text-base font-sans font-normal text-text-secondary">({{ $table['area'] }})</span>
            </h1>
            <p class="text-xs text-text-muted">{{ $branch['name'] }} • Pilih menu lalu kirim pesanan tanpa antre.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <button type="button" id="btn-call-staff" class="ranum-btn px-3.5 py-2.5 rounded-lg bg-surface-3 border border-border text-xs font-medium text-text-primary hover:border-accent min-h-[44px]">
                Panggil Staf
            </button>
            <button type="button" id="btn-request-bill" class="ranum-btn px-3.5 py-2.5 rounded-lg bg-surface-3 border border-border text-xs font-medium text-text-primary hover:border-accent min-h-[44px]">
                Minta Tagihan
            </button>
        </div>
    </div>

    {{-- Active Session Orders (if customer already ordered in this session) --}}
    @if(!empty($activeSession['orders']))
        <div class="ranum-enter-2 p-4 rounded-xl bg-surface-1 border border-border space-y-2.5">
            <p class="text-xs font-medium text-text-secondary">Pesanan Anda pada sesi meja ini:</p>
            <div class="flex flex-wrap gap-2">
                @foreach($activeSession['orders'] as $sOrder)
                    <a href="{{ route('order.track', $sOrder['accessToken']) }}"
                       class="ranum-btn inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border hover:border-accent text-xs">
                        <span class="font-semibold text-text-primary tabular-nums">{{ $sOrder['orderNumber'] }}</span>
                        <span class="text-accent">{{ $sOrder['status'] }}</span>
                        <span class="text-text-muted">&rarr;</span>
                    </a>
                @endforeach
            </div>
        </div>
    @endif

    {{-- Search & Category Filter --}}
    <div class="ranum-enter-3 space-y-3">
        <input type="text" id="menu-search-input" placeholder="Cari kopi, matcha, atau pastry..."
               class="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors duration-200">

        <div class="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button type="button" data-cat-pill="" class="ranum-btn px-4 py-2 rounded-lg text-sm font-medium bg-accent text-bg whitespace-nowrap min-h-[44px]">
                Semua
            </button>
            @foreach($categories as $cat)
                <button type="button" data-cat-pill="{{ $cat['slug'] }}" class="ranum-btn px-4 py-2 rounded-lg text-sm font-medium bg-surface-2 text-text-secondary border border-border hover:border-accent/50 whitespace-nowrap min-h-[44px]">
                    {{ $cat['name'] }}
                </button>
            @endforeach
        </div>
    </div>

    {{-- Product List --}}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @foreach($products as $idx => $product)
            @php $isAvail = ($product['availability'] ?? 'ACTIVE') === 'ACTIVE'; @endphp
            <article data-reveal style="--reveal-delay: {{ min($idx, 5) * 45 }}ms" data-product-card data-category="{{ $product['category']['slug'] ?? '' }}" data-name="{{ $product['name'] }}"
                     class="ranum-card rounded-xl bg-surface-2 border border-border overflow-hidden flex flex-col hover:border-accent/50">
                <div class="aspect-[16/10] bg-surface-3 relative overflow-hidden">
                    <img src="{{ $product['imageUrl'] ?? 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80' }}"
                         alt="{{ $product['name'] }}"
                         loading="lazy"
                         class="ranum-card-img w-full h-full object-cover {{ !$isAvail ? 'opacity-40 grayscale' : '' }}">
                    @if(($product['badge'] ?? 'NONE') !== 'NONE')
                        <span class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded bg-surface-1/90 border border-border text-[11px] font-medium text-accent">
                            {{ str_replace('_', ' ', $product['badge']) }}
                        </span>
                    @endif
                    @if(!$isAvail)
                        <span class="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded bg-danger text-bg text-[11px] font-semibold">
                            Habis
                        </span>
                    @endif
                </div>
                <div class="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div class="space-y-1">
                        <h2 class="text-base font-semibold text-text-primary">{{ $product['name'] }}</h2>
                        <p class="text-xs text-text-secondary line-clamp-2 leading-relaxed">{{ $product['description'] }}</p>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-border">
                        <span class="text-sm font-semibold text-text-primary tabular-nums">
                            Rp {{ number_format($product['basePrice'], 0, ',', '.') }}
                        </span>
                        @if($isAvail)
                            <button type="button" data-open-product="{{ $product['id'] }}"
                                    class="ranum-btn px-4 py-2 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-hover min-h-[44px]">
                                + Pilih
                            </button>
                        @else
                            <button type="button" disabled class="px-4 py-2 rounded-lg bg-surface-3 text-text-muted text-xs cursor-not-allowed min-h-[44px]">
                                Habis
                            </button>
                        @endif
                    </div>
                </div>
            </article>
        @endforeach
    </div>

    <div id="menu-empty-state" class="hidden p-10 rounded-xl bg-surface-2 border border-border text-center text-sm text-text-muted">
        Tidak ada menu yang sesuai dengan pencarian Anda.
    </div>
</div>

{{-- Floating Cart Bar --}}
<div id="floating-cart-bar" class="ranum-float-bar fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-4 max-w-2xl mx-auto z-30 pb-[env(safe-area-inset-bottom)]">
    <button type="button" id="fcb-open-drawer"
            class="ranum-btn w-full px-4 sm:px-5 py-3.5 rounded-xl bg-accent text-bg shadow-lg flex items-center justify-between font-semibold hover:bg-accent-hover min-h-[52px]">
        <span class="flex items-center gap-2 text-sm">
            <span>Lihat Keranjang</span>
            <span class="px-2 py-0.5 rounded bg-bg/15 text-xs tabular-nums" id="fcb-count">0 item</span>
        </span>
        <span class="text-base tabular-nums" id="fcb-total">Rp 0</span>
    </button>
</div>

{{-- Product Detail Modal (Elevation 4) --}}
<div id="product-modal" class="ranum-overlay fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div class="ranum-modal-panel w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface-4 border border-border shadow-lg flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div class="relative aspect-[16/9] bg-surface-3 shrink-0">
            <img id="pm-img" src="" alt="" class="w-full h-full object-cover">
            <button type="button" id="pm-close" aria-label="Tutup"
                    class="absolute top-3 right-3 w-10 h-10 rounded-full bg-surface-1/90 border border-border text-text-primary flex items-center justify-center hover:border-accent">
                ✕
            </button>
        </div>

        <div class="p-5 space-y-5">
            <div class="space-y-1">
                <h3 id="pm-title" class="font-display text-2xl font-semibold text-text-primary"></h3>
                <p id="pm-desc" class="text-sm text-text-secondary leading-relaxed"></p>
            </div>

            <div id="pm-options" class="space-y-4"></div>

            <div class="space-y-1.5">
                <label for="pm-notes" class="text-xs font-medium text-text-secondary">Catatan Item (Opsional)</label>
                <textarea id="pm-notes" rows="2" placeholder="Misal: es sedikit, tanpa sedotan..."
                          class="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"></textarea>
            </div>

            <div class="flex items-center justify-between gap-4 pt-2 border-t border-border">
                <div class="flex items-center gap-3">
                    <button type="button" id="pm-qty-dec" class="ranum-btn w-11 h-11 rounded-lg bg-surface-2 border border-border text-text-primary text-lg hover:border-accent">-</button>
                    <span id="pm-qty" class="text-base font-semibold tabular-nums w-6 text-center">1</span>
                    <button type="button" id="pm-qty-inc" class="ranum-btn w-11 h-11 rounded-lg bg-surface-2 border border-border text-text-primary text-lg hover:border-accent">+</button>
                </div>

                <button type="button" id="pm-add-to-cart"
                        class="ranum-btn flex-1 py-3 px-5 rounded-xl bg-accent text-bg text-sm font-semibold hover:bg-accent-hover flex items-center justify-between min-h-[44px]">
                    <span>Tambah</span>
                    <span id="pm-total-price" class="tabular-nums">Rp 0</span>
                </button>
            </div>
        </div>
    </div>
</div>

{{-- Cart & Checkout Drawer (Elevation 4) --}}
<div id="cart-drawer" class="ranum-overlay fixed inset-0 z-40 bg-black/70 flex justify-end">
    <div class="ranum-drawer-panel w-full max-w-md h-[100dvh] bg-surface-4 border-l border-border shadow-lg flex flex-col">
        <div class="p-5 border-b border-border flex items-center justify-between">
            <div>
                <h3 class="font-display text-2xl font-semibold text-text-primary">Keranjang Pesanan</h3>
                <p class="text-xs text-text-secondary">{{ $table['name'] }} • {{ $table['area'] }}</p>
            </div>
            <button type="button" id="cd-close" class="w-10 h-10 rounded-lg bg-surface-2 border border-border text-text-primary">✕</button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-5">
            <div id="cd-items" class="space-y-3"></div>

            <div class="space-y-3 pt-2 border-t border-border">
                <div>
                    <label for="cd-customer-name" class="text-xs font-medium text-text-secondary block mb-1">Nama Panggilan (Opsional)</label>
                    <input type="text" id="cd-customer-name" placeholder="Agar staf mudah menyapa Anda"
                           class="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none">
                </div>
                <div>
                    <label for="cd-order-notes" class="text-xs font-medium text-text-secondary block mb-1">Catatan Pesanan (Opsional)</label>
                    <textarea id="cd-order-notes" rows="2" placeholder="Catatan umum untuk dapur/barista..."
                              class="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"></textarea>
                </div>
            </div>

            <div class="space-y-2 pt-2 border-t border-border">
                <p class="text-xs font-medium text-text-secondary">Metode Pembayaran</p>
                <label class="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border cursor-pointer">
                    <input type="radio" name="payment_policy" value="ONLINE_MIDTRANS" checked class="mt-1 accent-[#C69B67]">
                    <div>
                        <p class="text-sm font-medium text-text-primary">Bayar Online (Midtrans Snap)</p>
                        <p class="text-xs text-text-muted">QRIS, GoPay, ShopeePay, Virtual Account, atau Kartu.</p>
                    </div>
                </label>
                @if($branch['allowPayAtCashier'] ?? false)
                <label class="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border cursor-pointer">
                    <input type="radio" name="payment_policy" value="PAY_AT_CASHIER" class="mt-1 accent-[#C69B67]">
                    <div>
                        <p class="text-sm font-medium text-text-primary">Bayar di Kasir</p>
                        <p class="text-xs text-text-muted">Pesanan diteruskan setelah konfirmasi kasir.</p>
                    </div>
                </label>
                @endif
            </div>
        </div>

        <div class="p-5 bg-surface-3 border-t border-border space-y-3">
            <div class="space-y-1 text-xs text-text-secondary">
                <div class="flex justify-between"><span>Subtotal</span><span id="cd-subtotal" class="tabular-nums">Rp 0</span></div>
                <div class="flex justify-between"><span>Service Charge ({{ $branch['serviceChargePercent'] ?? 5 }}%)</span><span id="cd-service" class="tabular-nums">Rp 0</span></div>
                <div class="flex justify-between"><span>Pajak ({{ $branch['taxRatePercent'] ?? 10 }}%)</span><span id="cd-tax" class="tabular-nums">Rp 0</span></div>
                <div class="flex justify-between text-base font-semibold text-text-primary pt-2 border-t border-border">
                    <span>Total</span>
                    <span id="cd-total" class="tabular-nums text-accent">Rp 0</span>
                </div>
            </div>
            <button type="button" id="cd-checkout-btn"
                    class="ranum-btn w-full py-3.5 rounded-xl bg-accent text-bg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 min-h-[48px]">
                Kirim Pesanan
            </button>
        </div>
    </div>
</div>

{{-- Midtrans Snap Embedded Popup Modal (same page, Dark Mode Elevation) --}}
<div id="midtrans-embed-modal" class="ranum-overlay fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
    <div class="ranum-modal-panel w-full max-w-md rounded-2xl bg-surface-4 border border-border shadow-lg overflow-hidden flex flex-col max-h-[92dvh]">
        <div class="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border flex items-center justify-between gap-3 bg-surface-3">
            <div class="min-w-0">
                <p class="text-[10px] sm:text-[11px] uppercase tracking-widest text-accent font-medium">Pembayaran Aman Midtrans</p>
                <h3 class="font-display text-lg sm:text-xl font-semibold text-text-primary truncate">
                    <span id="mem-order-number" class="tabular-nums"></span> • <span id="mem-amount" class="text-accent tabular-nums"></span>
                </h3>
            </div>
            <button type="button" id="mem-close" aria-label="Tutup Pembayaran"
                    class="ranum-btn w-9 h-9 rounded-lg bg-surface-2 border border-border text-text-primary hover:border-accent flex items-center justify-center shrink-0">
                ✕
            </button>
        </div>
        <div class="p-2.5 sm:p-4 overflow-y-auto bg-surface-2">
            <div id="snap-embed-container" class="w-full min-h-[420px] sm:min-h-[520px] rounded-xl overflow-hidden bg-white"></div>
        </div>
    </div>
</div>

{{-- Local Sandbox Simulator Modal (when MIDTRANS_SERVER_KEY is empty in dev) --}}
<div id="sandbox-pay-modal" class="ranum-overlay fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
    <div class="ranum-modal-panel w-full max-w-md rounded-2xl bg-surface-4 border border-border p-6 space-y-5 shadow-lg">
        <div class="space-y-1">
            <span class="text-xs uppercase tracking-widest text-warning font-semibold">Midtrans Sandbox Mode</span>
            <h3 class="font-display text-2xl font-semibold text-text-primary">Simulasi Pembayaran Online</h3>
            <p class="text-xs text-text-secondary">Kredensial Midtrans belum diisi di `.env`. Gunakan simulator ini untuk menguji alur pembayaran terverifikasi.</p>
        </div>
        <div class="p-4 rounded-xl bg-surface-2 border border-border space-y-1 text-sm">
            <div class="flex justify-between"><span class="text-text-muted">No. Order</span><span id="spm-order-number" class="font-semibold tabular-nums"></span></div>
            <div class="flex justify-between"><span class="text-text-muted">Total Tagihan</span><span id="spm-amount" class="font-semibold text-accent tabular-nums"></span></div>
        </div>
        <div class="flex flex-col gap-2">
            <button type="button" id="spm-confirm-btn" class="w-full py-3 rounded-xl bg-success text-bg text-sm font-semibold">
                Simulasikan Pembayaran Berhasil (QRIS)
            </button>
            <button type="button" id="spm-later-btn" class="w-full py-3 rounded-xl bg-surface-2 border border-border text-sm text-text-secondary">
                Lihat Halaman Status Pesanan
            </button>
        </div>
    </div>
</div>

<div id="ranum-toast" class="ranum-float-bar fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium border shadow-lg bg-surface-4 border-accent/50 text-text-primary whitespace-nowrap"></div>
@endsection

@push('scripts')
<script>
window.__RANUM_TABLE__ = {!! json_encode([
    'qrToken' => $qrToken,
    'apiUrl' => $publicApiUrl,
    'taxRatePercent' => $branch['taxRatePercent'] ?? 10,
    'serviceChargePercent' => $branch['serviceChargePercent'] ?? 5,
    'allowPayAtCashier' => $branch['allowPayAtCashier'] ?? false,
    'products' => $products,
], JSON_UNESCAPED_UNICODE) !!};
</script>
@vite(['resources/ts/table-order.ts'])
@endpush
