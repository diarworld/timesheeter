import React from 'react';
import { Meta, StoryFn } from '@storybook/nextjs';
import { fn } from 'storybook/test';

import { RangePicker } from './index';

// Range here etc
// Maybe convert to mdx

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: 'Example/RangePicker',
  component: RangePicker,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  // Argtypes are badly inferred sometimes, some need manual configuration
  argTypes: {
    // do range dae & regular date
    onClick: { action: 'clicked', actionHandler: fn() },
  },
  args: {
    children: 'RangePicker label',
  },
} as Meta<typeof RangePicker>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: StoryFn<typeof RangePicker> = (args) => <RangePicker {...args} />;

export const Primary = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
// Primary.args = {
//   type: 'primary',
// };
