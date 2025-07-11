<x-layouts.app>
    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900 dark:text-gray-100">
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Custom Training Plan</h2>
                        <p class="text-gray-600 dark:text-gray-400 mt-2">Design your own training program with multiple phases and exercises.</p>
                    </div>

                    <form action="{{ route('training-plans.store') }}" method="POST" x-data="trainingPlanForm()">
                        @csrf
                        
                        <!-- Basic Plan Information -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div>
                                <x-forms.input 
                                    name="name" 
                                    label="Plan Name" 
                                    placeholder="e.g., My Custom Strength Plan"
                                    value="{{ old('name') }}"
                                    required />
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Training Goal</label>
                                <select name="goal" required class="w-full px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="">Select Goal</option>
                                    @foreach(\App\Enums\TrainingGoal::cases() as $goal)
                                        <option value="{{ $goal->value }}" {{ old('goal') === $goal->value ? 'selected' : '' }}>
                                            {{ ucfirst($goal->value) }}
                                        </option>
                                    @endforeach
                                </select>
                                @error('goal')<span class="text-red-500 text-sm">{{ $message }}</span>@enderror
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience Level</label>
                                <select name="experience_level" required class="w-full px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="">Select Level</option>
                                    @foreach(\App\Enums\ExperienceLevel::cases() as $level)
                                        <option value="{{ $level->value }}" {{ old('experience_level') === $level->value ? 'selected' : '' }}>
                                            {{ ucfirst($level->value) }}
                                        </option>
                                    @endforeach
                                </select>
                                @error('experience_level')<span class="text-red-500 text-sm">{{ $message }}</span>@enderror
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Progression Type</label>
                                <select name="default_progression_type" required class="w-full px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="">Select Type</option>
                                    @foreach(\App\Enums\ProgressionType::cases() as $type)
                                        <option value="{{ $type->value }}" {{ old('default_progression_type') === $type->value ? 'selected' : '' }}>
                                            {{ ucfirst($type->value) }}
                                        </option>
                                    @endforeach
                                </select>
                                @error('default_progression_type')<span class="text-red-500 text-sm">{{ $message }}</span>@enderror
                            </div>
                        </div>

                        <div class="mb-6">
                            <x-forms.input 
                                name="description" 
                                label="Description" 
                                placeholder="Describe your training plan goals and approach..."
                                value="{{ old('description') }}"
                                required />
                        </div>

                        <!-- Progression Rates -->
                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div>
                                <x-forms.input 
                                    name="default_progression_rate" 
                                    type="number" 
                                    step="0.1" 
                                    min="0.1" 
                                    max="50"
                                    label="Default Rate" 
                                    placeholder="2.5"
                                    value="{{ old('default_progression_rate') }}"
                                    required />
                            </div>
                            <div>
                                <x-forms.input 
                                    name="easy_progression_rate" 
                                    type="number" 
                                    step="0.1" 
                                    min="0.1" 
                                    max="50"
                                    label="Easy Rate" 
                                    placeholder="1.5"
                                    value="{{ old('easy_progression_rate') }}" />
                            </div>
                            <div>
                                <x-forms.input 
                                    name="medium_progression_rate" 
                                    type="number" 
                                    step="0.1" 
                                    min="0.1" 
                                    max="50"
                                    label="Medium Rate" 
                                    placeholder="2.5"
                                    value="{{ old('medium_progression_rate') }}" />
                            </div>
                            <div>
                                <x-forms.input 
                                    name="hard_progression_rate" 
                                    type="number" 
                                    step="0.1" 
                                    min="0.1" 
                                    max="50"
                                    label="Hard Rate" 
                                    placeholder="3.5"
                                    value="{{ old('hard_progression_rate') }}" />
                            </div>
                        </div>

                        <!-- Training Phases -->
                        <div class="mb-8">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Training Phases</h3>
                                <button type="button" @click="addPhase()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                    Add Phase
                                </button>
                            </div>

                            <div class="space-y-6">
                                <template x-for="(phase, phaseIndex) in phases" :key="phaseIndex">
                                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                                        <div class="flex items-center justify-between mb-4">
                                            <h4 class="text-md font-medium text-gray-900 dark:text-gray-100" x-text="`Phase ${phaseIndex + 1}`"></h4>
                                            <button type="button" @click="removePhase(phaseIndex)" x-show="phases.length > 1" class="text-red-600 hover:text-red-800 text-sm">Remove</button>
                                        </div>

                                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <input type="text" :name="`phases[${phaseIndex}][name]`" x-model="phase.name" placeholder="Phase name" required
                                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                            </div>
                                            <div>
                                                <input type="number" :name="`phases[${phaseIndex}][duration_weeks]`" x-model="phase.duration_weeks" placeholder="Duration (weeks)" min="1" max="12" required
                                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                            </div>
                                            <div>
                                                <input type="number" :name="`phases[${phaseIndex}][progression_rate]`" x-model="phase.progression_rate" placeholder="Progression rate" step="0.1" min="0.1" max="50"
                                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                            </div>
                                        </div>

                                        <div class="mb-4">
                                            <textarea :name="`phases[${phaseIndex}][description]`" x-model="phase.description" placeholder="Phase description" rows="2"
                                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"></textarea>
                                        </div>

                                        <!-- Exercises -->
                                        <div>
                                            <div class="flex items-center justify-between mb-3">
                                                <h5 class="text-sm font-medium text-gray-900 dark:text-gray-100">Exercises</h5>
                                                <button type="button" @click="addExercise(phaseIndex)" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors">
                                                    Add Exercise
                                                </button>
                                            </div>

                                            <div class="space-y-3">
                                                <template x-for="(exercise, exerciseIndex) in phase.exercises" :key="exerciseIndex">
                                                    <div class="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-4">
                                                        <div class="flex items-center justify-between mb-3">
                                                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300" x-text="`Exercise ${exerciseIndex + 1}`"></span>
                                                            <button type="button" @click="removeExercise(phaseIndex, exerciseIndex)" x-show="phase.exercises.length > 1" class="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                                        </div>

                                                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                                                            <div>
                                                                <select :name="`phases[${phaseIndex}][exercises][${exerciseIndex}][exercise]`" x-model="exercise.exercise" required
                                                                    class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100">
                                                                    <option value="">Select Exercise</option>
                                                                    @foreach(\App\Enums\Exercise::cases() as $exercise)
                                                                        <option value="{{ $exercise->value }}">{{ $exercise->displayName() }}</option>
                                                                    @endforeach
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <input type="number" :name="`phases[${phaseIndex}][exercises][${exerciseIndex}][sets]`" x-model="exercise.sets" placeholder="Sets" min="1" max="10" required
                                                                    class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                                            </div>
                                                            <div>
                                                                <input type="text" :name="`phases[${phaseIndex}][exercises][${exerciseIndex}][reps]`" x-model="exercise.reps" placeholder="Reps (e.g., 8-12)" required
                                                                    class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                                            </div>
                                                            <div>
                                                                <input type="text" :name="`phases[${phaseIndex}][exercises][${exerciseIndex}][weight]`" x-model="exercise.weight" placeholder="Weight (e.g., 70%)" required
                                                                    class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                                            </div>
                                                        </div>

                                                        <div class="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <input type="number" :name="`phases[${phaseIndex}][exercises][${exerciseIndex}][rest_seconds]`" x-model="exercise.rest_seconds" placeholder="Rest (seconds)" min="30" max="600" required
                                                                    class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                                            </div>
                                                            <div>
                                                                <input type="number" :name="`phases[${phaseIndex}][exercises][${exerciseIndex}][day]`" x-model="exercise.day" placeholder="Day (1-7)" min="1" max="7" required
                                                                    class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                                            </div>
                                                        </div>

                                                        <div class="mt-3">
                                                            <textarea :name="`phases[${phaseIndex}][exercises][${exerciseIndex}][notes]`" x-model="exercise.notes" placeholder="Exercise notes (optional)" rows="2"
                                                                class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"></textarea>
                                                        </div>
                                                    </div>
                                                </template>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <div class="flex items-center justify-end space-x-3">
                            <a href="{{ route('dashboard') }}" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors">
                                Cancel
                            </a>
                            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                Create Training Plan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script>
        function trainingPlanForm() {
            return {
                phases: [
                    {
                        name: '',
                        description: '',
                        duration_weeks: 4,
                        progression_rate: null,
                        exercises: [
                            {
                                exercise: '',
                                sets: 3,
                                reps: '',
                                weight: '',
                                rest_seconds: 120,
                                day: 1,
                                notes: ''
                            }
                        ]
                    }
                ],
                
                addPhase() {
                    if (this.phases.length < 8) {
                        this.phases.push({
                            name: '',
                            description: '',
                            duration_weeks: 4,
                            progression_rate: null,
                            exercises: [
                                {
                                    exercise: '',
                                    sets: 3,
                                    reps: '',
                                    weight: '',
                                    rest_seconds: 120,
                                    day: 1,
                                    notes: ''
                                }
                            ]
                        });
                    }
                },
                
                removePhase(index) {
                    if (this.phases.length > 1) {
                        this.phases.splice(index, 1);
                    }
                },
                
                addExercise(phaseIndex) {
                    this.phases[phaseIndex].exercises.push({
                        exercise: '',
                        sets: 3,
                        reps: '',
                        weight: '',
                        rest_seconds: 120,
                        day: 1,
                        notes: ''
                    });
                },
                
                removeExercise(phaseIndex, exerciseIndex) {
                    if (this.phases[phaseIndex].exercises.length > 1) {
                        this.phases[phaseIndex].exercises.splice(exerciseIndex, 1);
                    }
                }
            }
        }
    </script>
</x-layouts.app> 