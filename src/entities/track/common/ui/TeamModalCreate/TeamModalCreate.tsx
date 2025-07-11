import { track } from 'entities/track/common/model/reducers';
import { TeamFormManage } from 'entities/track/common/ui/TeamFormManage';
import React, { useCallback } from 'react';
import { Modal } from 'antd';
import { useAppDispatch, useAppSelector } from 'shared/lib/hooks';
import { useMessage } from 'entities/locale/lib/hooks';

import { selectTeamManageCreate } from 'entities/track/common/model/selectors';
import { TTrackerConfig } from 'entities/tracker/model/types';
import styles from './TeamModalCreate.module.scss';

type TProps = {
  tracker: TTrackerConfig;
  isTrackCreateLoading: boolean;
};

export const TeamModalCreate = ({ tracker, isTrackCreateLoading }: TProps) => {
  const message = useMessage();
  const dispatch = useAppDispatch();
  const trackInput = useAppSelector(selectTeamManageCreate);

  const onTrackModalClose = useCallback(() => {
    dispatch(track.actions.setTeamManageCreate());
  }, [dispatch]);

  if (!trackInput) return null;

  return (
    <Modal
      className={styles.modal}
      open={!!trackInput}
      title={message('manage.team.title')}
      onCancel={onTrackModalClose}
      footer={null}
      width="fit-content"
    >
      <TeamFormManage tracker={tracker} _initialValues={trackInput} isTrackCreateLoading={isTrackCreateLoading} />
    </Modal>
  );
};
