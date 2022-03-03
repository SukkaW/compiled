import '@compiled/react';
import { hoverObjectLiteral } from './mixins';

const inlineMixinFunc = () => ({
  color: 'red',
});

const inlineMixinObj = {
  color: 'green',
};

export default {
  title: 'css prop/static object',
};

export const ObjectLiteral = (): JSX.Element => {
  return <div css={{ color: 'blue', display: 'flex', fontSize: '50px' }}>blue text</div>;
};

export const ObjectLiteralSpreadFromFunc = (): JSX.Element => {
  return (
    <div
      css={{
        color: 'blue',
        display: 'flex',
        fontSize: '50px',
        ...inlineMixinFunc(),
      }}>
      red text
    </div>
  );
};

export const ObjectLiteralSpreadFromObj = (): JSX.Element => {
  return (
    <div
      css={{
        color: 'blue',
        display: 'flex',
        fontSize: '50px',
        ...inlineMixinObj,
      }}>
      green text
    </div>
  );
};

export const ObjectLiteralLocalObj = (): JSX.Element => {
  return (
    <div
      css={{
        ':hover': inlineMixinObj,
        color: 'blue',
        display: 'flex',
        fontSize: '50px',
      }}>
      blue text
    </div>
  );
};

export const ObjectLiteralImportedObj = (): JSX.Element => {
  return (
    <div
      css={{
        ':hover': hoverObjectLiteral,
        color: 'purple',
        display: 'flex',
        fontSize: '50px',
      }}>
      purple text
    </div>
  );
};

export const ObjectLiteralMapWithKeys = (): JSX.Element => (
  <div>
    {['foo', 'bar'].map((string) => (
      <div key={string} css={{ backgroundColor: 'blue' }}>
        {string}
      </div>
    ))}
  </div>
);

export const ObjectExpressionDisabledSameLine = (): JSX.Element => (
  <h1
    css={{ color: 'red' }} // @compiled-disable-line transform-css-prop
  >
    Black text
  </h1>
);

export const ObjectExpressionDisabledNextLine = (): JSX.Element => (
  <h1
    // @compiled-disable-next-line transform-css-prop
    css={{ color: 'red' }}>
    Black text
  </h1>
);
