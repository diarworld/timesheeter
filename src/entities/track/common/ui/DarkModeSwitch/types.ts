import { SpringConfig } from 'react-spring';

export enum ThemeMode {
  System = 'System',
  Light = 'Light',
  Dark = 'Dark',
}

type TSVGProperties = {
  transform: string;
};

type TCircleProperties = {
  r: number;
};

type TMaskProperties = {
  cx: string;
  cy: string;
};

type TLinesProperties = {
  opacity: number;
};

type TModeProperties = {
  circle: TCircleProperties;
  mask: TMaskProperties;
  svg: TSVGProperties;
  lines: TLinesProperties;
};

export interface IAnimationProperties {
  [ThemeMode.System]: TModeProperties;
  [ThemeMode.Light]: TModeProperties;
  [ThemeMode.Dark]: TModeProperties;
  springConfig: SpringConfig;
}

export interface IColorOptions {
  halfSunLeftFill: string;
  halfSunLeftStroke: string;
  halfSunLeftBeamStroke: string;
  halfMoonRightFill: string;
  halfMoonRightStroke: string;
  halfMoonRightBeamStroke: string;
  sunFill: string;
  sunStroke: string;
  sunBeamStroke: string;
  moonFill: string;
  moonStroke: string;
}

export interface IDarkModeSwitchHandle {
  click: () => void;
}

export interface IDarkModeSwitchProps {
  onChange: (themeMode: ThemeMode) => void;
  isSystemThemeModeEnabled?: boolean;
  themeMode: ThemeMode;
  style?: React.CSSProperties;
  size?: number | string;
  colors?: Partial<IColorOptions>;
  animationProperties?: IAnimationProperties;
}

export interface ISunAndMoonAnimatedSvgProps {
  width: number | string;
  height: number | string;
  style?: React.CSSProperties;
  themeMode: ThemeMode;
  isSystemThemeModeEnabled: boolean;
  colors: IColorOptions;
  animationProperties: IAnimationProperties;
}
