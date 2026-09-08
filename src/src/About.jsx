function About() {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          About TradeFlow
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Wholesale Billing & Business Management
        </p>
      </div>

      {/* Brand Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-7">
          <div className="flex items-center gap-4">
            {/* TradeFlow Logo */}
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-2xl font-bold">
                T
              </span>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                TradeFlow
              </h2>

              <p className="text-sm text-gray-500 mt-0.5">
                Wholesale Billing & Business Management
              </p>

              <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">
                Version 1.0.0
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-7 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              About the Software
            </p>

            <p className="text-sm text-gray-500 leading-relaxed">
              TradeFlow is an offline-first wholesale billing and
              business management software designed to simplify
              billing, inventory, customer management, payments,
              reporting and everyday business operations.
            </p>
          </div>

          {/* Features */}
          <div className="mt-7">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Key Features
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="text-blue-600 font-semibold">✓</span>
                Billing & Invoices
              </div>

              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="text-blue-600 font-semibold">✓</span>
                Stock Management
              </div>

              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="text-blue-600 font-semibold">✓</span>
                Customer Management
              </div>

              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="text-blue-600 font-semibold">✓</span>
                Payments & Credit
              </div>

              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="text-blue-600 font-semibold">✓</span>
                Reports & Statements
              </div>

              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="text-blue-600 font-semibold">✓</span>
                Backup & Restore
              </div>
            </div>
          </div>
        </div>

        {/* Developer / Support */}
        <div className="bg-gray-50 border-t border-gray-100 px-7 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">
                Developed by
              </p>

              <p className="text-sm font-medium text-gray-700">
                Mallikarjun S. Asapure
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Support
              </p>

              <p className="text-sm font-medium text-gray-700">
                +91 95796 88201
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* License Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          License Information
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-gray-400 mb-1">
              License
            </p>

            <p className="text-sm font-medium text-gray-700">
              Licensed Software
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">
              Data Storage
            </p>

            <p className="text-sm font-medium text-gray-700">
              Local & Offline
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            © 2026 TradeFlow. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;
