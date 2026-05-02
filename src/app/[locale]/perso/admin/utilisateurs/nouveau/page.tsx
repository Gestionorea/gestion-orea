import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import NewUserForm from './NewUserForm';

export default async function NewUserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const me = await getUserById(session.userId);

  if (!me || me.role !== 'owner') {
    redirect('/fr/perso');
  }

  const t = await getTranslations('perso.admin.users');

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">
        {t('eyebrow')}
      </p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">
        {t('newTitle')}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-gray-500">
        {t('newSubtitle')}
      </p>
      <NewUserForm />
    </div>
  );
}
