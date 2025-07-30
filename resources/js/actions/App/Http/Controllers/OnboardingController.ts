import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\OnboardingController::profile
* @see app/Http/Controllers/OnboardingController.php:30
* @route '/onboarding/profile'
*/
export const profile = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: profile.url(options),
    method: 'get',
})

profile.definition = {
    methods: ['get','head'],
    url: '/onboarding/profile',
}

/**
* @see \App\Http\Controllers\OnboardingController::profile
* @see app/Http/Controllers/OnboardingController.php:30
* @route '/onboarding/profile'
*/
profile.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return profile.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::profile
* @see app/Http/Controllers/OnboardingController.php:30
* @route '/onboarding/profile'
*/
profile.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: profile.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\OnboardingController::profile
* @see app/Http/Controllers/OnboardingController.php:30
* @route '/onboarding/profile'
*/
profile.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: profile.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\OnboardingController::storeProfile
* @see app/Http/Controllers/OnboardingController.php:58
* @route '/onboarding/profile'
*/
export const storeProfile = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storeProfile.url(options),
    method: 'post',
})

storeProfile.definition = {
    methods: ['post'],
    url: '/onboarding/profile',
}

/**
* @see \App\Http\Controllers\OnboardingController::storeProfile
* @see app/Http/Controllers/OnboardingController.php:58
* @route '/onboarding/profile'
*/
storeProfile.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return storeProfile.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::storeProfile
* @see app/Http/Controllers/OnboardingController.php:58
* @route '/onboarding/profile'
*/
storeProfile.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storeProfile.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\OnboardingController::plan
* @see app/Http/Controllers/OnboardingController.php:94
* @route '/onboarding/plan'
*/
export const plan = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: plan.url(options),
    method: 'get',
})

plan.definition = {
    methods: ['get','head'],
    url: '/onboarding/plan',
}

/**
* @see \App\Http\Controllers\OnboardingController::plan
* @see app/Http/Controllers/OnboardingController.php:94
* @route '/onboarding/plan'
*/
plan.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return plan.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::plan
* @see app/Http/Controllers/OnboardingController.php:94
* @route '/onboarding/plan'
*/
plan.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: plan.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\OnboardingController::plan
* @see app/Http/Controllers/OnboardingController.php:94
* @route '/onboarding/plan'
*/
plan.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: plan.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\OnboardingController::storePlan
* @see app/Http/Controllers/OnboardingController.php:115
* @route '/onboarding/plan'
*/
export const storePlan = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storePlan.url(options),
    method: 'post',
})

storePlan.definition = {
    methods: ['post'],
    url: '/onboarding/plan',
}

/**
* @see \App\Http\Controllers\OnboardingController::storePlan
* @see app/Http/Controllers/OnboardingController.php:115
* @route '/onboarding/plan'
*/
storePlan.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return storePlan.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::storePlan
* @see app/Http/Controllers/OnboardingController.php:115
* @route '/onboarding/plan'
*/
storePlan.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storePlan.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\OnboardingController::schedule
* @see app/Http/Controllers/OnboardingController.php:134
* @route '/onboarding/schedule'
*/
export const schedule = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: schedule.url(options),
    method: 'get',
})

schedule.definition = {
    methods: ['get','head'],
    url: '/onboarding/schedule',
}

/**
* @see \App\Http\Controllers\OnboardingController::schedule
* @see app/Http/Controllers/OnboardingController.php:134
* @route '/onboarding/schedule'
*/
schedule.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return schedule.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::schedule
* @see app/Http/Controllers/OnboardingController.php:134
* @route '/onboarding/schedule'
*/
schedule.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: schedule.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\OnboardingController::schedule
* @see app/Http/Controllers/OnboardingController.php:134
* @route '/onboarding/schedule'
*/
schedule.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: schedule.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\OnboardingController::storeSchedule
* @see app/Http/Controllers/OnboardingController.php:157
* @route '/onboarding/schedule'
*/
export const storeSchedule = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storeSchedule.url(options),
    method: 'post',
})

storeSchedule.definition = {
    methods: ['post'],
    url: '/onboarding/schedule',
}

/**
* @see \App\Http\Controllers\OnboardingController::storeSchedule
* @see app/Http/Controllers/OnboardingController.php:157
* @route '/onboarding/schedule'
*/
storeSchedule.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return storeSchedule.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::storeSchedule
* @see app/Http/Controllers/OnboardingController.php:157
* @route '/onboarding/schedule'
*/
storeSchedule.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storeSchedule.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\OnboardingController::stats
* @see app/Http/Controllers/OnboardingController.php:176
* @route '/onboarding/stats'
*/
export const stats = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: stats.url(options),
    method: 'get',
})

stats.definition = {
    methods: ['get','head'],
    url: '/onboarding/stats',
}

/**
* @see \App\Http\Controllers\OnboardingController::stats
* @see app/Http/Controllers/OnboardingController.php:176
* @route '/onboarding/stats'
*/
stats.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return stats.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::stats
* @see app/Http/Controllers/OnboardingController.php:176
* @route '/onboarding/stats'
*/
stats.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: stats.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\OnboardingController::stats
* @see app/Http/Controllers/OnboardingController.php:176
* @route '/onboarding/stats'
*/
stats.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: stats.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\OnboardingController::storeStats
* @see app/Http/Controllers/OnboardingController.php:190
* @route '/onboarding/stats'
*/
export const storeStats = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storeStats.url(options),
    method: 'post',
})

storeStats.definition = {
    methods: ['post'],
    url: '/onboarding/stats',
}

/**
* @see \App\Http\Controllers\OnboardingController::storeStats
* @see app/Http/Controllers/OnboardingController.php:190
* @route '/onboarding/stats'
*/
storeStats.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return storeStats.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::storeStats
* @see app/Http/Controllers/OnboardingController.php:190
* @route '/onboarding/stats'
*/
storeStats.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storeStats.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\OnboardingController::preferences
* @see app/Http/Controllers/OnboardingController.php:215
* @route '/onboarding/preferences'
*/
export const preferences = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: preferences.url(options),
    method: 'get',
})

preferences.definition = {
    methods: ['get','head'],
    url: '/onboarding/preferences',
}

/**
* @see \App\Http\Controllers\OnboardingController::preferences
* @see app/Http/Controllers/OnboardingController.php:215
* @route '/onboarding/preferences'
*/
preferences.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return preferences.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::preferences
* @see app/Http/Controllers/OnboardingController.php:215
* @route '/onboarding/preferences'
*/
preferences.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: preferences.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\OnboardingController::preferences
* @see app/Http/Controllers/OnboardingController.php:215
* @route '/onboarding/preferences'
*/
preferences.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: preferences.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\OnboardingController::storePreferences
* @see app/Http/Controllers/OnboardingController.php:234
* @route '/onboarding/preferences'
*/
export const storePreferences = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storePreferences.url(options),
    method: 'post',
})

storePreferences.definition = {
    methods: ['post'],
    url: '/onboarding/preferences',
}

/**
* @see \App\Http\Controllers\OnboardingController::storePreferences
* @see app/Http/Controllers/OnboardingController.php:234
* @route '/onboarding/preferences'
*/
storePreferences.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return storePreferences.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::storePreferences
* @see app/Http/Controllers/OnboardingController.php:234
* @route '/onboarding/preferences'
*/
storePreferences.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: storePreferences.url(options),
    method: 'post',
})

const OnboardingController = { profile, storeProfile, plan, storePlan, schedule, storeSchedule, stats, storeStats, preferences, storePreferences }

export default OnboardingController