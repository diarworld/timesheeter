import { AbstractQParam } from 'entities/issue/common/lib/QueryBuilder';

const UNQUOTED_VALUES = ['me()', 'currentUser()'];

export class YandexQParam extends AbstractQParam {
  buildQuery(): string {
    if (this.value.length === 0) {
      return '';
    }

    const resultValueStr = this.value.map((v) => (UNQUOTED_VALUES.includes(v) ? v : `"${v}"`)).join(', ');

    return `"${this.name}": ${this.operator}${resultValueStr}`;
  }
}
