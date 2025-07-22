import 'antd/dist/reset.css';
import { Provider } from 'react-redux';
import { store } from '../src/app/store';

export const decorators = [
  (Story) => <Provider store={store}><Story /></Provider>,
];

export const parameters = {
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
export const tags = ["autodocs"];
