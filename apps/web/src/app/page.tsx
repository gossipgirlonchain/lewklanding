"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function HomePage() {
  const [isSignedUp, setIsSignedUp] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // Get signup count
  const { data: signupData } = useQuery({
    queryKey: ["signups-count"],
    queryFn: async () => {
      const response = await fetch("/api/signups");
      if (!response.ok) {
        throw new Error("Failed to get signup count");
      }
      return response.json();
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (email) => {
      const response = await fetch("/api/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign up");
      }

      return data;
    },
    onSuccess: () => {
      setIsSignedUp(true);
      reset();
      queryClient.invalidateQueries({ queryKey: ["signups-count"] });
    },
  });

  const onSubmit = (data) => {
    signupMutation.mutate(data.email);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://ucarecdn.com/00db48af-f47b-463e-8d1e-72c52210a809/-/format/auto/"
          alt="Fashion runway background"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-purple-900/30 to-pink-900/40"></div>
      </div>

      {/* Logo in corner */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-20 bg-transparent">
        <img 
          src="/lewklogowhie.png?v=2" 
          alt="LEWK Logo" 
          className="h-8 w-auto md:h-10"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 md:px-8 lg:px-12 text-center">
        {/* Large Stylized Tagline */}
        <div className="mb-8 md:mb-12 lg:mb-16 max-w-6xl px-4">
          <img 
            src="/headertext.svg" 
            alt="WHO COULD HAVE PREDICTED THIS" 
            className="w-full max-w-4xl mx-auto h-auto"
          />
        </div>

        {/* Signup Section */}
        <div className="w-full max-w-md px-4">
          {!isSignedUp ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-pink-300/30 shadow-2xl">
              {/* Large Signup Heading */}
              <h3 className="text-xl md:text-2xl font-bold mb-6 leading-tight font-sans">
                <span className="text-white">SIGN UP TO</span> <span style={{color: '#FF53B9'}}>CLOCK IT FIRST</span>
              </h3>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <input
                    type="email"
                    placeholder="enter your email"
                    className="w-full px-6 py-4 md:py-5 bg-white/20 border border-pink-300/50 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-lg font-jaoren"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Please enter a valid email",
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-pink-300 text-sm mt-2 font-jaoren">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {signupMutation.isError && (
                  <p className="text-pink-300 text-sm font-jaoren">
                    {signupMutation.error?.message ||
                      "Something went wrong. Please try again."}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={signupMutation.isLoading}
                  className="w-full py-3 md:py-4 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg transform hover:scale-105 shadow-lg hover:shadow-pink-500/25 font-sans"
                  style={{backgroundColor: '#FF53B9'}}
                >
                  {signupMutation.isLoading
                    ? "SIGNING UP..."
                    : "GET EARLY ACCESS"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 lg:p-10 border border-pink-300/30 shadow-2xl">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent font-jaoren">
                  YOU'RE IN!
                </h3>
                <p className="text-white/80 text-lg mb-4">
                  we'll let you know when the magic happens
                </p>
                {signupData?.count && (
                  <div className="p-4 bg-pink-500/20 rounded-xl border border-pink-300/30">
                    <p className="text-pink-300 font-semibold font-jaoren">
                      join {signupData.count} others ready for the unexpected
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
    </div>
  );
}
