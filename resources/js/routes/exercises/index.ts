import { queryParams, type QueryParams } from './../../wayfinder'
/**
* @see \App\Http\Controllers\ExerciseController::show
* @see app/Http/Controllers/ExerciseController.php:15
* @route '/exercises/{exercise}'
*/
export const show = (args: { exercise: string | number | { slug: string | number } } | [exercise: string | number | { slug: string | number } ] | string | number | { slug: string | number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ['get','head'],
    url: '/exercises/{exercise}',
}

/**
* @see \App\Http\Controllers\ExerciseController::show
* @see app/Http/Controllers/ExerciseController.php:15
* @route '/exercises/{exercise}'
*/
show.url = (args: { exercise: string | number | { slug: string | number } } | [exercise: string | number | { slug: string | number } ] | string | number | { slug: string | number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { exercise: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'slug' in args) {
        args = { exercise: args.slug }
    }

    if (Array.isArray(args)) {
        args = {
            exercise: args[0],
        }
    }

    const parsedArgs = {
        exercise: typeof args.exercise === 'object'
        ? args.exercise.slug
        : args.exercise,
    }

    return show.definition.url
            .replace('{exercise}', parsedArgs.exercise.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\ExerciseController::show
* @see app/Http/Controllers/ExerciseController.php:15
* @route '/exercises/{exercise}'
*/
show.get = (args: { exercise: string | number | { slug: string | number } } | [exercise: string | number | { slug: string | number } ] | string | number | { slug: string | number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\ExerciseController::show
* @see app/Http/Controllers/ExerciseController.php:15
* @route '/exercises/{exercise}'
*/
show.head = (args: { exercise: string | number | { slug: string | number } } | [exercise: string | number | { slug: string | number } ] | string | number | { slug: string | number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: show.url(args, options),
    method: 'head',
})

const exercises = {
    show,
}

export default exercises