// app.tsx
'use client'

import { useState, FormEvent, useRef, useEffect } from 'react';
import Head from 'next/head';

type VerificationStep = {
  method: string;
  success: boolean;
  message: string;
};

type Status = {
  message: string;
  details?: string;
  verificationSteps?: VerificationStep[];
  screenshot?: string;
};

export default function InstagramMentionBot() {
  const [users, setUsers] = useState<string>('');
  const [postUrl, setPostUrl] = useState<string>('');
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTips, setShowTips] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // كشف نوع الجهاز
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // دالة لاستخراج أسماء المستخدمين من أي بنية JSON
  const extractUsernames = (data: any): string[] => {
    if (Array.isArray(data)) {
      return data;
    }
    
    if (typeof data === 'object' && data !== null) {
      // البحث عن أول خاصية مصفوفة في الكائن
      for (const key in data) {
        if (Array.isArray(data[key])) {
          return data[key];
        }
      }
      
      // البحث عن أي مصفوفة متداخلة
      const findArray = (obj: any): string[] | null => {
        for (const key in obj) {
          if (Array.isArray(obj[key])) {
            return obj[key];
          }
          if (typeof obj[key] === 'object') {
            const result = findArray(obj[key]);
            if (result) return result;
          }
        }
        return null;
      };
      
      const nestedArray = findArray(data);
      if (nestedArray) return nestedArray;
    }
    
    throw new Error('لا يمكن استخراج أسماء المستخدمين من الملف. التنسيق غير مدعوم.');
  };

  // استيراد المستخدمين من ملف
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        
        // التحقق من نوع الملف
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(content);
          const usernames = extractUsernames(jsonData);
          setUsers(usernames.join('\n'));
          
          setStatus({
            message: `تم استيراد ${usernames.length} مستخدم بنجاح من ملف JSON`,
            details: `تم العثور على مستخدمين: ${usernames.slice(0, 5).join(', ')}${usernames.length > 5 ? '...' : ''}`
          });
        } else {
          // معالجة الملفات النصية
          setUsers(content);
          const lines = content.split('\n').filter(l => l.trim());
          setStatus({
            message: `تم استيراد ${lines.length} مستخدم بنجاح من ملف نصي`,
            details: `المستخدمون: ${lines.slice(0, 5).join(', ')}${lines.length > 5 ? '...' : ''}`
          });
        }
      } catch (error: any) {
        setStatus({
          message: `خطأ في قراءة الملف: ${error.message}`,
          details: 'تأكد من تنسيق الملف'
        });
      } finally {
        // إعادة تعيين قيمة المدخل للسماح بتحميل نفس الملف مرة أخرى
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setStatus({
        message: 'حدث خطأ أثناء قراءة الملف',
        details: 'تأكد من أن الملف غير تالف'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // إرسال الطلب للخادم
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);
    
    try {
      const userList = users.split('\n').filter(u => u.trim());
      if (userList.length === 0) {
        throw new Error('لم يتم إدخال أي مستخدمين');
      }
      
      const response = await fetch('/api/mentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: userList,
          postUrl
        })
      });
      
      if (!response.ok) {
        throw new Error(`خطأ في الخادم: ${response.status}`);
      }
      
      const result: Status = await response.json();
      setStatus(result);
    } catch (error: any) {
      setStatus({
        message: `حدث خطأ: ${error.message || 'فشل في نشر التعليق'}`,
        details: error.stack || 'لا توجد تفاصيل إضافية'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>بوت ذكر المستخدمين في إنستغرام | أتمتة التعليقات</title>
        <meta 
          name="description" 
          content="أداة لأتمتة ذكر المستخدمين في تعليقات إنستغرام. قم بإدخال قائمة المستخدمين من ملف JSON أو نصي، وسيقوم البوت بالذكر تلقائيًا." 
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              بوت ذكر المستخدمين في إنستغرام
            </h1>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              أضف قائمة المستخدمين من ملف JSON أو نصي، ورابط المنشور، وسيقوم البوت بذكرهم في تعليق واحد تلقائياً
            </p>
          </header>

          {showTips && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-lg">
              <div className="flex justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">نصائح هامة</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>تأكد أن الحساب ليس خاصاً وأن المنشور عام</li>
                        <li>ملفات JSON يجب أن تحتوي على مصفوفة أسماء مستخدمين</li>
<li>يمكن استخدام التنسيقات: ["user1", "user2"] أو &lbrace;"users": ["user1", "user2"]&rbrace;</li>
                        <li>تأكد من صحة بناء الجملة في ملف JSON</li>
                        <li>أضف 10-15 مستخدم فقط في كل تعليق لضمان النشر</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTips(false)}
                  className="text-yellow-600 hover:text-yellow-800"
                  aria-label="إغلاق النصائح"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <main className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="users" className="block text-base font-medium text-gray-800 mb-2">
                    أسماء المستخدمين (سطر لكل مستخدم):
                  </label>
                  <textarea 
                    id="users"
                    value={users}
                    onChange={(e) => setUsers(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800"
                    rows={8}
                    placeholder="user1&#10;user2&#10;user3"
                    required
                    aria-describedby="usersHelp"
                  />
                  <p id="usersHelp" className="mt-2 text-sm text-gray-500">أدخل أسماء المستخدمين، كل اسم في سطر جديد أو استورد من ملف</p>
                  <div className="mt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-800"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="استيراد المستخدمين من ملف"
                    >
                      <svg className="inline mr-2 -mt-1 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      استيراد من ملف (TXT/JSON)
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-800"
                      onClick={() => setUsers('')}
                      aria-label="مسح قائمة المستخدمين"
                    >
                      <svg className="inline mr-2 -mt-1 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      مسح الكل
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".txt,.json"
                      onChange={handleFileUpload}
                      aria-label="اختر ملف لاستيراد المستخدمين"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="postUrl" className="block text-base font-medium text-gray-800 mb-2">
                    رابط المنشور:
                  </label>
                  <input
                    type="url"
                    id="postUrl"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800"
                    placeholder="https://www.instagram.com/p/..."
                    required
                    aria-describedby="postUrlHelp"
                  />
                  <p id="postUrlHelp" className="mt-2 text-sm text-gray-500">انسخ رابط المنشور من متصفحك</p>
                </div>
                
                <div>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full flex justify-center items-center py-4 px-6 rounded-lg shadow-md text-lg font-semibold ${
                      isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transform hover:-translate-y-0.5 transition-all duration-200'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    aria-busy={isLoading}
                    aria-live="polite"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                        بدء العملية
                      </>
                    )}
                  </button>
                </div>
              </form>

              {status && (
                <section aria-live="polite" className="mt-8">
                  <div className={`p-4 rounded-lg mb-6 ${
                    status.message.includes('تم نشر') || status.message.includes('استيراد') ? 'bg-green-50 border border-green-200' : 
                    status.message.includes('حدث خطأ') || status.message.includes('خطأ') ? 'bg-red-50 border border-red-200' : 
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {status.message.includes('تم نشر') || status.message.includes('استيراد') ? (
                          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : status.message.includes('حدث خطأ') || status.message.includes('خطأ') ? (
                          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <h2 className={`text-sm font-medium ${
                          status.message.includes('تم نشر') || status.message.includes('استيراد') ? 'text-green-800' : 
                          status.message.includes('حدث خطأ') || status.message.includes('خطأ') ? 'text-red-800' : 
                          'text-blue-800'
                        }`}>
                          {status.message.includes('تم نشر') || status.message.includes('استيراد') ? 'نجحت العملية' : 
                          status.message.includes('حدث خطأ') || status.message.includes('خطأ') ? 'حدث خطأ' : 'تنبيه'}
                        </h2>
                        <div className="mt-1 text-sm text-gray-700">
                          {status.message}
                          {status.details && <p className="mt-1 text-xs text-gray-500">{status.details}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {status.verificationSteps && status.verificationSteps.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-3">تفاصيل التحقق</h3>
                      <div className="space-y-3">
                        {status.verificationSteps.map((step, index) => (
                          <article 
                            key={index} 
                            className={`p-4 rounded-lg border ${
                              step.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-start">
                              <div className={`flex-shrink-0 mt-0.5 h-5 w-5 ${step.success ? 'text-green-500' : 'text-red-500'}`}>
                                {step.success ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3">
                                <h4 className={`font-medium ${step.success ? 'text-green-800' : 'text-red-800'}`}>
                                  {step.method}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {step.message}
                                </p>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {status.screenshot && !isMobile && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-3">لقطة الشاشة</h3>
                      <div className="border rounded-lg overflow-hidden shadow">
                        <img 
                          src={`data:image/png;base64,${status.screenshot}`} 
                          alt="لقطة شاشة للنتيجة"
                          className="w-full"
                        />
                        <div className="bg-gray-50 p-3 text-center text-sm text-gray-600">
                          لقطة شاشة بعد تنفيذ العملية
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </main>

          <aside className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-lg shadow-md">
              <div className="flex items-center mb-3">
                <div className="bg-indigo-100 p-2 rounded-full mr-3">
                  <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900">تنسيقات JSON المدعومة</h3>
              </div>
              <div className="text-gray-600 text-sm space-y-2">
                <div className="p-2 bg-gray-50 rounded-md">
                  <code className="text-xs block">["user1", "user2", "user3"]</code>
                  <p className="mt-1">مصفوفة مباشرة</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-md">
                  <code className="text-xs block">{"{ \"users\": [\"user1\", \"user2\"] }"}</code>
                  <p className="mt-1">كائن بمفتاح "users"</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-md">
                  <code className="text-xs block">{"{ \"data\": [\"user1\", \"user2\"] }"}</code>
                  <p className="mt-1">كائن بمفتاح "data"</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow-md">
              <div className="flex items-center mb-3">
                <div className="bg-indigo-100 p-2 rounded-full mr-3">
                  <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900">الأمان</h3>
              </div>
              <p className="text-gray-600 text-sm">
                لا تشارك ملف .env.local الذي يحتوي على بيانات تسجيل الدخول
              </p>
              <p className="mt-2 text-gray-600 text-sm">
                يتم معالجة الملفات فقط في المتصفح ولا يتم رفعها إلى الخادم
              </p>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow-md">
              <div className="flex items-center mb-3">
                <div className="bg-indigo-100 p-2 rounded-full mr-3">
                  <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900">النشر</h3>
              </div>
              <p className="text-gray-600 text-sm">
                عند النشر على Vercel، تأكد من إضافة متغيرات البيئة في الإعدادات
              </p>
              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                <code className="text-xs block">IG_USERNAME=your_username</code>
                <code className="text-xs block mt-1">IG_PASSWORD=your_password</code>
                <code className="text-xs block mt-1">MAX_MENTIONS=10</code>
              </div>
            </div>
          </aside>

          <footer className="mt-8 text-center text-sm text-gray-500">
            <p>هذا المشروع مخصص للأغراض التعليمية فقط. احرص على الالتزام بشروط استخدام إنستغرام.</p>
            <p className="mt-1">© {new Date().getFullYear()} - جميع الحقوق محفوظة</p>
          </footer>
        </div>
      </div>
    </>
  );
}