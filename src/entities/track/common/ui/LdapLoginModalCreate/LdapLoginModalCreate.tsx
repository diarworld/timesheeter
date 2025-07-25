import { track } from 'entities/track/common/model/reducers';
import { LdapLoginFormManage } from 'entities/track/common/ui/LdapLoginFormManage';
import React, { FC, useCallback } from 'react';
import { Modal } from 'antd';
import { useAppDispatch, useAppSelector } from 'shared/lib/hooks';
import { useMessage } from 'entities/locale/lib/hooks';

import { selectLdapLoginManage } from 'entities/track/common/model/selectors';
import { TTrackerConfig } from 'entities/tracker/model/types';
import styles from './LdapLoginModalCreate.module.scss';

export const LdapLoginModalCreate: FC<{ tracker: TTrackerConfig; isTrackCreateLoading: boolean }> = () => {
  const message = useMessage();
  const dispatch = useAppDispatch();
  const trackInput = useAppSelector(selectLdapLoginManage);

  const onTrackModalClose = useCallback(() => {
    dispatch(track.actions.setLdapLoginCreate());
  }, [dispatch]);

  if (!trackInput) return null;

  return (
    <Modal
      className={styles.modal}
      open={!!trackInput}
      title={message('ldap.auth.title')}
      onCancel={onTrackModalClose}
      footer={null}
      width="fit-content"
    >
      <LdapLoginFormManage />
    </Modal>
  );
};
