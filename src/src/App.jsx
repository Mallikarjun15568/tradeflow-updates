import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  Warehouse,
  BarChart3,
  Settings as SettingsIcon,
  Info,
} from 'lucide-react';
import Products from './Products';
import Customers from './Customers';
import Billing from './Billing';
import Invoice from './Invoice';
import Stock from './Stock';
import Settings from './Settings';
import Dashboard from './Dashboard';
import CustomerDetails from './CustomerDetails';
import Reports from './Reports';
import Activation from './Activation';
import About from './About';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'stock', label: 'Stock', icon: Warehouse },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'about', label: 'About', icon: Info },
];

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);
  const activeItem = menuItems.find((item) => item.id === activeSection);
  const [viewingCustomerId, setViewingCustomerId] = useState(null);
  const [isActivated, setIsActivated] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(true);

  useEffect(() => {
    const savedLicense = localStorage.getItem('tradeflow_license');

    if (savedLicense) {
      setIsActivated(true);
    }

    setCheckingLicense(false);
  }, []);

  if (checkingLicense) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading TradeFlow...
        </div>
      </div>
    );
  }

  if (!isActivated) {
    return (
      <Activation
        onActivated={() => setIsActivated(true)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-gray-200">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                T
          </div>

<div>
  <div className="text-gray-800 font-semibold leading-tight">
    TradeFlow
  </div>
  <div className="text-xs text-gray-400 leading-tight">
    Business Management
  </div>
</div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-gray-200 text-xs text-gray-400">
          TradeFlow v1.0.0
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-base font-semibold text-gray-800">{activeItem.label}</h1>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
              M
            </div>
          </div>
        </header>

        {/* Page content */}
<main className="flex-1 overflow-y-auto p-8">
         {viewingInvoiceId ? (
  <Invoice
    invoiceId={viewingInvoiceId}
    onBack={() => setViewingInvoiceId(null)}
  />
) : viewingCustomerId ? (
  <CustomerDetails
    customerId={viewingCustomerId}
    onBack={() => setViewingCustomerId(null)}
  />
) :
 activeSection === 'dashboard' ? (
  <Dashboard />
) : activeSection === 'products' ? (
  <Products />
) : activeSection === 'customers' ? (
  <Customers 
  onViewCustomer={(id) => setViewingCustomerId(id)}
  />
) : activeSection === 'billing' ? (
  <Billing
    onInvoiceCreated={(id) => setViewingInvoiceId(id)}
    onViewInvoice={(id) => setViewingInvoiceId(id)}
  />
) : activeSection === 'stock' ? (
  <Stock />
) : activeSection === 'settings' ? (
  <Settings />
) : activeSection === 'reports' ? (
  <Reports />
) : activeSection === 'about' ? (
 <About />
) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
