import { CategoryManager } from "@/components/admin/category-manager";
import { listCategoriesAdmin } from "@/app/admin/cms/actions";

export const metadata = { title: "CMS · 카테고리" };

export default async function CmsCategoriesPage() {
  let categories: Awaited<ReturnType<typeof listCategoriesAdmin>> = [];
  try {
    categories = await listCategoriesAdmin();
  } catch {
    /* empty */
  }
  return <CategoryManager categories={categories as Parameters<typeof CategoryManager>[0]["categories"]} />;
}
