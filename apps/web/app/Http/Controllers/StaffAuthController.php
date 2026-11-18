<?php

namespace App\Http\Controllers;

use App\Services\NestApiService;
use Illuminate\Http\Request;

class StaffAuthController extends Controller
{
    public function __construct(private readonly NestApiService $api) {}

    public function showLogin()
    {
        if (session()->has('staff_jwt') && session()->has('staff_user')) {
            return redirect()->route('staff.dashboard');
        }

        return view('staff.login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        try {
            $res = $this->api->loginStaff($credentials['email'], $credentials['password']);
        } catch (\Throwable) {
            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => 'Server API tidak dapat dihubungi. Pastikan NestJS API berjalan.']);
        }

        if (!$res->successful()) {
            $msg = $res->json('message') ?? 'Email atau password tidak valid.';
            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => is_array($msg) ? implode(', ', $msg) : $msg]);
        }

        $data = $res->json();
        session([
            'staff_jwt' => $data['accessToken'],
            'staff_user' => $data['user'],
        ]);
        $request->session()->regenerate();

        return redirect()->route('staff.dashboard');
    }

    public function logout(Request $request)
    {
        $request->session()->forget(['staff_jwt', 'staff_user']);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('staff.login');
    }
}
