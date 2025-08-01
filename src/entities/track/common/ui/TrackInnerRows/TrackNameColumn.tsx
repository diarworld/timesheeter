import { Form, Typography, Popconfirm, Button } from 'antd';
import { TextArea } from 'components';
import { FocusEventHandler, memo, useEffect } from 'react';
import { useMessage } from 'entities/locale/lib/hooks';
import { TTrackInputDelete, TTrackInputEditForm } from 'entities/track/common/model/types';
import { DeleteRowOutlined, DeleteOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import styles from './TrackNameColumn.module.scss';

interface ITrackNameFormProps {
  initialValues: { comment: string };
  onFocus: FocusEventHandler<HTMLTextAreaElement>;
  onSubmit: (values: { comment: string }) => void;
  isEdit: boolean;
  isDarkMode: boolean;
  message: (key: string) => string;
}

const TrackNameForm: React.FC<ITrackNameFormProps> = ({
  initialValues,
  onFocus,
  onSubmit,
  isEdit,
  isDarkMode,
  message,
}) => {
  const [form] = Form.useForm<typeof initialValues>();

  useEffect(() => {
    form.setFieldValue('comment', initialValues.comment);
  }, [initialValues.comment, form]);

  const handleBlur: FocusEventHandler<HTMLTextAreaElement> = (e) => {
    e.target.spellcheck = false;
    form.validateFields().then(onSubmit).catch(console.error);
  };

  return (
    <Form
      noValidate
      className={styles.form}
      form={form}
      initialValues={initialValues}
      aria-label={message('track.comment.title')}
    >
      <Form.Item name="comment" noStyle>
        <TextArea
          onFocus={onFocus}
          onBlur={handleBlur}
          className={clsx(
            styles.textarea,
            { [styles.textarea_dark]: isDarkMode },
            { [styles.textarea_light]: !isDarkMode },
          )}
          spellCheck={false}
          autoSize
          readOnly={!isEdit}
        />
      </Form.Item>
    </Form>
  );
};

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

    const handleFocus: FocusEventHandler<HTMLTextAreaElement> = (e) => {
      e.target.select();
      e.target.spellcheck = true;
    };

    const handleSubmit = (values: typeof initialValues) => {
      if (!isEdit) return;
      updateTrack(values, issueId, trackId);
    };

    return (
      <>
        <td colSpan={2} className={styles.col}>
          <div>
            {isEdit ? (
              <>
                <Popconfirm
                  icon={<DeleteRowOutlined />}
                  title={`${message('track.delete.title')}?`}
                  onConfirm={() => {
                    // console.log('Popconfirm confirm clicked', { issueId, trackId });
                    deleteTrack({ issueIdOrKey: issueId, trackId });
                  }}
                >
                  {/* <TrackDeleteButton isDarkMode={isDarkMode} aria-label={message('track.delete.title')} /> */}
                  <Button shape="circle" type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
                {isEditTrackComment ? (
                  <TrackNameForm
                    initialValues={initialValues}
                    onFocus={handleFocus}
                    onSubmit={handleSubmit}
                    isEdit={isEdit}
                    isDarkMode={isDarkMode}
                    message={message}
                  />
                ) : (
                  <Typography.Text
                    disabled
                    className={clsx(
                      styles.commentEditDisabled,
                      { [styles.commentEditDisabled_dark]: isDarkMode },
                      { [styles.commentEditDisabled_light]: !isDarkMode },
                    )}
                  >
                    {trackCommentEditDisabledReason}
                  </Typography.Text>
                )}
              </>
            ) : (
              <div
                className={clsx(
                  { [styles.commentEditDisabled_dark]: isDarkMode },
                  { [styles.commentEditDisabled_light]: !isDarkMode },
                )}
              >
                {initialValues.comment}
              </div>
            )}
          </div>
        </td>
        <td colSpan={3} aria-hidden="true" />
      </>
    );
  },
);

TrackNameColumn.displayName = 'TrackNameColumn';
