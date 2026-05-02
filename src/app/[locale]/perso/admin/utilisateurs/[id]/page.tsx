import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import EditUserForm from './EditUserForm';
import ResetPasswordForm from './ResetPasswordForm';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const [me, user] = await Promise.all([getUserById(session.userId), getUserById(id)]);

  if (!me || me.role !== 'owner') {
    redirect('/fr/perso');
  }

  if (!user) {
    notFound();
  }

  const t = await getTranslations('perso.admin.users');

  if (user.role === 'owner' && user.id !== session.userId) {
    return (
      <div className="py-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">
          {t('editTitle')}
        </h1>
        <p className="mt-6 max-w-xl text-sm text-red-700">
          {t('errors.cantEditOtherOwner')}
        </p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">
        {t('eyebrow')}
      </p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">
        {t('editTitle')}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-gray-500">
        {t('editSubtitle')}
      </p>
      <EditUserForm user={user} isSelf={user.id === session.userId} />
      <ResetPasswordForm userId={user.id} />
    </div>
  );
}
