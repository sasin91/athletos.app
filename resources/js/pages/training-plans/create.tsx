import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormEventHandler } from 'react';
import trainingPlans from '@/routes/training-plans';

export default function CreateTrainingPlan() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        duration_weeks: '',
        difficulty_level: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(trainingPlans.store.url());
    };

    return (
        <AppLayout>
            <Head title="Create Training Plan" />

            <div className="py-12">
                <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create New Training Plan</CardTitle>
                            <CardDescription>
                                Design a custom training plan for your fitness goals.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Plan Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Enter plan name"
                                        autoFocus
                                    />
                                    {errors.name && <div className="text-sm text-red-600">{errors.name}</div>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Describe the training plan"
                                        rows={4}
                                    />
                                    {errors.description && <div className="text-sm text-red-600">{errors.description}</div>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="duration_weeks">Duration (weeks)</Label>
                                        <Input
                                            id="duration_weeks"
                                            name="duration_weeks"
                                            type="number"
                                            value={data.duration_weeks}
                                            onChange={(e) => setData('duration_weeks', e.target.value)}
                                            placeholder="12"
                                            min="1"
                                            max="52"
                                        />
                                        {errors.duration_weeks && <div className="text-sm text-red-600">{errors.duration_weeks}</div>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="difficulty_level">Difficulty Level</Label>
                                        <select
                                            id="difficulty_level"
                                            name="difficulty_level"
                                            value={data.difficulty_level}
                                            onChange={(e) => setData('difficulty_level', e.target.value)}
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            <option value="">Select difficulty</option>
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                        {errors.difficulty_level && <div className="text-sm text-red-600">{errors.difficulty_level}</div>}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Button type="submit" disabled={processing}>
                                        Create Training Plan
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => window.history.back()}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}