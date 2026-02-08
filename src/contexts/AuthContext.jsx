import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const login = async (email, password) => {
    try {
      // TODO: Replace with Supabase authentication
      const mockUser = {
        id: '1',
        email,
        full_name: 'Demo User',
        role: email.includes('admin') ? 'admin' : 'user',
        profile_photo_url: IMAGES.testimonial1
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      
      toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: 'مرحباً بعودتك!',
      });
      
      return mockUser;
    } catch (error) {
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signup = async (email, password, fullName) => {
    try {
      // TODO: Replace with Supabase authentication
      const mockUser = {
        id: Date.now().toString(),
        email,
        full_name: fullName,
        role: 'user',
        profile_photo_url: null
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      
      toast({
        title: 'تم إنشاء الحساب بنجاح',
        description: 'مرحباً بك في منصة د. سارة',
      });
      
      return mockUser;
    } catch (error) {
      toast({
        title: 'خطأ في إنشاء الحساب',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    toast({
      title: 'تم تسجيل الخروج',
      description: 'نراك قريباً!',
    });
  };

  const resetPassword = async (email) => {
    // TODO: Replace with Supabase password reset
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