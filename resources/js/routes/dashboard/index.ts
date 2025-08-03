import { queryParams, type QueryParams } from './../../wayfinder'
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
const dashboard = {
    startTraining,
}

export default dashboard