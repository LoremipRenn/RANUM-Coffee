@extends('layouts.app')

@section('title', 'QR Meja Tidak Valid — RANUM Coffee')

@section('content')
<section class="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
    <div class="w-16 h-16 mx-auto rounded-2xl bg-surface-2 border border-danger/40 flex items-center justify-center text-danger text-2xl">
        !
    </div>
    <div class="space-y-2">
        <h1 class="font-display text-3xl sm:text-4xl font-semibold text-text-primary">Tidak Dapat Membuka Meja</h1>
        <p class="text-sm sm:text-base text-text-secondary leading-relaxed">{{ $message }}</p>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a href="{{ route('menu') }}" class="px-5 py-2.5 rounded-lg bg-accent text-bg text-sm font-semibold hover:bg-accent-hover">
            Lihat Katalog Menu
        </a>
        <a href="{{ route('home') }}" class="px-5 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-primary">
            Kembali ke Beranda
        </a>
    </div>
</section>
@endsection
