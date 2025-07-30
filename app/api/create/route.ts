import { NextResponse } from 'next/server';
import { createTempEmail } from '@/lib/email';
import { getRandomName } from '@/lib/name';
import { registerInstagram } from '@/lib/playwright';
import { isIPBlocked } from "@/lib/checkIP";

export async function GET() {
    const ipStatus = await isIPBlocked();
    console.log(`IP Status: ${ipStatus.ip} - Blocked: ${ipStatus.blocked}`);
if (ipStatus.blocked) {
    throw new Error(`🚫 تم حظر عنوان الـ IP (${ipStatus.ip}) لأنه مصنف كـ Proxy أو Hosting. يرجى تغيير الشبكة.`);
  }
  try {
    const emailData = await createTempEmail();
    const name = getRandomName();
    await registerInstagram(emailData.address, name,emailData.password,emailData.token);

    return NextResponse.json({ success: true, email: emailData.address, name ,password: emailData.password });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Something went wrong' });
  }
}