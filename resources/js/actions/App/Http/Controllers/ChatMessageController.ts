import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\ChatMessageController::store
* @see app/Http/Controllers/ChatMessageController.php:25
* @route '/chat/{session}/message'
*/
export const store = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ['post'],
    url: '/chat/{session}/message',
}

/**
* @see \App\Http\Controllers\ChatMessageController::store
* @see app/Http/Controllers/ChatMessageController.php:25
* @route '/chat/{session}/message'
*/
store.url = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return store.definition.url
            .replace('{session}', parsedArgs.session.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\ChatMessageController::store
* @see app/Http/Controllers/ChatMessageController.php:25
* @route '/chat/{session}/message'
*/
store.post = (args: { session: number | { id: number } } | [session: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(args, options),
    method: 'post',
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

const ChatMessageController = { store, answer }

export default ChatMessageController