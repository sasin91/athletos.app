import { Head } from '@inertiajs/react';
import AppLayout from '@/components/Layout/AppLayout';
import Dashboard from '@/components/Dashboard';

interface DashboardPageProps {
  athlete: any;
  metrics: any;
  weightProgressions: any;
  plannedExercises: any[];
  oneRepMaxes: any;
  recoveryExercises: any[];
  date: string;
  formattedDate: string;
}

export default function DashboardPage(props: DashboardPageProps) {
  return (
    <AppLayout>
      <Head title="Dashboard" />
      <Dashboard {...props} />
    </AppLayout>
  );
}