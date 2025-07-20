# TrainingPlan Refactor - Files to Update

## Summary
The TrainingPlan Eloquent model has been removed and replaced with a Driver/Manager pattern. All references to `training_plan_id` foreign keys need to be updated to use `plan_type` strings.

## Files that need updates:

### 1. Database Migrations (Already handled)
- ✅ `2025_07_18_162607_add_plan_type_to_training_phases_table.php`
- ✅ `2025_07_18_162757_drop_training_plans_table.php`
- ✅ `2025_07_18_162912_update_athlete_training_plan_references.php`
- ✅ `2025_07_18_162921_update_training_plan_references.php`

### 2. Models (Already handled)
- ✅ `app/Models/TrainingPhase.php` - Updated to use `plan_type`
- ✅ `app/Models/Athlete.php` - Updated to use `current_plan_type`
- ✅ `app/Models/Training.php` - Updated to use `plan_type`

### 3. Factories (Need to remove/update)
- ❌ `database/factories/TrainingPlanFactory.php` - DELETE FILE
- ❌ `database/factories/TrainingFactory.php` - Remove training_plan_id, add plan_type
- ❌ `database/factories/AthleteFactory.php` - Remove current_plan_id reference
- ❌ `database/factories/UserFactory.php` - Remove TrainingPlan references
- ❌ `database/factories/TrainingPhaseFactory.php` - Remove training_plan_id, add plan_type

### 4. Controllers (Need to update)
- ❌ `app/Http/Controllers/TrainingController.php` - Update validation and assignment
- ❌ `app/Http/Controllers/TrainingPlanController.php` - Remove references
- ❌ `app/Http/Controllers/TrainingPlanChatController.php` - Remove references
- ❌ `app/Http/Controllers/OnboardingController.php` - Update to use driver system

### 5. Actions (Need to update)
- ❌ `app/Actions/ComputePlannedTrainings.php` - Update to use plan_type

### 6. Livewire Components (Need to update)
- ❌ `app/Livewire/TrainingPlanChat.php` - Update to use driver system

### 7. Tests (Need to update - many files)
- ❌ All test files that use `TrainingPlan::factory()` need to be updated
- ❌ All test files that reference `training_plan_id` need to use `plan_type`

### 8. Database Seeder (Need to update)
- ❌ `database/seeders/DatabaseSeeder.php` - Remove TrainingPlan references

## Migration Strategy:
1. Run the migrations to update database schema
2. Remove/update factories
3. Update controllers to use driver system
4. Update actions and livewire components
5. Update all tests to use new system
6. Run tests to verify everything works