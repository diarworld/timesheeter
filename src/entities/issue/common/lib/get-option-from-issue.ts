import { TIssue } from 'entities/issue/common/model/types';
import { TOption } from 'shared/lib/types';

export const getOptionFromIssue = ({ key, summary }: TIssue, searchTerm?: string): TOption => {
  const isKeyMatch = searchTerm && key.toLowerCase() === searchTerm.toLowerCase();
  const colorIndicator = isKeyMatch ? '🟢' : '🔵';

  return {
    label: `${colorIndicator} [${key}] ${summary}`,
    value: key,
  };
};
