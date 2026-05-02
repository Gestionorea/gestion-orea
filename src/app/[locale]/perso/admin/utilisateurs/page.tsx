import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserById, listUsers } from '@/lib/users';
import UserList from './UserList';

export default async function UsersPage({
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

  const [t, users] = await Promise.all([
    getTranslations('perso.admin.users'),
    listUsers(),
  ]);

  return (
    <div className="py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">
            {t('eyebrow')}
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        <Link
          href={`/${locale}/perso/admin/utilisateurs/nouveau`}
          className="inline-flex items-center justify-center bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:bg-gray-800"
        >
          {t('addButton')}
        </Link>
      </div>
      <UserList users={users} currentUserId={session.userId} locale={locale} />
    </div>
  );
}
