import { Head } from '@inertiajs/react';

export default function Terms() {
  return (
    <>
      <Head title="Terms of Service - Athletos" />
      
      <div className="bg-white">
        <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
            
            <div className="prose prose-lg text-gray-700 space-y-6">
              <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Athletos, you accept and agree to be bound by the terms 
                  and provision of this agreement.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use License</h2>
                <p>
                  Permission is granted to temporarily use Athletos for personal, 
                  non-commercial transitory viewing only. This is the grant of a license, 
                  not a transfer of title.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Health and Safety</h2>
                <p>
                  Athletos provides fitness guidance and training plans. Always consult with 
                  a healthcare professional before beginning any exercise program. Use of our 
                  platform is at your own risk.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Privacy</h2>
                <p>
                  Your privacy is important to us. Please review our Privacy Policy, 
                  which also governs your use of the platform.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Modifications</h2>
                <p>
                  Athletos may revise these terms of service at any time without notice. 
                  By using this platform, you are agreeing to be bound by the then current 
                  version of these terms of service.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Information</h2>
                <p>
                  If you have any questions about these Terms of Service, please contact us 
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