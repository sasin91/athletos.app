import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:115
 * @route '/onboarding/plan'
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
    url: '/onboarding/plan',
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:115
 * @route '/onboarding/plan'
 */
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:115
 * @route '/onboarding/plan'
 */
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})
const plan = {
    store,
}

export default plan