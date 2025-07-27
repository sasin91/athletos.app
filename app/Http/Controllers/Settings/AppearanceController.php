<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\View\View;
use Inertia\Inertia;

class AppearanceController extends Controller
{
    public function edit(): \Inertia\Response
    {
        return Inertia::render('settings/appearance');
    }
}
