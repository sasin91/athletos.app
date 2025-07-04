<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * 
 *
 * @property int $id
 * @property int $gym_id
 * @property int $facility_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Facility $facility
 * @property-read \App\Models\Gym $gym
 * @method static \Database\Factories\GymFacilityFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility whereFacilityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility whereGymId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GymFacility whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class GymFacility extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'gym_id',
        'facility_id',
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
            'facility_id' => 'integer',
        ];
    }

    public function gym(): BelongsTo
    {
        return $this->belongsTo(Gym::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
