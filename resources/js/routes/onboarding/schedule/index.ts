import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:157
 * @route '/onboarding/schedule'
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
    url: '/onboarding/schedule',
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:157
 * @route '/onboarding/schedule'
 */
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:157
 * @route '/onboarding/schedule'
 */
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})
const schedule = {
    store,
}

export default schedule