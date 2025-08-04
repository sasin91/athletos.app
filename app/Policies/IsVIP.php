<?php

namespace App\Policies;

use App\Models\User;

trait IsVIP
{
    private array $allowedEmails = [
        'bluebazze@gmail.com',
        'jonas.kerwin.hansen@gmail.com',
        'abdelsamed2635@gmail.com',
        'abdel_laghmoch@hotmail.com',
    ];

    protected function isVIP(User $user): bool
    {
        return $user->isAthlete() && in_array($user->email, $this->allowedEmails);
    }
}