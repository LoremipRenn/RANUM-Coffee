@extends('layouts.app')

@section('title', 'RANUM Coffee — Where Every Sip Has a Story')

@section('content')
{{-- Cinematic Editorial Hero --}}
<section class="relative overflow-hidden border-b border-border">
    <div class="absolute inset-0 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80"
             alt="RANUM Coffee Slow Bar"
             class="ranum-hero-kenburns w-full h-full object-cover opacity-35">
        <div class="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/50"></div>
    </div>

    <div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-36">
        <div class="max-w-2xl space-y-6">
            <div class="ranum-enter-1 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-2/90 border border-border text-xs">
                @if(($outlet['isOpen'] ?? true))
                    <span class="ranum-pulse-dot w-2 h-2 rounded-full bg-success"></span>
                    <span class="text-text-secondary">Buka Hari Ini • {{ $outlet['openHours'] ?? '07:00 - 22:00 WIB' }}</span>
                @else
                    <span class="w-2 h-2 rounded-full bg-danger"></span>
                    <span class="text-text-secondary">Sedang Tutup • {{ $outlet['openHours'] ?? '07:00 - 22:00 WIB' }}</span>
                @endif
            </div>

            <h1 class="ranum-enter-2 font-display text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-text-primary leading-[1.08]">
                Where Every Sip<br>
                <span class="text-accent italic font-medium">Has a Story.</span>
            </h1>

            <p class="ranum-enter-3 text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
                Menyeduh biji kopi single origin Nusantara dengan ketelitian rasa, ruang yang tenang, dan pengalaman memesan langsung dari meja Anda.
            </p>

            <div class="ranum-enter-4 flex flex-wrap items-center gap-3 pt-2">
                <a href="{{ route('menu') }}" class="ranum-btn px-6 py-3 rounded-lg bg-accent text-bg text-sm font-semibold hover:bg-accent-hover shadow-sm">
                    Jelajahi Menu
                </a>
                <a href="{{ route('about') }}" class="ranum-btn px-6 py-3 rounded-lg bg-surface-2 border border-border text-text-primary text-sm font-medium hover:border-accent/60">
                    Kunjungi Senopati
                </a>
            </div>
        </div>
    </div>
</section>

{{-- Repeating Editorial Origin Marquee --}}
<div class="bg-surface-1 border-b border-border py-3 ranum-marquee">
    <div class="ranum-marquee-track text-xs uppercase tracking-[0.26em] text-text-muted">
        <div class="flex items-center gap-8 pr-8">
            <span>Aceh Gayo Pantan Musara</span><span class="text-accent">•</span>
            <span>Toraja Sapan</span><span class="text-accent">•</span>
            <span>Flores Manggarai</span><span class="text-accent">•</span>
            <span>Gula Aren Banyumas</span><span class="text-accent">•</span>
            <span>Slow Bar Senopati</span><span class="text-accent">•</span>
        </div>
        <div class="flex items-center gap-8 pr-8" aria-hidden="true">
            <span>Aceh Gayo Pantan Musara</span><span class="text-accent">•</span>
            <span>Toraja Sapan</span><span class="text-accent">•</span>
            <span>Flores Manggarai</span><span class="text-accent">•</span>
            <span>Gula Aren Banyumas</span><span class="text-accent">•</span>
            <span>Slow Bar Senopati</span><span class="text-accent">•</span>
        </div>
    </div>
</div>

{{-- Signature Menu --}}
<section class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
    <div data-reveal class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="space-y-2">
            <p class="text-xs uppercase tracking-[0.22em] text-olive font-medium">Pilihan Barista</p>
            <h2 class="font-display text-3xl sm:text-4xl font-semibold text-text-primary">Menu Unggulan</h2>
        </div>
        <a href="{{ route('menu') }}" class="text-sm text-accent hover:text-accent-hover font-medium transition-colors">
            Lihat Semua Menu &rarr;
        </a>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        @forelse($featuredProducts as $idx => $product)
            <article data-reveal style="--reveal-delay: {{ min($idx, 5) * 60 }}ms" class="ranum-card rounded-xl bg-surface-2 border border-border overflow-hidden flex flex-col hover:border-accent/50">
                <div class="aspect-[4/3] bg-surface-3 overflow-hidden relative">
                    <img src="{{ $product['imageUrl'] ?? 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80' }}"
                         alt="{{ $product['name'] }}"
                         loading="lazy"
                         class="ranum-card-img w-full h-full object-cover">
                    @if(($product['badge'] ?? 'NONE') !== 'NONE')
                        <span class="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface-1/90 border border-border text-[11px] font-medium text-accent">
                            {{ str_replace('_', ' ', $product['badge']) }}
                        </span>
                    @endif
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div class="space-y-1.5">
                        <p class="text-xs text-text-muted">{{ $product['category']['name'] ?? 'Coffee' }}</p>
                        <h3 class="text-lg font-semibold text-text-primary">{{ $product['name'] }}</h3>
                        <p class="text-sm text-text-secondary line-clamp-2 leading-relaxed">{{ $product['description'] }}</p>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-border">
                        <span class="text-base font-semibold text-text-primary tabular-nums">
                            Rp {{ number_format($product['basePrice'], 0, ',', '.') }}
                        </span>
                        <span class="text-xs text-text-muted">Tersedia via QR Meja</span>
                    </div>
                </div>
            </article>
        @empty
            <div class="col-span-full p-8 rounded-xl bg-surface-2 border border-border text-center text-text-muted text-sm">
                Menu sedang dimuat atau server API belum aktif.
            </div>
        @endforelse
    </div>
</section>

{{-- Origin & Craft Story --}}
<section class="bg-surface-1 border-y border-border overflow-hidden">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div data-reveal="left" class="lg:col-span-6 space-y-5">
            <p class="text-xs uppercase tracking-[0.22em] text-olive font-medium">Akar Nusantara</p>
            <h2 class="font-display text-3xl sm:text-4xl font-semibold text-text-primary leading-tight">
                Dari Dataran Tinggi Gayo hingga Manggarai, disangrai kecil untuk karakter terbaik.
            </h2>
            <p class="text-sm sm:text-base text-text-secondary leading-relaxed">
                Setiap cangkir di RANUM Coffee berasal dari kemitraan langsung dengan petani kopi Indonesia. Kami memadukan teknik seduh manual yang presisi dengan kehangatan rempah dan gula aren organik lokal.
            </p>
            <div class="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2">
                <div class="p-3 sm:p-4 rounded-xl bg-surface-2 border border-border">
                    <p class="font-display text-xl sm:text-2xl font-semibold text-accent">100%</p>
                    <p class="text-[11px] sm:text-xs text-text-secondary mt-1">Arabika Nusantara</p>
                </div>
                <div class="p-3 sm:p-4 rounded-xl bg-surface-2 border border-border">
                    <p class="font-display text-xl sm:text-2xl font-semibold text-accent">QR</p>
                    <p class="text-[11px] sm:text-xs text-text-secondary mt-1">Pesan dari Meja</p>
                </div>
                <div class="p-3 sm:p-4 rounded-xl bg-surface-2 border border-border">
                    <p class="font-display text-xl sm:text-2xl font-semibold text-accent">Snap</p>
                    <p class="text-[11px] sm:text-xs text-text-secondary mt-1">QRIS & E-Wallet</p>
                </div>
            </div>
        </div>
        <div data-reveal="right" class="lg:col-span-6">
            <div class="ranum-float-slow aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-surface-2 shadow-lg">
                <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80"
                     alt="Suasana Kedai RANUM Coffee"
                     loading="lazy"
                     class="w-full h-full object-cover">
            </div>
        </div>
    </div>
</section>

{{-- QR Table Ordering Banner --}}
<section class="max-w-6xl mx-auto px-4 sm:px-6 pt-16">
    <div data-reveal class="p-8 sm:p-10 rounded-2xl bg-surface-2 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2 max-w-xl">
            <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium">Dine-In Praktis</p>
            <h3 class="font-display text-2xl sm:text-3xl font-semibold text-text-primary">
                Sudah duduk di meja? Pindai QR untuk memesan tanpa antre.
            </h3>
            <p class="text-sm text-text-secondary">
                Pilih ukuran, tingkat gula, pilihan susu, dan bayar langsung melalui QRIS, GoPay, atau Virtual Account dari smartphone Anda.
            </p>
        </div>
        <a href="{{ url('/t/ranum-meja-01-senopati-8f3a') }}" class="ranum-btn px-5 py-3 rounded-lg bg-surface-3 border border-accent/40 text-accent text-sm font-medium hover:bg-accent hover:text-bg whitespace-nowrap">
            Coba Demo Meja 01 &rarr;
        </a>
    </div>
</section>
@endsection
