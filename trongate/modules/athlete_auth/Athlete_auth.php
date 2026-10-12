<?php
/**
 * Turns a bearer token into an authenticated athlete.
 *
 * The api module's configured authenticator: it runs for every operation
 * with a `required_user_level`, so a handler cannot forget to authenticate.
 * A port of the Rust API's `AuthenticatedAthlete` extractor.
 *
 * Everything here produces 401 and nothing produces 403. A missing, malformed,
 * expired or forged token means "we do not know who you are"; 403 means "we
 * know exactly who you are and you may not do this", which only a handler
 * applying an ownership rule can decide.
 */
class Athlete_auth extends Trongate {

    /** The only kind of account that exists (CONTEXT.md). */
    public const LEVEL_ATHLETE = 'athlete';

    /**
     * Authenticator entry point. Not reachable by URL: the leading underscore
     * keeps Trongate from routing to it, and the api interceptor answers
     * every request before Trongate could try.
     */
    public function _authenticate(int|string $level): ?Authenticated_athlete {
        if ($level !== self::LEVEL_ATHLETE) {
            // A typo in an attribute must not quietly make an endpoint public
            // or quietly lock everybody out; it is a programming error.
            throw new LogicException("unknown user level {$level}");
        }

        $token = Api_request::bearer_token();
        if ($token === null) {
            return null;
        }

        $claims = self::verifier()->verify($token, time());
        if ($claims === null) {
            return null;
        }

        return $this->model->athlete_if_active($claims['sub'], $claims['jti'])
            ? new Authenticated_athlete($claims['sub'])
            : null;
    }

    private static function verifier(): Access_token_verifier {
        static $verifier = null;
        if ($verifier === null) {
            $config = [];
            require APPPATH . 'config/auth.php';
            $verifier = Access_token_verifier::from_config($config['auth']);
        }
        return $verifier;
    }
}
