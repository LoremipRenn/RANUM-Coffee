<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class NestApiService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.nest.url', 'http://127.0.0.1:3001/api/v1'), '/');
    }

    public function getPublicOutlet(): ?array
    {
        try {
            $res = Http::timeout(4)->get("{$this->baseUrl}/public/outlet");
            return $res->successful() ? $res->json() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    public function getPublicMenu(array $query = []): array
    {
        try {
            $res = Http::timeout(5)->get("{$this->baseUrl}/public/menu", $query);
            return $res->successful() ? ($res->json() ?? ['categories' => [], 'products' => []]) : ['categories' => [], 'products' => []];
        } catch (\Throwable) {
            return ['categories' => [], 'products' => []];
        }
    }

    public function validateQr(string $token): array
    {
        try {
            $res = Http::timeout(5)->get("{$this->baseUrl}/public/qr/" . urlencode($token));
            return [
                'ok' => $res->successful(),
                'status' => $res->status(),
                'data' => $res->json(),
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => 503,
                'data' => ['message' => 'Server layanan sedang tidak dapat dihubungi.'],
            ];
        }
    }

    public function getPublicOrder(string $accessToken): ?array
    {
        try {
            $res = Http::timeout(5)->get("{$this->baseUrl}/public/orders/" . urlencode($accessToken));
            return $res->successful() ? $res->json() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    public function loginStaff(string $email, string $password): Response
    {
        return Http::timeout(6)->post("{$this->baseUrl}/auth/login", [
            'email' => $email,
            'password' => $password,
        ]);
    }

    public function staffRequest(string $method, string $path, string $jwt, array $payload = []): Response
    {
        $client = Http::timeout(8)->withToken($jwt);
        $url = "{$this->baseUrl}/" . ltrim($path, '/');

        return match (strtoupper($method)) {
            'GET' => $client->get($url, $payload),
            'POST' => $client->post($url, $payload),
            'PATCH' => $client->patch($url, $payload),
            'DELETE' => $client->delete($url, $payload),
            default => $client->get($url, $payload),
        };
    }
}
