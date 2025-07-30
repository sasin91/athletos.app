import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\TrainingPlanController::create
* @see app/Http/Controllers/TrainingPlanController.php:35
* @route '/training-plans/create'
*/
export const create = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: create.url(options),
    method: 'get',
})

create.definition = {
    methods: ['get','head'],
    url: '/training-plans/create',
}

/**
* @see \App\Http\Controllers\TrainingPlanController::create
* @see app/Http/Controllers/TrainingPlanController.php:35
* @route '/training-plans/create'
*/
create.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingPlanController::create
* @see app/Http/Controllers/TrainingPlanController.php:35
* @route '/training-plans/create'
*/
create.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: create.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\TrainingPlanController::create
* @see app/Http/Controllers/TrainingPlanController.php:35
* @route '/training-plans/create'
*/
create.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: create.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\TrainingPlanController::store
* @see app/Http/Controllers/TrainingPlanController.php:42
* @route '/training-plans'
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
    url: '/training-plans',
}

/**
* @see \App\Http\Controllers\TrainingPlanController::store
* @see app/Http/Controllers/TrainingPlanController.php:42
* @route '/training-plans'
*/
store.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingPlanController::store
* @see app/Http/Controllers/TrainingPlanController.php:42
* @route '/training-plans'
*/
store.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\TrainingPlanController::show
* @see app/Http/Controllers/TrainingPlanController.php:118
* @route '/training-plans/{trainingPlan}'
*/
export const show = (args: { trainingPlan: number | { id: number } } | [trainingPlan: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ['get','head'],
    url: '/training-plans/{trainingPlan}',
}

/**
* @see \App\Http\Controllers\TrainingPlanController::show
* @see app/Http/Controllers/TrainingPlanController.php:118
* @route '/training-plans/{trainingPlan}'
*/
show.url = (args: { trainingPlan: number | { id: number } } | [trainingPlan: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { trainingPlan: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { trainingPlan: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            trainingPlan: args[0],
        }
    }

    const parsedArgs = {
        trainingPlan: typeof args.trainingPlan === 'object'
        ? args.trainingPlan.id
        : args.trainingPlan,
    }

    return show.definition.url
            .replace('{trainingPlan}', parsedArgs.trainingPlan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingPlanController::show
* @see app/Http/Controllers/TrainingPlanController.php:118
* @route '/training-plans/{trainingPlan}'
*/
show.get = (args: { trainingPlan: number | { id: number } } | [trainingPlan: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\TrainingPlanController::show
* @see app/Http/Controllers/TrainingPlanController.php:118
* @route '/training-plans/{trainingPlan}'
*/
show.head = (args: { trainingPlan: number | { id: number } } | [trainingPlan: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\TrainingPlanController::assign
* @see app/Http/Controllers/TrainingPlanController.php:23
* @route '/training-plans/{trainingPlan}/assign'
*/
export const assign = (args: { trainingPlan: number | { id: number } } | [trainingPlan: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: assign.url(args, options),
    method: 'post',
})

assign.definition = {
    methods: ['post'],
    url: '/training-plans/{trainingPlan}/assign',
}

/**
* @see \App\Http\Controllers\TrainingPlanController::assign
* @see app/Http/Controllers/TrainingPlanController.php:23
* @route '/training-plans/{trainingPlan}/assign'
*/
assign.url = (args: { trainingPlan: number | { id: number } } | [trainingPlan: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { trainingPlan: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { trainingPlan: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            trainingPlan: args[0],
        }
    }

    const parsedArgs = {
        trainingPlan: typeof args.trainingPlan === 'object'
        ? args.trainingPlan.id
        : args.trainingPlan,
    }

    return assign.definition.url
            .replace('{trainingPlan}', parsedArgs.trainingPlan.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\TrainingPlanController::assign
* @see app/Http/Controllers/TrainingPlanController.php:23
* @route '/training-plans/{trainingPlan}/assign'
*/
assign.post = (args: { trainingPlan: number | { id: number } } | [trainingPlan: number | { id: number } ] | number | { id: number }, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: assign.url(args, options),
    method: 'post',
})

const TrainingPlanController = { create, store, show, assign }

export default TrainingPlanController