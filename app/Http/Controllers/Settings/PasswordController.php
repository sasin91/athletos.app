<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;
use Illuminate\View\View;
use Inertia\Response;
use Inertia\Inertia;

class PasswordController extends Controller
{
    public function edit(Request $request): Response
    {
        return inertia('settings/password', [
            'user' => $request->user(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Rules\Password::defaults(), 'confirmed'],
        ]);

        if ($validator->fails()) {
            return redirect()->route('settings.profile.edit')
                ->withErrors($validator)
                ->withInput();
        }

        $validated = $validator->validated();

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()->route('settings.profile.edit')->with('status', 'password-updated');
    }
}
