<?php

use App\Actions\CalculateTrainingOffset;
use Carbon\Carbon;

beforeEach(function () {
    $this->action = new CalculateTrainingOffset();
});

it('parses offset string with weeks', function () {
    expect($this->action->parseOffsetString('1w'))->toBe(1);
    expect($this->action->parseOffsetString('2w'))->toBe(2);
    expect($this->action->parseOffsetString('3w'))->toBe(3);
    expect($this->action->parseOffsetString('4w'))->toBe(4);
});

it('parses offset string with week words', function () {
    expect($this->action->parseOffsetString('1week'))->toBe(1);
    expect($this->action->parseOffsetString('2weeks'))->toBe(2);
    expect($this->action->parseOffsetString('3week'))->toBe(3);
});

it('parses offset string with days', function () {
    expect($this->action->parseOffsetString('7d'))->toBe(1);
    expect($this->action->parseOffsetString('14d'))->toBe(2);
    expect($this->action->parseOffsetString('7day'))->toBe(1);
    expect($this->action->parseOffsetString('14days'))->toBe(2);
});

it('parses invalid offset strings', function () {
    expect($this->action->parseOffsetString('invalid'))->toBeNull();
    expect($this->action->parseOffsetString('5d'))->toBeNull(); // Not divisible by 7
    expect($this->action->parseOffsetString('0w'))->toBeNull();
    expect($this->action->parseOffsetString('-1w'))->toBeNull();
});

it('should train on date with no offset', function () {
    $startDate = Carbon::parse('2024-01-01');
    $date = Carbon::parse('2024-01-08'); // Week 1
    
    expect($this->action->shouldTrainOnDate(null, $date, $startDate))->toBeTrue();
});

it('should train on date with 2w offset', function () {
    $startDate = Carbon::parse('2024-01-01');
    
    // Week 0 (start week) - should train
    expect($this->action->shouldTrainOnDate('2w', $startDate, $startDate))->toBeTrue();
    
    // Week 1 - should not train
    $week1 = Carbon::parse('2024-01-08');
    expect($this->action->shouldTrainOnDate('2w', $week1, $startDate))->toBeFalse();
    
    // Week 2 - should train
    $week2 = Carbon::parse('2024-01-15');
    expect($this->action->shouldTrainOnDate('2w', $week2, $startDate))->toBeTrue();
    
    // Week 3 - should not train
    $week3 = Carbon::parse('2024-01-22');
    expect($this->action->shouldTrainOnDate('2w', $week3, $startDate))->toBeFalse();
    
    // Week 4 - should train
    $week4 = Carbon::parse('2024-01-29');
    expect($this->action->shouldTrainOnDate('2w', $week4, $startDate))->toBeTrue();
});

it('should train on date with 3w offset', function () {
    $startDate = Carbon::parse('2024-01-01');
    
    // Week 0 (start week) - should train
    expect($this->action->shouldTrainOnDate('3w', $startDate, $startDate))->toBeTrue();
    
    // Week 1 - should not train
    $week1 = Carbon::parse('2024-01-08');
    expect($this->action->shouldTrainOnDate('3w', $week1, $startDate))->toBeFalse();
    
    // Week 2 - should not train
    $week2 = Carbon::parse('2024-01-15');
    expect($this->action->shouldTrainOnDate('3w', $week2, $startDate))->toBeFalse();
    
    // Week 3 - should train
    $week3 = Carbon::parse('2024-01-22');
    expect($this->action->shouldTrainOnDate('3w', $week3, $startDate))->toBeTrue();
});

it('gets offset description', function () {
    expect($this->action->getOffsetDescription(null))->toBe('Every week');
    expect($this->action->getOffsetDescription('1w'))->toBe('Every week');
    expect($this->action->getOffsetDescription('2w'))->toBe('Every other week (1 week on, 1 week off)');
    expect($this->action->getOffsetDescription('3w'))->toBe('Every 3 weeks');
    expect($this->action->getOffsetDescription('4w'))->toBe('Every 4 weeks');
    expect($this->action->getOffsetDescription('invalid'))->toBe('Invalid offset');
});

it('gets next training week', function () {
    $startDate = Carbon::parse('2024-01-01');
    $currentDate = Carbon::parse('2024-01-08'); // Week 1
    
    // With 2w offset, next training week should be Week 2
    $nextWeek = $this->action->getNextTrainingWeek('2w', $currentDate, $startDate);
    expect($nextWeek->format('Y-m-d'))->toBe('2024-01-15');
    
    // With no offset, next training week should be next week
    $nextWeek = $this->action->getNextTrainingWeek(null, $currentDate, $startDate);
    expect($nextWeek->format('Y-m-d'))->toBe('2024-01-15');
});

it('gets previous training week', function () {
    $startDate = Carbon::parse('2024-01-01');
    $currentDate = Carbon::parse('2024-01-08'); // Week 1
    
    // With 2w offset, previous training week should be Week 0
    $prevWeek = $this->action->getPreviousTrainingWeek('2w', $currentDate, $startDate);
    expect($prevWeek->format('Y-m-d'))->toBe('2024-01-01');
    
    // With no offset, previous training week should be last week
    $prevWeek = $this->action->getPreviousTrainingWeek(null, $currentDate, $startDate);
    expect($prevWeek->format('Y-m-d'))->toBe('2024-01-01');
}); 