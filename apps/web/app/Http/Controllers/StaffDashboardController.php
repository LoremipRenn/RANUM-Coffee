<?php

namespace App\Http\Controllers;

use App\Services\NestApiService;
use Illuminate\Http\Request;

class StaffDashboardController extends Controller
{
    public function __construct(private readonly NestApiService $api) {}

    public function index()
    {
        $jwt = session('staff_jwt');
        $user = session('staff_user');

        if (!$jwt || !$user) {
            return redirect()->route('staff.login');
        }

        return view('staff.dashboard', [
            'staffUser' => $user,
            'staffJwt' => $jwt,
            'publicApiUrl' => config('services.nest.public_url'),
        ]);
    }

    public function proxy(Request $request, string $path)
    {
        $jwt = session('staff_jwt');
        if (!$jwt) {
            return response()->json(['message' => 'Sesi berakhir. Silakan login ulang.'], 401);
        }

        $allowedPrefixes = [
            'staff/',
        ];

        $normalizedPath = ltrim($path, '/');
        $allowed = false;
        foreach ($allowedPrefixes as $prefix) {
            if (str_starts_with($normalizedPath, $prefix)) {
                $allowed = true;
                break;
            }
        }

        if (!$allowed) {
            return response()->json(['message' => 'Endpoint tidak diizinkan.'], 403);
        }

        $payload = $request->isMethod('GET') ? $request->query() : $request->all();
        $res = $this->api->staffRequest($request->method(), $normalizedPath, $jwt, $payload);

        $contentType = $res->header('Content-Type') ?? 'application/json';
        if (str_contains($contentType, 'text/csv')) {
            return response($res->body(), $res->status(), [
                'Content-Type' => 'text/csv; charset=utf-8',
                'Content-Disposition' => $res->header('Content-Disposition') ?? 'attachment; filename="report.csv"',
            ]);
        }

        return response()->json($res->json() ?? ['message' => $res->body()], $res->status());
    }
}
