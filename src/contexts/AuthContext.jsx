import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { useToast } from '@/components/ui/use-toast';
import { IMAGES } from '@/lib/theme';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) console.error('Profile fetch error:', error.message);
    return data || null;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: error.message,
        variant: 'destructive',
      });

      return null;
    }

    const profile = await fetchUserProfile(data.user.id);
    localStorage.setItem('user', JSON.stringify(profile));
    setUser(profile);

    toast({
      title: 'تم تسجيل الدخول بنجاح',
      description: 'مرحباً بعودتك!',
    });

    return profile;
  };

  const signup = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        full_name: fullName
      }
    });

    if (error) {
      toast({
        title: 'خطأ في إنشاء الحساب',
        description: error.message,
        variant: 'destructive',
      });

      return null;
    }

    const profile = await fetchUserProfile(data.user.id);
    localStorage.setItem('user', JSON.stringify(profile));
    setUser(profile);

    toast({
      title: 'تم إنشاء الحساب بنجاح',
      description: 'مرحباً بك في منصة د. سارة',
    });

    return profile;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error.message);
    } else {
      localStorage.removeItem('user');
      setUser(null);
      toast({
        title: 'تم تسجيل الخروج',
        description: 'نراك قريباً!',
      });
    }
  };

  const resetPassword = async (email) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://localhost:3000',
    });

    toast({
      title: 'تم إرسال رابط إعادة التعيين',
      description: 'تحقق من بريدك الإلكتروني',
    });
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};