import { useRouter } from 'next/router';

export const useUserLoginFilter = () => {
  const router = useRouter();

  const userLogin = router.query.login as string | undefined;

  return userLogin;
};