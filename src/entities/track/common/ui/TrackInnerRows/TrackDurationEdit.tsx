import { Form, Input } from 'antd';
import { durationValidationRules } from 'entities/track/common/lib/helpers';
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import { FocusEventHandler, memo, useEffect, useState } from 'react';
import { TrackCalendarSum } from 'entities/track/common/ui/TrackCalendarSum';
import { DURATION_EMPTY } from 'entities/track/common/lib/constants';
import { TTrack, TTrackInputEditForm } from 'entities/track/common/model/types';
import { useISOToHumanReadableDuration } from 'entities/track/common/lib/hooks/use-iso-to-human-readable-duration';
import { humanReadableDurationToISO } from 'entities/track/common/lib/human-readable-duration-to-iso';
import clsx from 'clsx';
import styles from './TrackDurationEdit.module.scss';

interface ITrackDurationFormProps {
  initialValues: { duration: string };
  onSubmit: (values: { duration: string }) => void;
  onFocus: FocusEventHandler<HTMLInputElement>;
  isDarkMode: boolean;
}

const TrackDurationForm: React.FC<ITrackDurationFormProps> = ({ initialValues, onSubmit, onFocus, isDarkMode }) => {
  const [form] = Form.useForm<typeof initialValues>();
  const [durationError, setDurationError] = useState(false);

  useEffect(() => {
    form.setFieldValue('duration', initialValues.duration);
  }, [initialValues.duration, form]);

  const submitForm = () => {
    form
      .validateFields()
      .then(onSubmit)
      .catch((errors: ValidateErrorEntity<typeof initialValues>) => {
        const durationFieldError = errors.errorFields.find((field) => field.name.includes('duration'));
        if (durationFieldError?.errors.length) {
          setDurationError(true);
        }
      });
  };

  const handleFocus: FocusEventHandler<HTMLInputElement> = (e) => {
    setDurationError(false);
    onFocus(e);
  };

  return (
    <Form noValidate form={form} initialValues={initialValues}>
      <Form.Item noStyle name="duration" rules={durationValidationRules}>
        <Input
          className={clsx(styles.input, { [styles.input_dark]: isDarkMode }, { [styles.input_light]: !isDarkMode })}
          onBlur={submitForm}
          onPressEnter={submitForm}
          onFocus={handleFocus}
          status={durationError ? 'error' : undefined}
        />
      </Form.Item>
    </Form>
  );
};

interface ITrackDurationEditProps {
  issueId: string;
  trackItem: TTrack;
  isEdit?: boolean;
  updateTrack(input: Partial<TTrackInputEditForm>, issueIdOrKey?: string, trackId?: number | string): void;
  isDarkMode: boolean;
}

export const TrackDurationEdit = memo(
  ({ trackItem, issueId, isEdit, updateTrack, isDarkMode }: ITrackDurationEditProps) => {
    const [, setDurationError] = useState(false);
    const duration = trackItem?.duration || DURATION_EMPTY;
    const durationFormat = useISOToHumanReadableDuration(duration);

    const initialValues = {
      duration: durationFormat,
    } as const;

    const handleSubmit = (values: typeof initialValues) => {
      const durationISO = humanReadableDurationToISO(values.duration);

      if (!isEdit || !durationISO || durationISO === trackItem.duration) return;
      updateTrack(
        {
          duration: durationISO,
        },
        issueId,
        trackItem.id,
      );
    };

    const handleFocus: FocusEventHandler<HTMLInputElement> = () => {
      setDurationError(false);
    };

    return (
      <td className={styles.col}>
        {isEdit ? (
          <TrackDurationForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onFocus={handleFocus}
            isDarkMode={isDarkMode}
          />
        ) : (
          <TrackCalendarSum tracksOrTrack={[trackItem]} />
        )}
      </td>
    );
  },
);

TrackDurationEdit.displayName = 'TrackDurationEdit';
