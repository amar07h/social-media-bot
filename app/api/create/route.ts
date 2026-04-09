import { NextResponse } from 'next/server';
import { createTempEmail } from '@/lib/email';
import { getRandomName } from '@/lib/name';
import { registerInstagram } from '@/lib/playwright';
import { isIPBlocked } from "@/lib/checkIP";
import {generateDotEmail} from "@/helper/function";
export async function GET() {
    const ipStatus = await isIPBlocked();
    console.log(`IP Status: ${ipStatus.ip} - Blocked: ${ipStatus.blocked}`);
if (ipStatus.blocked) {
    throw new Error(`🚫 تم حظر عنوان الـ IP (${ipStatus.ip}) لأنه مصنف كـ Proxy أو Hosting. يرجى تغيير الشبكة.`);
  }
  try {
      const email = generateDotEmail("i29557914bot@gmail.com",1);

    //const emailData = await createTempEmail();
  
    const name = getRandomName();
    await registerInstagram(email, name,"3asbalik123");

    return NextResponse.json({ success: true, email: email, name ,password:"3asbalik123" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Something went wrong' });
  }
}