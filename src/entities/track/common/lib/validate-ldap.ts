import { LDAP_REGEX } from 'entities/track/common/lib/constants';

export const validateLDAP = (str: string | undefined) => {
  if (!str) {
    return true;
  }

  return !!str && str.match(LDAP_REGEX) !== null;
};
