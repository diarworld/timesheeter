import React, { forwardRef, memo } from 'react';
import { Button } from 'antd';
import { Trash } from 'components/Icons/Trash';
import styles from './TrackDeleteButton.module.scss';
import clsx from 'clsx';

interface ITrackDeleteButtonProps {
  isDarkMode: boolean;
}

export const TrackDeleteButton = memo(
  forwardRef<HTMLButtonElement, ITrackDeleteButtonProps>(({ isDarkMode, ...props }, ref) => (
    <Button ref={ref} type="text" shape="circle" className={clsx(styles.btn, { [styles.btn_dark]: isDarkMode }, { [styles.btn_light]: !isDarkMode })} {...props}>
      <Trash />
    </Button>
  )),
);
