@extends('layouts.app')

@section('title', 'Menu Digital — RANUM Coffee')

@section('content')
<section class="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-2">
            <p class="ranum-enter-1 text-xs uppercase tracking-[0.22em] text-olive font-medium">Katalog Musiman</p>
            <h1 class="ranum-enter-2 font-display text-4xl sm:text-5xl font-semibold text-text-primary">Menu RANUM Coffee</h1>
            <p class="ranum-enter-3 text-sm text-text-secondary max-w-xl">
                Untuk memesan langsung dari meja, silakan pindai QR code yang tersedia di meja Anda.
            </p>
        </div>

        <form method="GET" action="{{ route('menu') }}" class="ranum-enter-3 flex items-center gap-2 w-full md:w-80">
            @if($activeCategory)
                <input type="hidden" name="category" value="{{ $activeCategory }}">
            @endif
            <input type="text" name="q" value="{{ $searchQuery }}" placeholder="Cari kopi atau pastry..."
                   class="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors">
            <button type="submit" class="ranum-btn px-4 py-2.5 rounded-lg bg-surface-3 border border-border text-sm text-text-primary hover:border-accent">
                Cari
            </button>
        </form>
    </div>

    {{-- Category Filter --}}
    <div class="ranum-enter-4 no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <a href="{{ route('menu', array_filter(['q' => $searchQuery])) }}"
           class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap {{ !$activeCategory ? 'bg-accent text-bg' : 'bg-surface-2 text-text-secondary border border-border hover:border-accent/50' }}">
            Semua Menu
        </a>
        @foreach($categories as $cat)
            <a href="{{ route('menu', array_filter(['category' => $cat['slug'], 'q' => $searchQuery])) }}"
               class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap {{ $activeCategory === $cat['slug'] ? 'bg-accent text-bg' : 'bg-surface-2 text-text-secondary border border-border hover:border-accent/50' }}">
                {{ $cat['name'] }}
            </a>
        @endforeach
    </div>

    {{-- Product Grid --}}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        @forelse($products as $idx => $product)
            <article data-reveal style="--reveal-delay: {{ min($idx, 5) * 45 }}ms" class="ranum-card rounded-xl bg-surface-2 border border-border overflow-hidden flex flex-col hover:border-accent/50">
                <div class="aspect-[4/3] bg-surface-3 relative overflow-hidden">
                    <img src="{{ $product['imageUrl'] ?? 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80' }}"
                         alt="{{ $product['name'] }}"
                         loading="lazy"
                         class="ranum-card-img w-full h-full object-cover {{ ($product['availability'] ?? 'ACTIVE') === 'OUT_OF_STOCK' ? 'opacity-45 grayscale' : '' }}">
                    @if(($product['badge'] ?? 'NONE') !== 'NONE')
                        <span class="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface-1/90 border border-border text-[11px] font-medium text-accent">
                            {{ str_replace('_', ' ', $product['badge']) }}
                        </span>
                    @endif
                    @if(($product['availability'] ?? 'ACTIVE') === 'OUT_OF_STOCK')
                        <span class="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-danger/90 text-bg text-[11px] font-semibold">
                            Habis
                        </span>
                    @endif
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div class="space-y-1.5">
                        <p class="text-xs text-text-muted">{{ $product['category']['name'] ?? '' }}</p>
                        <h2 class="text-lg font-semibold text-text-primary">{{ $product['name'] }}</h2>
                        <p class="text-sm text-text-secondary leading-relaxed">{{ $product['description'] }}</p>
                    </div>
                    <div class="flex items-center justify-between pt-3 border-t border-border">
                        <span class="text-base font-semibold text-text-primary tabular-nums">
                            Rp {{ number_format($product['basePrice'], 0, ',', '.') }}
                        </span>
                        <span class="text-xs {{ ($product['availability'] ?? 'ACTIVE') === 'ACTIVE' ? 'text-success' : 'text-danger' }}">
                            {{ ($product['availability'] ?? 'ACTIVE') === 'ACTIVE' ? 'Tersedia' : 'Sementara Habis' }}
                        </span>
                    </div>
                </div>
            </article>
        @empty
            <div class="col-span-full p-10 rounded-xl bg-surface-2 border border-border text-center text-text-muted">
                Tidak ada produk yang cocok dengan pencarian Anda.
            </div>
        @endforelse
    </div>
</section>
@endsection
