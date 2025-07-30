// lib/email.ts
import axios from 'axios';

export async function createTempEmail() {
  // 1. جلب الدومينات المتاحة
  const domainRes = await axios.get('https://api.mail.tm/domains');
  const domain = domainRes.data['hydra:member'][0].domain;

  const username = `user${Math.floor(Math.random() * 100000)}`;
  const password = "3asbaLik123@" // كلمة سر عشوائية
  const address = `${username}@${domain}`;

  // 2. تسجيل الحساب
 await axios.post('https://api.mail.tm/accounts', {
    address,
    password,
  });

  // 3. تسجيل الدخول للحصول على التوكن
  const loginRes = await axios.post('https://api.mail.tm/token', {
    address,
    password,
  });  return {
    address,
    password,
    token: loginRes.data.token,
  };
}
export async function waitForVerificationCode(token: string): Promise<string> {
  const api = axios.create({
    baseURL: 'https://api.mail.tm',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let attempts = 0;
  while (attempts < 15) {
    const res = await api.get('/messages');
    const messages = res.data['hydra:member'];

    const instaMail = messages.find((msg: any) =>
      msg.from.address.includes('instagram') || msg.subject.toLowerCase().includes('instagram')
    );

    if (instaMail) {
      // جلب تفاصيل الرسالة
      const message = await api.get(`/messages/${instaMail.id}`);
      const body = message.data.text;

      // استخراج الكود من النص
      const codeMatch = body.match(/(\d{6})/);
      if (codeMatch) {
        return codeMatch[1]; // ✅ رمز التفعيل
      }
    }

    // الانتظار 3 ثواني ثم إعادة المحاولة
    await new Promise((res) => setTimeout(res, 3000));
    attempts++;
  }

  throw new Error("لم يتم العثور على رمز التفعيل بعد عدة محاولات.");
}