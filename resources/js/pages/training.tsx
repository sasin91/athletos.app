import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { dashboard } from '@/routes';
import AppLayout from '@/layouts/app-layout';

type SavedCallback = (data?: any) => void;

// Custom useInterval hook to handle React state updates properly
function useInterval(callback: SavedCallback, delay: number | null) {
  const savedCallback = useRef<SavedCallback>(() => {});

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

interface Exercise {
  value: string;
  displayName: string;
  category: string;
  difficulty: string;
}

interface PlannedExercise {
  exercise: Exercise;
  exerciseSlug: string;
  order: number;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number;
  displayName: string;
  category: string;
  difficulty: string;
  tags: string[];
  notes?: string;
  cues?: string[];
  image?: string;
  summary?: string;
}

interface TrainingSet {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  timeSpent: number;
  explosiveness: number;
  notes: string;
  meta: PlannedExercise;
}

interface TrainingPlan {
  name: string;
}

interface TrainingPhase {
  name: string;
}

interface Training {
  id: number;
  scheduled_at: string;
  progress: number;
  trainingPlan?: TrainingPlan;
  trainingPhase?: TrainingPhase;
}

interface Props {
  training: Training;
  plannedExercises: PlannedExercise[];
  sets: Record<string, TrainingSet[]>;
  availableExercises: PlannedExercise[];
  totalTimerSeconds: number;
  totalTimerStarted: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

type TrainingFeedback = {
  overallRating: number;
  mood: string;
  energyLevel: number;
  difficulty: string;
  difficultyLevel: number;
  notes: string;
}

interface TrainingSessionState {
  sets: Record<string, TrainingSet[]>;
  totalTimerSeconds: number;
  totalTimerStarted: boolean;
  feedback: TrainingFeedback;
  lastSaved: string;
}

interface RestTimer {
  restSeconds: number;
  restRunning: boolean;
  restInterval: NodeJS.Timeout | null;
}

export default function TrainingShow({
  training,
  plannedExercises,
  sets: initialSets,
  availableExercises,
  totalTimerSeconds: initialTotalSeconds,
  totalTimerStarted: initialTimerStarted,
  isLoading,
  hasError,
  errorMessage
}: Props) {
  // Use localStorage hook for persistent training session state
  const [sessionState, setSessionState] = useLocalStorage<TrainingSessionState>(`training_session_${training.id}`, {
    sets: initialSets,
    totalTimerSeconds: initialTotalSeconds,
    totalTimerStarted: initialTimerStarted,
    feedback: {
      overallRating: 0,
      mood: '',
      energyLevel: 0,
      difficulty: '',
      difficultyLevel: 0,
      notes: ''
    },
    lastSaved: new Date().toISOString()
  });

  // Local state for UI interactions (not persisted)
  const [addingExercise, setAddingExercise] = useState(false);
  const [timerRunning, setTimerRunning] = useState(true); // Always start running immediately
  const [restTimers, setRestTimers] = useState<Record<string, RestTimer>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({}); // Store raw input values temporarily
  const wakeLock = useRef<any>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Use Inertia form for feedback with persisted initial values
  const { data: feedback, setData: setFeedback } = useForm<TrainingFeedback>(sessionState.feedback);
  
  // Processing state for completion
  const [isCompleting, setIsCompleting] = useState(false);

  // Helper functions to update persisted state
  const updateSets = (newSets: Record<string, TrainingSet[]>) => {
    setSessionState(prev => ({
      ...prev,
      sets: newSets,
      lastSaved: new Date().toISOString()
    }));
  };

  const updateTimer = (seconds: number, started: boolean) => {
    setSessionState(prev => ({
      ...prev,
      totalTimerSeconds: seconds,
      totalTimerStarted: started,
      lastSaved: new Date().toISOString()
    }));
  };

  // Update session state when feedback changes (without causing loops)
  const updateFeedback = (field: keyof TrainingFeedback, value: any) => {
    setFeedback(field, value);
    // Update session state immediately without useEffect to prevent loops
    setSessionState(prev => ({
      ...prev,
      feedback: {
        ...prev.feedback,
        [field]: value
      },
      lastSaved: new Date().toISOString()
    }));
  };

  // Timer callback function
  const incrementTimer = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      totalTimerSeconds: prev.totalTimerSeconds + 1,
      totalTimerStarted: true,
      lastSaved: new Date().toISOString()
    }));
  }, [setSessionState]);

  // Use the custom useInterval hook for the timer
  useInterval(incrementTimer, timerRunning ? 1000 : null);

  // Initialize wake lock and cleanup on mount/unmount
  useEffect(() => {
    // Request wake lock to keep screen active when timer starts
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && timerRunning) {
          if (wakeLock.current) {
            wakeLock.current.release();
          }
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake lock failed:', err);
      }
    };

    if (timerRunning) {
      requestWakeLock();
    }
    
    return () => {
      // Cleanup on unmount
      if (wakeLock.current) {
        wakeLock.current.release();
        wakeLock.current = null;
      }
      // Clean up all rest timers
      Object.values(restTimers).forEach(timer => {
        if (timer.restInterval) {
          clearInterval(timer.restInterval);
        }
      });
      // Clean up all debounce timers
      Object.values(debounceTimers.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, [timerRunning, restTimers]);

  const stopTimer = () => {
    setTimerRunning(false);
    if (wakeLock.current) {
      wakeLock.current.release();
      wakeLock.current = null;
    }
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setSessionState(prev => ({
      ...prev,
      totalTimerSeconds: 0,
      totalTimerStarted: false,
      lastSaved: new Date().toISOString()
    }));
    if (wakeLock.current) {
      wakeLock.current.release();
      wakeLock.current = null;
    }
  };

  // Clear all saved data and reset to initial state (for testing/debugging)
  const clearSavedState = () => {
    if (confirm('This will clear all your saved progress. Are you sure?')) {
      setSessionState({
        sets: initialSets,
        totalTimerSeconds: initialTotalSeconds,
        totalTimerStarted: initialTimerStarted,
        feedback: {
          overallRating: 0,
          mood: '',
          energyLevel: 0,
          difficulty: '',
          difficultyLevel: 0,
          notes: ''
        },
        lastSaved: new Date().toISOString()
      });
      // Reset form state too
      updateFeedback('overallRating', 0);
      updateFeedback('mood', '');
      updateFeedback('energyLevel', 0);
      updateFeedback('difficulty', '');
      updateFeedback('difficultyLevel', 0);
      updateFeedback('notes', '');
      // Clear input values
      setInputValues({});
      // Restart timer immediately after clearing state
      setTimerRunning(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const updateSetValue = (exerciseSlug: string, setIndex: number, field: keyof TrainingSet, value: any) => {
    const newSets = {
      ...sessionState.sets,
      [exerciseSlug]: sessionState.sets[exerciseSlug].map((set, index) =>
        index === setIndex ? { ...set, [field]: value } : set
      )
    };
    updateSets(newSets);
  };

  // Debounced version for input fields to prevent rapid state updates
  const updateSetValueDebounced = (exerciseSlug: string, setIndex: number, field: keyof TrainingSet, rawValue: string) => {
    const inputId = `${exerciseSlug}-${setIndex}-${field}`;
    
    // Update the raw input value immediately for UI responsiveness
    setInputValues(prev => ({
      ...prev,
      [inputId]: rawValue
    }));

    // Clear existing debounce timer
    if (debounceTimers.current[inputId]) {
      clearTimeout(debounceTimers.current[inputId]);
    }

    // Set new debounce timer
    debounceTimers.current[inputId] = setTimeout(() => {
      let parsedValue: any = null;
      
      if (rawValue.trim() !== '') {
        if (field === 'reps' || field === 'rpe') {
          parsedValue = parseInt(rawValue);
          if (isNaN(parsedValue)) parsedValue = null;
        } else if (field === 'weight') {
          parsedValue = parseFloat(rawValue);
          if (isNaN(parsedValue)) parsedValue = null;
        } else {
          parsedValue = rawValue;
        }
      }

      updateSetValue(exerciseSlug, setIndex, field, parsedValue);
      delete debounceTimers.current[inputId];
    }, 300); // 300ms debounce
  };

  // Get the display value for an input field
  const getInputValue = (exerciseSlug: string, setIndex: number, field: keyof TrainingSet, currentValue: any): string => {
    const inputId = `${exerciseSlug}-${setIndex}-${field}`;
    
    // If we have a raw input value stored, use that (for immediate UI feedback)
    if (inputValues[inputId] !== undefined) {
      return inputValues[inputId];
    }
    
    // Otherwise use the current persisted value
    return currentValue?.toString() || '';
  };

  const addSet = (exerciseSlug: string) => {
    const exerciseSets = sessionState.sets[exerciseSlug] || [];
    const newSetNumber = exerciseSets.length + 1;
    const lastSet = exerciseSets[exerciseSets.length - 1];

    const newSet: TrainingSet = {
      setNumber: newSetNumber,
      reps: null,
      weight: null,
      rpe: null,
      timeSpent: 0,
      explosiveness: 0,
      notes: '',
      meta: lastSet?.meta || plannedExercises.find(ex => ex.exerciseSlug === exerciseSlug)!
    };

    const newSets = {
      ...sessionState.sets,
      [exerciseSlug]: [...exerciseSets, newSet]
    };
    updateSets(newSets);
  };

  const removeSet = (exerciseSlug: string, setNumber: number) => {
    const newSets = {
      ...sessionState.sets,
      [exerciseSlug]: sessionState.sets[exerciseSlug].filter(set => set.setNumber !== setNumber)
    };
    updateSets(newSets);
  };

  const addExercise = (exerciseValue: string) => {
    const exercise = availableExercises.find(ex => ex.exercise.value === exerciseValue);
    if (exercise) {
      const newSet: TrainingSet = {
        setNumber: 1,
        reps: null,
        weight: null,
        rpe: null,
        timeSpent: 0,
        explosiveness: 0,
        notes: '',
        meta: exercise
      };

      const newSets = {
        ...sessionState.sets,
        [exercise.exerciseSlug]: [newSet]
      };
      updateSets(newSets);
    }
    setAddingExercise(false);
  };

  const startRestTimer = (exerciseSlug: string, setNumber: number) => {
    const key = `${exerciseSlug}-${setNumber}`;
    const interval = setInterval(() => {
      setRestTimers(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          restSeconds: (prev[key]?.restSeconds || 0) + 1
        }
      }));
    }, 1000);

    setRestTimers(prev => ({
      ...prev,
      [key]: {
        restSeconds: 0,
        restRunning: true,
        restInterval: interval
      }
    }));
  };

  const stopRestTimer = (exerciseSlug: string, setNumber: number) => {
    const key = `${exerciseSlug}-${setNumber}`;
    const timer = restTimers[key];
    if (timer?.restInterval) {
      clearInterval(timer.restInterval);
    }
    setRestTimers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        restRunning: false,
        restInterval: null
      }
    }));
  };

  const resetRestTimer = (exerciseSlug: string, setNumber: number) => {
    const key = `${exerciseSlug}-${setNumber}`;
    const timer = restTimers[key];
    if (timer?.restInterval) {
      clearInterval(timer.restInterval);
    }
    setRestTimers(prev => ({
      ...prev,
      [key]: {
        restSeconds: 0,
        restRunning: false,
        restInterval: null
      }
    }));
  };

  const completeTraining = () => {
    // Validate required feedback fields
    if (!feedback.overallRating || !feedback.mood || !feedback.energyLevel || !feedback.difficulty || !feedback.difficultyLevel) {
      alert('Please fill in all required feedback fields.');
      return;
    }

    // Stop the timer when training is completed
    stopTimer();

    // Submit training completion with feedback and exercise sets
    setIsCompleting(true);
    
    const completionData = {
      overall_rating: feedback.overallRating,
      mood: feedback.mood,
      energy_level: feedback.energyLevel,
      difficulty: feedback.difficulty,
      difficulty_level: feedback.difficultyLevel,
      notes: feedback.notes,
      total_timer_seconds: sessionState.totalTimerSeconds,
      exercise_sets: JSON.stringify(sessionState.sets),
    };

    router.post(`/trainings/${training.id}/complete`, completionData, {
      onSuccess: () => {
        // Clear the saved state since training is completed successfully
        setSessionState({
          sets: initialSets,
          totalTimerSeconds: initialTotalSeconds,
          totalTimerStarted: initialTimerStarted,
          feedback: {
            overallRating: 0,
            mood: '',
            energyLevel: 0,
            difficulty: '',
            difficultyLevel: 0,
            notes: ''
          },
          lastSaved: new Date().toISOString()
        });
        setIsCompleting(false);
      },
      onError: (errors: any) => {
        console.error('Training completion failed:', errors);
        // Restart the timer if completion failed
        setTimerRunning(true);
        setIsCompleting(false);
      }
    });
  };

  const scrollToExercise = (exerciseSlug: string) => {
    const element = document.getElementById(`exercise-${exerciseSlug}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <>
        <Head title="Training Session - Loading" />
        <div className="mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Exercises...</h3>
            <p className="text-gray-500 dark:text-gray-400">Generating your training plan exercises</p>
          </div>
        </div>
      </>
    );
  }

  if (hasError) {
    return (
      <>
        <Head title="Training Session - Error" />
        <div className="mx-auto max-w-4xl">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-8 text-center">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Exercises</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{errorMessage}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <AppLayout>
      <Head title={`${training.trainingPlan?.name || 'Training Session'}`} />

      <div className="mx-auto max-w-4xl">
        {/* Restored State Notification */}
        {sessionState.lastSaved && sessionState.totalTimerSeconds > 0 && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Welcome back! Your training session has been restored.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Last saved: {new Date(sessionState.lastSaved).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={clearSavedState}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                title="Start fresh (clears all saved progress)"
              >
                Start Fresh
              </button>
            </div>
          </div>
        )}

        {/* Training Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {training.trainingPlan?.name || 'Training Session'}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                {new Date(training.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {training.trainingPhase?.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(training.progress)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${training.progress}%` }}
                role="progressbar"
                aria-valuenow={training.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </header>

        {/* Training Content */}
        <div className="relative">
          {Object.keys(sessionState.sets).length > 0 ? (
            <>
              {/* Exercise Navigation */}
              {Object.keys(sessionState.sets).length > 1 && (
                <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Jump to Exercise:</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.keys(sessionState.sets).map((exerciseSlug, index) => {
                      const exercise = sessionState.sets[exerciseSlug][0]?.meta;
                      return (
                        <button
                          key={exerciseSlug}
                          onClick={() => scrollToExercise(exerciseSlug)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          {index + 1}. {exercise?.displayName || exerciseSlug}
                        </button>
                      );
                    })}
                  </div>
                </nav>
              )}

              {/* Exercise Sets */}
              {Object.entries(sessionState.sets).map(([exerciseSlug, exerciseSets], exerciseIndex) => (
                <fieldset
                  key={exerciseSlug}
                  id={`exercise-${exerciseSlug}`}
                  className="mb-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                >
                  <legend className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                      {exerciseIndex + 1}
                    </span>
                    {exerciseSets[0]?.meta?.displayName || exerciseSlug}
                  </legend>

                  {exerciseSets.map((set, setIndex) => {
                    const restTimerKey = `${exerciseSlug}-${set.setNumber}`;
                    const restTimer = restTimers[restTimerKey] || { restSeconds: 0, restRunning: false, restInterval: null };

                    return (
                      <div key={set.setNumber} className="mb-6 rounded-lg transition-all duration-200 p-6 bg-white dark:bg-gray-800 shadow-sm">
                        {/* Set Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                            Set {set.setNumber}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSet(exerciseSlug, set.setNumber)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        {/* Input Fields */}
                        <div className="space-y-4 mb-4">
                          <div className="relative">
                            <label
                              htmlFor={`reps-${exerciseSlug}-${set.setNumber}`}
                              className="absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100"
                            >
                              Reps
                            </label>
                            <input
                              type="number"
                              id={`reps-${exerciseSlug}-${set.setNumber}`}
                              className="block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                              placeholder="Reps"
                              value={getInputValue(exerciseSlug, setIndex, 'reps', set.reps)}
                              onChange={(e) => updateSetValueDebounced(exerciseSlug, setIndex, 'reps', e.target.value)}
                            />
                          </div>
                          <div className="relative">
                            <label
                              htmlFor={`weight-${exerciseSlug}-${set.setNumber}`}
                              className="absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100"
                            >
                              Weight
                            </label>
                            <input
                              type="text"
                              id={`weight-${exerciseSlug}-${set.setNumber}`}
                              className="block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                              placeholder="Weight (kg)"
                              value={getInputValue(exerciseSlug, setIndex, 'weight', set.weight)}
                              onChange={(e) => updateSetValueDebounced(exerciseSlug, setIndex, 'weight', e.target.value)}
                            />
                          </div>
                          <div className="relative">
                            <label
                              htmlFor={`rpe-${exerciseSlug}-${set.setNumber}`}
                              className="absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100"
                            >
                              RPE
                            </label>
                            <input
                              type="number"
                              id={`rpe-${exerciseSlug}-${set.setNumber}`}
                              className="block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                              placeholder="RPE"
                              value={getInputValue(exerciseSlug, setIndex, 'rpe', set.rpe)}
                              onChange={(e) => updateSetValueDebounced(exerciseSlug, setIndex, 'rpe', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Rest Timer */}
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Rest Timer</div>
                              <div className="font-mono text-xl mb-3">
                                {formatTime(restTimer.restSeconds)}
                              </div>
                              <div className="flex gap-2 justify-center">
                                {!restTimer.restRunning ? (
                                  <button
                                    type="button"
                                    onClick={() => startRestTimer(exerciseSlug, set.setNumber)}
                                    className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                  >
                                    Start
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => stopRestTimer(exerciseSlug, set.setNumber)}
                                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                  >
                                    Stop
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => resetRestTimer(exerciseSlug, set.setNumber)}
                                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => addSet(exerciseSlug)}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Set
                  </button>
                </fieldset>
              ))}

              {/* Training Feedback Section */}
              <fieldset
                id="training-feedback"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8"
              >
                <legend className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                    ✓
                  </span>
                  Training Session Feedback
                </legend>

                <div className="space-y-6">
                  {/* Overall Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Overall Training Rating <span className="text-red-500">*</span>
                    </label>
                    <div className="flex justify-center space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => updateFeedback('overallRating', rating)}
                          className={`flex items-center justify-center w-12 h-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-yellow-300 dark:hover:border-yellow-600 transition-colors ${feedback.overallRating >= rating ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''
                            }`}
                        >
                          <svg
                            className={`w-8 h-8 ${feedback.overallRating >= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  {/* Mood Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      How are you feeling? <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { value: 'terrible', emoji: '😫', label: 'Terrible' },
                        { value: 'bad', emoji: '😔', label: 'Bad' },
                        { value: 'okay', emoji: '😐', label: 'Okay' },
                        { value: 'good', emoji: '😊', label: 'Good' },
                        { value: 'excellent', emoji: '🤩', label: 'Excellent' }
                      ].map((moodOption) => (
                        <button
                          key={moodOption.value}
                          type="button"
                          onClick={() => updateFeedback('mood', moodOption.value)}
                          className={`flex flex-col items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${feedback.mood === moodOption.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                        >
                          <span className="text-2xl mb-1">{moodOption.emoji}</span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {moodOption.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Energy Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Energy Level (1-10) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                      {[...Array(10)].map((_, index) => {
                        const level = index + 1;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updateFeedback('energyLevel', level)}
                            className={`flex items-center justify-center h-12 w-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${feedback.energyLevel === level ? 'border-blue-600 bg-blue-600 text-white' : ''
                              }`}
                          >
                            <span className="font-semibold">{level}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>Exhausted</span>
                      <span>Energized</span>
                    </div>
                  </div>

                  {/* Training Difficulty */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      How challenging was this training? <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: 'too_easy', label: 'Too Easy' },
                        { value: 'just_right', label: 'Just Right' },
                        { value: 'challenging', label: 'Challenging' },
                        { value: 'too_hard', label: 'Too Hard' }
                      ].map((diffOption) => (
                        <button
                          key={diffOption.value}
                          type="button"
                          onClick={() => updateFeedback('difficulty', diffOption.value)}
                          className={`flex flex-col items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${feedback.difficulty === diffOption.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                        >
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                            {diffOption.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Difficulty Level (1-10) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span>Very Easy</span>
                      <span>Very Hard</span>
                    </div>
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                      {[...Array(10)].map((_, index) => {
                        const level = index + 1;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updateFeedback('difficultyLevel', level)}
                            className={`flex items-center justify-center h-12 w-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-red-300 dark:hover:border-red-600 transition-colors ${feedback.difficultyLevel === level ? 'border-red-600 bg-red-600 text-white' : ''
                              }`}
                          >
                            <span className="font-semibold">{level}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="How did the training feel? Any adjustments needed for next time?"
                      value={feedback.notes}
                      onChange={(e) => updateFeedback('notes', e.target.value)}
                    />
                  </div>

                  {/* Complete Training Button */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={completeTraining}
                      disabled={isCompleting}
                      className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {isCompleting ? 'Completing...' : 'Complete Training'}
                    </button>
                  </div>
                </div>
              </fieldset>
            </>
          ) : (
            /* No Exercises State */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Exercises Planned</h3>
              <p className="text-gray-500 dark:text-gray-400">This training session doesn't have any exercises planned yet.</p>
            </div>
          )}

          {/* Add Exercise Drawer */}
          {addingExercise && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-gray-500/75"
                aria-hidden="true"
                onClick={() => setAddingExercise(false)}
              />

              {/* Drawer */}
              <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10 sm:pl-16">
                <div className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-auto bg-white dark:bg-gray-900 shadow-xl">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add Exercise</h2>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            onClick={() => setAddingExercise(false)}
                            className="relative rounded-md bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <span className="sr-only">Close panel</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <ul role="list" className="flex-1 divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto px-6">
                      {availableExercises.map((exercise) => (
                        <li key={exercise.exercise.value} className="flex justify-between gap-x-6 py-5">
                          <div className="flex min-w-0 gap-x-4">
                            <img
                              className="size-12 flex-none rounded bg-gray-50 object-cover"
                              src={exercise.image || '/images/exercise-placeholder.png'}
                              alt={exercise.displayName}
                            />
                            <div className="min-w-0 flex-auto">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {exercise.displayName}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {exercise.summary || ''}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(exercise.tags || []).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-0.5 text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => addExercise(exercise.exercise.value)}
                              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                              Add
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setAddingExercise(false)}
                        className="inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Static Footer */}
        <div className="fixed bottom-0 left-0 w-full z-50 bg-gray-900/95 text-white py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-4">
            {/* Back to Dashboard */}
            <div className="relative group">
              <a
                href={dashboard.url()}
                className="inline-flex items-center justify-center w-12 h-12 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-100 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </a>
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Back to Dashboard
              </div>
            </div>

            {/* Total Timer */}
            <div className="flex flex-col items-center">
              <span className="font-medium">Total Timer:</span>
              <span className={`font-mono text-lg ${
                sessionState.totalTimerSeconds >= 3600 ? 'text-red-400' : // 60+ minutes - red
                sessionState.totalTimerSeconds >= 2700 ? 'text-yellow-400' : // 45+ minutes - yellow
                'text-green-400' // Under 45 minutes - green
              }`}>
                {formatTime(sessionState.totalTimerSeconds)}
              </span>
              <div className={`text-xs mt-1 flex items-center ${
                sessionState.totalTimerSeconds >= 3600 ? 'text-red-400' :
                sessionState.totalTimerSeconds >= 2700 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-1 animate-pulse ${
                  sessionState.totalTimerSeconds >= 3600 ? 'bg-red-400' :
                  sessionState.totalTimerSeconds >= 2700 ? 'bg-yellow-400' :
                  'bg-green-400'
                }`}></div>
                {sessionState.totalTimerSeconds >= 3600 ? 'Over Time!' :
                 sessionState.totalTimerSeconds >= 2700 ? 'Wrap Up Soon' :
                 'Running'}
              </div>
              {sessionState.lastSaved && (
                <div className="text-xs text-gray-400 mt-1 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Progress saved
                </div>
              )}
            </div>

            {/* Add Exercise */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setAddingExercise(true)}
                className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Add Exercise
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}