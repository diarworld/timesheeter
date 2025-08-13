import { DateWrapper } from 'features/date/lib/DateWrapper';
import { DATE_FORMAT_DATE_API } from 'features/date/lib/constants';
import { QueryBuilder, QLogic } from 'entities/issue/common/lib/QueryBuilder';
import { YandexQSorting } from 'entities/issue/yandex/lib/QueryBuilder/YandexQSorting';
import { YandexQParam } from 'entities/issue/yandex/lib/QueryBuilder/YandexQParam';
import { TGetIssuesParams, TGetUserIssuesParams, TSearchIssuesParams } from 'entities/issue/common/model/types';

const isGetUserIssuesParams = (x: TGetIssuesParams): x is TGetUserIssuesParams =>
  Object.hasOwn(x, 'from') && Object.hasOwn(x, 'to');

const isSearchIssuesParams = (x: TGetIssuesParams): x is TSearchIssuesParams => Object.hasOwn(x, 'search');

const getUserIssuesQuery = ({
  from,
  to,
  includeIssues,
  user,
  statusList,
  summary,
  queue,
  sortBy,
  sortOrder,
  utcOffsetInMinutes,
}: TGetUserIssuesParams) => {
  const formattedFrom = DateWrapper.getDateFormat(
    DateWrapper.getDate({ date: from, utcOffsetInMinutes }),
    DATE_FORMAT_DATE_API,
    0,
  );
  const formattedTo = DateWrapper.getDateFormat(
    DateWrapper.getDate({ date: to, utcOffsetInMinutes }),
    DATE_FORMAT_DATE_API,
    0,
  );

  const assigneeParam = new YandexQParam('Assignee', String(user));
  const modifierParam = new YandexQParam('Modifier', String(user));
  const userParam = new QLogic.OR(assigneeParam, modifierParam);

  const createdParam = new QLogic.AND(
    new YandexQParam('Created', formattedTo, '<='),
    new YandexQParam('Created', formattedFrom, '>='),
  );
  const updatedParam = new QLogic.AND(
    new YandexQParam('Updated', formattedFrom, '>='),
    new YandexQParam('Updated', formattedTo, '<='),
    modifierParam,
  );

  const periodParam = new QLogic.OR(createdParam, updatedParam);

  const userIssuesForPeriodParam = new QLogic.AND(userParam, periodParam);

  const keysParam = new YandexQParam('Key', includeIssues);

  const queryBuilder = new QueryBuilder(
    new QLogic.OR(keysParam, userIssuesForPeriodParam),
    new YandexQParam('Status', statusList),
    new YandexQParam('Summary', summary),
    new YandexQParam('Queue', queue),
    new YandexQSorting(sortBy, sortOrder),
  );

  return queryBuilder.buildQuery();
};

const getSearchIssuesQuery = ({ search }: TSearchIssuesParams) =>
  new QueryBuilder(
    new QLogic.OR(new YandexQParam('Summary', search), new YandexQParam('Key', search?.toUpperCase())),
    new YandexQSorting('Updated', 'DESC'),
  ).buildQuery();

export const createYandexIssueRequest = (params: TGetIssuesParams) => {
  let query: string | undefined;

  if (isSearchIssuesParams(params)) {
    query = getSearchIssuesQuery(params);
  } else if (isGetUserIssuesParams(params)) {
    query = getUserIssuesQuery(params);
  }

  if (!query) {
    console.error('Possible error! Query for issues request was not constructed!');
  }

  return { query };
};
