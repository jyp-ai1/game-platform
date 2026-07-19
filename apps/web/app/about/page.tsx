import { StaticPage } from "@/components/static-page";
import { siteConfig } from "@/lib/site-config";

export default function AboutPage() {
  return (
    <StaticPage
      title="About"
      description={`${siteConfig.name}는 1990년대부터 2010년대까지 사랑받았던 게임들을 설치 없이 브라우저에서 바로 다시 즐길 수 있는 공간입니다. 앞으로 계속해서 새로운 게임을 추가해 나갈 예정입니다.`}
    />
  );
}
