import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/users';

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect('/fr/login');
  }

  return session;
}

export async function requireMutator() {
  const session = await requireAuth();

  if (!['owner', 'assistant'].includes(session.role)) {
    redirect('/fr/perso');
  }

  return session;
}

export async function requireOwner() {
  const session = await requireAuth();
  const me = await getUserById(session.userId);

  if (!me || me.role !== 'owner') {
    redirect('/fr/perso');
  }

  return session;
}

export async function requireReconciler() {
  const session = await requireAuth();

  if (!['owner', 'accountant'].includes(session.role)) {
    redirect('/fr/perso');
  }

  return session;
}
