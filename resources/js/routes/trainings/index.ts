import { queryParams, type QueryParams } from './../../wayfinder'
import complete from './complete'
/**
* @see \App\Http\Controllers\TrainingController::index
 * @see app/Http/Controllers/TrainingController.php:24
 * @route '/trainings'
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
    url: '/trainings',
}

/**
* @see \App\Http\Controllers\TrainingController::index
 * @see app/Http/Controllers/TrainingController.php:24
 * @route '/trainings'
 */
index.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingController::index
 * @see app/Http/Controllers/TrainingController.php:24
 * @route '/trainings'
 */
index.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\TrainingController::index
 * @see app/Http/Controllers/TrainingController.php:24
 * @route '/trainings'
 */
index.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\TrainingController::store
 * @see app/Http/Controllers/TrainingController.php:41
 * @route '/trainings'
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
    url: '/trainings',
}

/**
* @see \App\Http\Controllers\TrainingController::store
 * @see app/Http/Controllers/TrainingController.php:41
 * @route '/trainings'
 */
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingController::store
 * @see app/Http/Controllers/TrainingController.php:41
 * @route '/trainings'
 */
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\TrainingController::show
 * @see app/Http/Controllers/TrainingController.php:66
 * @route '/trainings/{training}'
 */
export const show = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ['get','head'],
    url: '/trainings/{training}',
}

/**
* @see \App\Http\Controllers\TrainingController::show
 * @see app/Http/Controllers/TrainingController.php:66
 * @route '/trainings/{training}'
 */
show.url = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return show.definition.url
            .replace('{training}', parsedArgs.training.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingController::show
 * @see app/Http/Controllers/TrainingController.php:66
 * @route '/trainings/{training}'
 */
show.get = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\TrainingController::show
 * @see app/Http/Controllers/TrainingController.php:66
 * @route '/trainings/{training}'
 */
show.head = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\TrainingController::complete
 * @see app/Http/Controllers/TrainingController.php:188
 * @route '/trainings/{training}/complete'
 */
export const complete = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: complete.url(args, options),
    method: 'get',
})

complete.definition = {
    methods: ['get','head'],
    url: '/trainings/{training}/complete',
}

/**
* @see \App\Http\Controllers\TrainingController::complete
 * @see app/Http/Controllers/TrainingController.php:188
 * @route '/trainings/{training}/complete'
 */
complete.url = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return complete.definition.url
            .replace('{training}', parsedArgs.training.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingController::complete
 * @see app/Http/Controllers/TrainingController.php:188
 * @route '/trainings/{training}/complete'
 */
complete.get = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: complete.url(args, options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\TrainingController::complete
 * @see app/Http/Controllers/TrainingController.php:188
 * @route '/trainings/{training}/complete'
 */
complete.head = (args: { training: number | { id: number } } | [training: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: complete.url(args, options),
    method: 'head',
})
const trainings = {
    index,
store,
show,
complete,
}

export default trainings