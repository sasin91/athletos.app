<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GymSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Insert gyms
        DB::table('gyms')->insert([
            [
                'name' => 'PureGym Slagelse City 3',
                'location' => 'Kongensgade 58, 4200 Slagelse, Denmark',
                'website' => 'https://www.puregym.dk/find-center/slagelse-city-3',
                'opening_hours' => json_encode([
                    'monday' => ['00:00-23:59'],
                    'tuesday' => ['00:00-23:59'],
                    'wednesday' => ['00:00-23:59'],
                    'thursday' => ['00:00-23:59'],
                    'friday' => ['00:00-23:59'],
                    'saturday' => ['00:00-23:59'],
                    'sunday' => ['00:00-23:59'],
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Home Gym',
                'location' => "User's Home",
                'website' => null,
                'opening_hours' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // Insert equipment
        $equipmentList = [
            ['name' => 'Barbell', 'description' => 'Free Weight', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dumbbell', 'description' => 'Free Weight', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Cable Machine', 'description' => 'Cable', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Chest Press Machine', 'description' => 'Machine', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Shoulder Press Machine', 'description' => 'Machine', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Lat Pulldown Machine', 'description' => 'Machine', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Leg Press Machine', 'description' => 'Machine', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Ab Machine', 'description' => 'Machine', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Pull-up Bar', 'description' => 'Bodyweight', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dip Station', 'description' => 'Bodyweight', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Ab Wheel', 'description' => 'Bodyweight', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Yoga Mat', 'description' => 'Mobility/Flexibility', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Cable Tower', 'description' => 'Machines', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Seated Hamstring Curl Machine', 'description' => 'Machines', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Leg Extension Machine', 'description' => 'Machines', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Squat Rack', 'description' => 'Strength', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bench Press', 'description' => 'Strength', 'created_at' => now(), 'updated_at' => now()],
        ];
        foreach ($equipmentList as $eq) {
            DB::table('equipment')->insert($eq);
        }

        // Insert facilities
        $facilityList = [
            ['name' => 'Bike Studio', 'description' => 'Studio room with exercise bikes', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bodytracker Scale', 'description' => 'Body composition analysis tool', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Showers', 'description' => 'Member bathroom facilities', 'created_at' => now(), 'updated_at' => now()],
        ];
        foreach ($facilityList as $fac) {
            DB::table('facilities')->insert($fac);
        }

        // Fetch gym IDs
        $puregymId = DB::table('gyms')->where('name', 'PureGym Slagelse City 3')->value('id');
        $homegymId = DB::table('gyms')->where('name', 'Home Gym')->value('id');

        // Fetch equipment IDs
        $equipmentIds = DB::table('equipment')->pluck('id', 'name');
        // Fetch facility IDs
        $facilityIds = DB::table('facilities')->pluck('id', 'name');

        // Assign equipment to PureGym Slagelse City 3 with quantities
        $gymEquipment = [
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Barbell'], 'quantity' => 2],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Dumbbell'], 'quantity' => 6],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Cable Machine'], 'quantity' => 2],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Chest Press Machine'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Shoulder Press Machine'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Lat Pulldown Machine'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Leg Press Machine'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Ab Machine'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Pull-up Bar'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Dip Station'], 'quantity' => 1],
            // Additional
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Ab Wheel'], 'quantity' => 3],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Yoga Mat'], 'quantity' => 5],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Cable Tower'], 'quantity' => 2],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Seated Hamstring Curl Machine'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Leg Extension Machine'], 'quantity' => 1],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Squat Rack'], 'quantity' => 4],
            ['gym_id' => $puregymId, 'equipment_id' => $equipmentIds['Bench Press'], 'quantity' => 5],
        ];
        // Assign equipment to Home Gym with quantities
        $gymEquipment = array_merge($gymEquipment, [
            ['gym_id' => $homegymId, 'equipment_id' => $equipmentIds['Pull-up Bar'], 'quantity' => 1],
            ['gym_id' => $homegymId, 'equipment_id' => $equipmentIds['Ab Wheel'], 'quantity' => 1],
            ['gym_id' => $homegymId, 'equipment_id' => $equipmentIds['Yoga Mat'], 'quantity' => 1],
        ]);
        DB::table('gym_equipments')->insert($gymEquipment);

        // Assign facilities to PureGym Slagelse City 3
        $gymFacilities = [
            ['gym_id' => $puregymId, 'facility_id' => $facilityIds['Bike Studio']],
            ['gym_id' => $puregymId, 'facility_id' => $facilityIds['Bodytracker Scale']],
            ['gym_id' => $puregymId, 'facility_id' => $facilityIds['Showers']],
        ];
        DB::table('gym_facilities')->insert($gymFacilities);
    }
}
