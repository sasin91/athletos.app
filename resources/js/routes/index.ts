import { queryParams, type QueryParams } from './../wayfinder'
/**
* @see \App\Http\Controllers\HomeController::home
* @see app/Http/Controllers/HomeController.php:10
* @route '/'
*/
export const home = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: home.url(options),
    method: 'get',
})

home.definition = {
    methods: ['get','head'],
    url: '/',
}

/**
* @see \App\Http\Controllers\HomeController::home
* @see app/Http/Controllers/HomeController.php:10
* @route '/'
*/
home.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return home.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\HomeController::home
* @see app/Http/Controllers/HomeController.php:10
* @route '/'
*/
home.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: home.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\HomeController::home
* @see app/Http/Controllers/HomeController.php:10
* @route '/'
*/
home.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: home.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\DashboardController::dashboard
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
*/
export const dashboard = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: dashboard.url(options),
    method: 'get',
})

dashboard.definition = {
    methods: ['get','head'],
    url: '/dashboard',
}

/**
* @see \App\Http\Controllers\DashboardController::dashboard
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
*/
dashboard.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return dashboard.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\DashboardController::dashboard
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
*/
dashboard.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: dashboard.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\DashboardController::dashboard
* @see app/Http/Controllers/DashboardController.php:34
* @route '/dashboard'
*/
dashboard.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: dashboard.url(options),
    method: 'head',
})

/**
* @see routes/web.php:75
* @route '/terms'
*/
export const terms = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: terms.url(options),
    method: 'get',
})

terms.definition = {
    methods: ['get','head'],
    url: '/terms',
}

/**
* @see routes/web.php:75
* @route '/terms'
*/
terms.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return terms.definition.url + queryParams(options)
}

/**
* @see routes/web.php:75
* @route '/terms'
*/
terms.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: terms.url(options),
    method: 'get',
})

/**
* @see routes/web.php:75
* @route '/terms'
*/
terms.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: terms.url(options),
    method: 'head',
})

/**
* @see routes/web.php:76
* @route '/privacy'
*/
export const privacy = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: privacy.url(options),
    method: 'get',
})

privacy.definition = {
    methods: ['get','head'],
    url: '/privacy',
}

/**
* @see routes/web.php:76
* @route '/privacy'
*/
privacy.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return privacy.definition.url + queryParams(options)
}

/**
* @see routes/web.php:76
* @route '/privacy'
*/
privacy.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: privacy.url(options),
    method: 'get',
})

/**
* @see routes/web.php:76
* @route '/privacy'
*/
privacy.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: privacy.url(options),
    method: 'head',
})

/**
* @see routes/web.php:77
* @route '/about'
*/
export const about = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: about.url(options),
    method: 'get',
})

about.definition = {
    methods: ['get','head'],
    url: '/about',
}

/**
* @see routes/web.php:77
* @route '/about'
*/
about.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return about.definition.url + queryParams(options)
}

/**
* @see routes/web.php:77
* @route '/about'
*/
about.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: about.url(options),
    method: 'get',
})

/**
* @see routes/web.php:77
* @route '/about'
*/
about.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: about.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Auth\RegistrationController::register
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
*/
export const register = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: register.url(options),
    method: 'get',
})

register.definition = {
    methods: ['get','head'],
    url: '/register',
}

/**
* @see \App\Http\Controllers\Auth\RegistrationController::register
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
*/
register.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return register.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\RegistrationController::register
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
*/
register.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: register.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Auth\RegistrationController::register
* @see app/Http/Controllers/Auth/RegistrationController.php:19
* @route '/register'
*/
register.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: register.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Auth\LoginController::login
* @see app/Http/Controllers/Auth/LoginController.php:20
* @route '/login'
*/
export const login = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: login.url(options),
    method: 'get',
})

login.definition = {
    methods: ['get','head'],
    url: '/login',
}

/**
* @see \App\Http\Controllers\Auth\LoginController::login
* @see app/Http/Controllers/Auth/LoginController.php:20
* @route '/login'
*/
login.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return login.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\LoginController::login
* @see app/Http/Controllers/Auth/LoginController.php:20
* @route '/login'
*/
login.get = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: login.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Auth\LoginController::login
* @see app/Http/Controllers/Auth/LoginController.php:20
* @route '/login'
*/
login.head = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: login.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Auth\LoginController::logout
* @see app/Http/Controllers/Auth/LoginController.php:52
* @route '/logout'
*/
export const logout = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: logout.url(options),
    method: 'post',
})

logout.definition = {
    methods: ['post'],
    url: '/logout',
}

/**
* @see \App\Http\Controllers\Auth\LoginController::logout
* @see app/Http/Controllers/Auth/LoginController.php:52
* @route '/logout'
*/
logout.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return logout.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Auth\LoginController::logout
* @see app/Http/Controllers/Auth/LoginController.php:52
* @route '/logout'
*/
logout.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: logout.url(options),
    method: 'post',
})

