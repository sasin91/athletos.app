<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrainingCompleteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization is handled in the controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'exercises' => 'nullable|array',
            'exercises.*' => 'array',
            'exercises.*.*' => 'array',
            'exercises.*.*.reps' => 'required|integer|min:1|max:100',
            'exercises.*.*.weight' => 'nullable|numeric|min:0|max:1000',
            'exercises.*.*.rpe' => 'nullable|integer|min:1|max:10',
            'mood' => 'nullable|string|in:terrible,bad,okay,good,great',
            'energy_level' => 'nullable|integer|min:1|max:10',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'exercises.*.*.reps.required' => 'Reps are required for each set.',
            'exercises.*.*.reps.integer' => 'Reps must be a whole number.',
            'exercises.*.*.reps.min' => 'Reps must be at least 1.',
            'exercises.*.*.reps.max' => 'Reps cannot exceed 100.',
            'exercises.*.*.weight.numeric' => 'Weight must be a number.',
            'exercises.*.*.weight.min' => 'Weight cannot be negative.',
            'exercises.*.*.weight.max' => 'Weight cannot exceed 1000.',
            'exercises.*.*.rpe.integer' => 'RPE must be a whole number.',
            'exercises.*.*.rpe.min' => 'RPE must be at least 1.',
            'exercises.*.*.rpe.max' => 'RPE cannot exceed 10.',
            'mood.in' => 'Mood must be one of: terrible, bad, okay, good, great.',
            'energy_level.integer' => 'Energy level must be a whole number.',
            'energy_level.min' => 'Energy level must be at least 1.',
            'energy_level.max' => 'Energy level cannot exceed 10.',
        ];
    }
} 