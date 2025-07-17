import { Form, Typography, Popconfirm } from 'antd';
import { TextArea } from 'components';
import { FocusEventHandler, memo, useEffect } from 'react';
import { useMessage } from 'entities/locale/lib/hooks';
import { TTrackInputDelete, TTrackInputEditForm } from 'entities/track/common/model/types';
import { DeleteRowOutlined } from '@ant-design/icons';
import { TrackDeleteButton } from './TrackDeleteButton';
import styles from './TrackNameColumn.module.scss';
import clsx from 'clsx';

interface ITrackNameColumnProps {
  trackId: number | string;
  trackComment: string | undefined;
  issueId: string;
  isEdit?: boolean;
  isEditTrackComment?: boolean;
  trackCommentEditDisabledReason?: string;
  updateTrack(input: Partial<TTrackInputEditForm>, issueIdOrKey?: string, trackId?: number | string): void;
  deleteTrack(form: TTrackInputDelete): void;
  isDarkMode: boolean;
}

export const TrackNameColumn = memo(
  ({
    issueId,
    isEdit,
    isEditTrackComment,
    trackId,
    trackComment,
    updateTrack,
    deleteTrack,
    trackCommentEditDisabledReason,
    isDarkMode,
  }: ITrackNameColumnProps) => {
    const message = useMessage();
    const initialValues = {
      comment: trackComment ?? '',
    } as const;

    const [form] = Form.useForm<typeof initialValues>();

    useEffect(() => {
      form.setFieldValue('comment', trackComment);
    }, [trackComment, form]);

    const handleFocus: FocusEventHandler<HTMLTextAreaElement> = (e) => {
      e.target.select();
      e.target.spellcheck = true;
    };

    const handleSubmit = (values: typeof initialValues) => {
      if (!isEdit) return;
      updateTrack(values, issueId, trackId);
    };

    const handleBlur: FocusEventHandler<HTMLTextAreaElement> = (e) => {
      e.target.spellcheck = false;
      form.validateFields().then(handleSubmit).catch(console.error);
    };

    return (
      <><td colSpan={2} className={styles.col}>
        <div>
          {isEdit ? (
            <>
              <Popconfirm
                icon={<DeleteRowOutlined />}
                title={`${message('track.delete.title')}?`}
                onConfirm={() => {
                  // console.log('Popconfirm confirm clicked', { issueId, trackId });
                  deleteTrack({ issueIdOrKey: issueId, trackId });
                } }
              >
                <TrackDeleteButton isDarkMode={isDarkMode} />
              </Popconfirm>
              {isEditTrackComment ? (
                <Form noValidate className={styles.form} form={form} initialValues={initialValues}>
                  <Form.Item name="comment" noStyle>
                    <TextArea
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      className={clsx(styles.textarea, { [styles.textarea_dark]: isDarkMode }, { [styles.textarea_light]: !isDarkMode })}
                      spellCheck={false}
                      autoSize
                      // style={{ width: '40%' }}
                      readOnly={!isEdit} />
                  </Form.Item>
                </Form>
              ) : (
                <Typography.Text disabled className={clsx(styles.commentEditDisabled, { [styles.commentEditDisabled_dark]: isDarkMode }, { [styles.commentEditDisabled_light]: !isDarkMode })}>
                  {trackCommentEditDisabledReason}
                </Typography.Text>
              )}
            </>
          ) : (
            <div className={clsx({ [styles.commentEditDisabled_dark]: isDarkMode }, { [styles.commentEditDisabled_light]: !isDarkMode })}>{initialValues.comment}</div>
          )}
        </div>
      </td><td colSpan={3} /></>
    );
  },
);

TrackNameColumn.displayName = 'TrackNameColumn';
