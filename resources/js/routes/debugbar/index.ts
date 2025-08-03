import { queryParams, type QueryParams } from './../../wayfinder'
import assets from './assets'
import cache from './cache'
import queries from './queries'
/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::openhandler
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:43
 * @route '/_debugbar/open'
 */
export const openhandler = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: openhandler.url(options),
    method: 'get',
})

openhandler.definition = {
    methods: ['get','head'],
    url: '/_debugbar/open',
}

/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::openhandler
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:43
 * @route '/_debugbar/open'
 */
openhandler.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return openhandler.definition.url + queryParams(options)
}

/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::openhandler
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:43
 * @route '/_debugbar/open'
 */
openhandler.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: openhandler.url(options),
    method: 'get',
})
/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::openhandler
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:43
 * @route '/_debugbar/open'
 */
openhandler.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: openhandler.url(options),
    method: 'head',
})

/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::clockwork
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:77
 * @route '/_debugbar/clockwork/{id}'
 */
export const clockwork = (args: { id: string | number } | [id: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: clockwork.url(args, options),
    method: 'get',
})

clockwork.definition = {
    methods: ['get','head'],
    url: '/_debugbar/clockwork/{id}',
}

/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::clockwork
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:77
 * @route '/_debugbar/clockwork/{id}'
 */
clockwork.url = (args: { id: string | number } | [id: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { id: args }
    }

    
    if (Array.isArray(args)) {
        args = {
                    id: args[0],
                }
    }

    const parsedArgs = {
                        id: args.id,
                }

    return clockwork.definition.url
            .replace('{id}', parsedArgs.id.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::clockwork
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:77
 * @route '/_debugbar/clockwork/{id}'
 */
clockwork.get = (args: { id: string | number } | [id: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: clockwork.url(args, options),
    method: 'get',
})
/**
* @see \Barryvdh\Debugbar\Controllers\OpenHandlerController::clockwork
 * @see vendor/barryvdh/laravel-debugbar/src/Controllers/OpenHandlerController.php:77
 * @route '/_debugbar/clockwork/{id}'
 */
clockwork.head = (args: { id: string | number } | [id: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: clockwork.url(args, options),
    method: 'head',
})
const debugbar = {
    openhandler,
clockwork,
assets,
cache,
queries,
}

export default debugbar