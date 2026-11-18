@extends('layouts.staff')

@section('title', 'Dashboard Operasional — RANUM Coffee')

@section('content')
@php $role = $staffUser['role'] ?? 'CASHIER'; @endphp
<div class="min-h-screen flex bg-bg relative overflow-x-hidden">
    {{-- Mobile Sidebar Backdrop --}}
    <div id="sidebar-backdrop" class="ranum-overlay fixed inset-0 z-30 bg-black/65 backdrop-blur-sm lg:hidden"></div>

    {{-- Sidebar (Elevation 1, Collapsible on Desktop & Slide-over on Mobile) --}}
    <aside id="staff-sidebar" data-collapsed="false"
           class="ranum-staff-sidebar ranum-enter fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface-1 border-r border-border p-4 flex flex-col justify-between gap-6 shrink-0 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-out">
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <span class="font-display text-2xl font-semibold text-text-primary">RANUM</span>
                    <span class="block text-[11px] uppercase tracking-widest text-olive">Operations</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded bg-surface-3 border border-border text-[11px] font-medium text-accent">
                        {{ $role }}
                    </span>
                    <button type="button" id="sidebar-mobile-close" aria-label="Tutup Menu"
                            class="ranum-btn lg:hidden w-8 h-8 rounded-lg bg-surface-2 border border-border text-text-primary flex items-center justify-center">
                        ✕
                    </button>
                </div>
            </div>

            <nav class="flex flex-col gap-1.5">
                <button type="button" data-tab-btn="queue" class="ranum-btn w-full whitespace-nowrap flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium bg-surface-2 text-accent border-l-2 border-accent">
                    Antrean Pesanan
                </button>
                <button type="button" data-tab-btn="tables" class="ranum-btn w-full whitespace-nowrap flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-2/60">
                    Meja & QR
                </button>
                @if($role === 'ADMIN')
                <button type="button" data-tab-btn="menu" class="ranum-btn w-full whitespace-nowrap flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-2/60">
                    Menu & Stok
                </button>
                @endif
                @if(in_array($role, ['ADMIN', 'CASHIER']))
                <button type="button" data-tab-btn="reports" class="ranum-btn w-full whitespace-nowrap flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-2/60">
                    Pembayaran & Laporan
                </button>
                @endif
                @if($role === 'ADMIN')
                <button type="button" data-tab-btn="settings" class="ranum-btn w-full whitespace-nowrap flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-2/60">
                    Pengaturan & Staf
                </button>
                @endif
            </nav>
        </div>

        <div class="pt-4 border-t border-border flex items-center justify-between gap-2">
            <div class="min-w-0">
                <p class="text-xs font-medium text-text-primary truncate">{{ $staffUser['name'] }}</p>
                <p class="text-[11px] text-text-muted truncate">{{ $staffUser['email'] }}</p>
            </div>
            <form method="POST" action="{{ route('staff.logout') }}">
                @csrf
                <button type="submit" class="ranum-btn px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-secondary hover:text-danger hover:border-danger/40">
                    Keluar
                </button>
            </form>
        </div>
    </aside>

    {{-- Main Workspace --}}
    <div class="flex-1 min-w-0 flex flex-col">
        {{-- Compact Top Bar with Sidebar Toggle --}}
        <header class="ranum-enter-1 h-14 border-b border-border bg-surface-1/80 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
            <div class="flex items-center gap-3">
                <button type="button" id="sidebar-toggle-btn" aria-label="Buka/Tutup Sidebar"
                        class="ranum-btn w-9 h-9 rounded-lg bg-surface-2 border border-border text-text-primary hover:border-accent flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
                <span class="text-xs sm:text-sm font-medium text-text-secondary">RANUM Coffee Operations</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-text-muted">
                <span class="ranum-pulse-dot w-2 h-2 rounded-full bg-success"></span>
                <span class="hidden sm:inline">Realtime Aktif</span>
            </div>
        </header>

        <main class="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
            {{-- TAB: QUEUE --}}
            <section data-tab-panel="queue" class="ranum-enter-2 space-y-5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 class="font-display text-3xl font-semibold text-text-primary">Antrean Pesanan</h1>
                        <p class="text-xs text-text-muted">Pembaruan otomatis secara realtime untuk pesanan masuk & dapur.</p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <input type="text" id="queue-search-input" placeholder="Cari No. Order / Tamu..."
                               class="px-3.5 py-2 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors">
                        <select id="queue-status-filter" class="px-3.5 py-2 rounded-lg bg-surface-2 border border-border text-sm text-text-primary focus:border-accent focus:outline-none transition-colors">
                            <option value="">Semua Status</option>
                            <option value="PENDING">Menunggu Konfirmasi</option>
                            <option value="CONFIRMED">Diterima Barista</option>
                            <option value="PREPARING">Sedang Dibuat</option>
                            <option value="READY">Siap Disajikan</option>
                            <option value="SERVED">Telah Disajikan</option>
                            <option value="AWAITING_PAYMENT">Menunggu Pembayaran</option>
                            <option value="COMPLETED">Selesai</option>
                            <option value="CANCELLED">Dibatalkan</option>
                        </select>
                        <button type="button" id="queue-refresh-btn" class="ranum-btn px-3.5 py-2 rounded-lg bg-surface-2 border border-border text-sm text-text-primary hover:border-accent">
                            Refresh
                        </button>
                    </div>
                </div>

                <div id="staff-requests-box" class="hidden"></div>

                <div id="orders-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div class="col-span-full p-8 text-center text-sm text-text-muted">Memuat antrean...</div>
                </div>
            </section>

            {{-- TAB: TABLES & QR --}}
            <section data-tab-panel="tables" class="hidden ranum-enter space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 class="font-display text-3xl font-semibold text-text-primary">Manajemen Meja & QR</h1>
                        <p class="text-xs text-text-muted">Pantau sesi meja aktif, cetak QR, atau kelola akses pemesanan meja.</p>
                    </div>
                </div>

                @if($role === 'ADMIN')
                <form id="create-table-form" class="p-4 rounded-xl bg-surface-2 border border-border grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    <div>
                        <label class="text-xs text-text-secondary block mb-1">Kode</label>
                        <input type="text" name="code" required placeholder="T-07" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                    </div>
                    <div>
                        <label class="text-xs text-text-secondary block mb-1">Nama Meja</label>
                        <input type="text" name="name" required placeholder="Meja 07" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                    </div>
                    <div>
                        <label class="text-xs text-text-secondary block mb-1">Area</label>
                        <input type="text" name="area" placeholder="Indoor" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                    </div>
                    <div>
                        <label class="text-xs text-text-secondary block mb-1">Kapasitas</label>
                        <input type="number" name="capacity" value="4" min="1" max="24" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                    </div>
                    <button type="submit" class="ranum-btn py-2 px-4 rounded-lg bg-accent text-bg text-sm font-semibold hover:bg-accent-hover h-[38px]">
                        + Tambah Meja
                    </button>
                </form>
                @endif

                <div id="tables-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
            </section>

            {{-- TAB: MENU & STOK --}}
            @if($role === 'ADMIN')
            <section data-tab-panel="menu" class="hidden ranum-enter space-y-6">
                <div>
                    <h1 class="font-display text-3xl font-semibold text-text-primary">Menu & Ketersediaan</h1>
                    <p class="text-xs text-text-muted">Kelola produk dan ubah status stok secara instan.</p>
                </div>

                <form id="create-product-form" class="p-5 rounded-xl bg-surface-2 border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label class="text-xs text-text-secondary block mb-1">Kategori</label>
                        <select id="new-product-category" name="categoryId" required class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm"></select>
                    </div>
                    <div>
                        <label class="text-xs text-text-secondary block mb-1">Nama Produk</label>
                        <input type="text" name="name" required placeholder="Kopi Tubruk Gayo" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                    </div>
                    <div>
                        <label class="text-xs text-text-secondary block mb-1">Harga Dasar (IDR)</label>
                        <input type="number" name="basePrice" required min="1000" placeholder="28000" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="text-xs text-text-secondary block mb-1">Deskripsi</label>
                        <input type="text" name="description" required placeholder="Deskripsi singkat karakter rasa..." class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                    </div>
                    <div class="flex items-end">
                        <button type="submit" class="ranum-btn w-full py-2 px-4 rounded-lg bg-accent text-bg text-sm font-semibold hover:bg-accent-hover h-[38px]">
                            + Tambah Produk
                        </button>
                    </div>
                </form>

                <div id="staff-products-list" class="space-y-2.5"></div>
            </section>
            @endif

            {{-- TAB: REPORTS & PAYMENTS --}}
            @if(in_array($role, ['ADMIN', 'CASHIER']))
            <section data-tab-panel="reports" class="hidden ranum-enter space-y-6">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 class="font-display text-3xl font-semibold text-text-primary">Pembayaran & Laporan</h1>
                        <p class="text-xs text-text-muted">Ringkasan penjualan, grafik pemasukan, dan rekonsiliasi transaksi Midtrans & tunai.</p>
                    </div>
                    @if($role === 'ADMIN')
                    <a href="/staff/proxy/staff/reports/export" class="ranum-btn px-4 py-2 rounded-lg bg-surface-2 border border-border text-xs font-medium text-accent hover:border-accent">
                        Ekspor CSV Transaksi
                    </a>
                    @endif
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="ranum-card p-5 rounded-xl bg-surface-2 border border-border">
                        <p class="text-xs text-text-muted">Total Pendapatan Lunas</p>
                        <p id="rep-revenue" class="text-2xl font-bold text-accent tabular-nums mt-1">Rp 0</p>
                    </div>
                    <div class="ranum-card p-5 rounded-xl bg-surface-2 border border-border">
                        <p class="text-xs text-text-muted">Total Pesanan</p>
                        <p id="rep-orders" class="text-2xl font-bold text-text-primary tabular-nums mt-1">0</p>
                    </div>
                    <div class="ranum-card p-5 rounded-xl bg-surface-2 border border-border">
                        <p class="text-xs text-text-muted">Pesanan Lunas</p>
                        <p id="rep-paid" class="text-2xl font-bold text-success tabular-nums mt-1">0</p>
                    </div>
                </div>

                {{-- Revenue Chart (Harian / Bulanan / Tahunan) --}}
                <div class="p-5 rounded-xl bg-surface-2 border border-border space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 class="text-base font-semibold text-text-primary">Grafik Pemasukan</h2>
                            <p id="rev-chart-subtitle" class="text-xs text-text-muted">14 hari terakhir (transaksi lunas)</p>
                        </div>
                        <div class="flex items-center gap-1.5 bg-surface-1 p-1 rounded-lg border border-border" id="rev-chart-period-btns">
                            <button type="button" data-chart-period="day" class="ranum-btn px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-bg">Harian</button>
                            <button type="button" data-chart-period="month" class="ranum-btn px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary">Bulanan</button>
                            <button type="button" data-chart-period="year" class="ranum-btn px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary">Tahunan</button>
                        </div>
                    </div>
                    <div id="rev-chart-container" class="w-full overflow-x-auto">
                        <div class="h-64 flex items-center justify-center text-xs text-text-muted">Memuat grafik...</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div class="lg:col-span-4 p-5 rounded-xl bg-surface-2 border border-border space-y-3">
                        <h2 class="text-sm font-semibold text-text-primary">Produk Terlaris</h2>
                        <div id="rep-top-products"></div>
                    </div>
                    <div class="lg:col-span-8 p-5 rounded-xl bg-surface-2 border border-border space-y-3 overflow-x-auto">
                        <h2 class="text-sm font-semibold text-text-primary">Riwayat Pembayaran</h2>
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-border text-xs text-text-muted">
                                    <th class="py-2 pr-3">No. Order</th>
                                    <th class="py-2 pr-3">Meja</th>
                                    <th class="py-2 pr-3">Metode</th>
                                    <th class="py-2 pr-3">Nominal</th>
                                    <th class="py-2 pr-3">Status</th>
                                    <th class="py-2">Midtrans Ref</th>
                                </tr>
                            </thead>
                            <tbody id="rep-payments-body"></tbody>
                        </table>
                    </div>
                </div>
            </section>
            @endif

            {{-- TAB: SETTINGS & STAFF --}}
            @if($role === 'ADMIN')
            <section data-tab-panel="settings" class="hidden ranum-enter space-y-6">
                <div>
                    <h1 class="font-display text-3xl font-semibold text-text-primary">Pengaturan & Staf</h1>
                    <p class="text-xs text-text-muted">Konfigurasi outlet, pajak, metode bayar, dan audit log.</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <form id="outlet-settings-form" class="p-5 rounded-xl bg-surface-2 border border-border space-y-4">
                        <h2 class="text-base font-semibold text-text-primary">Konfigurasi Outlet</h2>
                        <div>
                            <label class="text-xs text-text-secondary block mb-1">Nama Outlet</label>
                            <input type="text" name="name" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                        </div>
                        <div>
                            <label class="text-xs text-text-secondary block mb-1">Jam Operasional</label>
                            <input type="text" name="openHours" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-text-secondary block mb-1">Pajak (%)</label>
                                <input type="number" step="0.5" name="taxRatePercent" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                            </div>
                            <div>
                                <label class="text-xs text-text-secondary block mb-1">Service Charge (%)</label>
                                <input type="number" step="0.5" name="serviceChargePercent" class="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm">
                            </div>
                        </div>
                        <label class="flex items-center gap-2.5 text-sm text-text-primary">
                            <input type="checkbox" name="isOpen" class="accent-[#C69B67] w-4 h-4">
                            <span>Outlet Buka (Terima Pemesanan QR)</span>
                        </label>
                        <label class="flex items-center gap-2.5 text-sm text-text-primary">
                            <input type="checkbox" name="allowPayAtCashier" class="accent-[#C69B67] w-4 h-4">
                            <span>Aktifkan Opsi Bayar di Kasir</span>
                        </label>
                        <button type="submit" class="ranum-btn px-5 py-2.5 rounded-lg bg-accent text-bg text-sm font-semibold hover:bg-accent-hover">
                            Simpan Pengaturan
                        </button>
                    </form>

                    <div class="space-y-6">
                        <div class="p-5 rounded-xl bg-surface-2 border border-border space-y-3">
                            <h2 class="text-base font-semibold text-text-primary">Akun Staf</h2>
                            <div id="staff-users-list"></div>
                        </div>
                        <div class="p-5 rounded-xl bg-surface-2 border border-border space-y-3">
                            <h2 class="text-base font-semibold text-text-primary">Audit Log Terbaru</h2>
                            <div id="audit-logs-list" class="max-h-60 overflow-y-auto"></div>
                        </div>
                    </div>
                </div>
            </section>
            @endif
        </main>
    </div>
</div>

{{-- QR Preview Modal (High-contrast white quiet zone per PRD) --}}
<div id="qr-preview-modal" class="ranum-overlay fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="ranum-modal-panel w-full max-w-sm rounded-2xl bg-surface-4 border border-border p-6 text-center space-y-4 shadow-lg">
        <div class="flex items-center justify-between">
            <h3 id="qr-preview-title" class="font-display text-2xl font-semibold text-text-primary">QR Meja</h3>
            <button type="button" id="qr-preview-close" class="ranum-btn w-8 h-8 rounded-lg bg-surface-2 border border-border text-text-primary">✕</button>
        </div>
        <div class="bg-white p-4 rounded-xl inline-block mx-auto">
            <img id="qr-preview-img" src="" alt="QR Code Meja" class="w-56 h-56 mx-auto">
        </div>
        <p id="qr-preview-url" class="text-[11px] text-text-muted break-all"></p>
        <button type="button" onclick="window.print()" class="ranum-btn w-full py-2.5 rounded-lg bg-accent text-bg text-sm font-semibold">
            Cetak QR Meja
        </button>
    </div>
</div>

<div id="staff-toast" class="hidden"></div>
@endsection

@push('scripts')
<script>
window.__RANUM_STAFF__ = {!! json_encode([
    'user' => $staffUser,
    'jwt' => $staffJwt,
    'apiUrl' => $publicApiUrl,
    'csrfToken' => csrf_token(),
], JSON_UNESCAPED_UNICODE) !!};
</script>
@vite(['resources/ts/staff-dashboard.ts'])
@endpush
