import { queryParams, type QueryParams } from './../../wayfinder'
/**
* @see \App\Http\Controllers\ChatController::index
* @see app/Http/Controllers/ChatController.php:29
* @route '/chat'
*/
export const index = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ['get','head'],
    url: '/chat',
}

/**
* @see \App\Http\Controllers\ChatController::index
* @see app/Http/Controllers/ChatController.php:29
* @route '/chat'
*/
index.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::index
* @see app/Http/Controllers/ChatController.php:29
* @route '/chat'
*/
index.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\ChatController::index
* @see app/Http/Controllers/ChatController.php:29
* @route '/chat'
*/
index.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\ChatController::show
* @see app/Http/Controllers/ChatController.php:51
* @route '/chat/{session}'
*/
export const show = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ['get','head'],
    url: '/chat/{session}',
}

/**
* @see \App\Http\Controllers\ChatController::show
* @see app/Http/Controllers/ChatController.php:51
* @route '/chat/{session}'
*/
show.url = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { session: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { session: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            session: args[0],
        }
    }

    const parsedArgs = {
        session: typeof args.session === 'object'
        ? args.session.id
        : args.session,
    }

    return show.definition.url
            .replace('{session}', parsedArgs.session.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::show
* @see app/Http/Controllers/ChatController.php:51
* @route '/chat/{session}'
*/
show.get = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\ChatController::show
* @see app/Http/Controllers/ChatController.php:51
* @route '/chat/{session}'
*/
show.head = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\ChatController::stream
* @see app/Http/Controllers/ChatController.php:117
* @route '/chat/stream/{streamId}'
*/
export const stream = (args: { streamId: string | number } | [streamId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: stream.url(args, options),
    method: 'get',
})

stream.definition = {
    methods: ['get','head'],
    url: '/chat/stream/{streamId}',
}

/**
* @see \App\Http\Controllers\ChatController::stream
* @see app/Http/Controllers/ChatController.php:117
* @route '/chat/stream/{streamId}'
*/
stream.url = (args: { streamId: string | number } | [streamId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { streamId: args }
    }

    if (Array.isArray(args)) {
        args = {
            streamId: args[0],
        }
    }

    const parsedArgs = {
        streamId: args.streamId,
    }

    return stream.definition.url
            .replace('{streamId}', parsedArgs.streamId.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::stream
* @see app/Http/Controllers/ChatController.php:117
* @route '/chat/stream/{streamId}'
*/
stream.get = (args: { streamId: string | number } | [streamId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: stream.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\ChatController::stream
* @see app/Http/Controllers/ChatController.php:117
* @route '/chat/stream/{streamId}'
*/
stream.head = (args: { streamId: string | number } | [streamId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: stream.url(args, options),
    method: 'head',
})

const chat = {
    index,
    show,
    stream,
}

export default chat