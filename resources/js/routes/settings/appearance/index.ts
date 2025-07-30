import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Settings\AppearanceController::edit
* @see app/Http/Controllers/Settings/AppearanceController.php:12
* @route '/settings/appearance'
*/
export const edit = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: edit.url(options),
    method: 'get',
})

edit.definition = {
    methods: ['get','head'],
    url: '/settings/appearance',
}

/**
* @see \App\Http\Controllers\Settings\AppearanceController::edit
* @see app/Http/Controllers/Settings/AppearanceController.php:12
* @route '/settings/appearance'
*/
edit.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return edit.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Settings\AppearanceController::edit
* @see app/Http/Controllers/Settings/AppearanceController.php:12
* @route '/settings/appearance'
*/
edit.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: edit.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Settings\AppearanceController::edit
* @see app/Http/Controllers/Settings/AppearanceController.php:12
* @route '/settings/appearance'
*/
edit.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: edit.url(options),
    method: 'head',
})

const appearance = {
    edit,
}

export default appearance