import { StaticPage } from "@/components/static-page";

export default function NotFound() {
  return (
    <StaticPage
      title="404 - Page Not Found"
      description="요청하신 페이지를 찾을 수 없습니다."
      centered
    />
  );
}
