@extends('layouts.staff')

@section('title', 'Login Staf — RANUM Coffee')

@section('content')
<div class="min-h-screen flex items-center justify-center p-4 bg-bg">
    <div class="ranum-enter w-full max-w-md rounded-2xl bg-surface-2 border border-border p-6 sm:p-8 space-y-6 shadow-lg">
        <div class="ranum-enter-1 space-y-1.5 text-center">
            <a href="{{ route('home') }}" class="inline-block font-display text-3xl font-semibold text-text-primary hover:text-accent transition-colors duration-200">
                RANUM Coffee
            </a>
            <p class="text-xs uppercase tracking-[0.2em] text-text-muted">Portal Operasional Staf</p>
        </div>

        @if($errors->any())
            <div class="ranum-enter-1 p-3.5 rounded-lg bg-danger/15 border border-danger/40 text-xs text-danger">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="{{ route('staff.login.post') }}" class="space-y-4">
            @csrf
            <div class="ranum-enter-2 space-y-1.5">
                <label for="email" class="text-xs font-medium text-text-secondary block">Email Staf</label>
                <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus
                       placeholder="nama@ranumcoffee.id"
                       class="w-full px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors duration-200">
            </div>

            <div class="ranum-enter-3 space-y-1.5">
                <label for="password" class="text-xs font-medium text-text-secondary block">Password</label>
                <input id="password" type="password" name="password" required
                       placeholder="••••••••"
                       class="w-full px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors duration-200">
            </div>

            <div class="ranum-enter-4 pt-1 space-y-3">
                <button type="submit" class="ranum-btn w-full py-3 rounded-lg bg-accent text-bg text-sm font-semibold hover:bg-accent-hover shadow-sm min-h-[44px]">
                    Masuk ke Dashboard
                </button>
                <div class="text-center">
                    <a href="{{ route('home') }}" class="inline-block text-xs text-text-muted hover:text-accent transition-colors duration-200">
                        &larr; Kembali ke Beranda
                    </a>
                </div>
            </div>
        </form>
    </div>
</div>
@endsection
