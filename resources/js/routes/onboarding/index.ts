import { queryParams, type QueryParams } from './../../wayfinder'
import profile from './profile'
import plan from './plan'
import schedule from './schedule'
import stats from './stats'
import preferences from './preferences'
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
const onboarding = {
    profile,
plan,
schedule,
stats,
preferences,
}

export default onboarding