import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\ChatController::startStream
* @see app/Http/Controllers/ChatController.php:72
* @route '/api/chat/stream/start'
*/
const startStream2c13058d96c69ae1b8a27c8f90cbc1ee = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: startStream2c13058d96c69ae1b8a27c8f90cbc1ee.url(options),
    method: 'post',
})

startStream2c13058d96c69ae1b8a27c8f90cbc1ee.definition = {
    methods: ['post'],
    url: '/api/chat/stream/start',
}

/**
* @see \App\Http\Controllers\ChatController::startStream
* @see app/Http/Controllers/ChatController.php:72
* @route '/api/chat/stream/start'
*/
startStream2c13058d96c69ae1b8a27c8f90cbc1ee.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return startStream2c13058d96c69ae1b8a27c8f90cbc1ee.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::startStream
* @see app/Http/Controllers/ChatController.php:72
* @route '/api/chat/stream/start'
*/
startStream2c13058d96c69ae1b8a27c8f90cbc1ee.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: startStream2c13058d96c69ae1b8a27c8f90cbc1ee.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\ChatController::startStream
* @see app/Http/Controllers/ChatController.php:72
* @route '/chat/stream/start'
*/
const startStreamcc33849a90a907a875b9d4e4c15cf541 = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: startStreamcc33849a90a907a875b9d4e4c15cf541.url(options),
    method: 'post',
})

startStreamcc33849a90a907a875b9d4e4c15cf541.definition = {
    methods: ['post'],
    url: '/chat/stream/start',
}

/**
* @see \App\Http\Controllers\ChatController::startStream
* @see app/Http/Controllers/ChatController.php:72
* @route '/chat/stream/start'
*/
startStreamcc33849a90a907a875b9d4e4c15cf541.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return startStreamcc33849a90a907a875b9d4e4c15cf541.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::startStream
* @see app/Http/Controllers/ChatController.php:72
* @route '/chat/stream/start'
*/
startStreamcc33849a90a907a875b9d4e4c15cf541.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: startStreamcc33849a90a907a875b9d4e4c15cf541.url(options),
    method: 'post',
})

export const startStream = {
    '/api/chat/stream/start': startStream2c13058d96c69ae1b8a27c8f90cbc1ee,
    '/chat/stream/start': startStreamcc33849a90a907a875b9d4e4c15cf541,
}

/**
* @see \App\Http\Controllers\ChatController::stopStream
* @see app/Http/Controllers/ChatController.php:0
* @route '/api/chat/stream/stop'
*/
export const stopStream = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: stopStream.url(options),
    method: 'post',
})

stopStream.definition = {
    methods: ['post'],
    url: '/api/chat/stream/stop',
}

/**
* @see \App\Http\Controllers\ChatController::stopStream
* @see app/Http/Controllers/ChatController.php:0
* @route '/api/chat/stream/stop'
*/
stopStream.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return stopStream.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::stopStream
* @see app/Http/Controllers/ChatController.php:0
* @route '/api/chat/stream/stop'
*/
stopStream.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: stopStream.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\ChatController::websocket
* @see app/Http/Controllers/ChatController.php:222
* @route '/api/chat/websocket'
*/
export const websocket = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: websocket.url(options),
    method: 'post',
})

websocket.definition = {
    methods: ['post'],
    url: '/api/chat/websocket',
}

/**
* @see \App\Http\Controllers\ChatController::websocket
* @see app/Http/Controllers/ChatController.php:222
* @route '/api/chat/websocket'
*/
websocket.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return websocket.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::websocket
* @see app/Http/Controllers/ChatController.php:222
* @route '/api/chat/websocket'
*/
websocket.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: websocket.url(options),
    method: 'post',
})

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

const ChatController = { startStream, stopStream, websocket, index, show, stream }

export default ChatController