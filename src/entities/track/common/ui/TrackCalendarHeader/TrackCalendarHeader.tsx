import { Col, Row, Space } from 'antd';
import { LocaleSelector } from 'entities/locale/ui/LocaleSelector';
import { TrackTimeButton } from 'entities/track/common/ui/TrackCalendarHeader/TrackTimeButton';
import { ManageTeamButton } from 'entities/track/common/ui/TrackCalendarHeader/ManageTeamButton';
import { TimeOffsetSelect } from 'features/date/ui/TimeOffsetSelect/TimeOffsetSelect';
import { GlobalFetching } from 'shared/ui/GlobalFetching';
import { ReactNode } from 'react';
import { TimePeriodStepper } from './TimePeriodStepper';
import { TodayText } from './TodayText';
import { TrackCalendarHeaderControlBar } from './TrackCalendarHeaderControlBar';

import styles from './TrackCalendarHeader.module.scss';

interface ITrackCalendarHeaderProps {
  isEdit?: boolean;
  upperRowControls?: ReactNode;
  filters?: ReactNode;
}

export function TrackCalendarHeader({ isEdit, filters, upperRowControls }: ITrackCalendarHeaderProps) {
  return (
    <div className={styles.header}>
      <Row justify="space-between">
        <Col>
        <ManageTeamButton className={styles.addTrackBtn} isEdit={isEdit} />
        <TrackTimeButton className={styles.addTrackBtn} isEdit={isEdit} />
        <TodayText />
        </Col>

        <Col>
          <Space>
            {upperRowControls}
            <LocaleSelector />
            <TimeOffsetSelect />
          </Space>
        </Col>
      </Row>

      <Row className={styles.durationRow}>
        <Col flex="auto">
          <TimePeriodStepper loader={<GlobalFetching />} />
        </Col>
      </Row>

      <TrackCalendarHeaderControlBar>{filters}</TrackCalendarHeaderControlBar>
    </div>
  );
}
