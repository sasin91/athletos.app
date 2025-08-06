import { queryParams, type QueryParams } from './../../../wayfinder'
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

const message = {
    store,
}

export default message