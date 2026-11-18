<?php

use App\Http\Controllers\PublicController;
use App\Http\Controllers\StaffAuthController;
use App\Http\Controllers\StaffDashboardController;
use App\Http\Controllers\TableOrderController;
use Illuminate\Support\Facades\Route;

// Public Brand & Digital Menu
Route::get('/', [PublicController::class, 'home'])->name('home');
Route::get('/menu', [PublicController::class, 'menu'])->name('menu');
Route::get('/about', [PublicController::class, 'about'])->name('about');

// Customer QR Table Ordering & Order Tracking
Route::get('/t/{token}', [TableOrderController::class, 'showTable'])->name('table.order');
Route::get('/order/{accessToken}', [TableOrderController::class, 'trackOrder'])->name('order.track');

// Staff Authentication & Dashboard
Route::get('/staff/login', [StaffAuthController::class, 'showLogin'])->name('staff.login');
Route::post('/staff/login', [StaffAuthController::class, 'login'])
    ->middleware('throttle:5,1')
    ->name('staff.login.post');
Route::post('/staff/logout', [StaffAuthController::class, 'logout'])->name('staff.logout');

Route::get('/staff/dashboard', [StaffDashboardController::class, 'index'])->name('staff.dashboard');
Route::match(['GET', 'POST', 'PATCH', 'DELETE'], '/staff/proxy/{path}', [StaffDashboardController::class, 'proxy'])
    ->where('path', '.*')
    ->middleware('throttle:120,1')
    ->name('staff.proxy');
