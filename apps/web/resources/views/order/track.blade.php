@extends('layouts.app')

@section('title', 'Status Pesanan ' . $order['orderNumber'] . ' — RANUM Coffee')
@section('hide-footer', true)

@push('head')
@if($midtransClientKey)
    <script src="{{ $midtransIsProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js' }}"
            data-client-key="{{ $midtransClientKey }}"></script>
@endif
@endpush

@section('content')
@php
    $steps = [
        'AWAITING_PAYMENT' => 'Menunggu Pembayaran',
        'PENDING' => 'Menunggu Konfirmasi',
        'CONFIRMED' => 'Diterima Barista',
        'PREPARING' => 'Sedang Dibuat',
        'READY' => 'Siap Disajikan',
        'SERVED' => 'Telah Disajikan',
        'COMPLETED' => 'Selesai',
    ];
    $latestPayment = $order['payments'][0] ?? null;
    $isPaid = collect($order['payments'] ?? [])->contains(fn($p) => ($p['status'] ?? '') === 'PAID');
@endphp

<section class="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <div class="ranum-enter-1 p-6 rounded-2xl bg-surface-2 border border-border space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <p class="text-xs uppercase tracking-widest text-text-muted">Nomor Pesanan</p>
                <h1 class="font-display text-2xl sm:text-3xl font-semibold text-text-primary tabular-nums break-all">{{ $order['orderNumber'] }}</h1>
                <p class="text-sm text-text-secondary mt-0.5">{{ $order['table']['name'] ?? 'Meja' }} • {{ $order['branch']['name'] ?? 'RANUM Coffee' }}</p>
            </div>
            <div class="flex flex-col items-end gap-1.5">
                <span id="track-order-badge" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-surface-3 text-accent border-accent/40 transition-colors duration-200">
                    {{ $steps[$order['status']] ?? $order['status'] }}
                </span>
                <span id="track-payment-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-200 {{ $isPaid ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning border-warning/30' }}">
                    {{ $isPaid ? 'Lunas' : ($latestPayment['status'] ?? 'Menunggu Bayar') }}
                </span>
            </div>
        </div>

        <div id="track-pay-actions" class="{{ ($isPaid || $order['status'] === 'CANCELLED') ? 'hidden' : '' }} pt-3 border-t border-border flex flex-wrap items-center gap-2.5">
            @if(($order['paymentPolicy'] ?? 'ONLINE_MIDTRANS') === 'ONLINE_MIDTRANS')
                <button type="button" id="btn-pay-now" class="ranum-btn px-4 py-2.5 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-hover min-h-[44px]">
                    Bayar Sekarang
                </button>
                <button type="button" id="btn-sync-payment" class="ranum-btn px-4 py-2.5 rounded-lg bg-surface-3 border border-border text-xs text-text-primary hover:border-accent min-h-[44px]">
                    Cek Status Pembayaran
                </button>
            @else
                <p class="text-xs text-warning">Silakan selesaikan pembayaran di kasir.</p>
            @endif
        </div>
    </div>

    {{-- Progress Timeline --}}
    <div data-reveal class="ranum-enter-2 p-6 rounded-2xl bg-surface-2 border border-border space-y-4">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-text-secondary">Progres Pesanan</h2>
        <div class="space-y-3.5">
            @foreach($steps as $code => $label)
                <div class="flex items-center gap-3" data-step-status="{{ $code }}">
                    <span data-step-dot class="w-3 h-3 rounded-full transition-all duration-300 {{ $order['status'] === $code ? 'bg-accent ring-4 ring-accent/20' : 'bg-surface-3 border border-border' }}"></span>
                    <span data-step-label class="text-sm transition-colors duration-200 {{ $order['status'] === $code ? 'font-semibold text-accent' : 'text-text-secondary' }}">{{ $label }}</span>
                </div>
            @endforeach
        </div>
    </div>

    {{-- Order Summary --}}
    <div data-reveal style="--reveal-delay: 80ms" class="ranum-enter-3 p-6 rounded-2xl bg-surface-2 border border-border space-y-4">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-text-secondary">Ringkasan Item</h2>
        <div class="space-y-3 divide-y divide-border">
            @foreach($order['items'] as $item)
                <div class="pt-3 first:pt-0 flex items-start justify-between gap-3 text-sm">
                    <div>
                        <p class="font-medium text-text-primary">
                            <span class="text-accent tabular-nums">{{ $item['quantity'] }}x</span> {{ $item['productName'] }}
                        </p>
                        @if(!empty($item['options']))
                            <p class="text-xs text-text-secondary mt-0.5">
                                {{ collect($item['options'])->pluck('optionName')->join(' • ') }}
                            </p>
                        @endif
                        @if(!empty($item['notes']))
                            <p class="text-xs text-warning mt-0.5">Catatan: {{ $item['notes'] }}</p>
                        @endif
                    </div>
                    <span class="font-medium text-text-primary tabular-nums">
                        Rp {{ number_format($item['lineTotal'], 0, ',', '.') }}
                    </span>
                </div>
            @endforeach
        </div>

        <div class="pt-3 border-t border-border space-y-1 text-xs text-text-secondary">
            <div class="flex justify-between"><span>Subtotal</span><span class="tabular-nums">Rp {{ number_format($order['subtotal'], 0, ',', '.') }}</span></div>
            <div class="flex justify-between"><span>Service Charge</span><span class="tabular-nums">Rp {{ number_format($order['serviceChargeAmount'], 0, ',', '.') }}</span></div>
            <div class="flex justify-between"><span>Pajak</span><span class="tabular-nums">Rp {{ number_format($order['taxAmount'], 0, ',', '.') }}</span></div>
            <div class="flex justify-between text-base font-semibold text-text-primary pt-2 border-t border-border">
                <span>Total</span>
                <span class="text-accent tabular-nums">Rp {{ number_format($order['totalAmount'], 0, ',', '.') }}</span>
            </div>
        </div>
    </div>

    <div class="ranum-enter-4 flex flex-wrap items-center justify-between gap-3">
        <a id="btn-order-more" href="#" class="ranum-btn hidden px-5 py-3 rounded-xl bg-accent text-bg text-sm font-semibold hover:bg-accent-hover">
            + Pesan Tambahan di Meja Ini
        </a>
        <a href="{{ route('home') }}" class="ranum-btn px-5 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text-secondary hover:text-text-primary hover:border-accent/50">
            Ke Halaman Utama
        </a>
    </div>
</section>

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

{{-- Local Sandbox Simulator Modal --}}
<div id="sandbox-pay-modal" class="ranum-overlay fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
    <div class="ranum-modal-panel w-full max-w-md rounded-2xl bg-surface-4 border border-border p-6 space-y-5 shadow-lg">
        <div class="space-y-1">
            <span class="text-xs uppercase tracking-widest text-warning font-semibold">Midtrans Sandbox Mode</span>
            <h3 class="font-display text-2xl font-semibold text-text-primary">Simulasi Pembayaran Online</h3>
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
                Tutup
            </button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
window.__RANUM_TRACK__ = {!! json_encode([
    'accessToken' => $accessToken,
    'apiUrl' => $publicApiUrl,
    'initialStatus' => $order['status'],
    'orderNumber' => $order['orderNumber'],
    'totalAmount' => $order['totalAmount'],
], JSON_UNESCAPED_UNICODE) !!};
</script>
@vite(['resources/ts/order-track.ts'])
@endpush
