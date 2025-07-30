import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\DashboardController::index
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
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
    url: '/dashboard',
}

/**
* @see \App\Http\Controllers\DashboardController::index
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
*/
index.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\DashboardController::index
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
*/
index.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\DashboardController::index
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
*/
index.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\DashboardController::startTraining
* @see app/Http/Controllers/DashboardController.php:95
* @route '/dashboard/start-training'
*/
export const startTraining = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: startTraining.url(options),
    method: 'post',
})

startTraining.definition = {
    methods: ['post'],
    url: '/dashboard/start-training',
}

/**
* @see \App\Http\Controllers\DashboardController::startTraining
* @see app/Http/Controllers/DashboardController.php:95
* @route '/dashboard/start-training'
*/
startTraining.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return startTraining.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\DashboardController::startTraining
* @see app/Http/Controllers/DashboardController.php:95
* @route '/dashboard/start-training'
*/
startTraining.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: startTraining.url(options),
    method: 'post',
})

const DashboardController = { index, startTraining }

export default DashboardController