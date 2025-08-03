import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Settings\AthleteProfileController::edit
 * @see app/Http/Controllers/Settings/AthleteProfileController.php:21
 * @route '/settings/athlete-profile'
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
    url: '/settings/athlete-profile',
}

/**
* @see \App\Http\Controllers\Settings\AthleteProfileController::edit
 * @see app/Http/Controllers/Settings/AthleteProfileController.php:21
 * @route '/settings/athlete-profile'
 */
edit.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return edit.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Settings\AthleteProfileController::edit
 * @see app/Http/Controllers/Settings/AthleteProfileController.php:21
 * @route '/settings/athlete-profile'
 */
edit.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: edit.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Settings\AthleteProfileController::edit
 * @see app/Http/Controllers/Settings/AthleteProfileController.php:21
 * @route '/settings/athlete-profile'
 */
edit.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: edit.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Settings\AthleteProfileController::update
 * @see app/Http/Controllers/Settings/AthleteProfileController.php:59
 * @route '/settings/athlete-profile'
 */
export const update = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'put',
} => ({
    url: update.url(options),
    method: 'put',
})

update.definition = {
    methods: ['put'],
    url: '/settings/athlete-profile',
}

/**
* @see \App\Http\Controllers\Settings\AthleteProfileController::update
 * @see app/Http/Controllers/Settings/AthleteProfileController.php:59
 * @route '/settings/athlete-profile'
 */
update.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return update.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Settings\AthleteProfileController::update
 * @see app/Http/Controllers/Settings/AthleteProfileController.php:59
 * @route '/settings/athlete-profile'
 */
update.put = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'put',
} => ({
    url: update.url(options),
    method: 'put',
})
const athleteProfile = {
    edit,
update,
}

export default athleteProfile