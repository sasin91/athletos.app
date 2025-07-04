<?php

namespace App\View\Components\Onboarding;

use Illuminate\View\Component;

class Layout extends Component
{
    public $onboarding;

    public function __construct($onboarding)
    {
        $this->onboarding = $onboarding;
    }

    public function render()
    {
        return view('onboarding.layout');
    }
} 