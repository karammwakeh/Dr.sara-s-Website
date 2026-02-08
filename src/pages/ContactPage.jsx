import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ContactPage = () => {
  const { language } = useLanguage();
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: language === 'ar' ? 'تم الإرسال' : 'Message Sent',
      description: language === 'ar' ? 'سنتواصل معك قريباً.' : 'We will get back to you soon.',
    });
  };

  return (
    <>
      <Helmet>
        <title>{language === 'ar' ? 'تواصل معنا - د. سارة' : 'Contact - Dr. Sarah'}</title>
      </Helmet>

      <div className="min-h-screen bg-quinary/20 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
            
            {/* Info Side */}
            <div className="md:w-5/12 bg-primary text-white p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="relative z-10">
                <h1 className="text-4xl font-bold font-playfair mb-6">
                  {language === 'ar' ? 'تواصل معنا' : 'Get in Touch'}
                </h1>
                <p className="text-quinary/90 mb-12 text-lg">
                  {language === 'ar' 
                    ? 'نحن هنا للإجابة على استفساراتك ومساعدتك في بدء رحلتك.' 
                    : 'We are here to answer your questions and help you start your journey.'}
                </p>

                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{language === 'ar' ? 'اتصل بنا' : 'Call Us'}</h3>
                      <p className="text-quinary/70">+966 50 123 4567</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Us'}</h3>
                      <p className="text-quinary/70">info@drsarah.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{language === 'ar' ? 'الموقع' : 'Location'}</h3>
                      <p className="text-quinary/70">Riyadh, Saudi Arabia</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Side */}
            <div className="md:w-7/12 p-12">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">
                      {language === 'ar' ? 'الاسم' : 'Name'}
                    </label>
                    <input type="text" className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-dark" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </label>
                    <input type="email" className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-dark" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-dark mb-2">
                    {language === 'ar' ? 'الموضوع' : 'Subject'}
                  </label>
                  <input type="text" className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-dark" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-dark mb-2">
                    {language === 'ar' ? 'الرسالة' : 'Message'}
                  </label>
                  <textarea rows="5" className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-dark" required></textarea>
                </div>
                <Button type="submit" className="w-full bg-secondary hover:bg-primary text-white font-bold py-6 text-lg">
                  {language === 'ar' ? 'إرسال الرسالة' : 'Send Message'} <Send className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;