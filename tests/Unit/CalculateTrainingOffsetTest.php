<?php

namespace Tests\Unit;

use App\Actions\CalculateTrainingOffset;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class CalculateTrainingOffsetTest extends TestCase
{
    private CalculateTrainingOffset $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = new CalculateTrainingOffset();
    }

    public function test_parse_offset_string_with_weeks()
    {
        $this->assertEquals(1, $this->action->parseOffsetString('1w'));
        $this->assertEquals(2, $this->action->parseOffsetString('2w'));
        $this->assertEquals(3, $this->action->parseOffsetString('3w'));
        $this->assertEquals(4, $this->action->parseOffsetString('4w'));
    }

    public function test_parse_offset_string_with_week_words()
    {
        $this->assertEquals(1, $this->action->parseOffsetString('1week'));
        $this->assertEquals(2, $this->action->parseOffsetString('2weeks'));
        $this->assertEquals(3, $this->action->parseOffsetString('3week'));
    }

    public function test_parse_offset_string_with_days()
    {
        $this->assertEquals(1, $this->action->parseOffsetString('7d'));
        $this->assertEquals(2, $this->action->parseOffsetString('14d'));
        $this->assertEquals(1, $this->action->parseOffsetString('7day'));
        $this->assertEquals(2, $this->action->parseOffsetString('14days'));
    }

    public function test_parse_invalid_offset_strings()
    {
        $this->assertNull($this->action->parseOffsetString('invalid'));
        $this->assertNull($this->action->parseOffsetString('5d')); // Not divisible by 7
        $this->assertNull($this->action->parseOffsetString('0w'));
        $this->assertNull($this->action->parseOffsetString('-1w'));
    }

    public function test_should_train_on_date_with_no_offset()
    {
        $startDate = Carbon::parse('2024-01-01');
        $date = Carbon::parse('2024-01-08'); // Week 1
        
        $this->assertTrue($this->action->shouldTrainOnDate(null, $date, $startDate));
    }

    public function test_should_train_on_date_with_2w_offset()
    {
        $startDate = Carbon::parse('2024-01-01');
        
        // Week 0 (start week) - should train
        $this->assertTrue($this->action->shouldTrainOnDate('2w', $startDate, $startDate));
        
        // Week 1 - should not train
        $week1 = Carbon::parse('2024-01-08');
        $this->assertFalse($this->action->shouldTrainOnDate('2w', $week1, $startDate));
        
        // Week 2 - should train
        $week2 = Carbon::parse('2024-01-15');
        $this->assertTrue($this->action->shouldTrainOnDate('2w', $week2, $startDate));
        
        // Week 3 - should not train
        $week3 = Carbon::parse('2024-01-22');
        $this->assertFalse($this->action->shouldTrainOnDate('2w', $week3, $startDate));
        
        // Week 4 - should train
        $week4 = Carbon::parse('2024-01-29');
        $this->assertTrue($this->action->shouldTrainOnDate('2w', $week4, $startDate));
    }

    public function test_should_train_on_date_with_3w_offset()
    {
        $startDate = Carbon::parse('2024-01-01');
        
        // Week 0 (start week) - should train
        $this->assertTrue($this->action->shouldTrainOnDate('3w', $startDate, $startDate));
        
        // Week 1 - should not train
        $week1 = Carbon::parse('2024-01-08');
        $this->assertFalse($this->action->shouldTrainOnDate('3w', $week1, $startDate));
        
        // Week 2 - should not train
        $week2 = Carbon::parse('2024-01-15');
        $this->assertFalse($this->action->shouldTrainOnDate('3w', $week2, $startDate));
        
        // Week 3 - should train
        $week3 = Carbon::parse('2024-01-22');
        $this->assertTrue($this->action->shouldTrainOnDate('3w', $week3, $startDate));
    }

    public function test_get_offset_description()
    {
        $this->assertEquals('Every week', $this->action->getOffsetDescription(null));
        $this->assertEquals('Every week', $this->action->getOffsetDescription('1w'));
        $this->assertEquals('Every other week (1 week on, 1 week off)', $this->action->getOffsetDescription('2w'));
        $this->assertEquals('Every 3 weeks', $this->action->getOffsetDescription('3w'));
        $this->assertEquals('Every 4 weeks', $this->action->getOffsetDescription('4w'));
        $this->assertEquals('Invalid offset', $this->action->getOffsetDescription('invalid'));
    }

    public function test_get_next_training_week()
    {
        $startDate = Carbon::parse('2024-01-01');
        $currentDate = Carbon::parse('2024-01-08'); // Week 1
        
        // With 2w offset, next training week should be Week 2
        $nextWeek = $this->action->getNextTrainingWeek('2w', $currentDate, $startDate);
        $this->assertEquals('2024-01-15', $nextWeek->format('Y-m-d'));
        
        // With no offset, next training week should be next week
        $nextWeek = $this->action->getNextTrainingWeek(null, $currentDate, $startDate);
        $this->assertEquals('2024-01-15', $nextWeek->format('Y-m-d'));
    }

    public function test_get_previous_training_week()
    {
        $startDate = Carbon::parse('2024-01-01');
        $currentDate = Carbon::parse('2024-01-08'); // Week 1
        
        // With 2w offset, previous training week should be Week 0
        $prevWeek = $this->action->getPreviousTrainingWeek('2w', $currentDate, $startDate);
        $this->assertEquals('2024-01-01', $prevWeek->format('Y-m-d'));
        
        // With no offset, previous training week should be last week
        $prevWeek = $this->action->getPreviousTrainingWeek(null, $currentDate, $startDate);
        $this->assertEquals('2024-01-01', $prevWeek->format('Y-m-d'));
    }
} 