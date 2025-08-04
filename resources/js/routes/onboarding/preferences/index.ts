import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:234
 * @route '/onboarding/preferences'
 */
export const store = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ['post'],
    url: '/onboarding/preferences',
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:234
 * @route '/onboarding/preferences'
 */
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:234
 * @route '/onboarding/preferences'
 */
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})
const preferences = {
    store,
}

export default preferences