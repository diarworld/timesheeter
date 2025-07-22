import { Text } from './Text';
import { fn } from 'storybook/test';
export default {
  title: 'Text',
  component: Text,
  argTypes: {
    onClick: { action: 'clicked', actionHandler: fn() },
  },
};

export const $обычныйТекст = {
  render: () => <Text lh="22">Пример текста</Text>,
  name: 'Обычный текст',
};

export const $ссылкиНаТаски = {
  render: () => (
    <Text underline color="#0B68FF" fw="500">
      Пример текста
    </Text>
  ),
  name: 'Ссылки на таски',
};

export const $жирныйЧасыТаблицы = {
  render: () => <Text fw="700">Пример текста</Text>,
  name: 'Жирный (часы таблицы)',
};

export const $нежирныеЧасыТаблицы = {
  render: () => <Text>Пример текста</Text>,
  name: 'Нежирные часы таблицы',
};

export const $датаWeek = {
  render: () => (
    <Text fw="500" fs="28" lh="34">
      Пример текста
    </Text>
  ),
  name: 'Дата week',
};

export const $переключалкаМесяцНеделя = {
  render: () => <Text lh="18">Пример текста</Text>,
  name: 'Переключалка месяц/неделя',
};

export const $чекбокс = {
  render: () => (
    <Text fs="13" lh="16">
      Пример текста
    </Text>
  ),
  name: 'Чекбокс',
};

export const $текстИнпутаДейтпикера = {
  render: () => <Text lh="16">Пример текста</Text>,
  name: 'Текст инпута дейтпикера',
};

export const $чипсинаВСелектеСотрудникаТекстыВСелектахПоискахЧипсах = {
  render: () => <Text lh="20">Пример текста</Text>,
  name: 'Чипсина в селекте сотрудника, тексты в селектах/поисках/чипсах',
};

export const $текстВМодалке = {
  render: () => (
    <Text fw="500" fs="16" lh="20">
      Пример текста
    </Text>
  ),
  name: 'Текст в модалке',
};

export const $заголовокМодалки = {
  render: () => (
    <Text fw="700" fs="16" lh="19">
      Пример текста
    </Text>
  ),
  name: 'Заголовок модалки',
};

export const $текстВКнопкеМодалкиСПлюсиком = {
  render: () => <Text color="#0B68FF">Пример текста</Text>,
  name: 'Текст в кнопке модалки с плюсиком',
};

export const $хедерТаблицы = {
  render: () => (
    <Text fw="700" fs="13" lh="16">
      Пример текста
    </Text>
  ),
  name: 'Хедер таблицы',
};

export const $текущаяДатаМелкая = {
  render: () => <Text>Пример текста</Text>,
  name: 'Текущая дата мелкая',
};
