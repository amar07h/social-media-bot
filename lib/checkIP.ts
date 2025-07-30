import axios from 'axios';

export async function isIPBlocked(): Promise<{ ip: string, blocked: boolean }> {
  try {
    // اجلب عنوان الـ IP العام
    const ipRes = await axios.get('https://api.ipify.org?format=json');
    const ip = ipRes.data.ip;

    // تحقق هل هو Proxy / Hosting / Tor ...
    const checkRes = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,proxy,hosting,mobile,query`);

    if (checkRes.data.status !== 'success') {
      console.warn("⚠️ تعذر التحقق من حالة الـ IP");
      return { ip, blocked: false };
    }

    const isProxy = checkRes.data.proxy || checkRes.data.hosting;
    return {
      ip,
      blocked: isProxy,
    };
  } catch (error) {
    console.error("فشل التحقق من عنوان الـ IP:", error);
    return { ip: 'unknown', blocked: false };
  }
}
