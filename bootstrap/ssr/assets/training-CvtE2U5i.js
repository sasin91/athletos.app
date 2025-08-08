import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useForm, Head, router } from "@inertiajs/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";
import { d as dashboard } from "./index-CrXrSpq1.js";
import { A as AppLayout } from "./app-layout-J2OJ2uom.js";
import "./index-ID1znBf5.js";
import "class-variance-authority";
import "./button-hAi0Fg-Q.js";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-tooltip";
import "lucide-react";
import "@radix-ui/react-avatar";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-navigation-menu";
import "@radix-ui/react-dialog";
import "./index-BAFHCEvX.js";
import "./app-logo-icon-wMAVxvx3.js";
import "sonner";
function useInterval(callback, delay) {
  const savedCallback = useRef(() => {
  });
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
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
function TrainingShow({
  training,
  plannedExercises,
  sets: initialSets,
  availableExercises,
  totalTimerSeconds: initialTotalSeconds,
  totalTimerStarted: initialTimerStarted,
  isLoading,
  hasError,
  errorMessage
}) {
  var _a, _b, _c;
  const [sessionState, setSessionState] = useLocalStorage(`training_session_${training.id}`, {
    sets: initialSets,
    totalTimerSeconds: initialTotalSeconds,
    totalTimerStarted: initialTimerStarted,
    feedback: {
      overallRating: 0,
      mood: "",
      energyLevel: 0,
      difficulty: "",
      difficultyLevel: 0,
      notes: ""
    },
    lastSaved: (/* @__PURE__ */ new Date()).toISOString()
  });
  const [addingExercise, setAddingExercise] = useState(false);
  const [timerRunning, setTimerRunning] = useState(true);
  const [restTimers, setRestTimers] = useState({});
  const [inputValues, setInputValues] = useState({});
  const wakeLock = useRef(null);
  const debounceTimers = useRef({});
  const { data: feedback, setData: setFeedback } = useForm(sessionState.feedback);
  const [isCompleting, setIsCompleting] = useState(false);
  const updateSets = (newSets) => {
    setSessionState((prev) => ({
      ...prev,
      sets: newSets,
      lastSaved: (/* @__PURE__ */ new Date()).toISOString()
    }));
  };
  const updateFeedback = (field, value) => {
    setFeedback(field, value);
    setSessionState((prev) => ({
      ...prev,
      feedback: {
        ...prev.feedback,
        [field]: value
      },
      lastSaved: (/* @__PURE__ */ new Date()).toISOString()
    }));
  };
  const incrementTimer = useCallback(() => {
    setSessionState((prev) => ({
      ...prev,
      totalTimerSeconds: prev.totalTimerSeconds + 1,
      totalTimerStarted: true,
      lastSaved: (/* @__PURE__ */ new Date()).toISOString()
    }));
  }, [setSessionState]);
  useInterval(incrementTimer, timerRunning ? 1e3 : null);
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && timerRunning) {
          if (wakeLock.current) {
            wakeLock.current.release();
          }
          wakeLock.current = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.log("Wake lock failed:", err);
      }
    };
    if (timerRunning) {
      requestWakeLock();
    }
    return () => {
      if (wakeLock.current) {
        wakeLock.current.release();
        wakeLock.current = null;
      }
      Object.values(restTimers).forEach((timer) => {
        if (timer.restInterval) {
          clearInterval(timer.restInterval);
        }
      });
      Object.values(debounceTimers.current).forEach((timer) => {
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
  const clearSavedState = () => {
    if (confirm("This will clear all your saved progress. Are you sure?")) {
      setSessionState({
        sets: initialSets,
        totalTimerSeconds: initialTotalSeconds,
        totalTimerStarted: initialTimerStarted,
        feedback: {
          overallRating: 0,
          mood: "",
          energyLevel: 0,
          difficulty: "",
          difficultyLevel: 0,
          notes: ""
        },
        lastSaved: (/* @__PURE__ */ new Date()).toISOString()
      });
      updateFeedback("overallRating", 0);
      updateFeedback("mood", "");
      updateFeedback("energyLevel", 0);
      updateFeedback("difficulty", "");
      updateFeedback("difficultyLevel", 0);
      updateFeedback("notes", "");
      setInputValues({});
      setTimerRunning(true);
    }
  };
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };
  const updateSetValue = (exerciseSlug, setIndex, field, value) => {
    const newSets = {
      ...sessionState.sets,
      [exerciseSlug]: sessionState.sets[exerciseSlug].map(
        (set, index) => index === setIndex ? { ...set, [field]: value } : set
      )
    };
    updateSets(newSets);
  };
  const updateSetValueDebounced = (exerciseSlug, setIndex, field, rawValue) => {
    const inputId = `${exerciseSlug}-${setIndex}-${field}`;
    setInputValues((prev) => ({
      ...prev,
      [inputId]: rawValue
    }));
    if (debounceTimers.current[inputId]) {
      clearTimeout(debounceTimers.current[inputId]);
    }
    debounceTimers.current[inputId] = setTimeout(() => {
      let parsedValue = null;
      if (rawValue.trim() !== "") {
        if (field === "reps" || field === "rpe") {
          parsedValue = parseInt(rawValue);
          if (isNaN(parsedValue)) parsedValue = null;
        } else if (field === "weight") {
          parsedValue = parseFloat(rawValue);
          if (isNaN(parsedValue)) parsedValue = null;
        } else {
          parsedValue = rawValue;
        }
      }
      updateSetValue(exerciseSlug, setIndex, field, parsedValue);
      delete debounceTimers.current[inputId];
    }, 300);
  };
  const getInputValue = (exerciseSlug, setIndex, field, currentValue) => {
    const inputId = `${exerciseSlug}-${setIndex}-${field}`;
    if (inputValues[inputId] !== void 0) {
      return inputValues[inputId];
    }
    return (currentValue == null ? void 0 : currentValue.toString()) || "";
  };
  const addSet = (exerciseSlug) => {
    const exerciseSets = sessionState.sets[exerciseSlug] || [];
    const newSetNumber = exerciseSets.length + 1;
    const lastSet = exerciseSets[exerciseSets.length - 1];
    const newSet = {
      setNumber: newSetNumber,
      reps: null,
      weight: null,
      rpe: null,
      timeSpent: 0,
      explosiveness: 0,
      notes: "",
      meta: (lastSet == null ? void 0 : lastSet.meta) || plannedExercises.find((ex) => ex.exerciseSlug === exerciseSlug)
    };
    const newSets = {
      ...sessionState.sets,
      [exerciseSlug]: [...exerciseSets, newSet]
    };
    updateSets(newSets);
  };
  const removeSet = (exerciseSlug, setNumber) => {
    const newSets = {
      ...sessionState.sets,
      [exerciseSlug]: sessionState.sets[exerciseSlug].filter((set) => set.setNumber !== setNumber)
    };
    updateSets(newSets);
  };
  const addExercise = (exerciseValue) => {
    const exercise = availableExercises.find((ex) => ex.exercise.value === exerciseValue);
    if (exercise) {
      const newSet = {
        setNumber: 1,
        reps: null,
        weight: null,
        rpe: null,
        timeSpent: 0,
        explosiveness: 0,
        notes: "",
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
  const startRestTimer = (exerciseSlug, setNumber) => {
    const key = `${exerciseSlug}-${setNumber}`;
    const interval = setInterval(() => {
      setRestTimers((prev) => {
        var _a2;
        return {
          ...prev,
          [key]: {
            ...prev[key],
            restSeconds: (((_a2 = prev[key]) == null ? void 0 : _a2.restSeconds) || 0) + 1
          }
        };
      });
    }, 1e3);
    setRestTimers((prev) => ({
      ...prev,
      [key]: {
        restSeconds: 0,
        restRunning: true,
        restInterval: interval
      }
    }));
  };
  const stopRestTimer = (exerciseSlug, setNumber) => {
    const key = `${exerciseSlug}-${setNumber}`;
    const timer = restTimers[key];
    if (timer == null ? void 0 : timer.restInterval) {
      clearInterval(timer.restInterval);
    }
    setRestTimers((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        restRunning: false,
        restInterval: null
      }
    }));
  };
  const resetRestTimer = (exerciseSlug, setNumber) => {
    const key = `${exerciseSlug}-${setNumber}`;
    const timer = restTimers[key];
    if (timer == null ? void 0 : timer.restInterval) {
      clearInterval(timer.restInterval);
    }
    setRestTimers((prev) => ({
      ...prev,
      [key]: {
        restSeconds: 0,
        restRunning: false,
        restInterval: null
      }
    }));
  };
  const completeTraining = () => {
    if (!feedback.overallRating || !feedback.mood || !feedback.energyLevel || !feedback.difficulty || !feedback.difficultyLevel) {
      alert("Please fill in all required feedback fields.");
      return;
    }
    stopTimer();
    setIsCompleting(true);
    const completionData = {
      overall_rating: feedback.overallRating,
      mood: feedback.mood,
      energy_level: feedback.energyLevel,
      difficulty: feedback.difficulty,
      difficulty_level: feedback.difficultyLevel,
      notes: feedback.notes,
      total_timer_seconds: sessionState.totalTimerSeconds,
      exercise_sets: JSON.stringify(sessionState.sets)
    };
    router.post(`/trainings/${training.id}/complete`, completionData, {
      onSuccess: () => {
        setSessionState({
          sets: initialSets,
          totalTimerSeconds: initialTotalSeconds,
          totalTimerStarted: initialTimerStarted,
          feedback: {
            overallRating: 0,
            mood: "",
            energyLevel: 0,
            difficulty: "",
            difficultyLevel: 0,
            notes: ""
          },
          lastSaved: (/* @__PURE__ */ new Date()).toISOString()
        });
        setIsCompleting(false);
      },
      onError: (errors) => {
        console.error("Training completion failed:", errors);
        setTimerRunning(true);
        setIsCompleting(false);
      }
    });
  };
  const scrollToExercise = (exerciseSlug) => {
    const element = document.getElementById(`exercise-${exerciseSlug}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Head, { title: "Training Session - Loading" }),
      /* @__PURE__ */ jsx("div", { className: "mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }),
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2", children: "Loading Exercises..." }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Generating your training plan exercises" })
      ] }) })
    ] });
  }
  if (hasError) {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Head, { title: "Training Session - Error" }),
      /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-4xl", children: /* @__PURE__ */ jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-8 text-center", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-red-800 dark:text-red-200 mb-2", children: "Error Loading Exercises" }),
        /* @__PURE__ */ jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: errorMessage })
      ] }) })
    ] });
  }
  return /* @__PURE__ */ jsxs(AppLayout, { children: [
    /* @__PURE__ */ jsx(Head, { title: `${((_a = training.trainingPlan) == null ? void 0 : _a.name) || "Training Session"}` }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-4xl", children: [
      sessionState.lastSaved && sessionState.totalTimerSeconds > 0 && /* @__PURE__ */ jsx("div", { className: "mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-blue-600 dark:text-blue-400 mr-2", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z", clipRule: "evenodd" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-blue-800 dark:text-blue-200", children: "Welcome back! Your training session has been restored." }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-blue-600 dark:text-blue-400 mt-1", children: [
              "Last saved: ",
              new Date(sessionState.lastSaved).toLocaleString()
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: clearSavedState,
            className: "text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline",
            title: "Start fresh (clears all saved progress)",
            children: "Start Fresh"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs("header", { className: "mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-gray-100", children: ((_b = training.trainingPlan) == null ? void 0 : _b.name) || "Training Session" }),
            /* @__PURE__ */ jsx("p", { className: "text-lg text-gray-600 dark:text-gray-400 mt-2", children: new Date(training.scheduled_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            }) }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1", children: (_c = training.trainingPhase) == null ? void 0 : _c.name })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold text-blue-600 dark:text-blue-400", children: [
              Math.round(training.progress),
              "%"
            ] }),
            /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Complete" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4", children: /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: "bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300",
            style: { width: `${training.progress}%` },
            role: "progressbar",
            "aria-valuenow": training.progress,
            "aria-valuemin": 0,
            "aria-valuemax": 100
          }
        ) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        Object.keys(sessionState.sets).length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
          Object.keys(sessionState.sets).length > 1 && /* @__PURE__ */ jsxs("nav", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-900 dark:text-gray-100 mb-3", children: "Jump to Exercise:" }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2 mb-4", children: Object.keys(sessionState.sets).map((exerciseSlug, index) => {
              var _a2;
              const exercise = (_a2 = sessionState.sets[exerciseSlug][0]) == null ? void 0 : _a2.meta;
              return /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => scrollToExercise(exerciseSlug),
                  className: "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors",
                  children: [
                    index + 1,
                    ". ",
                    (exercise == null ? void 0 : exercise.displayName) || exerciseSlug
                  ]
                },
                exerciseSlug
              );
            }) })
          ] }),
          Object.entries(sessionState.sets).map(([exerciseSlug, exerciseSets], exerciseIndex) => {
            var _a2, _b2;
            return /* @__PURE__ */ jsxs(
              "fieldset",
              {
                id: `exercise-${exerciseSlug}`,
                className: "mb-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6",
                children: [
                  /* @__PURE__ */ jsxs("legend", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3", children: [
                    /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium", children: exerciseIndex + 1 }),
                    ((_b2 = (_a2 = exerciseSets[0]) == null ? void 0 : _a2.meta) == null ? void 0 : _b2.displayName) || exerciseSlug
                  ] }),
                  exerciseSets.map((set, setIndex) => {
                    const restTimerKey = `${exerciseSlug}-${set.setNumber}`;
                    const restTimer = restTimers[restTimerKey] || { restSeconds: 0, restRunning: false };
                    return /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-lg transition-all duration-200 p-6 bg-white dark:bg-gray-800 shadow-sm", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
                        /* @__PURE__ */ jsxs("div", { className: "text-lg font-semibold text-gray-700 dark:text-gray-300", children: [
                          "Set ",
                          set.setNumber
                        ] }),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => removeSet(exerciseSlug, set.setNumber),
                            className: "text-red-500 hover:text-red-700 text-sm",
                            children: "Remove"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "space-y-4 mb-4", children: [
                        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                          /* @__PURE__ */ jsx(
                            "label",
                            {
                              htmlFor: `reps-${exerciseSlug}-${set.setNumber}`,
                              className: "absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100",
                              children: "Reps"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "input",
                            {
                              type: "number",
                              id: `reps-${exerciseSlug}-${set.setNumber}`,
                              className: "block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6",
                              placeholder: "Reps",
                              value: getInputValue(exerciseSlug, setIndex, "reps", set.reps),
                              onChange: (e) => updateSetValueDebounced(exerciseSlug, setIndex, "reps", e.target.value)
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                          /* @__PURE__ */ jsx(
                            "label",
                            {
                              htmlFor: `weight-${exerciseSlug}-${set.setNumber}`,
                              className: "absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100",
                              children: "Weight"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "input",
                            {
                              type: "text",
                              id: `weight-${exerciseSlug}-${set.setNumber}`,
                              className: "block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6",
                              placeholder: "Weight (kg)",
                              value: getInputValue(exerciseSlug, setIndex, "weight", set.weight),
                              onChange: (e) => updateSetValueDebounced(exerciseSlug, setIndex, "weight", e.target.value)
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                          /* @__PURE__ */ jsx(
                            "label",
                            {
                              htmlFor: `rpe-${exerciseSlug}-${set.setNumber}`,
                              className: "absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100",
                              children: "RPE"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "input",
                            {
                              type: "number",
                              id: `rpe-${exerciseSlug}-${set.setNumber}`,
                              className: "block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6",
                              placeholder: "RPE",
                              value: getInputValue(exerciseSlug, setIndex, "rpe", set.rpe),
                              onChange: (e) => updateSetValueDebounced(exerciseSlug, setIndex, "rpe", e.target.value)
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx("div", { className: "border-t border-gray-200 dark:border-gray-600 pt-4", children: /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
                        /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400 mb-2", children: "Rest Timer" }),
                        /* @__PURE__ */ jsx("div", { className: "font-mono text-xl mb-3", children: formatTime(restTimer.restSeconds) }),
                        /* @__PURE__ */ jsxs("div", { className: "flex gap-2 justify-center", children: [
                          !restTimer.restRunning ? /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              onClick: () => startRestTimer(exerciseSlug, set.setNumber),
                              className: "px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors",
                              children: "Start"
                            }
                          ) : /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              onClick: () => stopRestTimer(exerciseSlug, set.setNumber),
                              className: "px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors",
                              children: "Stop"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              onClick: () => resetRestTimer(exerciseSlug, set.setNumber),
                              className: "px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors",
                              children: "Reset"
                            }
                          )
                        ] })
                      ] }) }) })
                    ] }, set.setNumber);
                  }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => addSet(exerciseSlug),
                      className: "mt-2 px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed",
                      children: "Add Set"
                    }
                  )
                ]
              },
              exerciseSlug
            );
          }),
          /* @__PURE__ */ jsxs(
            "fieldset",
            {
              id: "training-feedback",
              className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8",
              children: [
                /* @__PURE__ */ jsxs("legend", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3", children: [
                  /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full text-sm font-medium", children: "✓" }),
                  "Training Session Feedback"
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3", children: [
                      "Overall Training Rating ",
                      /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "flex justify-center space-x-2", children: [1, 2, 3, 4, 5].map((rating) => /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => updateFeedback("overallRating", rating),
                        className: `flex items-center justify-center w-12 h-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-yellow-300 dark:hover:border-yellow-600 transition-colors ${feedback.overallRating >= rating ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : ""}`,
                        children: /* @__PURE__ */ jsx(
                          "svg",
                          {
                            className: `w-8 h-8 ${feedback.overallRating >= rating ? "text-yellow-500" : "text-gray-300"}`,
                            fill: "currentColor",
                            viewBox: "0 0 20 20",
                            children: /* @__PURE__ */ jsx("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" })
                          }
                        )
                      },
                      rating
                    )) }),
                    /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2", children: [
                      /* @__PURE__ */ jsx("span", { children: "Poor" }),
                      /* @__PURE__ */ jsx("span", { children: "Excellent" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3", children: [
                      "How are you feeling? ",
                      /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3", children: [
                      { value: "terrible", emoji: "😫", label: "Terrible" },
                      { value: "bad", emoji: "😔", label: "Bad" },
                      { value: "okay", emoji: "😐", label: "Okay" },
                      { value: "good", emoji: "😊", label: "Good" },
                      { value: "excellent", emoji: "🤩", label: "Excellent" }
                    ].map((moodOption) => /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => updateFeedback("mood", moodOption.value),
                        className: `flex flex-col items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${feedback.mood === moodOption.value ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" : ""}`,
                        children: [
                          /* @__PURE__ */ jsx("span", { className: "text-2xl mb-1", children: moodOption.emoji }),
                          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-gray-700 dark:text-gray-300", children: moodOption.label })
                        ]
                      },
                      moodOption.value
                    )) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3", children: [
                      "Energy Level (1-10) ",
                      /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-5 md:grid-cols-10 gap-2", children: [...Array(10)].map((_, index) => {
                      const level = index + 1;
                      return /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => updateFeedback("energyLevel", level),
                          className: `flex items-center justify-center h-12 w-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${feedback.energyLevel === level ? "border-blue-600 bg-blue-600 text-white" : ""}`,
                          children: /* @__PURE__ */ jsx("span", { className: "font-semibold", children: level })
                        },
                        level
                      );
                    }) }),
                    /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2", children: [
                      /* @__PURE__ */ jsx("span", { children: "Exhausted" }),
                      /* @__PURE__ */ jsx("span", { children: "Energized" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3", children: [
                      "How challenging was this training? ",
                      /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
                      { value: "too_easy", label: "Too Easy" },
                      { value: "just_right", label: "Just Right" },
                      { value: "challenging", label: "Challenging" },
                      { value: "too_hard", label: "Too Hard" }
                    ].map((diffOption) => /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => updateFeedback("difficulty", diffOption.value),
                        className: `flex flex-col items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${feedback.difficulty === diffOption.value ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" : ""}`,
                        children: /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-gray-700 dark:text-gray-300 text-center", children: diffOption.label })
                      },
                      diffOption.value
                    )) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3", children: [
                      "Difficulty Level (1-10) ",
                      /* @__PURE__ */ jsx("span", { className: "text-red-500", children: "*" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2", children: [
                      /* @__PURE__ */ jsx("span", { children: "Very Easy" }),
                      /* @__PURE__ */ jsx("span", { children: "Very Hard" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-5 md:grid-cols-10 gap-2", children: [...Array(10)].map((_, index) => {
                      const level = index + 1;
                      return /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => updateFeedback("difficultyLevel", level),
                          className: `flex items-center justify-center h-12 w-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-red-300 dark:hover:border-red-600 transition-colors ${feedback.difficultyLevel === level ? "border-red-600 bg-red-600 text-white" : ""}`,
                          children: /* @__PURE__ */ jsx("span", { className: "font-semibold", children: level })
                        },
                        level
                      );
                    }) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Additional Notes (Optional)" }),
                    /* @__PURE__ */ jsx(
                      "textarea",
                      {
                        rows: 3,
                        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100",
                        placeholder: "How did the training feel? Any adjustments needed for next time?",
                        value: feedback.notes,
                        onChange: (e) => updateFeedback("notes", e.target.value)
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "pt-6 border-t border-gray-200 dark:border-gray-600", children: /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: completeTraining,
                      disabled: isCompleting,
                      className: "w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50",
                      children: [
                        /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 mr-2", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M5 13l4 4L19 7" }) }),
                        isCompleting ? "Completing..." : "Complete Training"
                      ]
                    }
                  ) })
                ] })
              ]
            }
          )
        ] }) : (
          /* No Exercises State */
          /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" }) }) }),
            /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2", children: "No Exercises Planned" }),
            /* @__PURE__ */ jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "This training session doesn't have any exercises planned yet." })
          ] })
        ),
        addingExercise && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "fixed inset-0 z-40 bg-gray-500/75",
              "aria-hidden": "true",
              onClick: () => setAddingExercise(false)
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "fixed inset-y-0 right-0 z-50 flex max-w-full pl-10 sm:pl-16", children: /* @__PURE__ */ jsx("div", { className: "pointer-events-auto w-screen max-w-md", children: /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col overflow-y-auto bg-white dark:bg-gray-900 shadow-xl", children: [
            /* @__PURE__ */ jsx("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
              /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold text-gray-900 dark:text-gray-100", children: "Add Exercise" }),
              /* @__PURE__ */ jsx("div", { className: "ml-3 flex h-7 items-center", children: /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setAddingExercise(false),
                  className: "relative rounded-md bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-500 focus-visible:ring-2 focus-visible:ring-indigo-500",
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close panel" }),
                    /* @__PURE__ */ jsx("svg", { className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18 18 6M6 6l12 12" }) })
                  ]
                }
              ) })
            ] }) }),
            /* @__PURE__ */ jsx("ul", { role: "list", className: "flex-1 divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto px-6", children: availableExercises.map((exercise) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between gap-x-6 py-5", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 gap-x-4", children: [
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    className: "size-12 flex-none rounded bg-gray-50 object-cover",
                    src: exercise.image || "/images/exercise-placeholder.png",
                    alt: exercise.displayName
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-auto", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: exercise.displayName }),
                  /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: exercise.summary || "" }),
                  /* @__PURE__ */ jsx("div", { className: "mt-1 flex flex-wrap gap-1", children: (exercise.tags || []).map((tag) => /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: "inline-block bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-0.5 text-xs",
                      children: tag
                    },
                    tag
                  )) })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => addExercise(exercise.exercise.value),
                  className: "inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
                  children: "Add"
                }
              ) })
            ] }, exercise.exercise.value)) }),
            /* @__PURE__ */ jsx("div", { className: "p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end", children: /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setAddingExercise(false),
                className: "inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600",
                children: "Cancel"
              }
            ) })
          ] }) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "fixed bottom-0 left-0 w-full z-50 bg-gray-900/95 text-white py-3 shadow-lg", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto flex items-center justify-between px-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative group", children: [
          /* @__PURE__ */ jsx(
            "a",
            {
              href: dashboard.url(),
              className: "inline-flex items-center justify-center w-12 h-12 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-100 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              children: /* @__PURE__ */ jsx("svg", { className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M10 19l-7-7m0 0l7-7m-7 7h18" }) })
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap", children: "Back to Dashboard" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center", children: [
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Total Timer:" }),
          /* @__PURE__ */ jsx("span", { className: `font-mono text-lg ${sessionState.totalTimerSeconds >= 3600 ? "text-red-400" : (
            // 60+ minutes - red
            sessionState.totalTimerSeconds >= 2700 ? "text-yellow-400" : (
              // 45+ minutes - yellow
              "text-green-400"
            )
          )}`, children: formatTime(sessionState.totalTimerSeconds) }),
          /* @__PURE__ */ jsxs("div", { className: `text-xs mt-1 flex items-center ${sessionState.totalTimerSeconds >= 3600 ? "text-red-400" : sessionState.totalTimerSeconds >= 2700 ? "text-yellow-400" : "text-green-400"}`, children: [
            /* @__PURE__ */ jsx("div", { className: `w-2 h-2 rounded-full mr-1 animate-pulse ${sessionState.totalTimerSeconds >= 3600 ? "bg-red-400" : sessionState.totalTimerSeconds >= 2700 ? "bg-yellow-400" : "bg-green-400"}` }),
            sessionState.totalTimerSeconds >= 3600 ? "Over Time!" : sessionState.totalTimerSeconds >= 2700 ? "Wrap Up Soon" : "Running"
          ] }),
          sessionState.lastSaved && /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-400 mt-1 flex items-center", children: [
            /* @__PURE__ */ jsx("svg", { className: "w-3 h-3 mr-1", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) }),
            "Progress saved"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative group", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setAddingExercise(true),
              className: "inline-flex items-center justify-center w-12 h-12 rounded-md bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
              children: /* @__PURE__ */ jsx("svg", { className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 4v16m8-8H4" }) })
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap", children: "Add Exercise" })
        ] })
      ] }) })
    ] })
  ] });
}
export {
  TrainingShow as default
};
