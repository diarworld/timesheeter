import { OrganizationRoute } from 'entities/organization/ui/OrganizationRoute';
import { IndexPage } from 'pages/Index';
import { parse } from 'cookie';
import { GetServerSidePropsContext } from 'next';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const req = context.req;
  const cookies = req?.headers.cookie ? parse(req.headers.cookie) : {};
  const accessToken = cookies.access_token || null;
  return { props: { accessToken } };
}

export default (props: { accessToken?: string }) => (
  <OrganizationRoute>
    <IndexPage accessToken={props.accessToken} />
  </OrganizationRoute>
);
