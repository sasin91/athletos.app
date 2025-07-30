import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\TrainingController::store
* @see app/Http/Controllers/TrainingController.php:200
* @route '/trainings/{training}/complete'
*/
export const store = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ['post'],
    url: '/trainings/{training}/complete',
}

/**
* @see \App\Http\Controllers\TrainingController::store
* @see app/Http/Controllers/TrainingController.php:200
* @route '/trainings/{training}/complete'
*/
store.url = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { training: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { training: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            training: args[0],
        }
    }

    const parsedArgs = {
        training: typeof args.training === 'object'
        ? args.training.id
        : args.training,
    }

    return store.definition.url
            .replace('{training}', parsedArgs.training.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingController::store
* @see app/Http/Controllers/TrainingController.php:200
* @route '/trainings/{training}/complete'
*/
store.post = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(args, options),
    method: 'post',
})

const complete = {
    store,
}

export default complete