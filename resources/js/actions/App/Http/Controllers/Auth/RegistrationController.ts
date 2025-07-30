import { queryParams, type QueryParams } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Auth\RegistrationController::create
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
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
    url: '/register',
}

/**
* @see \App\Http\Controllers\Auth\RegistrationController::create
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
*/
create.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\RegistrationController::create
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
*/
create.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: create.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Auth\RegistrationController::create
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
*/
create.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: create.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Auth\RegistrationController::store
* @see app/Http/Controllers/Auth/RegistrationController.php:24
* @route '/register'
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
    url: '/register',
}

/**
* @see \App\Http\Controllers\Auth\RegistrationController::store
* @see app/Http/Controllers/Auth/RegistrationController.php:24
* @route '/register'
*/
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\RegistrationController::store
* @see app/Http/Controllers/Auth/RegistrationController.php:24
* @route '/register'
*/
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})

const RegistrationController = { create, store }

export default RegistrationController