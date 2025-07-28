<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/chat/stream/start', [ChatController::class, 'startStream']);
    Route::post('/chat/stream/stop', [ChatController::class, 'stopStream']);
});
