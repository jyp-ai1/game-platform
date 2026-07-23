import { BannerManager } from "@/components/admin/banner-manager";
import { listBanners } from "@/app/admin/cms/actions";

export const metadata = { title: "CMS · 배너" };

export default async function CmsBannersPage() {
  let banners: Awaited<ReturnType<typeof listBanners>> = [];
  try {
    banners = await listBanners();
  } catch {
    // migration pending
  }
  return <BannerManager banners={banners as Parameters<typeof BannerManager>[0]["banners"]} />;
}
