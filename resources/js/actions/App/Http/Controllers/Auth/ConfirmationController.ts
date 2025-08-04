import { queryParams, type QueryParams } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Auth\ConfirmationController::create
 * @see app/Http/Controllers/Auth/ConfirmationController.php:15
 * @route '/confirm-password'
 */
export const create = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: create.url(options),
    method: 'get',
})

create.definition = {
    methods: ['get','head'],
    url: '/confirm-password',
}

/**
* @see \App\Http\Controllers\Auth\ConfirmationController::create
 * @see app/Http/Controllers/Auth/ConfirmationController.php:15
 * @route '/confirm-password'
 */
create.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\ConfirmationController::create
 * @see app/Http/Controllers/Auth/ConfirmationController.php:15
 * @route '/confirm-password'
 */
create.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: create.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Auth\ConfirmationController::create
 * @see app/Http/Controllers/Auth/ConfirmationController.php:15
 * @route '/confirm-password'
 */
create.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: create.url(options),
    method: 'head',
})

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
const ConfirmationController = { create, store }

export default ConfirmationController