import { track } from 'entities/track/common/model/reducers';
import { TeamFormManage } from 'entities/track/common/ui/TeamFormManage';
import React, { ReactNode, useCallback } from 'react';
import { AutoCompleteProps, Modal } from 'antd';
import { useAppDispatch, useAppSelector } from 'shared/lib/hooks';
import { useMessage } from 'entities/locale/lib/hooks';

import { selectTeamManageCreate } from 'entities/track/common/model/selectors';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TTeamFormManageFields } from 'entities/track/common/ui/TeamFormManage/types';
import { IIssueTracksProps } from 'entities/track/common/ui/IssueTracks/IssueTracks';
import { FieldInputProps } from 'react-final-form';
import styles from './TeamModalCreate.module.scss';

type TProps = {
  tracker: TTrackerConfig;
  isTrackCreateLoading: boolean;
  createTrack(form: TTeamFormManageFields): void;
  renderIssueTracksConnected(props: Pick<IIssueTracksProps, 'issueKey' | 'date' | 'className'>): ReactNode;
  renderIssuesSearchConnected(props: AutoCompleteProps<string> & FieldInputProps<string>): ReactNode;
};

export const TeamModalCreate = ({
  tracker,
  createTrack,
  isTrackCreateLoading,
  renderIssueTracksConnected,
  renderIssuesSearchConnected,
}: TProps) => {
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
      <TeamFormManage
        tracker={tracker}
        initialValues={trackInput}
        createTrack={createTrack}
        isTrackCreateLoading={isTrackCreateLoading}
        renderIssueTracksConnected={renderIssueTracksConnected}
        renderIssuesSearchConnected={renderIssuesSearchConnected}
      />
    </Modal>
  );
};
