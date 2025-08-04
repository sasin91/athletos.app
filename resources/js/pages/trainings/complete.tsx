import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Zap } from 'lucide-react';
import { dashboard } from '@/routes';
import trainings from '@/routes/trainings';

interface Training {
    id: number;
    name: string;
    duration: number;
    completed_at: string;
    exercises: Array<{
        id: number;
        name: string;
        sets: number;
        reps: number;
        weight?: number;
    }>;
}

interface RecoveryExercise {
    id: number;
    name: string;
    description: string;
    duration: number;
    type: string;
}

export default function TrainingComplete({ 
    training, 
    recoveryExercises 
}: { 
    training: Training;
    recoveryExercises: RecoveryExercise[];
}) {
    return (
        <AppLayout>
            <Head title="Training Complete" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    {/* Completion Header */}
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-bold">Training Complete!</h1>
                        <p className="text-muted-foreground">
                            Great job finishing your workout. Here's a summary of what you accomplished.
                        </p>
                    </div>

                    {/* Training Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                {training.name}
                            </CardTitle>
                            <CardDescription>
                                Completed on {new Date(training.completed_at).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                Duration: {training.duration} minutes
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium">Exercises Completed:</h4>
                                <div className="grid gap-3">
                                    {training.exercises.map((exercise) => (
                                        <div key={exercise.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <span className="font-medium">{exercise.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                    {exercise.sets} sets × {exercise.reps} reps
                                                </Badge>
                                                {exercise.weight && (
                                                    <Badge variant="outline">
                                                        {exercise.weight} lbs
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recovery Exercises */}
                    {recoveryExercises.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5" />
                                    Recommended Recovery
                                </CardTitle>
                                <CardDescription>
                                    Help your body recover with these suggested exercises
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    {recoveryExercises.map((exercise) => (
                                        <div key={exercise.id} className="p-4 border rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">{exercise.name}</h4>
                                                <Badge variant="secondary">{exercise.type}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {exercise.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                {exercise.duration} minutes
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 justify-center">
                        <Button onClick={() => window.location.href = dashboard.url()}>
                            Back to Dashboard
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={() => window.location.href = trainings.index.url()}
                        >
                            View All Trainings
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}