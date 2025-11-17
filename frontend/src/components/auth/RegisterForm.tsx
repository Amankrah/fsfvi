'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, User, Mail, Lock, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 to-green-100/20"></div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/20 backdrop-blur-2xl border-b border-white/30 shadow-2xl">
        <div className="bg-gradient-to-r from-white/10 via-white/5 to-white/10 backdrop-blur-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 relative p-1 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                  <Image
                    src="/logo.png"
                    alt="FSFVI Logo"
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent drop-shadow-sm">
                    FSFVI
                  </h1>
                  <p className="text-sm text-gray-700 font-medium drop-shadow-sm">Food System Financing Intelligence</p>
                </div>
              </div>
              <Link href="/">
                <Button variant="outline" size="sm" className="bg-white/30 hover:bg-white/40 border-white/40 hover:border-white/60 backdrop-blur-sm text-gray-800 shadow-lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <div className="w-full max-w-md">
          {/* Logo and Title Section */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <Image
                src="/logo.png"
                alt="FSFVI Logo"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Join FSFI</h2>
            <p className="text-gray-600">Create your account to start analyzing food system vulnerabilities</p>
          </div>

          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="p-8 space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-semibold text-sm">First Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="text"
                              placeholder="First name"
                              disabled={isLoading}
                              className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
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
                          <FormLabel className="text-gray-700 font-semibold text-sm">Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="text"
                              placeholder="Last name"
                              disabled={isLoading}
                              className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
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
                        <FormLabel className="text-gray-700 font-semibold">Username</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input 
                              {...field} 
                              type="text"
                              placeholder="Choose a username"
                              disabled={isLoading}
                              className="pl-10 h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
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
                        <FormLabel className="text-gray-700 font-semibold">Email</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input 
                              {...field} 
                              type="email"
                              placeholder="Enter your email"
                              disabled={isLoading}
                              className="pl-10 h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
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
                        <FormLabel className="text-gray-700 font-semibold">Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input 
                              {...field} 
                              type="password"
                              placeholder="Create a strong password"
                              disabled={isLoading}
                              className="pl-10 h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                        </FormControl>
                        {passwordValue && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center space-x-2 text-xs">
                              <CheckCircle className={`w-4 h-4 ${passwordStrength.hasLength ? 'text-emerald-500' : 'text-gray-300'}`} />
                              <span className={passwordStrength.hasLength ? 'text-emerald-600' : 'text-gray-500'}>8+ characters</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <CheckCircle className={`w-4 h-4 ${passwordStrength.hasUpper && passwordStrength.hasLower ? 'text-emerald-500' : 'text-gray-300'}`} />
                              <span className={passwordStrength.hasUpper && passwordStrength.hasLower ? 'text-emerald-600' : 'text-gray-500'}>Upper & lowercase</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <CheckCircle className={`w-4 h-4 ${passwordStrength.hasNumber ? 'text-emerald-500' : 'text-gray-300'}`} />
                              <span className={passwordStrength.hasNumber ? 'text-emerald-600' : 'text-gray-500'}>At least one number</span>
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
                        <FormLabel className="text-gray-700 font-semibold">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input 
                              {...field} 
                              type="password"
                              placeholder="Confirm your password"
                              disabled={isLoading}
                              className="pl-10 h-11 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </CardContent>

                <CardFooter className="px-8 pb-8">
                  <div className="w-full text-center space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">Already have an account?</span>
                      </div>
                    </div>
                    
                    <Link href="/auth/login" className="block">
                      <Button variant="outline" className="w-full h-12 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                        Sign In Instead
                      </Button>
                    </Link>
                    
                    <div className="text-xs text-gray-500 text-center">
                      <p>🔒 By creating an account, you agree to our Terms of Service</p>
                    </div>
                  </div>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}; 