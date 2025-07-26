import { Head, Link } from '@inertiajs/react';

export default function About() {
  return (
    <>
      <Head title="About Athletos" />
      
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
                About Athletos
              </h1>
              <p className="mt-4 text-xl text-gray-600">
                Your AI-powered training companion
              </p>
            </div>
            
            <div className="mt-12 prose prose-lg mx-auto text-gray-700">
              <p>
                Athletos is an innovative fitness platform that combines artificial intelligence 
                with proven training methodologies to deliver personalized workout experiences 
                tailored to your unique goals, preferences, and progress.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Mission</h2>
              <p>
                We believe that everyone deserves access to expert-level training guidance. 
                Our AI-powered platform democratizes personal training by providing intelligent, 
                adaptive workout plans that evolve with your fitness journey.
              </p>
              
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Key Features</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Personalized training plans that adapt to your progress</li>
                <li>Real-time form analysis and correction</li>
                <li>24/7 AI coaching support</li>
                <li>Comprehensive progress tracking</li>
                <li>Evidence-based exercise programming</li>
              </ul>
              
              <div className="mt-12 text-center">
                <Link
                  href="/register"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Start Your Journey
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}