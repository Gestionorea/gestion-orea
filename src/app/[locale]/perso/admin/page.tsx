import { redirect } from 'next/navigation';

export default async function PersoAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  redirect(`/${locale}/perso/admin/mot-de-passe`);
}
