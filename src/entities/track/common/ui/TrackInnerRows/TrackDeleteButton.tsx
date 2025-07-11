import React, { forwardRef, memo } from 'react';
import { Button } from 'antd';
import { Trash } from 'components/Icons/Trash';
import styles from './TrackDeleteButton.module.scss';

export const TrackDeleteButton = memo(
  forwardRef<HTMLButtonElement>((props, ref) => (
    <Button ref={ref} type="text" shape="circle" className={styles.btn} {...props}>
      <Trash />
    </Button>
  )),
);
