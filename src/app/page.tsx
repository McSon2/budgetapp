import { getServerSideSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSideSession();

  // Si l'utilisateur est connecté, rediriger vers le dashboard
  if (session) {
    redirect('/dashboard');
  }

  // Sinon, rediriger vers la page de connexion
  redirect('/login');
}
