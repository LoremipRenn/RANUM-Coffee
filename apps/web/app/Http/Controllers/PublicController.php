<?php

namespace App\Http\Controllers;

use App\Services\NestApiService;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function __construct(private readonly NestApiService $api) {}

    public function home()
    {
        $outlet = $this->api->getPublicOutlet();
        $featuredMenu = $this->api->getPublicMenu(['featured' => 'true']);

        return view('public.home', [
            'outlet' => $outlet,
            'featuredProducts' => $featuredMenu['products'] ?? [],
            'categories' => $featuredMenu['categories'] ?? [],
        ]);
    }

    public function menu(Request $request)
    {
        $outlet = $this->api->getPublicOutlet();
        $menu = $this->api->getPublicMenu([
            'q' => $request->query('q', ''),
            'category' => $request->query('category', ''),
        ]);

        return view('public.menu', [
            'outlet' => $outlet,
            'categories' => $menu['categories'] ?? [],
            'products' => $menu['products'] ?? [],
            'activeCategory' => $request->query('category', ''),
            'searchQuery' => $request->query('q', ''),
        ]);
    }

    public function about()
    {
        $outlet = $this->api->getPublicOutlet();

        return view('public.about', [
            'outlet' => $outlet,
        ]);
    }
}
