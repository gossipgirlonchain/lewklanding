import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function App() {
  const [isSignedUp, setIsSignedUp] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await fetch('/api/signups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Something went wrong');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSignedUp(true);
      reset();
      queryClient.invalidateQueries({ queryKey: ['signupCount'] });
    },
  });

  const { data: signupData } = useQuery({
    queryKey: ['signupCount'],
    queryFn: async () => {
      const response = await fetch('/api/signups');
      if (!response.ok) {
        throw new Error('Failed to fetch signup count');
      }
      return response.json();
    },
  });

  const onSubmit = (data: { email: string }) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
        <img 
          src="/lewklogowhie.png" 
          alt="LEWK" 
          className="h-8 w-auto md:h-10"
        />
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-8 lg:px-12 pt-20 md:pt-24">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16 lg:mb-20">
          <img 
            src="/header-text.svg" 
            alt="Header Text" 
            className="mx-auto max-w-4xl w-full h-auto"
            style={{
              imageRendering: 'high-quality',
              imageRendering: '-webkit-optimize-contrast',
              imageRendering: 'crisp-edges'
            }}
          />
        </div>

        {/* Signup Section */}
        <div className="max-w-md mx-auto">
          {!isSignedUp ? (
            <div className="bg-gray-900 rounded-2xl p-4 md:p-6">
              <h2 className="text-2xl md:text-3xl font-sans mb-6 text-center">
                Sign up to <span style={{color: '#FF53B9'}}>CLOCK IT</span> first
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <input
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Please enter a valid email address'
                      }
                    })}
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 md:py-5 rounded-xl bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:border-pink-500 focus:outline-none font-jaoren"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-2 font-jaoren">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={signupMutation.isPending}
                  className="w-full py-3 md:py-4 rounded-xl text-white font-sans font-semibold transition-colors"
                  style={{backgroundColor: '#FF53B9'}}
                >
                  {signupMutation.isPending ? 'Signing up...' : 'GET EARLY ACCESS'}
                </button>
              </form>

              {signupMutation.error && (
                <p className="text-red-400 text-sm mt-4 font-jaoren">
                  {signupMutation.error.message}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-sans mb-4">
                <span style={{color: '#FF53B9'}}>CLOCK IT</span> - You're in!
              </h2>
              <p className="text-gray-300 mb-4">
                We'll let you know when the magic happens
              </p>
              {signupData && (
                <p className="text-gray-400 text-sm">
                  Join {signupData.count} others ready for the unexpected
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
