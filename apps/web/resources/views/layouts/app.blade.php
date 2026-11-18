<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'RANUM Coffee — Where Every Sip Has a Story')</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/ts/motion.ts'])
    @stack('head')
</head>
<body class="bg-bg text-text-primary min-h-screen flex flex-col">
    <header class="sticky top-0 z-30 bg-surface-1/95 backdrop-blur-sm border-b border-border">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <a href="{{ route('home') }}" class="flex items-center gap-2.5 sm:gap-3 group shrink-0">
                <span class="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-accent font-display text-lg font-bold">R</span>
                <div class="leading-tight">
                    <span class="font-display text-lg sm:text-xl tracking-wide font-semibold text-text-primary block">RANUM</span>
                    <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-text-muted block">Specialty Coffee</span>
                </div>
            </a>

            <nav class="hidden md:flex items-center gap-7 text-sm">
                <a href="{{ route('home') }}" class="{{ request()->routeIs('home') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text-primary' }} transition-colors">Beranda</a>
                <a href="{{ route('menu') }}" class="{{ request()->routeIs('menu') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text-primary' }} transition-colors">Menu</a>
                <a href="{{ route('about') }}" class="{{ request()->routeIs('about') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text-primary' }} transition-colors">Tentang & Lokasi</a>
            </nav>

            <div class="flex items-center gap-2 min-w-0">
                @hasSection('nav-badge')
                    @yield('nav-badge')
                @else
                    <a href="{{ route('menu') }}" class="ranum-btn px-3.5 sm:px-4 py-2 rounded-lg bg-accent text-bg text-xs sm:text-sm font-semibold hover:bg-accent-hover whitespace-nowrap">
                        Lihat Menu
                    </a>
                @endif
                <button type="button" id="mobile-nav-toggle" aria-label="Buka Menu Navigasi" aria-expanded="false"
                        class="md:hidden w-10 h-10 rounded-lg bg-surface-2 border border-border text-text-primary flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
        </div>

        {{-- Mobile Navigation Drawer --}}
        <nav id="mobile-nav-menu" class="hidden md:hidden border-t border-border bg-surface-1 px-4 py-3 space-y-1">
            <a href="{{ route('home') }}" class="block px-3 py-2.5 rounded-lg text-sm {{ request()->routeIs('home') ? 'bg-surface-2 text-accent font-medium' : 'text-text-secondary hover:bg-surface-2' }}">Beranda</a>
            <a href="{{ route('menu') }}" class="block px-3 py-2.5 rounded-lg text-sm {{ request()->routeIs('menu') ? 'bg-surface-2 text-accent font-medium' : 'text-text-secondary hover:bg-surface-2' }}">Menu</a>
            <a href="{{ route('about') }}" class="block px-3 py-2.5 rounded-lg text-sm {{ request()->routeIs('about') ? 'bg-surface-2 text-accent font-medium' : 'text-text-secondary hover:bg-surface-2' }}">Tentang & Lokasi</a>
        </nav>
    </header>

    <main class="flex-1">
        @yield('content')
    </main>

    @unless(View::hasSection('hide-footer'))
    <footer class="bg-surface-1 border-t border-border mt-16">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="space-y-3">
                <h3 class="font-display text-2xl font-semibold text-text-primary">RANUM Coffee</h3>
                <p class="text-sm text-text-secondary leading-relaxed">
                    Where Every Sip Has a Story. Menyeduh biji kopi pilihan nusantara dengan pendekatan tenang, hangat, dan presisi.
                </p>
            </div>
            <div class="space-y-2 text-sm">
                <p class="text-xs uppercase tracking-widest text-text-muted">Navigasi</p>
                <div class="flex flex-col gap-1.5 text-text-secondary">
                    <a href="{{ route('home') }}" class="hover:text-accent">Beranda</a>
                    <a href="{{ route('menu') }}" class="hover:text-accent">Katalog Menu</a>
                    <a href="{{ route('about') }}" class="hover:text-accent">Tentang & Lokasi</a>
                    <a href="{{ route('staff.login') }}" class="hover:text-accent">Portal Staf</a>
                </div>
            </div>
            <div class="space-y-2 text-sm">
                <p class="text-xs uppercase tracking-widest text-text-muted">Outlet</p>
                <p class="text-text-secondary">Jl. Suryo No. 28, Kebayoran Baru, Jakarta Selatan</p>
                <p class="text-text-muted">Buka setiap hari • 07:00 - 22:00 WIB</p>
            </div>
        </div>
        <div class="border-t border-border py-4 text-center text-xs text-text-muted">
            &copy; {{ date('Y') }} RANUM Coffee. All rights reserved.
        </div>
    </footer>
    @endunless

    @stack('scripts')
</body>
</html>
