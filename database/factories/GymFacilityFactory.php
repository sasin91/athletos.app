<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Facility;
use App\Models\Gym;
use App\Models\gym_facility;

class GymFacilityFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = GymFacility::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'gym_id' => Gym::factory(),
            'facility_id' => Facility::factory(),
        ];
    }
}
