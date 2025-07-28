<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class HomeController
{
    public function __invoke(): Response
    {
        return inertia('welcome');
    }
}
