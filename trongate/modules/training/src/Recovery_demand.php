<?php
/**
 * How much the program costs to recover from.
 *
 * The axis D-01 cares about most. Deliberately three coarse steps: it is a
 * warning, not a measurement.
 */
enum Recovery_demand: string {
    case Moderate = 'moderate';
    case High = 'high';
    /** Will interfere with the rest of your training and the rest of your week. */
    case Brutal = 'brutal';
}
