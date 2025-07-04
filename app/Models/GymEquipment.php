<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * 
 *
 * @property-read \App\Models\Equipment|null $equipment
 * @property-read \App\Models\Gym|null $gym
 * @method static \Database\Factories\GymEquipmentFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymEquipment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymEquipment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymEquipment query()
 * @mixin \Eloquent
 */
class GymEquipment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'gym_id',
        'equipment_id',
        'quantity',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'gym_id' => 'integer',
            'equipment_id' => 'integer',
            'quantity' => 'integer',
        ];
    }

    public function gym(): BelongsTo
    {
        return $this->belongsTo(Gym::class);
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }
}
