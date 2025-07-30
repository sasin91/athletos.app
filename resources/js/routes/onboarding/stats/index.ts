import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\OnboardingController::store
* @see app/Http/Controllers/OnboardingController.php:190
* @route '/onboarding/stats'
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
    url: '/onboarding/stats',
}

/**
* @see \App\Http\Controllers\OnboardingController::store
* @see app/Http/Controllers/OnboardingController.php:190
* @route '/onboarding/stats'
*/
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\OnboardingController::store
* @see app/Http/Controllers/OnboardingController.php:190
* @route '/onboarding/stats'
*/
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})

const stats = {
    store,
}

export default stats