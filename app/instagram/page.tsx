'use client'

import { useState, FormEvent, useEffect } from 'react';
import Head from 'next/head';

type ScrapeType = 'followers' | 'likes' | 'comments' | 'shares';
type ScrapeStatus = 'idle' | 'processing' | 'success' | 'error';

interface ScrapeResult {
  usernames: string[];
  count: number;
  type: ScrapeType;
  postUrl: string;
  timestamp: string;
}

export default function InstagramScraper() {
  const [postUrl, setPostUrl] = useState<string>('');
  const [scrapeType, setScrapeType] = useState<ScrapeType>('likes');
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // تحميل النتائج السابقة من localStorage
    const savedResults = localStorage.getItem('ig_scrape_results');
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    setError('');
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postUrl,
          scrapeType
        })
      });
      
      if (!response.ok) {
        throw new Error(`خطأ في الخادم: ${response.status}`);
      }
      
      const data = await response.json();
      
      const newResult: ScrapeResult = {
        usernames: data.usernames,
        count: data.usernames.length,
        type: scrapeType,
        postUrl,
        timestamp: new Date().toISOString()
      };
      
      setCurrentResult(newResult);
      
      // تحديث النتائج مع الحفاظ على آخر 5 نتائج فقط
      const updatedResults = [newResult, ...results.slice(0, 4)];
      setResults(updatedResults);
      localStorage.setItem('ig_scrape_results', JSON.stringify(updatedResults));
      
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'فشل في استخراج البيانات');
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ الأسماء إلى الحافظة!');
  };

  const downloadUsernames = () => {
    if (!currentResult) return;
    
    const content = currentResult.usernames.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram_${currentResult.type}_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeName = (type: ScrapeType) => {
    switch (type) {
      case 'followers': return 'المتابعين';
      case 'likes': return 'المعجبين';
      case 'comments': return 'المعلقين';
      case 'shares': return 'المشاركين';
      default: return '';
    }
  };

  return (
    <>
      <Head>
        <title>أداة استخراج أسماء المستخدمين من إنستغرام | منشورات، إعجابات، تعليقات</title>
        <meta 
          name="description" 
          content="استخرج أسماء المستخدمين من أي منشور على إنستغرام - المعجبين، المعلقين، المشاركين، والمتابعين. أداة قوية لتحليل المنشورات." 
        />
        <meta name="keywords" content="إنستغرام, استخراج بيانات, أسماء مستخدمين, سكراب, تحليل منشورات, Instagram, scraper" />
        <meta name="author" content="Your Company" />
        <meta property="og:title" content="أداة استخراج أسماء المستخدمين من إنستغرام" />
        <meta property="og:description" content="استخرج أسماء المستخدمين من أي منشور على إنستغرام بسهولة" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yourdomain.com/scrape" />
        <meta property="og:image" content="https://yourdomain.com/scrape-og.jpg" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              أداة استخراج أسماء المستخدمين من إنستغرام
            </h1>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              استخرج أسماء المستخدمين من أي منشور - المعجبين، المعلقين، المشاركين والمتابعين
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <main className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
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
                      <p id="postUrlHelp" className="mt-2 text-sm text-gray-500">
                        انسخ رابط المنشور من متصفحك
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-base font-medium text-gray-800 mb-2">
                        نوع البيانات المطلوبة:
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {(['likes', 'comments', 'followers', 'shares'] as ScrapeType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setScrapeType(type)}
                            className={`p-4 rounded-lg border transition-all ${
                              scrapeType === type
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md transform -translate-y-1'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 ${
                                scrapeType === type ? 'bg-indigo-500' : 'bg-gray-300'
                              }`}></div>
                              <span className="font-medium">{getTypeName(type)}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {type === 'likes' && 'أسماء المستخدمين الذين أعجبهم المنشور'}
                              {type === 'comments' && 'أسماء المستخدمين الذين علقوا على المنشور'}
                              {type === 'followers' && 'أسماء متابعي صاحب المنشور'}
                              {type === 'shares' && 'أسماء المستخدمين الذين شاركوا المنشور'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <button 
                        type="submit" 
                        disabled={status === 'processing'}
                        className={`w-full flex justify-center items-center py-4 px-6 rounded-lg shadow-md text-lg font-semibold ${
                          status === 'processing' 
                            ? 'bg-indigo-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transform hover:-translate-y-0.5 transition-all duration-200'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                        aria-busy={status === 'processing'}
                      >
                        {status === 'processing' ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            جاري الاستخراج...
                          </>
                        ) : (
                          <>
                            <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            بدء الاستخراج
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {status === 'error' && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-red-800 font-medium">حدث خطأ</h3>
                      </div>
                      <p className="mt-2 text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {currentResult && status === 'success' && (
                    <div className="mt-8">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                          النتائج: {currentResult.count} {getTypeName(currentResult.type)}
                        </h2>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(currentResult.usernames.join('\n'))}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-800 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                            نسخ
                          </button>
                          <button
                            onClick={downloadUsernames}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium text-white flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            تحميل
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                          {currentResult.usernames.slice(0, 100).map((username, index) => (
                            <div 
                              key={index} 
                              className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center"
                            >
                              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8 mr-2" />
                              <span className="text-sm font-medium text-gray-800 truncate">@{username}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-4 text-center text-sm text-gray-500">
                        عرض {Math.min(currentResult.usernames.length, 100)} من أصل {currentResult.count} مستخدم
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">كيف تعمل الأداة؟</h2>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-indigo-100 p-2 rounded-full mt-0.5">
                        <span className="text-indigo-800 font-bold">1</span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-800">أدخل رابط المنشور</h3>
                        <p className="mt-1 text-gray-600">
                          انسخ رابط المنشور من إنستغرام والصقه في الحقل المخصص. تأكد من أن المنشور عام وليس خاصاً.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-indigo-100 p-2 rounded-full mt-0.5">
                        <span className="text-indigo-800 font-bold">2</span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-800">اختر نوع البيانات</h3>
                        <p className="mt-1 text-gray-600">
                          اختر ما إذا كنت ترغب في استخراج المعجبين، المعلقين، المشاركين أو متابعي صاحب المنشور.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-indigo-100 p-2 rounded-full mt-0.5">
                        <span className="text-indigo-800 font-bold">3</span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-800">استلم النتائج</h3>
                        <p className="mt-1 text-gray-600">
                          بعد بضع ثوانٍ، ستظهر لك قائمة بأسماء المستخدمين. يمكنك نسخها أو تحميلها كملف نصي.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
            
            <aside>
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-6">
                <div className="p-6 md:p-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">العمليات السابقة</h2>
                  
                  {results.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد عمليات سابقة</h3>
                      <p className="mt-1 text-sm text-gray-500">سيتم عرض عمليات الاستخراج السابقة هنا</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {results.map((result, index) => (
                        <div 
                          key={index}
                          className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            currentResult?.timestamp === result.timestamp 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200'
                          }`}
                          onClick={() => setCurrentResult(result)}
                        >
                          <div className="flex justify-between">
                            <h3 className="font-medium text-gray-800">
                              {getTypeName(result.type)}
                            </h3>
                            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
                              {result.count}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-1" title={result.postUrl}>
                            {result.postUrl}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(result.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 md:p-8 text-white">
                  <h2 className="text-xl font-bold mb-4">نصائح للاستخدام الأمثل</h2>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="flex-shrink-0 h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>تأكد من أن المنشور عام وليس خاصاً</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="flex-shrink-0 h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>استخدم الأداة بشكل معقول لتجنب حظر حسابك</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="flex-shrink-0 h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>حفظ النتائج بانتظام لاستخدامها لاحقاً</span>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
          
          <footer className="mt-12 text-center text-sm text-gray-500">
            <p>هذه الأداة مخصصة للأغراض القانونية فقط. يرجى احترام سياسة خصوصية المستخدمين وشروط استخدام إنستغرام.</p>
            <p className="mt-1">© {new Date().getFullYear()} - جميع الحقوق محفوظة</p>
          </footer>
        </div>
      </div>
    </>
  );
}