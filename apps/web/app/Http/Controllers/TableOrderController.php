<?php

namespace App\Http\Controllers;

use App\Services\NestApiService;

class TableOrderController extends Controller
{
    public function __construct(private readonly NestApiService $api) {}

    public function showTable(string $token)
    {
        $validation = $this->api->validateQr($token);

        if (!$validation['ok']) {
            return response()->view('order.invalid-qr', [
                'message' => $validation['data']['message'] ?? 'QR code meja tidak valid atau sedang dinonaktifkan.',
                'outlet' => $this->api->getPublicOutlet(),
            ], $validation['status'] >= 400 ? $validation['status'] : 400);
        }

        $menu = $this->api->getPublicMenu();

        return view('order.table', [
            'qrToken' => $token,
            'table' => $validation['data']['table'],
            'branch' => $validation['data']['branch'],
            'activeSession' => $validation['data']['activeSession'],
            'categories' => $menu['categories'] ?? [],
            'products' => $menu['products'] ?? [],
            'publicApiUrl' => config('services.nest.public_url'),
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
        ]);
    }

    public function trackOrder(string $accessToken)
    {
        $order = $this->api->getPublicOrder($accessToken);

        if (!$order) {
            abort(404, 'Pesanan tidak ditemukan.');
        }

        return view('order.track', [
            'order' => $order,
            'accessToken' => $accessToken,
            'publicApiUrl' => config('services.nest.public_url'),
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
        ]);
    }
}
