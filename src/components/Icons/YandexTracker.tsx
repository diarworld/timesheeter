import Icon, { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

const YTSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16">
    <path
      fillRule="evenodd"
      d="M2.75 2.5a.25.25 0 0 0-.25.25v2.167c0 .138.112.25.25.25h2.417V2.5zm3.917 0v2.667h2.666V2.5zm4.166 0v2.667h2.417a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25zm0 4.167h2.417A1.75 1.75 0 0 0 15 4.917V2.75A1.75 1.75 0 0 0 13.25 1H2.75A1.75 1.75 0 0 0 1 2.75v2.167c0 .966.784 1.75 1.75 1.75h2.417v6.583c0 .966.783 1.75 1.75 1.75h2.166a1.75 1.75 0 0 0 1.75-1.75zm-1.5 0H6.667v2.666h2.666zm0 4.166H6.667v2.417c0 .138.112.25.25.25h2.166a.25.25 0 0 0 .25-.25z"
      clipRule="evenodd"
    />
  </svg>
);
export const YandexTracker = (props: Partial<CustomIconComponentProps>) => <Icon component={YTSvg} {...props} />;
