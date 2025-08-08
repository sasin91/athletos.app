<?php

use App\Enums\Exercise;

it('is able to view any exercise page', function () {
   $urls = [];

   foreach (Exercise::cases() as $exercise) {
       $urls[] = route('exercises.show', $exercise->value);
   }

   visit($urls)
       ->assertNoSmoke();
});
