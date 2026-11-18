@extends('layouts.app')

@section('title', 'Tentang & Lokasi — RANUM Coffee')

@section('content')
<section class="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-14 overflow-hidden">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div class="lg:col-span-6 space-y-4">
            <p class="ranum-enter-1 text-xs uppercase tracking-[0.22em] text-olive font-medium">Cerita Kami</p>
            <h1 class="ranum-enter-2 font-display text-4xl sm:text-5xl font-semibold text-text-primary leading-tight">
                Ruang Singgah untuk Kopi yang Diseduh dengan Tenang.
            </h1>
            <p class="ranum-enter-3 text-base text-text-secondary leading-relaxed">
                RANUM Coffee lahir dari kecintaan terhadap keragaman karakter kopi Indonesia — dari aroma berry Aceh Gayo hingga manisnya gula aren Banyumas. Kami merancang ruang yang intim dan hangat agar setiap kunjungan terasa personal.
            </p>
        </div>

        <div class="lg:col-span-6 ranum-enter-4">
            <div class="ranum-float-slow aspect-[16/10] rounded-2xl overflow-hidden border border-border bg-surface-2 shadow-lg">
                <img src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=80"
                     alt="Proses seduh kopi di RANUM Coffee"
                     class="w-full h-full object-cover">
            </div>
        </div>
    </div>

    <div class="bg-surface-1 border border-border rounded-xl py-3 ranum-marquee">
        <div class="ranum-marquee-track text-xs uppercase tracking-[0.26em] text-text-muted">
            <div class="flex items-center gap-8 pr-8">
                <span>Single Origin Nusantara</span><span class="text-accent">•</span>
                <span>Small Batch Roasting</span><span class="text-accent">•</span>
                <span>Hand-Poured V60</span><span class="text-accent">•</span>
                <span>Jl. Suryo No. 28 Senopati</span><span class="text-accent">•</span>
            </div>
            <div class="flex items-center gap-8 pr-8" aria-hidden="true">
                <span>Single Origin Nusantara</span><span class="text-accent">•</span>
                <span>Small Batch Roasting</span><span class="text-accent">•</span>
                <span>Hand-Poured V60</span><span class="text-accent">•</span>
                <span>Jl. Suryo No. 28 Senopati</span><span class="text-accent">•</span>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div data-reveal="left" class="ranum-card p-6 rounded-2xl bg-surface-2 border border-border space-y-4">
            <h2 class="font-display text-2xl font-semibold text-text-primary">Outlet Flagship</h2>
            <div class="space-y-2 text-sm text-text-secondary">
                <p class="text-text-primary font-medium">{{ $outlet['name'] ?? 'RANUM Coffee — Senopati' }}</p>
                <p>{{ $outlet['address'] ?? 'Jl. Suryo No. 28, Kebayoran Baru, Jakarta Selatan' }}</p>
                <p>Telepon: {{ $outlet['phone'] ?? '+62 21 5550 1928' }}</p>
            </div>
        </div>

        <div data-reveal="right" class="ranum-card p-6 rounded-2xl bg-surface-2 border border-border space-y-4">
            <h2 class="font-display text-2xl font-semibold text-text-primary">Jam Operasional</h2>
            <div class="space-y-2 text-sm text-text-secondary">
                <p>Senin – Minggu: <span class="text-text-primary font-medium">{{ $outlet['openHours'] ?? '07:00 - 22:00 WIB' }}</span></p>
                <p class="flex items-center gap-2">Status Saat Ini:
                    @if(($outlet['isOpen'] ?? true))
                        <span class="inline-flex items-center gap-1.5 text-success font-medium">
                            <span class="ranum-pulse-dot w-2 h-2 rounded-full bg-success"></span>
                            Buka
                        </span>
                    @else
                        <span class="text-danger font-medium">Tutup</span>
                    @endif
                </p>
                <p class="text-xs text-text-muted pt-1">Last order 30 menit sebelum jam tutup.</p>
            </div>
        </div>
    </div>
</section>
@endsection
