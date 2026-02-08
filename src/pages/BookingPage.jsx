import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const BookingPage = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

  const handleBooking = (e) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      setBookingSuccess(true);
      toast({
        title: language === 'ar' ? 'تم الحجز بنجاح' : 'Booking Successful',
        description: language === 'ar' ? 'تم تأكيد موعدك.' : 'Your appointment has been confirmed.',
      });
    }, 1000);
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-quinary/20 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-bold font-playfair mb-4 text-primary">
            {language === 'ar' ? 'تم تأكيد الحجز!' : 'Booking Confirmed!'}
          </h2>
          <p className="text-gray-600 mb-8">
            {language === 'ar' 
              ? 'شكراً لك. تم إرسال تفاصيل الموعد إلى بريدك الإلكتروني.' 
              : 'Thank you. The appointment details have been sent to your email.'}
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full bg-primary text-white hover:bg-secondary">
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{language === 'ar' ? 'حجز موعد - د. سارة' : 'Book Appointment - Dr. Sarah'}</title>
      </Helmet>

      <div className="min-h-screen bg-quinary/20 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar Info */}
            <div className="md:w-1/3 bg-primary text-white p-8 md:p-12">
              <h2 className="text-3xl font-bold font-playfair mb-6">
                {language === 'ar' ? 'احجز جلستك' : 'Book Your Session'}
              </h2>
              <p className="text-quinary/90 mb-8 leading-relaxed">
                {language === 'ar'
                  ? 'اختر الوقت المناسب لك لبدء رحلة التغيير. الجلسات متاحة حضورياً أو عبر الإنترنت.'
                  : 'Choose a suitable time to start your transformation journey. Sessions available in-person or online.'}
              </p>
              <div className="space-y-4 text-sm text-quinary/90">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-secondary" />
                  <span>60 {language === 'ar' ? 'دقيقة / جلسة' : 'Minutes / Session'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-secondary" />
                  <span>{language === 'ar' ? 'متاح من الأحد للخميس' : 'Available Sun-Thu'}</span>
                </div>
              </div>
            </div>

            {/* Form Area */}
            <div className="md:w-2/3 p-8 md:p-12">
              <form onSubmit={handleBooking} className="space-y-8">
                {/* Date Selection (Simulated) */}
                <div>
                  <Label className="text-lg font-bold mb-4 block text-dark">
                    {language === 'ar' ? '1. اختر التاريخ' : '1. Select Date'}
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {[0, 1, 2, 3, 4].map((day) => {
                      const date = new Date();
                      date.setDate(date.getDate() + day);
                      return (
                        <div 
                          key={day}
                          onClick={() => setSelectedDate(date.toISOString())}
                          className={`flex-shrink-0 w-20 h-24 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                            selectedDate === date.toISOString() 
                              ? 'border-secondary bg-secondary/10 text-primary' 
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs font-bold uppercase text-gray-400">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className="text-xl font-bold text-dark">{date.getDate()}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <Label className="text-lg font-bold mb-4 block text-dark">
                    {language === 'ar' ? '2. اختر الوقت' : '2. Select Time'}
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {timeSlots.map((time) => (
                      <button
                        type="button"
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                          selectedTime === time 
                            ? 'bg-primary text-white shadow-lg' 
                            : 'bg-gray-50 text-dark hover:bg-gray-100'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Details */}
                <div>
                  <Label className="text-lg font-bold mb-4 block text-dark">
                    {language === 'ar' ? '3. معلوماتك' : '3. Your Details'}
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input type="text" placeholder={language === 'ar' ? 'الاسم' : 'Name'} className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary text-dark" required />
                    <input type="email" placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'} className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary text-dark" required />
                    <input type="tel" placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone'} className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary text-dark" />
                    <select className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary bg-white text-dark">
                      <option>{language === 'ar' ? 'نوع الجلسة' : 'Session Type'}</option>
                      <option value="online">Online (Zoom)</option>
                      <option value="person">In-Person</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Button 
                    type="submit" 
                    className="w-full bg-secondary hover:bg-primary text-white font-bold py-6 text-lg"
                    disabled={!selectedDate || !selectedTime}
                  >
                    {language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingPage;