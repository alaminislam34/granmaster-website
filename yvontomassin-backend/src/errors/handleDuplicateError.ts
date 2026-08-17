import { TErrorSources, TGenericErrorResponse } from '../interface/error';

const handleDuplicateError = (err: any): TGenericErrorResponse => {
  const key = err?.keyValue ? Object.keys(err.keyValue)[0] : 'field';
  const value = err?.keyValue ? err.keyValue[key] : undefined;
  const readableValue = value ? String(value) : 'value';

  const errorSources: TErrorSources = [
    {
      path: key,
      message: `${readableValue} already exists`,
    },
  ];

  const statusCode = 409;

  return {
    statusCode,
    message: 'Duplicate value',
    errorSources,
  };
};

export default handleDuplicateError;
