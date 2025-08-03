import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\HomeController::__invoke
 * @see app/Http/Controllers/HomeController.php:10
 * @route '/'
 */
const HomeController = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: HomeController.url(options),
    method: 'get',
})

HomeController.definition = {
    methods: ['get','head'],
    url: '/',
}

/**
* @see \App\Http\Controllers\HomeController::__invoke
 * @see app/Http/Controllers/HomeController.php:10
 * @route '/'
 */
HomeController.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return HomeController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\HomeController::__invoke
 * @see app/Http/Controllers/HomeController.php:10
 * @route '/'
 */
HomeController.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: HomeController.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\HomeController::__invoke
 * @see app/Http/Controllers/HomeController.php:10
 * @route '/'
 */
HomeController.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: HomeController.url(options),
    method: 'head',
})
export default HomeController