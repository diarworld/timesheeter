import { LDAP_REGEX } from 'entities/track/common/lib/constants';

export const validateLDAP = (str: string | undefined) => {
  if (!str) {
    return false;
  }

  return !!str && str.match(LDAP_REGEX) !== null;
};
