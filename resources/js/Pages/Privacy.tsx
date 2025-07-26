import { Head } from '@inertiajs/react';

export default function Privacy() {
  return (
    <>
      <Head title="Privacy Policy - Athletos" />
      
      <div className="bg-white">
        <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
            
            <div className="prose prose-lg text-gray-700 space-y-6">
              <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
                <p>
                  We collect information you provide directly to us, such as when you create 
                  an account, use our services, or contact us for support.
                </p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>Account information (name, email, profile details)</li>
                  <li>Training data (workouts, progress, measurements)</li>
                  <li>Usage information (how you interact with our platform)</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>Provide and improve our services</li>
                  <li>Create personalized training plans</li>
                  <li>Track your fitness progress</li>
                  <li>Communicate with you about your account</li>
                  <li>Ensure platform security</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to 
                  third parties without your consent, except as described in this policy.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
                <p>
                  We implement appropriate security measures to protect your personal 
                  information against unauthorized access, alteration, disclosure, or destruction.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and data</li>
                  <li>Export your data</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
                <p>
                  If you have questions about this Privacy Policy, please contact us 
                  through our support channels.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}