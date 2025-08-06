import { queryParams, type QueryParams } from './../../wayfinder'
import message from './message'
/**
* @see \App\Http\Controllers\ChatController::index
* @see app/Http/Controllers/ChatController.php:26
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
* @see app/Http/Controllers/ChatController.php:26
* @route '/chat'
*/
index.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::index
* @see app/Http/Controllers/ChatController.php:26
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
* @see app/Http/Controllers/ChatController.php:26
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
* @see \App\Http\Controllers\ChatController::newMethod
* @see app/Http/Controllers/ChatController.php:66
* @route '/chat/new'
*/
export const newMethod = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: newMethod.url(options),
    method: 'get',
})

newMethod.definition = {
    methods: ['get','head'],
    url: '/chat/new',
}

/**
* @see \App\Http\Controllers\ChatController::newMethod
* @see app/Http/Controllers/ChatController.php:66
* @route '/chat/new'
*/
newMethod.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return newMethod.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::newMethod
* @see app/Http/Controllers/ChatController.php:66
* @route '/chat/new'
*/
newMethod.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: newMethod.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\ChatController::newMethod
* @see app/Http/Controllers/ChatController.php:66
* @route '/chat/new'
*/
newMethod.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: newMethod.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\ChatController::show
* @see app/Http/Controllers/ChatController.php:48
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
* @see app/Http/Controllers/ChatController.php:48
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
* @see app/Http/Controllers/ChatController.php:48
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
* @see app/Http/Controllers/ChatController.php:48
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
* @see app/Http/Controllers/ChatController.php:0
* @route '/chat/{session}/stream'
*/
export const stream = (args: { session: string | number } | [session: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: stream.url(args, options),
    method: 'get',
})

stream.definition = {
    methods: ['get','head'],
    url: '/chat/{session}/stream',
}

/**
* @see \App\Http\Controllers\ChatController::stream
* @see app/Http/Controllers/ChatController.php:0
* @route '/chat/{session}/stream'
*/
stream.url = (args: { session: string | number } | [session: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { session: args }
    }

    if (Array.isArray(args)) {
        args = {
            session: args[0],
        }
    }

    const parsedArgs = {
        session: args.session,
    }

    return stream.definition.url
            .replace('{session}', parsedArgs.session.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatController::stream
* @see app/Http/Controllers/ChatController.php:0
* @route '/chat/{session}/stream'
*/
stream.get = (args: { session: string | number } | [session: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: stream.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\ChatController::stream
* @see app/Http/Controllers/ChatController.php:0
* @route '/chat/{session}/stream'
*/
stream.head = (args: { session: string | number } | [session: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: stream.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\ChatMessageController::answer
* @see app/Http/Controllers/ChatMessageController.php:48
* @route '/chat-message/{chatMessage}/answer'
*/
export const answer = (args: { chatMessage: number | { id: number } } | [chatMessage: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: answer.url(args, options),
    method: 'get',
})

answer.definition = {
    methods: ['get','head'],
    url: '/chat-message/{chatMessage}/answer',
}

/**
* @see \App\Http\Controllers\ChatMessageController::answer
* @see app/Http/Controllers/ChatMessageController.php:48
* @route '/chat-message/{chatMessage}/answer'
*/
answer.url = (args: { chatMessage: number | { id: number } } | [chatMessage: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { chatMessage: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { chatMessage: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            chatMessage: args[0],
        }
    }

    const parsedArgs = {
        chatMessage: typeof args.chatMessage === 'object'
        ? args.chatMessage.id
        : args.chatMessage,
    }

    return answer.definition.url
            .replace('{chatMessage}', parsedArgs.chatMessage.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatMessageController::answer
* @see app/Http/Controllers/ChatMessageController.php:48
* @route '/chat-message/{chatMessage}/answer'
*/
answer.get = (args: { chatMessage: number | { id: number } } | [chatMessage: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: answer.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\ChatMessageController::answer
* @see app/Http/Controllers/ChatMessageController.php:48
* @route '/chat-message/{chatMessage}/answer'
*/
answer.head = (args: { chatMessage: number | { id: number } } | [chatMessage: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: answer.url(args, options),
    method: 'head',
})

const chat = {
    index,
    new: newMethod,
    show,
    stream,
    message,
    answer,
}

export default chat