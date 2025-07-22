import React from 'react';
import { Meta, StoryFn } from '@storybook/nextjs';
import { fn } from 'storybook/test';

import { TextArea } from './index';

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: 'Example/TextArea',
  component: TextArea,
  argTypes: {
    onClick: { action: 'clicked', actionHandler: fn() },
  },
  args: {
    placeholder: 'TextArea placeholder',
  },
} as Meta<typeof TextArea>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: StoryFn<typeof TextArea> = (args) => <TextArea {...args} />;

export const Primary = Template.bind({});
