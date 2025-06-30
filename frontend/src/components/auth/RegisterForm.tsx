'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, UserPlus, User, Mail, Lock, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

// Validation schema
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm: React.FC = () => {
  const [error, setError] = useState<string>('');
  const { register: registerUser, isLoading } = useAuth();
  const router = useRouter();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      
      // Prepare registration data
      const registrationData = {
        username: data.username,
        email: data.email,
        password: data.password,
        password_confirm: data.confirmPassword,
        first_name: data.firstName || '',
        last_name: data.lastName || '',
      };

      await registerUser(registrationData);
      
      // Redirect to dashboard on successful registration
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Registration error details:', err);
      
      // Check if it's an Axios error with validation details
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: Record<string, string[]> } };
        const validationErrors = axiosError.response?.data;
        
        if (validationErrors) {
          console.log('Validation errors:', validationErrors);
          
          // Extract field-specific errors
          const errorMessages: string[] = [];
          Object.entries(validationErrors).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            }
          });
          
          const errorMessage = errorMessages.length > 0 
            ? errorMessages.join('. ') 
            : 'Registration failed. Please check your information and try again.';
          
          setError(errorMessage);
        } else {
          setError('Registration failed. Please try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed');
      }
    }
  };

  const passwordValue = form.watch('password');
  const passwordStrength = {
    hasLength: passwordValue?.length >= 8,
    hasUpper: /[A-Z]/.test(passwordValue || ''),
    hasLower: /[a-z]/.test(passwordValue || ''),
    hasNumber: /\d/.test(passwordValue || ''),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FSFVI</h1>
                <p className="text-xs text-gray-600">Food System Vulnerability Index</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Join FSFVI</CardTitle>
            <CardDescription className="text-gray-600">
              Create your account to start analyzing food system vulnerabilities
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium text-sm">First Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text"
                            placeholder="First name"
                            disabled={isLoading}
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium text-sm">Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text"
                            placeholder="Last name"
                            disabled={isLoading}
                            className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input 
                            {...field} 
                            type="text"
                            placeholder="Choose a username"
                            disabled={isLoading}
                            className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="Enter your email"
                            disabled={isLoading}
                            className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input 
                            {...field} 
                            type="password"
                            placeholder="Create a strong password"
                            disabled={isLoading}
                            className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      {passwordValue && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-1 text-xs">
                            <CheckCircle className={`w-3 h-3 ${passwordStrength.hasLength ? 'text-green-500' : 'text-gray-300'}`} />
                            <span className={passwordStrength.hasLength ? 'text-green-600' : 'text-gray-500'}>8+ characters</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <CheckCircle className={`w-3 h-3 ${passwordStrength.hasUpper && passwordStrength.hasLower ? 'text-green-500' : 'text-gray-300'}`} />
                            <span className={passwordStrength.hasUpper && passwordStrength.hasLower ? 'text-green-600' : 'text-gray-500'}>Upper & lowercase</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <CheckCircle className={`w-3 h-3 ${passwordStrength.hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
                            <span className={passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}>At least one number</span>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input 
                            {...field} 
                            type="password"
                            placeholder="Confirm your password"
                            disabled={isLoading}
                            className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="flex flex-col space-y-6 pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Already have an account?</span>
                    </div>
                  </div>
                  
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full h-11 border-gray-200 hover:bg-gray-50">
                      Sign In Instead
                    </Button>
                  </Link>
                  
                  <div className="text-xs text-gray-500 text-center">
                    <p>By creating an account, you agree to our Terms of Service</p>
                  </div>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}; 