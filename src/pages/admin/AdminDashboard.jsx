import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { DollarSign, Users, BookOpen, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [products, setProducts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [count, setUserCount] = useState(0);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchCourses = async () => {
      const { data: courses, error } = await supabase.from("courses").select("*");
      if (error) {
        console.error("Error fetching courses:", error.message);
      } else {
        setCourses(courses);
      }
      setLoading(false);
    };

    const fetchProducts = async () => {
      const { data: products, error } = await supabase.from("products").select("*");
      if (error) {
        console.error("Error fetching products:", error.message);
      } else {
        setProducts(products);
      }
      setLoading(false);
    };

    const fetchBookings = async () => {
      const { data: bookings, error } = await supabase.from("bookings").select("*");
      if (error) {
        console.error("Error fetching bookings:", error.message);
      } else {
        setBookings(bookings);
      }
      setLoading(false);
    };

    const countUsers = async () => {
      const { count, c_err } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      if (c_err) {
        console.error(c_err.message);
      } else {
        setUserCount(count);
      }

      setLoading(false);
    };

    countUsers();
    fetchCourses();
    fetchBookings();
    fetchProducts();
  }, []);

  const activeCourses = courses.filter(c => c.is_active).length;
  const bookingsThisMonth = bookings.filter(b => {
    let date = new Date(b.booking_date);
    date.setHours(0, 0, 0, 0);

    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return date >= startOfMonth && date <= today;
  }).length;

  const stats = [
    {
      icon: DollarSign,
      title: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: '$125,430',
      change: '+12.5%',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Users,
      title: language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users',
      value: count,
      change: '+8.2%',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: BookOpen,
      title: language === 'ar' ? 'الدورات النشطة' : 'Active Courses',
      value: activeCourses,
      change: '+4',
      color: 'from-primary to-secondary',
    },
    {
      icon: Calendar,
      title: language === 'ar' ? 'الحجوزات هذا الشهر' : 'Bookings This Month',
      value: bookingsThisMonth,
      change: '+18.3%',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <>
      <Helmet>
        <title>{language === 'ar' ? 'لوحة تحكم الإدارة - د. سارة' : 'Admin Dashboard - Dr. Sarah'}</title>
      </Helmet>

      <div className="min-h-screen bg-quinary/20 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 
              className="text-4xl font-bold text-dark mb-2"
              style={{ fontFamily: language === 'ar' ? 'Cairo, sans-serif' : 'serif' }}
            >
              {language === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}
            </h1>
            <p className="text-dark/70">
              {language === 'ar' ? 'نظرة عامة على أداء المنصة' : 'Overview of platform performance'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-quaternary/20"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-sm text-dark/60 mb-1">{stat.title}</div>
                <div className="text-2xl font-bold text-dark mb-1">{stat.value}</div>
                <div className="text-sm text-green-600">{stat.change}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 bg-white rounded-2xl p-8 shadow-lg border border-quaternary/20">
            <h2 className="text-2xl font-bold text-dark mb-4">
              {language === 'ar' ? 'الإدارة السريعة' : 'Quick Management'}
            </h2>
            <p className="text-dark/70">
              {language === 'ar' 
                ? 'أدوات الإدارة الكاملة ستكون متاحة بعد ربط Supabase'
                : 'Full management tools will be available after connecting Supabase'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;