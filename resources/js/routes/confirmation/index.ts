import { queryParams, type QueryParams } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Auth\ConfirmationController::store
 * @see app/Http/Controllers/Auth/ConfirmationController.php:20
 * @route '/confirm-password'
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
    url: '/confirm-password',
}

/**
* @see \App\Http\Controllers\Auth\ConfirmationController::store
 * @see app/Http/Controllers/Auth/ConfirmationController.php:20
 * @route '/confirm-password'
 */
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\ConfirmationController::store
 * @see app/Http/Controllers/Auth/ConfirmationController.php:20
 * @route '/confirm-password'
 */
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})
const confirmation = {
    store,
}

export default confirmation