<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\View\View;
use Inertia\Response;
use Inertia\Inertia;

class AppearanceController extends Controller
{
    public function edit(): Response
    {
        return inertia('settings/appearance');
    }
}
