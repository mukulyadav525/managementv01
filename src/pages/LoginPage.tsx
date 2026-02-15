import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button, Input } from '@/components/common';
import { getDashboardPath } from '@/utils/roleUtils';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(formData.email, formData.password);

      // Get the current user from store after sign in
      // Since signIn now awaits the profile fetch, this should be populated
      const currentUser = useAuthStore.getState().user;

      if (currentUser) {
        toast.success(`Login successful! Welcome back, ${currentUser.name || 'User'}`);
        const dashboardPath = getDashboardPath(currentUser.role);
        navigate(dashboardPath);
      } else {
        console.warn('LoginPage: No user profile found after sign in');
        toast.error('Login successful, but profile not found. Please contact support.');
        // Don't navigate to /dashboard because DashboardRedirect will just send them back or to tenant
        // Stay on login or redirect to a help page
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
            <Building2 className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Society Manager</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <Button
            type="button"
            variant="secondary"
            className="w-full mb-6 flex items-center justify-center gap-2"
            onClick={() => signInWithGoogle()}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Sign in with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Made with ❤️ by{' '}
            <a
              href="https://www.linkedin.com/in/mukulyadav525"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 font-medium hover:underline"
            >
              Mukul
            </a>{' '}
            and{' '}
            <a
              href="https://www.linkedin.com/in/priya-kyal-44bb69313"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 font-medium hover:underline"
            >
              Priya
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © {new Date().getFullYear()} Society Manager. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
