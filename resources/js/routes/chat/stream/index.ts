import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\ChatController::start
* @see app/Http/Controllers/ChatController.php:72
* @route '/chat/stream/start'
*/
export const start = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: start.url(options),
    method: 'post',
})

start.definition = {
    methods: ['post'],
    url: '/chat/stream/start',
}

/**
* @see \App\Http\Controllers\ChatController::start
* @see app/Http/Controllers/ChatController.php:72
* @route '/chat/stream/start'
*/
start.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return start.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::start
* @see app/Http/Controllers/ChatController.php:72
* @route '/chat/stream/start'
*/
start.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: start.url(options),
    method: 'post',
})

