import { queryParams, type QueryParams } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Auth\LoginController::create
 * @see app/Http/Controllers/Auth/LoginController.php:20
 * @route '/login'
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
    url: '/login',
}

/**
* @see \App\Http\Controllers\Auth\LoginController::create
 * @see app/Http/Controllers/Auth/LoginController.php:20
 * @route '/login'
 */
create.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\LoginController::create
 * @see app/Http/Controllers/Auth/LoginController.php:20
 * @route '/login'
 */
create.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: create.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Auth\LoginController::create
 * @see app/Http/Controllers/Auth/LoginController.php:20
 * @route '/login'
 */
create.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: create.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Auth\LoginController::store
 * @see app/Http/Controllers/Auth/LoginController.php:28
 * @route '/login'
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
    url: '/login',
}

/**
* @see \App\Http\Controllers\Auth\LoginController::store
 * @see app/Http/Controllers/Auth/LoginController.php:28
 * @route '/login'
 */
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\LoginController::store
 * @see app/Http/Controllers/Auth/LoginController.php:28
 * @route '/login'
 */
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Auth\LoginController::destroy
 * @see app/Http/Controllers/Auth/LoginController.php:52
 * @route '/logout'
 */
export const destroy = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: destroy.url(options),
    method: 'post',
})

destroy.definition = {
    methods: ['post'],
    url: '/logout',
}

/**
* @see \App\Http\Controllers\Auth\LoginController::destroy
 * @see app/Http/Controllers/Auth/LoginController.php:52
 * @route '/logout'
 */
destroy.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return destroy.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\LoginController::destroy
 * @see app/Http/Controllers/Auth/LoginController.php:52
 * @route '/logout'
 */
destroy.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: destroy.url(options),
    method: 'post',
})
const LoginController = { create, store, destroy }

export default LoginController