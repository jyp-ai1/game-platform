import { VerificationForm } from "@/components/admin/seo-verification-form";
import { listSeoSettings } from "@/app/admin/seo/actions";

export const metadata = { title: "SEO · Verification" };

export default async function SeoVerificationPage() {
  let settings = { google: "", bing: "", naver: "" };
  try {
    settings = await listSeoSettings();
  } catch {
    /* migration pending */
  }
  return <VerificationForm initial={settings} />;
}
