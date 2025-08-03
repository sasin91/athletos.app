import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:58
 * @route '/onboarding/profile'
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
    url: '/onboarding/profile',
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:58
 * @route '/onboarding/profile'
 */
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::store
 * @see app/Http/Controllers/OnboardingController.php:58
 * @route '/onboarding/profile'
 */
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})
const profile = {
    store,
}

export default profile