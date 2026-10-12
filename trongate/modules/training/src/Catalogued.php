<?php
/**
 * Everything in the program catalogue can describe itself (D-03).
 *
 * The first of the engine's traits to be ported. `Program` and `Prescriptive`
 * follow with the enrollments slice, which is the first consumer of `start()`,
 * `session()` and `advance()`.
 */
interface Catalogued {

    public function meta(): Program_meta;
}
